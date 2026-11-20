# SRS: ASSDI Student Learning Progress, Feedback & Management System

> **Source of truth for all agents.** Derived from the client's 19-page requisition PDF (docs/requirements.pdf, whose Bengali text extracts with broken characters) plus facts from the institute's public website. If this file and the PDF conflict, this file wins.
> Items marked **[ASSUMPTION]** are defaults chosen where the PDF is silent. They must be configurable and confirmed with the client (see section 16).

---

## 1. Overview

**Organization:** As-Sunnah Skill Development Institute (ASSDI), Dhaka, Bangladesh. Established 2022, a project of As-Sunnah Foundation, registered with NSDA (National Skill Development Authority). All courses are residential. Male and female students study on separate campuses.

**Problem:** Teachers have no structured way to know, day by day, what each student understood, who is struggling on which topic, and who needs extra help. Attendance and progress are not monitored in a central, data-driven way.

**Goal:** A centralized system that (1) builds a digital profile per student, (2) collects daily class feedback (understanding rating + help request), (3) tracks attendance, (4) lets teachers see struggling students, (5) gives coordinators and management batch/teacher/course analytics and reports.

**First course:** Small Business Management Course (SBMC). The design must support all other ASSDI courses (IT, culinary, tailoring, welding, electrical, mobile repair, language, etc.) **without schema changes**.

## 2. System parts

| # | Part | Users | Platform |
|---|------|-------|----------|
| A | Student Mobile App | Student | Android (React Native / Expo) |
| B | Teacher Web Dashboard | Teacher | Web, responsive |
| C | Coordinator and Admin Dashboard (incl. Admin Panel) | Super Admin, Coordinator, Management/Observer | Web, responsive |
| D | Backend, Database, REST API | all | Cloud (Django + PostgreSQL) |

All parts talk to one database through one secure REST API.

## 3. Institute context (from the public website)

Use this to shape data and seed data. **Real teacher/student names and phone numbers must never be used in development; use dummy data only.**

- **SBMC:** 3 months, residential, 150 seats per intake, male students aged 18-30, campus: "Kazi Bari Campus", North Badda, Dhaka. Several batches run in parallel (website lists batches 42, 43, 44).
- **Student background:** General, Aliya (madrasa), Qawmi. Background decides which Islamic-basics module a student takes.
- **SBMC curriculum is split into two departments:**
  - *Business Operations:* Microsoft Office; Theoretical and Practical Accounting; Office Administration and Leadership.
  - *Creative:* Graphic Design; Video Editing; Meta Marketing.
  - *Common to all:* English Language; Islamic Basics (separate modules for madrasa and general students). Generative AI tools also appear among the subjects taught.
- **Staff roles on the site:** Cluster Coordinator, Course Coordinator, Senior Teacher, Assistant Teacher, Instructor, Academic Staff, Executive. **One batch has many teachers, one per subject**, so teachers are assigned per subject/class, not as a single teacher per batch.
- **Language:** The institute is Bangla-first; English is secondary.

## 4. Users and roles

| Role | Can do |
|------|--------|
| **Super Admin** | Full system control. Create courses. Create Admin and Coordinator accounts. Manage permissions, system settings, security. |
| **Course Coordinator** | Manage all batches of own course(s). View students and teachers. View daily class progress and help requests. Generate attendance and performance reports. Send follow-up instructions to teachers. |
| **Teacher** | See only own assigned batches. Add daily class and topic. Take and (under allowed rules) correct attendance. See feedback. Receive and resolve help requests. See own batch progress reports. |
| **Student** | Log in to own account. See own schedule/topics. Submit daily feedback and understanding rating. Request teacher help. See own attendance, progress, and teacher responses. |
| **Management / Observer** | Read-only view of reports across courses/batches as permitted. Cannot change any personal data without approval. |

### 4.1 Permission matrix (summary; agents must expand into docs/roles-permissions.md)

| Feature | Super Admin | Coordinator | Teacher | Student | Observer |
|---|---|---|---|---|---|
| Create/edit course, modules | Y | own course (edit) | N | N | N |
| Create Admin/Coordinator accounts | Y | N | N | N | N |
| Manage students (add/edit/deactivate/import/transfer) | Y | Y (own course) | N | N | N |
| Manage batches and teacher assignments | Y | Y (own course) | N | N | N |
| Create/publish class sessions | Y | Y | Y (own batches) | N | N |
| View class schedule/topics | Y | Y | Y | own batch | Y |
| Submit feedback / help request | N | N | N | Y | N |
| View feedback and progress | Y | Y | own batches | own only | Y (aggregate) |
| Manage help requests | Y | view + follow-up | Y (own batches) | view own | view |
| Take attendance | Y | Y | Y (own batches) | scan QR only | N |
| Edit past attendance | Y | Y | only within allowed window | N | N |
| View attendance | Y | Y | own batches | own only | Y |
| Export reports | Y | Y | own batch | N | Y (permitted) |
| Audit log | Y | N | N | N | N |

## 5. Student mobile app: functional requirements

**FR-S1 Login.** Accounts are created by admin only (no self-registration). Login with Student ID / Registration Number + password; OTP as an alternative. Password reset. Profile update limited to approved fields. A student sees only their own data.

**FR-S2 Dashboard.** Student name and ID, course, batch number, today's class, today's attendance status, feedback submission status, overall learning progress, teacher-assistance status, notifications.

**FR-S3 Daily class information.** For the student's own batch only: class date, topic, teacher name, description, learning objectives, start and end time.

**FR-S4 Daily learning feedback (core feature).**
- Shown after each class ends.
- Q1: "How much of today's class did you understand?" Primary input for v1: **rating 1-5** (1 = did not understand, 2 = understood a little, 3 = understood fairly, 4 = understood well, 5 = fully understood).
- Internally map rating to percentage 20/40/60/80/100 for charts. Optional percentage slider (0-100) may be added later: bands 0-20 / 21-40 / 41-60 / 61-80 / 81-100.
- Q2: "Do you need the teacher's help on this topic?" Options: *Yes, I need teacher's help* / *No, I understand*.
- If Yes: a **Help Request** is created automatically and sent to the responsible teacher's dashboard. Optional free-text box (which part was not understood; what needs re-explaining). Text is never mandatory.
- Optional additional feedback (can be Phase 2): pace of class, wants more examples, which part was hard.
- **Must be submittable in 10-15 seconds.**
- **A student can submit only one feedback per class session** (DB-enforced).

**FR-S5 My learning progress.** Total classes, feedback submitted, average understanding, total and resolved help requests, attendance %, weekly progress graph.

**FR-S6 Notifications.** New class added, feedback reminder, teacher replied to help request, new announcement, attendance-related alerts.

**FR-S7 Attendance by QR.** In-app scanner (see section 7).

**FR-S8 Language.** Bangla (default) and English.

**FR-S9 Offline tolerance [ASSUMPTION].** If the network drops while submitting feedback, store locally and sync when online, without creating duplicates.

## 6. Teacher web dashboard: functional requirements

**FR-T1 Overview.** Assigned batches, total students, today's classes, today's present and absent students, feedback submitted, pending feedback, students requiring help.

**FR-T2 Help Request management (very important).** Separate section. Each request shows: student name, student ID, batch, class date, topic, understanding rating, student's message, request time, status. Status flow: **Pending -> In Progress -> Resolved**. Teacher can add a response note; the student gets a notification. Resolved requests record who resolved and when.

**FR-T3 Student-wise progress.** Open any student of own batch: last 7 days and 30 days ratings, topics with problems, number of help requests, number resolved, attendance history.

**FR-T4 Topic-wise analysis.** For a class topic, a chart showing how many students fall in each understanding band (example: 40 students -> 10 in 81-100%, 15 in 61-80%, 10 in 41-60%, 5 in 0-40%), so the teacher knows which topic to re-explain.

**FR-T5 Class management.** Add daily class and topic (within the assigned subject), with description, objectives and times.

**FR-T6 Attendance tools.** Generate QR, manual marking (section 7).

## 7. Attendance module (separate module)

Attendance **must not** be inferred from feedback submission.

**QR attendance flow**
1. Teacher generates a QR for a specific class session from the dashboard.
2. QR is active only for a configured window **[ASSUMPTION: from class start until start + 15 min]**.
3. To prevent QR sharing by photo, the QR payload is a **rotating signed token that refreshes every 30-60 seconds** (teacher screen shows it live); the server validates signature, expiry, session ID, and that the student belongs to the batch.
4. Student scans in the app; server checks Student ID, Class ID, time.
5. Success -> **Present**. Scan after the on-time limit **[ASSUMPTION: later than start + 10 min]** -> **Late**.
6. No scan by class end -> **Absent**, correctable through the approved correction process.
7. Rule: one attendance record per (session, student).

**Manual attendance:** teacher/coordinator can mark Present, Absent, Late, Approved Leave. Every manual change writes an audit log entry (who, old value, new value, reason).

**Attendance percentage [ASSUMPTION, configurable]:** (Present + Late) / (Total sessions - Approved Leave) x 100.

**Reports:** daily, weekly, monthly, individual student, batch-wise, repeated-absence list. Repeated absence threshold **[ASSUMPTION: 3 consecutive or 5 total]**, configurable.

## 8. Coordinator dashboard

Total students, active batches, total teachers, today's classes, overall attendance, overall learning progress, total and pending help requests, batch-wise performance, teacher-wise performance, repeated absence list, students requiring attention.

**Filters:** course, batch, teacher, date range, class topic, attendance status, help-request status.

## 9. Admin panel

- **Students:** add, edit, delete/deactivate, import via Excel/CSV, assign to batch, transfer to another batch. Fields include education background (General/Aliya/Qawmi) and campus.
- **Courses:** create, edit, duration, modules/subjects, activate/deactivate.
- **Departments and subjects** within a course.
- **Batches:** create, batch number, campus, assign teachers per subject, add students, assign schedule, status.
- **Teachers:** add, create account, assign/change batches and subjects, manage permissions.
- **Classes:** add, assign topic, assign teacher, set date and time, publish.
- **Announcements** to a batch or course.

## 10. Reports (PDF and Excel export for each)

1. Daily attendance 2. Daily learning progress 3. Weekly progress 4. Monthly student performance 5. Batch-wise performance 6. Topic-wise understanding 7. Teacher-wise 8. Student help request 9. Repeated absence.

## 11. Notifications (Firebase Cloud Messaging + in-app)

- **Student:** class reminder, feedback reminder, teacher response, announcement.
- **Teacher:** new help request, multiple students need help (same topic), attendance alert, pending feedback summary.
- **Coordinator:** repeated absence, high number of help requests, low batch learning progress, teacher follow-up required.

## 12. Data model (agents must produce full ERD in docs/ERD.md)

Entities from the PDF: Users, Students, Teachers, Courses, Batches, Enrollments, Class Schedules, Class Sessions, Class Topics, Attendance Records, Learning Feedback, Help Requests, Notifications, Announcements, Reports, Audit Logs.

**Required additions (from the real institute):** Departments, Subjects, Campuses, TeacherAssignments (batch + subject + teacher), Batch.batch_number, Student.education_background, Student.campus, Class Session audience (all / general / madrasa) for the Islamic-basics modules.

**Hard constraints**
- Every feedback row links to exactly one student, one class session, and one topic.
- `UNIQUE(class_session, student)` on feedback and on attendance records.
- A help request links to the feedback that created it (nullable only for manually created requests).
- Soft-delete / deactivate users instead of hard delete.
- Adding a new course or batch must need **no schema change**.

## 13. Non-functional and security requirements

- Role-based access control, enforced on the server for every endpoint (not only in the UI).
- HTTPS everywhere; hashed passwords (Argon2/PBKDF2); JWT access + refresh tokens; rate limiting on login and QR scan endpoints.
- Audit log for sensitive actions (attendance edits, role/permission changes, student transfers, deactivation, exports).
- Daily automated database backup, tested restore procedure, documented recovery plan.
- Account deactivation; data privacy (no student data shared or exported without permission).
- Performance: feedback submit < 1 s on a normal mobile connection; dashboards load < 3 s for 1,500 students.
- Scale target: at least 1,500 concurrent enrolled students, 250 staff, many batches.
- All APIs under `/api/v1/` with OpenAPI docs.

## 14. UI/UX requirements

- Simple, clean, mobile-responsive, easy navigation, minimal steps, clear charts.
- **Bangla default + English toggle** (i18n from day one). Bangla font: Hind Siliguri (fallback Noto Sans Bengali).
- Student feedback flow: one screen, big touch targets, 5 emoji-style rating buttons, a single Yes/No toggle, one Submit button.
- Rating colors: 1 red, 2 orange, 3 yellow, 4 light green, 5 green.
- Branding: use the ASSDI logo and colors (see section 18). Calm, respectful visual tone suitable for an Islamic institute; no decorative imagery that conflicts with that.
- Suggested screens, Student app: Login, Home, Feedback, My Progress, Notifications/Profile, QR Scan. Teacher web: Overview, Help Requests board, Attendance, Student Progress, Topic Analysis. Coordinator/Admin: Overview, filters, batch/teacher comparison, management pages, reports.

## 15. Technology (proposed; may be finalized by the development team)

- Backend: Django 5 + Django REST Framework, PostgreSQL, SimpleJWT, drf-spectacular.
- Web: Next.js (App Router, TypeScript, Tailwind, shadcn/ui, Recharts).
- Mobile: Expo React Native (TypeScript), Android release build + testing APK.
- Notifications: Firebase Cloud Messaging.
- Reports: WeasyPrint/ReportLab (PDF), openpyxl (Excel).
- Hosting: VPS with Docker, Nginx, HTTPS (Let's Encrypt); domain and hosting registered in the institute's name.

## 16. Open questions for the client (record answers in docs/open-questions.md)

1. How many minutes after class start counts as Late? How long is the QR active?
2. Attendance percentage formula and who may correct attendance (and until when)?
3. Is the Rating (1-5) or Percentage slider the v1 input? (Default here: Rating.)
4. Can students edit feedback after submitting? Until when? (Default: no.)
5. Feedback window: until midnight of class day, or longer?
6. One teacher per class session, or can several teach together?
7. Are female-campus batches included in the first release?
8. Who creates student accounts and when are Student IDs issued?
9. Should attendance data be exportable for NSDA assessment?
10. Domain/subdomain, hosting provider, Firebase and Google Play accounts: who owns and pays?
11. Repeated-absence and at-risk thresholds.
12. Is hostel/residence attendance in scope (all courses are residential)?

## 17. Scope

**MVP (build first):** Auth and roles; courses/departments/subjects/batches/enrollments; class sessions and topics; student feedback; help requests and teacher help board; attendance (QR + manual); student progress; teacher overview and topic chart; basic coordinator dashboard; notifications (in-app + FCM for help request and feedback reminder); audit log; backups.

**Phase 2:** Full report set with PDF/Excel export; advanced filters; coordinator notifications; announcements; Excel import polish; offline queue.

**Future (do not build now):** At-risk student detection; topic difficulty ranking; individual learning-journey graph; AI-powered feedback insights; multi-course expansion UI.

## 18. Assets and branding

Download the logo and brand assets into `docs/assets/` (see the download instructions in the project README). Known public files:

- `https://assunnahskill.edu.bd/mark.png` (logo mark)
- `https://assunnahskill.edu.bd/logo.png` (full logo, also used as social share image)

Agents must derive the primary/secondary colors **from the logo** and store them as design tokens (CSS variables / theme file). Do not scrape other site images; use plain, text-first UI.

## 19. Seed / demo data specification

`python manage.py seed_demo` creates **dummy-only** data: 1 course (SBMC); 2 departments (Business Operations, Creative); subjects: Microsoft Office, Accounting, Office Administration and Leadership, Graphic Design, Video Editing, Meta Marketing, English, Islamic Basics (General module), Islamic Basics (Madrasa module); 1 campus; 2 batches; 6 teachers (each tied to a subject); 40 students with fake Bengali names, fake phone numbers, mixed education backgrounds; 15 class sessions with topics; sample feedback, help requests and attendance so every dashboard has data. Credentials for each role printed to the console.

## 20. Acceptance criteria (client sign-off)

1. Student logs in to own account.
2. Student sees own daily classes.
3. Student submits feedback (once per class) in 10-15 seconds.
4. Teacher sees and manages help requests (Pending, In Progress, Resolved).
5. Teacher takes attendance (QR and manual).
6. Student sees own attendance.
7. Coordinator sees batch-wise progress.
8. Admin manages students, teachers, batches.
9. Reports export to PDF and Excel.
10. Every role's permissions work correctly (a student cannot read another student's data; a teacher cannot see another teacher's batch).
11. Security and backup checks pass.
12. Source code and documentation handed over.

## 21. Deliverables

Android app (testing APK + release build), web dashboard, admin panel, backend source, mobile source, web source, database schema, API documentation, UI/UX design files, server and deployment docs, admin and teacher user manual, testing report, backup and recovery instructions, third-party account ownership and access, complete handover documentation. Source code, database and student data are owned and controlled by the institute.
