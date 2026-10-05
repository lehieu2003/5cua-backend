# 5cua-backend

Backend API cho hệ thống 5Cua Smart Farm — Express + Prisma + PostgreSQL.

## Chạy local

Xem `DEPLOY.md` ở workspace root (nếu có) hoặc hỏi maintainer.

## CI

- **Backend CI**: build + typecheck + test trên `main`/`develop` và PR.
- **Backend Quality Gate**: test tích hợp với Postgres trên `main` và PR.
- **AI Code Review**: bot tự review diff mỗi PR và mỗi push lên `main`, nhận xét bằng tiếng Việt (comment trên PR, còn push thẳng thì xem tab **Actions → AI Code Review → Summary**). Không chặn merge.
