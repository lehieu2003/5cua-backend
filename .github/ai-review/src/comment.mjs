// comment.mjs — format kết quả review + đăng/cập nhật comment GitHub + step summary.

import { appendFile } from 'node:fs/promises';

const GITHUB_API = 'https://api.github.com';
const EMOJI = { critical: '🔴', major: '🟡', minor: '🟢' };

export function stickyMarker(prNumber) {
  return `<!-- ai-code-review:pr-${prNumber} -->`;
}
export const STICKY_MARKER = '<!-- ai-code-review:pr-'; // prefix để nhận diện comment của bot

export function formatReview({ findings, sha, mode, skippedFiles = [], truncatedFiles = [], notes = [] }, prNumber) {
  const lines = [];
  lines.push(`## 🤖 AI Code Review — \`${sha}\``);
  lines.push('');
  if (!findings || findings.length === 0) {
    lines.push('✅ Không phát hiện vấn đề nào trong diff này.');
  } else {
    const order = { critical: 0, major: 1, minor: 2 };
    const sorted = [...findings].sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));
    for (const f of sorted) {
      const emoji = EMOJI[f.severity] ?? '🟢';
      lines.push(`### ${emoji} ${f.title}`);
      lines.push(`📁 \`${f.file}:${f.line ?? '?'}\``);
      lines.push('');
      if (f.detail) lines.push(f.detail);
      if (f.suggestion) lines.push('', `> 💡 ${f.suggestion}`);
      lines.push('');
    }
  }
  if (notes.length > 0) {
    lines.push('', '📝 Ghi chú:');
    for (const n of notes) lines.push(`- ${n}`);
  }
  if (truncatedFiles.length > 0) {
    lines.push('', `⚠️ Không review được (diff vượt giới hạn): ${truncatedFiles.join(', ')}`);
  }
  if (skippedFiles.length > 0) {
    lines.push(
      '',
      `Đã bỏ qua: ${skippedFiles.map((s) => `\`${s.filename}\` (${s.reason})`).join(', ')}`
    );
  }
  if (mode === 'pr' && prNumber != null) {
    lines.push('', stickyMarker(prNumber));
  }
  return lines.join('\n');
}

export async function ghApi({ token, path, method = 'GET', body, fetchImpl = fetch }) {
  const res = await fetchImpl(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'code-review-bot',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`GitHub API ${method} ${path} lỗi HTTP ${res.status}: ${data?.message ?? ''}`);
  }
  return res;
}

export async function upsertPrComment({ token, repo, prNumber, body, fetchImpl }) {
  const marker = stickyMarker(prNumber);
  const list = await ghApi({
    token,
    path: `/repos/${repo}/issues/${prNumber}/comments?per_page=100`,
    fetchImpl,
  }).then((r) => r.json());

  const existing = list.find((c) => typeof c.body === 'string' && c.body.includes(marker));
  if (existing) {
    await ghApi({
      token,
      path: `/repos/${repo}/issues/comments/${existing.id}`,
      method: 'PATCH',
      body: { body },
      fetchImpl,
    });
    return 'updated';
  }
  await ghApi({
    token,
    path: `/repos/${repo}/issues/${prNumber}/comments`,
    method: 'POST',
    body: { body },
    fetchImpl,
  });
  return 'created';
}

export async function postCommitComment({ token, repo, sha, body, fetchImpl }) {
  await ghApi({
    token,
    path: `/repos/${repo}/commits/${sha}/comments`,
    method: 'POST',
    body: { body },
    fetchImpl,
  });
}

export async function writeSummary(body) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  await appendFile(file, `${body}\n`);
}
