#!/usr/bin/env bash
# ============================================================================
# Git Governance — quy tắc chung cho mọi repo của lehieu2003
#
# G1. NHÁNH BẮT BUỘC: mọi thay đổi phải đi qua nhánh + pull request.
#     Nhánh chính (main/master) chỉ nhận:
#       - commit squash-merge (tiêu đề kết thúc "(#<số PR>)"), hoặc
#       - merge commit (2 parents).
#     Push thẳng commit thường lên nhánh chính = VI PHẠM.
#
# G2. TÊN NHÁNH: <type>/<mo-ta>
#     type: feat|fix|hotfix|release|chore|docs|ci|test|refactor|perf|build|e2e|bot
#     mo-ta: chữ thường, số, '.', '_', '-' (vd: feat/audit-service, fix/login-401)
#
# G3. COMMIT MESSAGE: Conventional Commits
#     <type>(<scope>)?: <mô tả>     vd: feat(auth): thêm refresh token
#     Merge commit và "Revert \"…\"" được miễn.
#     (Cảnh báo mềm khi tiêu đề > 72 ký tự.)
#
# Cách dùng:
#   --pr BASE_SHA HEAD_SHA        CI: kiểm tra nhánh + toàn bộ commit của PR
#   --push BEFORE AFTER           CI: chặn push thẳng nhánh chính
#   --commit-msg FILE             git hook commit-msg: kiểm tra 1 message
#   --local-push                  git hook pre-push: chặn push thẳng (đọc stdin)
#   --install-hook                cài hook commit-msg + pre-push cho repo hiện tại
#
# CI gọi qua .github/workflows/git-governance.yml. Hook cài bằng --install-hook.
# ============================================================================
set -euo pipefail

ALLOWED_TYPES="feat|fix|hotfix|release|chore|docs|ci|test|refactor|perf|build|e2e|bot"
BRANCH_RE="^($ALLOWED_TYPES)/[a-z0-9._/-]+$"
COMMIT_RE="^($ALLOWED_TYPES)(\([A-Za-z0-9.,_/-]+\))?(!)?: .+"
DEFAULT_BRANCH_RE='^(refs/heads/)?(main|master)$'
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

err()  { echo "❌ GIT GOVERNANCE: $*" >&2; exit 1; }
warn() { echo "⚠️  GIT GOVERNANCE: $*" >&2; }
ok()   { echo "✅ GIT GOVERNANCE: $*"; }

is_merge() { [ "$(git rev-list --parents -n 1 "$1" 2>/dev/null | wc -w | tr -d ' ')" -gt 2 ]; }
is_revert() { git log -1 --format=%s "$1" 2>/dev/null | grep -q '^Revert "' ; }
is_zero_sha() { echo "$1" | grep -q '^0+$'; }

# G3 — kiểm tra message của 1 commit
check_commit_message() { # $1=sha $2=label hiển thị
  local sha="$1" label="${2:-$1}" subject len
  is_merge "$sha" && return 0
  is_revert "$sha" && return 0
  subject="$(git log -1 --format=%s "$sha")"
  if ! printf '%s' "$subject" | grep -Eq "$COMMIT_RE"; then
    err "G3 — commit $label có message không hợp lệ: \"$subject\".
    Đúng định dạng: <type>(<scope>)?: <mô tả> — type thuộc: $ALLOWED_TYPES
    Sửa bằng: git commit --amend (commit cuối) hoặc git rebase -i (commit giữa)."
  fi
  len=${#subject}
  [ "$len" -gt 72 ] && warn "commit $label: tiêu đề $len ký tự (>72) — nên gọn hơn"
  return 0
}

# G1 — commit trên nhánh chính: chỉ chấp nhận squash "(#N)" hoặc merge commit
check_mainline_commit() { # $1=sha
  local sha="$1" subject
  is_merge "$sha" && return 0
  subject="$(git log -1 --format=%s "$sha")"
  if ! printf '%s' "$subject" | grep -Eq '\(#[0-9]+\)$'; then
    err "G1 — phát hiện push thẳng nhánh chính: commit $(git rev-parse --short "$sha") \"$subject\".
    Quy trình: git checkout -b <type>/mo-ta → commit → push → tạo PR → squash merge."
  fi
}

cmd_pr() { # $1=BASE_SHA $2=HEAD_SHA ; nhánh từ env GITHUB_HEAD_REF
  local base="$1" head="$2" branch="${GITHUB_HEAD_REF:-}"
  [ -n "$branch" ] || err "G2 — không xác định được nhánh nguồn của PR"
  if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
    err "G1 — PR từ nhánh chính ($branch)? Phải làm việc trên nhánh riêng."
  fi
  if ! printf '%s' "$branch" | grep -Eq "$BRANCH_RE"; then
    err "G2 — tên nhánh \"$branch\" không hợp lệ. Dùng: <type>/<mo-ta> với type thuộc: $ALLOWED_TYPES"
  fi
  local count=0 sha
  for sha in $(git rev-list "$base..$head"); do
    check_commit_message "$sha" "$(git rev-parse --short "$sha")"
    count=$((count + 1))
  done
  ok "PR từ nhánh \"$branch\" hợp lệ — $count commit đều theo Conventional Commits."
}

cmd_push() { # $1=BEFORE $2=AFTER — mọi commit mới trên nhánh chính phải là merge/squash
  local before="$1" after="$2" sha shas count=0
  if is_zero_sha "$before"; then
    ok "Nhánh mới/force-push — bỏ qua kiểm tra push."
    exit 0
  fi
  if ! shas="$(git rev-list --first-parent "$before..$after" 2>/dev/null)"; then
    shas="$(git rev-list -n 1 "$after")"
    warn "before không xác định được (force-push?) — chỉ kiểm tra commit đầu mút."
  fi
  for sha in $shas; do
    check_mainline_commit "$sha"
    count=$((count + 1))
  done
  ok "Nhánh chính sạch — $count commit mới đều là merge/squash từ PR."
}

cmd_commit_msg() { # $1=đường dẫn file chứa message (git hook commit-msg)
  local file="$1" subject
  subject="$(head -n 1 "$file")"
  if printf '%s' "$subject" | grep -Eq "$COMMIT_RE"; then
    ok "Message hợp lệ."
    exit 0
  fi
  if printf '%s' "$subject" | grep -Eq '^Revert "'; then
    ok "Revert commit — miễn kiểm tra."
    exit 0
  fi
  err "G3 — message không hợp lệ: \"$subject\".
    Đúng định dạng: <type>(<scope>)?: <mô tả> — type thuộc: $ALLOWED_TYPES
    Vd: feat(auth): thêm refresh token"
}

cmd_local_push() { # git hook pre-push — đọc stdin: local_ref local_sha remote_ref remote_sha
  local line local_ref local_sha remote_ref remote_sha shas sha
  while read -r local_ref local_sha remote_ref remote_sha; do
    [ -n "${remote_ref:-}" ] || continue
    printf '%s' "$remote_ref" | grep -Eq "$DEFAULT_BRANCH_RE" || continue
    if is_zero_sha "$remote_sha"; then continue; fi # đẩy nhánh mới — GitHub sẽ chặn nếu cần
    if is_zero_sha "$local_sha"; then
      err "G1 — đang xoá nhánh chính? Không cho phép."
    fi
    if ! shas="$(git rev-list --first-parent "$remote_sha..$local_sha" 2>/dev/null)"; then
      continue # force-push cập nhật lịch sử cũ — CI trên GitHub sẽ kiểm tra
    fi
    for sha in $shas; do
      if ! is_merge "$sha"; then
        err "G1 — từ chối push thẳng nhánh chính (commit $(git rev-parse --short "$sha")).
    Quy trình: git checkout -b <type>/mo-ta → commit → push nhánh đó → tạo PR → squash merge.
    (Van khẩn cấp trên máy bạn: git push --no-verify — nhưng CI vẫn sẽ báo đỏ.)"
      fi
    done
  done
  ok "Push hợp lệ."
  exit 0
}

cmd_install_hook() {
  local root hooks
  root="$(git rev-parse --show-toplevel 2>/dev/null)" || err "Chạy trong repo git để cài hook."
  hooks="$root/.git/hooks"
  { echo '#!/usr/bin/env bash';
    echo '"$(git rev-parse --show-toplevel)/.github/scripts/validate-git-governance.sh" --commit-msg "$1"';
  } > "$hooks/commit-msg"
  { echo '#!/usr/bin/env bash';
    echo '"$(git rev-parse --show-toplevel)/.github/scripts/validate-git-governance.sh" --local-push';
  } > "$hooks/pre-push"
  chmod +x "$hooks/commit-msg" "$hooks/pre-push"
  ok "Đã cài hook commit-msg + pre-push (chặn vi phạm ngay trên máy, trước khi push)."
}

case "${1:-}" in
  --pr)           shift; cmd_pr "$@" ;;
  --push)         shift; cmd_push "$@" ;;
  --commit-msg)   shift; cmd_commit_msg "$@" ;;
  --local-push)   cmd_local_push ;;
  --install-hook) cmd_install_hook ;;
  *) sed -n '2,26p' "${BASH_SOURCE[0]}"; exit 1 ;;
esac
