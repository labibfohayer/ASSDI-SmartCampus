# ASSDI System Implementation & MVP Build Plan

> **Document Status:** Complete  
> **Source of Truth:** `docs/SRS.md` (Section 17: Scope) + `AGENTS.md`  
> **Architecture Principle:** Test-Driven, Incremental Atomic Tasks, Zero Regression

---

## 1. Scope Boundary: MVP vs Phase 2 vs Future

| Horizon | Core Focus Areas |
|---|---|
| **MVP (Phase 1)** | 1. Dockerized Backend & PostgreSQL Setup.<br>2. Custom User Auth (JWT), Roles (`super_admin`, `coordinator`, `teacher`, `student`, `observer`).<br>3. Multi-course Curriculum Models (`courses`, `departments`, `subjects`, `class_topics`, `campuses`, `batches`, `teacher_assignments`).<br>4. Dummy Seed Data Generator (`seed_demo` for SBMC with dummy data).<br>5. Daily Class Sessions & Scheduling.<br>6. Daily Learning Feedback (1–5 rating, 10–15s submit, unique DB constraint).<br>7. Teacher Help Request Board (Pending ➔ In Progress ➔ Resolved).<br>8. Attendance System (Time-limited rotating signed QR + Manual fallback + Audit log).<br>9. Student Mobile App (Expo React Native, Bangla-first Hind Siliguri, 1-touch feedback, QR scanner).<br>10. Teacher & Coordinator Web Dashboards (Next.js, Recharts topic distribution, batch analytics).<br>11. In-App Notifications & FCM integration (`device_tokens`). |
| **Phase 2** | 1. Full PDF/Excel reporting export pipeline using WeasyPrint and openpyxl.<br>2. Advanced multi-parameter filters on dashboards.<br>3. Coordinator automated absence and low-progress alerts.<br>4. Offline feedback caching & background synchronization queue.<br>5. Excel student bulk import polish & error visualizer. |
| **Future (Post Phase 2)** | 1. Machine Learning powered at-risk dropout predictions.<br>2. Automatic topic difficulty ranking algorithm.<br>3. Individual longitudinal learning-journey graphs.<br>4. Multi-institute / multi-branch tenancy management. |

---

## 2. Granular MVP Sprints & Atomic Task Breakdown

Each task is scoped to be executable independently in a single focused session.

---

### Sprint 1: Foundation, Infrastructure & Authentication Engine

#### Task 1.1: Project Skeleton & Dockerized PostgreSQL Setup
* **Goal:** Initialize Django 5 project with clean modular architecture, PostgreSQL connection, environment variable configuration, and Docker Compose.
* **Dependencies:** None.
* **Deliverables:** `backend/` directory, `docker-compose.yml`, `backend/Dockerfile`, `.env.example`, `requirements.txt`.
* **Verification:** `docker compose up -d` brings up PostgreSQL; `python manage.py check` passes.

#### Task 1.2: Custom User Model & SimpleJWT Setup
* **Goal:** Implement custom `User` model using UUID PK, role enum (`super_admin`, `coordinator`, `teacher`, `student`, `observer`), soft-delete fields, and SimpleJWT authentication.
* **Dependencies:** Task 1.1.
* **Deliverables:** `backend/apps/users/models.py`, `backend/apps/users/serializers.py`, `backend/apps/users/views.py`.
* **Verification:** Unit tests verifying user creation, token generation via `/api/v1/auth/login/`, and token refresh.

#### Task 1.3: OpenAPI Swagger Documentation & Standard Response Middleware
* **Goal:** Configure `drf-spectacular` for live OpenAPI schema generation at `/api/v1/docs/` and standard API error formatting.
* **Dependencies:** Task 1.2.
* **Verification:** Access `/api/v1/docs/` and verify OpenAPI JSON/UI renders without warnings.

---

### Sprint 2: Academic Architecture & Scoping Models

#### Task 2.1: Campus, Course, Department & Subject Models
* **Goal:** Implement core academic structure supporting multi-course scalability without schema alterations.
* **Deliverables:** `backend/apps/academic/models.py` (`Campus`, `Course`, `Department`, `Subject`).
* **Verification:** Django migrations run cleanly; admin panel registrations verified.

#### Task 2.2: Curriculum-Level ClassTopics & Coordinator Course Scoping
* **Goal:** Implement `ClassTopics` table under subjects and `CoordinatorCourseAssignments` table.
* **Dependencies:** Task 2.1.
* **Deliverables:** Migration creating `class_topics` (with FK to `subject`) and `coordinator_course_assignments` (with `UNIQUE(user_id, course_id)`).
* **Verification:** Tests ensuring teachers can add topics under their subject and coordinators are restricted to assigned courses.

#### Task 2.3: Batches, Teacher Assignments & Student Profiles
* **Goal:** Implement `Batch`, `TeacherAssignment` (UNIQUE per batch+subject+teacher), `Student` profile, and `Enrollment`.
* **Dependencies:** Task 2.2.
* **Deliverables:** `backend/apps/students/models.py`, `backend/apps/batches/models.py`.
* **Verification:** Tests enforcing uniqueness constraints and student profile linking.

#### Task 2.4: SBMC Dummy Data Generator Command (`seed_demo`)
* **Goal:** Implement `python manage.py seed_demo` strictly adhering to Rule 6 (dummy Bengali names, fake phone numbers, SBMC departments: Business Operations & Creative, 2 batches, 6 teachers, 40 students).
* **Dependencies:** Task 2.3.
* **Verification:** Running `python manage.py seed_demo` populates clean data and prints login credentials for each role to console.

---

### Sprint 3: Class Sessions & Daily Routine API

#### Task 3.1: Class Schedules & Daily Class Sessions API
* **Goal:** Implement weekly recurring timetable slots (`ClassSchedule`) and daily class instances (`ClassSession`) linked to `ClassTopics`.
* **Dependencies:** Task 2.4.
* **Deliverables:** `backend/apps/sessions/models.py`, serializers, viewsets, `/api/v1/sessions/today/` endpoint.
* **Verification:** Test `/api/v1/sessions/today/` returns accurate today's sessions filtered by student's batch and audience (`all`, `general`, `madrasa`).

---

### Sprint 4: Attendance Engine (Rotating QR & Manual Fallback)

#### Task 4.1: Rotating Signed QR Token Engine
* **Goal:** Implement teacher QR generation endpoint producing time-limited, signed, rotating tokens (refreshing every 30s) and student QR scan endpoint.
* **Dependencies:** Task 3.1.
* **Deliverables:** `backend/apps/attendance/services.py`, `backend/apps/attendance/views.py`.
* **Verification:** Tests validating: on-time scan = `Present`, late scan = `Late`, expired token = rejected, and strict `UNIQUE(session_id, student_id)` enforcement.

#### Task 4.2: Manual Attendance Marking & Audit-Logged Corrections
* **Goal:** Implement manual attendance mark/bulk-mark and correction endpoint with mandatory audit log reason.
* **Dependencies:** Task 4.1.
* **Deliverables:** `backend/apps/attendance/models.py` (`AttendanceRecord`, `AuditLog`).
* **Verification:** Test verifying manual override creates an `AuditLog` entry; teacher cannot edit after 24 hours without coordinator permission.

---

### Sprint 5: Daily Learning Feedback & Help Request Workflow

#### Task 5.1: Daily Learning Feedback API (10–15s flow)
* **Goal:** Implement single-screen feedback submission: 1–5 rating + help toggle, DB-enforced `UNIQUE(session_id, student_id)`.
* **Dependencies:** Task 3.1.
* **Deliverables:** `backend/apps/feedback/models.py` (`LearningFeedback`), endpoints `/api/v1/sessions/{id}/feedback/`.
* **Verification:** Test ensuring student can submit only once per session; duplicate returns `409 Conflict`.

#### Task 5.2: Automated Help Request Pipeline & Teacher Board
* **Goal:** Automatically create `HelpRequest` when feedback has `needs_help=True`; implement teacher resolution endpoint (`Pending` ➔ `In Progress` ➔ `Resolved`).
* **Dependencies:** Task 5.1.
* **Deliverables:** `backend/apps/feedback/models.py` (`HelpRequest`), endpoints `/api/v1/help-requests/`.
* **Verification:** Test verifying help request creation, teacher assignment routing, and status resolution with response note.

#### Task 5.3: Topic Understanding Distribution Analytics
* **Goal:** Compute topic understanding distribution across percentage bands (0–40%, 41–60%, 61–80%, 81–100%) across batches.
* **Dependencies:** Task 5.1.
* **Verification:** Test cross-batch aggregation endpoint `/api/v1/topics/{id}/analytics/`.

---

### Sprint 6: Mobile Application (Expo React Native)

#### Task 6.1: Expo Mobile App Skeleton & Bangla Typography
* **Goal:** Initialize Expo TypeScript project, configure Bangla font (*Hind Siliguri*), i18n localization (Bangla default + English toggle).
* **Deliverables:** `mobile/` directory, font assets, theme configuration.
* **Verification:** App renders in Android emulator with native Hind Siliguri typography.

#### Task 6.2: Student Authentication & Today's Dashboard Screen
* **Goal:** Student login screen with Student ID / phone + password, storing JWT in SecureStore; Home screen showing today's class and attendance status.
* **Dependencies:** Task 6.1, Task 1.2.
* **Verification:** E2E test verifying student login and dashboard rendering.

#### Task 6.3: 10–15s Fast Feedback Screen & QR Scanner
* **Goal:** Build one-screen feedback modal with 5 large emoji rating buttons, Yes/No help toggle, and camera QR scanner for attendance.
* **Dependencies:** Task 6.2, Task 4.1, Task 5.1.
* **Verification:** Feedback submitted in <15 seconds; QR scan records attendance immediately.

#### Task 6.4: My Progress & Notifications Screen
* **Goal:** Build student progress screen showing total attendance %, average understanding, help request resolution statuses.
* **Dependencies:** Task 6.3.
* **Verification:** Displays weekly graph and resolved teacher notes.

---

### Sprint 7: Web Dashboards (Next.js App Router)

#### Task 7.1: Next.js Foundation & Design System Setup
* **Goal:** Initialize Next.js project with App Router, TypeScript, Tailwind CSS, shadcn/ui, Hind Siliguri font, and JWT auth provider.
* **Deliverables:** `web/` directory, auth middleware, layout wrappers.
* **Verification:** Next.js build passes (`npm run build`).

#### Task 7.2: Teacher Web Dashboard
* **Goal:** Build teacher interface: assigned batches overview, live rotating attendance QR display screen, manual attendance sheet, help request board, and Recharts topic understanding distribution bar chart.
* **Dependencies:** Task 7.1, Sprints 3–5.
* **Verification:** Teacher can project QR on classroom screen and resolve student help requests in real-time.

#### Task 7.3: Coordinator & Admin Dashboard
* **Goal:** Build course-scoped coordinator dashboard: batch comparison, teacher assignments, student bulk import (Excel drag-and-drop), and repeated absence alerts.
* **Dependencies:** Task 7.2.
* **Verification:** Coordinator only sees their assigned course data; Excel import populates student list.

---

### Sprint 8: Notifications Engine & Security Hardening

#### Task 8.1: Device Tokens & Firebase Cloud Messaging (FCM) Integration
* **Goal:** Register device tokens via `/api/v1/auth/device-tokens/` and trigger push notifications on class reminder and teacher help response.
* **Dependencies:** Task 1.2, Task 5.2.
* **Verification:** Test verifying push trigger on help request resolution.

#### Task 8.2: End-to-End Security, RBAC & Performance Audit
* **Goal:** Execute comprehensive automated test suite verifying strict server-side RBAC isolation across all 5 roles, database constraint integrity, and sub-second feedback latency.
* **Dependencies:** All previous tasks.
* **Verification:** 100% test pass rate across backend and web builds.
