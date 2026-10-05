// diff.mjs — chuẩn hoá + lọc + cắt diff trước khi gửi review.
// Input nhận một trong hai dạng: {files: [{filename, patch}]} (REST pulls/{n}/files)
// hoặc {diffText} (unified diff từ `git diff`). Trả về cùng một biểu diễn.

export const DEFAULT_SKIP = [
  { glob: 'package-lock.json', reason: 'lockfile' },
  { glob: 'yarn.lock', reason: 'lockfile' },
  { glob: 'pnpm-lock.yaml', reason: 'lockfile' },
  { glob: 'pubspec.lock', reason: 'lockfile' },
  { glob: '*.g.dart', reason: 'generated' },
  { glob: '*.freezed.dart', reason: 'generated' },
  { glob: 'dist/**', reason: 'path' },
  { glob: 'build/**', reason: 'path' },
  { glob: '.github/**', reason: 'path' },
];

const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|dart|prisma|sql)$/;

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

function matchesPath(glob, filename) {
  const re = globToRegExp(glob);
  if (re.test(filename)) return true;
  if (!glob.includes('/')) return re.test(filename.split('/').pop());
  return false;
}

export function normalizeDiff({ files, diffText } = {}) {
  if (Array.isArray(files)) {
    return files.map((f) => ({ filename: f.filename, patch: f.patch }));
  }
  if (typeof diffText === 'string' && diffText.length > 0) {
    const entries = [];
    let current = null;
    for (const line of diffText.split('\n')) {
      const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (m) {
        current = { filename: m[2], patch: [] };
        entries.push(current);
      } else if (current) {
        current.patch.push(line);
      }
    }
    return entries.map((e) => ({ filename: e.filename, patch: e.patch.join('\n') }));
  }
  return [];
}

export function collectDiff(entries, opts = {}) {
  const maxLines = opts.maxLines ?? 1500;
  const maxChars = opts.maxChars ?? 60000;
  const customGlobs = opts.skipGlobs ?? [];

  const skippedFiles = [];
  const kept = [];
  for (const e of entries) {
    if (e.patch == null) {
      skippedFiles.push({ filename: e.filename, reason: 'binary' });
      continue;
    }
    const rule = DEFAULT_SKIP.find((r) => matchesPath(r.glob, e.filename));
    if (rule) {
      skippedFiles.push({ filename: e.filename, reason: rule.reason });
      continue;
    }
    const custom = customGlobs.find((g) => matchesPath(g, e.filename));
    if (custom) {
      skippedFiles.push({ filename: e.filename, reason: 'pattern' });
      continue;
    }
    kept.push(e);
  }

  // nguồn trước, tài liệu/config sau; ổn định trong từng nhóm
  const sorted = [
    ...kept.filter((e) => SOURCE_EXT.test(e.filename)),
    ...kept.filter((e) => !SOURCE_EXT.test(e.filename)),
  ];

  const blocks = [];
  const includedFiles = [];
  const truncatedFiles = [];
  let usedLines = 0;
  let usedChars = 0;
  for (const e of sorted) {
    const block = `diff --git a/${e.filename} b/${e.filename}\n${e.patch}`;
    const blockLines = block.split('\n').length;
    const fitFull = usedLines + blockLines <= maxLines && usedChars + block.length <= maxChars;
    if (fitFull) {
      blocks.push(block);
      includedFiles.push(e.filename);
      usedLines += blockLines;
      usedChars += block.length;
      continue;
    }
    const remainLines = maxLines - usedLines;
    const remainChars = maxChars - usedChars;
    // thử cắt cụt: chỉ khi còn đủ chỗ cho một mảnh có nghĩa
    if (remainLines >= 30 && remainChars >= 1000) {
      let slice = block.split('\n').slice(0, remainLines - 1).join('\n');
      if (slice.length > remainChars) slice = slice.slice(0, remainChars);
      if (slice.split('\n').length >= 30 && slice.length >= 1000) {
        blocks.push(slice);
        includedFiles.push(e.filename);
        usedLines += slice.split('\n').length;
        usedChars += slice.length;
      }
      truncatedFiles.push(e.filename);
    } else {
      truncatedFiles.push(e.filename);
    }
  }

  return {
    diffText: blocks.join('\n'),
    includedFiles,
    skippedFiles,
    truncatedFiles,
  };
}
