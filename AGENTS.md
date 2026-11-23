# Project: ASSDI Student Learning Progress, Feedback & Management System

Client: As-Sunnah Skill Development Institute (Dhaka, Bangladesh).
First course: Small Business Management Course (SBMC). The design must support future multi-course expansion with no schema changes.

Source of truth: docs/SRS.md. Read it before every major task. If anything conflicts with other documents, SRS.md wins.

## Stack
- Backend: Django 5 + Django REST Framework + PostgreSQL, JWT auth (SimpleJWT), OpenAPI docs (drf-spectacular)
- Web dashboard: Next.js (App Router, TypeScript, Tailwind, shadcn/ui, Recharts)
- Mobile: Expo React Native (TypeScript), Android first
- Notifications: Firebase Cloud Messaging

## Roles
super_admin, coordinator, teacher, student, observer (read-only).

## Rules
1. Strict role-based access control enforced on the server for every endpoint. A student sees only their own data. A teacher sees only their assigned batches. An observer is read-only.
2. Database constraint: UNIQUE(class_session, student) on both feedback and attendance records.
3. All APIs live under /api/v1/ and are documented with OpenAPI.
4. UI is Bangla-first with an English toggle (i18n from day one). Bangla font: Hind Siliguri.
5. Student feedback must be submittable in 10-15 seconds.
6. Use dummy data only. Never use real names or phone numbers.
7. Write tests for every feature and run them before saying a task is done.
8. Never hardcode secrets. Use .env and provide .env.example.
9. Ask me before running any destructive command (drop database, rm -rf, force push).
10. Make small commits with clear messages.
11. Work on one task at a time. Do not build features that are not part of the current task.
12. Reply to me in simple Bengali (Bangla script) when explaining things; keep code, comments and file names in English.

## UNDO PROTOCOL
If the user says 'undo', 'আনডু', 'আগের অবস্থানে ফিরিয়ে নাও', 'ভালো লাগেনি' or similar about the palette/design refresh, restore the UI to the state saved in tag `before-palette-refresh`: commit or stash any pending work on the branch `palette-refresh`, then run `git checkout design-refresh` (the branch recorded in docs/design-review/palette-refresh-undo.md). Do NOT delete the `palette-refresh` branch, so the user can come back to it later. Restart the dev server, confirm in the browser that the old look is back, and tell the user in simple Bengali that the previous state is restored and how to redo it (`git checkout palette-refresh`).

