// review.mjs — điều phối: lấy diff → lọc → GLM → đăng kết quả.
// Chạy trong GitHub Actions qua composite action (env từ action.yml + caller)
// hoặc CLI local: node review.mjs --dry-run --offline --diff-file <file>

import { execFileSync as realExecFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { normalizeDiff, collectDiff } from './diff.mjs';
import { buildPrompt } from './prompt.mjs';
import { callGLM, parseFindings, GlmError } from './glm.mjs';
import { formatReview, upsertPrComment, postCommitComment, writeSummary } from './comment.mjs';

const MAX_PR_FILES = 300;
const ZERO_SHA = /^0+$/;

export async function runReview(config) {
  const {
    eventName,
    repo,
    prNumber,
    baseSha,
    sha,
    token,
    model = 'glm-5.3-flash',
    language = 'vi',
    apiKey,
    baseUrl,
    skipPatterns = [],
    fetchImpl = fetch,
    execFileSyncImpl = (argv) => realExecFileSync(argv[0], argv.slice(1), { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }),
    dryRun = false,
    offline = false,
    offlineFindings,
    diffTextOverride,
    sleep,
  } = config;

  const notes = [];

  if (!offline && !apiKey) {
    console.error('❌ Thiếu ZAI_API_KEY — bot không thể gọi AI review. Đặt secret ZAI_API_KEY trong repo.');
    return { exitCode: 1, findings: [], notes, skippedFiles: [], truncatedFiles: [] };
  }

  const isPr = eventName === 'pull_request';

  // 1. Lấy diff
  let entries;
  try {
    if (diffTextOverride !== undefined) {
      entries = normalizeDiff({ diffText: diffTextOverride });
    } else if (isPr) {
      entries = await fetchPrFiles({ repo, prNumber, token, fetchImpl, execFileSyncImpl, baseSha, notes });
    } else {
      const range = resolvePushRange({ before: config.before, after: config.after, execFileSyncImpl, notes });
      const diffText = execFileSyncImpl(['git', '-C', process.cwd(), 'diff', range]);
      entries = normalizeDiff({ diffText });
    }
  } catch (err) {
    console.error(`❌ Không lấy được diff: ${err.message}`);
    return { exitCode: 1, findings: [], notes, skippedFiles: [], truncatedFiles: [] };
  }

  // 2. Lọc + cắt
  const { diffText, skippedFiles, truncatedFiles } = collectDiff(entries, { skipGlobs: skipPatterns });

  // 3. Prompt
  const { system, user } = buildPrompt({ diffText, skippedFiles, truncatedFiles, language });

  // 4. Gọi GLM
  let findings;
  try {
    if (offline) {
      findings = offlineFindings ?? [];
    } else {
      const { raw } = await callGLM({ system, user, apiKey, model, baseUrl, fetchImpl, sleep });
      findings = parseFindings(raw);
      if (findings === null) {
        findings = [
          {
            severity: 'minor',
            file: '(toàn bộ diff)',
            line: 0,
            title: 'Không parse được phản hồi AI',
            detail: 'Model trả về định dạng không mong đợi (không phải JSON schema yêu cầu).',
            suggestion: 'Chạy lại workflow; nếu lặp lại, thử đổi model.',
          },
        ];
      }
    }
  } catch (err) {
    if (err instanceof GlmError) {
      console.error(`❌ ${err.message}${err.retryable ? ' (đã retry 1 lần)' : ''}`);
    } else {
      console.error(`❌ Lỗi khi gọi AI: ${err.message}`);
    }
    return { exitCode: 1, findings: [], notes, skippedFiles, truncatedFiles };
  }

  // 5. Format + đăng
  const markdown = formatReview({ findings, sha, mode: isPr ? 'pr' : 'push', skippedFiles, truncatedFiles }, prNumber);

  if (dryRun) {
    console.log(markdown);
    return { exitCode: 0, findings, notes, skippedFiles, truncatedFiles, markdown };
  }

  try {
    if (isPr) {
      await upsertPrComment({ token, repo, prNumber, body: markdown, fetchImpl });
      await writeSummary(markdown);
      console.log(`✅ Đã đăng/cập nhật review trên PR #${prNumber}: ${findings.length} finding(s)`);
    } else {
      await writeSummary(markdown);
      if (findings.length > 0) {
        await postCommitComment({ token, repo, sha, body: markdown, fetchImpl });
        console.log(`✅ Đã comment review lên commit ${sha}: ${findings.length} finding(s)`);
      } else {
        console.log('✅ Không phát hiện vấn đề nào (chi tiết trong job summary).');
      }
    }
  } catch (err) {
    console.error(`❌ Không đăng được kết quả review lên GitHub: ${err.message}`);
    return { exitCode: 1, findings, notes, skippedFiles, truncatedFiles };
  }

  return { exitCode: 0, findings, notes, skippedFiles, truncatedFiles, markdown };
}

async function fetchPrFiles({ repo, prNumber, token, fetchImpl, execFileSyncImpl, baseSha, notes }) {
  const perPage = 100;
  const files = [];
  let page = 1;
  for (;;) {
    const res = await fetchImpl(
      `https://api.github.com/repos/${repo}/pulls/${prNumber}/files?per_page=${perPage}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'code-review-bot',
        },
      }
    );
    if (!res.ok) throw new Error(`GET pulls/${prNumber}/files → HTTP ${res.status}`);
    const batch = await res.json();
    files.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (files.length > MAX_PR_FILES) {
      notes.push(`PR có >${MAX_PR_FILES} file đổi — chuyển sang git diff tổng thể.`);
      const diffText = execFileSyncImpl([
        'git', '-C', process.cwd(), 'diff', `origin/${baseSha}...HEAD`,
      ]);
      return normalizeDiff({ diffText });
    }
  }
  return files;
}

function resolvePushRange({ before, after, execFileSyncImpl, notes }) {
  const missingBefore =
    !before || ZERO_SHA.test(before) || !shaExists(before, execFileSyncImpl);
  if (missingBefore) {
    notes.push('before không xác định được (nhánh mới hoặc force-push) → review HEAD~1..HEAD.');
    return 'HEAD~1..HEAD';
  }
  return `${before}..${after}`;
}

function shaExists(sha, execFileSyncImpl) {
  try {
    execFileSyncImpl(['git', '-C', process.cwd(), 'cat-file', '-e', `${sha}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

// --- CLI ---
async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const offline = argv.includes('--offline');
  const diffFileIdx = argv.indexOf('--diff-file');

  const event = process.env.GITHUB_EVENT_PATH
    ? JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'))
    : {};

  let diffTextOverride;
  if (diffFileIdx !== -1) {
    diffTextOverride = await readFile(argv[diffFileIdx + 1], 'utf8');
  }

  const isPr = event.pull_request != null;
  const config = {
    eventName: isPr ? 'pull_request' : 'push',
    repo: process.env.GITHUB_REPOSITORY,
    prNumber: event.number,
    baseSha: event.pull_request?.base?.sha,
    before: event.before,
    after: event.after,
    sha: event.pull_request?.head?.sha ?? event.after ?? 'local',
    token: process.env.GITHUB_TOKEN,
    apiKey: process.env.ZAI_API_KEY,
    model: process.env.ZAI_MODEL || undefined,
    language: process.env.ZAI_LANGUAGE || 'vi',
    skipPatterns: (process.env.ZAI_SKIP_PATTERNS || '').split('\n').map((s) => s.trim()).filter(Boolean),
    baseUrl: process.env.ZAI_BASE_URL || undefined,
    dryRun,
    offline,
    diffTextOverride,
  };

  if (offline && !diffTextOverride) {
    config.diffTextOverride = await readFile(
      fileURLToPath(new URL('../../test/fixtures/sample.diff', import.meta.url)),
      'utf8'
    );
  }
  if (offline && process.env.ZAI_API_KEY === undefined) {
    config.offlineFindings = JSON.parse(
      await readFile(
        fileURLToPath(new URL('../../test/fixtures/glm-response.json', import.meta.url)),
        'utf8'
      )
    ).findings;
  }

  const { exitCode } = await runReview(config);
  process.exitCode = exitCode;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((err) => {
    console.error(`❌ Lỗi không mong đợi: ${err.stack ?? err.message}`);
    process.exitCode = 1;
  });
}
