# Lessons Learned

| Date | Topic | Lesson | Action Item |
|------|-------|--------|-------------|
| 2026-01-01 | Next.js App Router route precedence | Dynamic routes like `/api/profile/[id]` can unintentionally capture reserved/static paths (e.g. `/api/profile/avatar`) and return 405 if the method isn't implemented. | Prefer explicit static routes for well-known subpaths and keep upload contracts (field name + response shape) documented and stable. |
