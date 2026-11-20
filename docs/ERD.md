# Database Architecture & Entity Relationship Diagram (ERD)

> **Document Status:** Complete  
> **Source of Truth:** `docs/SRS.md` (Sections 12, 4, 7, 13) + Architectural Updates  
> **Target Database Engine:** PostgreSQL 16+

---

## 1. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ DEVICE_TOKENS : "registers"
    USERS ||--o{ COORDINATOR_COURSE_ASSIGNMENTS : "assigned_to"
    USERS ||--o{ TEACHER_ASSIGNMENTS : "assigned_to"
    USERS ||--o| STUDENTS : "has_profile"
    USERS ||--o{ AUDIT_LOGS : "acts"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ ANNOUNCEMENTS : "publishes"

    CAMPUSES ||--o{ BATCHES : "hosts"
    CAMPUSES ||--o{ STUDENTS : "resides_at"

    COURSES ||--o{ COORDINATOR_COURSE_ASSIGNMENTS : "managed_by"
    COURSES ||--o{ DEPARTMENTS : "contains"
    COURSES ||--o{ SUBJECTS : "includes"
    COURSES ||--o{ BATCHES : "runs"

    DEPARTMENTS ||--o{ SUBJECTS : "organizes"

    SUBJECTS ||--o{ CLASS_TOPICS : "defines_curriculum"
    SUBJECTS ||--o{ TEACHER_ASSIGNMENTS : "taught_by"
    SUBJECTS ||--o{ CLASS_SCHEDULES : "scheduled_in"
    SUBJECTS ||--o{ CLASS_SESSIONS : "conducted_for"

    CLASS_TOPICS ||--o{ CLASS_SESSIONS : "taught_in"
    CLASS_TOPICS ||--o{ LEARNING_FEEDBACKS : "evaluated_in"
    CLASS_TOPICS ||--o{ HELP_REQUESTS : "requested_on"

    BATCHES ||--o{ TEACHER_ASSIGNMENTS : "staffed_with"
    BATCHES ||--o{ ENROLLMENTS : "enrolls"
    BATCHES ||--o{ CLASS_SCHEDULES : "follows"
    BATCHES ||--o{ CLASS_SESSIONS : "conducts"

    STUDENTS ||--o{ ENROLLMENTS : "joins"
    STUDENTS ||--o{ ATTENDANCE_RECORDS : "records"
    STUDENTS ||--o{ LEARNING_FEEDBACKS : "submits"
    STUDENTS ||--o{ HELP_REQUESTS : "requests"

    CLASS_SESSIONS ||--o{ QR_SCAN_TOKENS : "generates"
    CLASS_SESSIONS ||--o{ ATTENDANCE_RECORDS : "tracks"
    CLASS_SESSIONS ||--o{ LEARNING_FEEDBACKS : "collects"
    CLASS_SESSIONS ||--o{ HELP_REQUESTS : "originates"

    LEARNING_FEEDBACKS ||--o| HELP_REQUESTS : "triggers"

    USERS {
        uuid id PK
        varchar login_id UK "student ID or staff username/email"
        varchar email "nullable, optional"
        varchar phone "nullable, optional, dummy in dev"
        varchar password_hash
        varchar full_name
        varchar role "super_admin|coordinator|teacher|student|observer"
        boolean must_change_password "default false"
        boolean is_active
        timestamp soft_deleted_at "nullable"
        timestamp created_at
        timestamp updated_at
    }

    DEVICE_TOKENS {
        bigint id PK
        uuid user_id FK
        text fcm_token UK
        varchar platform "android|ios|web"
        timestamp last_seen_at
        boolean is_active
        timestamp created_at
    }

    CAMPUSES {
        bigint id PK
        varchar name
        varchar code UK
        varchar gender_campus "male|female"
        text address
        boolean is_active
        timestamp created_at
    }

    COURSES {
        bigint id PK
        varchar name
        varchar code UK
        text description
        integer duration_months
        boolean is_active
        timestamp created_at
    }

    COORDINATOR_COURSE_ASSIGNMENTS {
        bigint id PK
        uuid user_id FK
        bigint course_id FK
        timestamp assigned_at
    }

    DEPARTMENTS {
        bigint id PK
        bigint course_id FK
        varchar name
        varchar code
        boolean is_active
    }

    SUBJECTS {
        bigint id PK
        bigint course_id FK
        bigint department_id FK "nullable"
        varchar name
        varchar code
        varchar audience_type "all|general|madrasa"
        boolean is_active
    }

    CLASS_TOPICS {
        bigint id PK
        bigint subject_id FK
        uuid created_by_teacher_id FK "nullable"
        varchar title
        text description
        text learning_objectives
        boolean is_active
        timestamp created_at
    }

    BATCHES {
        bigint id PK
        bigint course_id FK
        bigint campus_id FK
        integer batch_number
        varchar name
        date start_date
        date end_date
        varchar status "upcoming|active|completed"
        timestamp created_at
    }

    TEACHER_ASSIGNMENTS {
        bigint id PK
        bigint batch_id FK
        bigint subject_id FK
        uuid teacher_user_id FK
        boolean is_primary
        timestamp assigned_at
    }

    STUDENTS {
        bigint id PK
        uuid user_id FK UK
        varchar student_id_number UK
        varchar registration_no UK
        varchar education_background "General|Aliya|Qawmi"
        bigint campus_id FK
        varchar guardian_phone
        varchar status "active|dropped|transferred"
        timestamp created_at
    }

    ENROLLMENTS {
        bigint id PK
        bigint student_id FK
        bigint batch_id FK
        timestamp enrolled_at
        varchar status "active|completed|transferred"
    }

    CLASS_SCHEDULES {
        bigint id PK
        bigint batch_id FK
        bigint subject_id FK
        uuid teacher_user_id FK
        integer day_of_week "0=Sun..6=Sat"
        time start_time
        time end_time
        varchar room
        date valid_from "nullable"
        date valid_to "nullable"
        boolean is_active
    }

    CLASS_SESSIONS {
        bigint id PK
        bigint batch_id FK
        bigint subject_id FK
        bigint topic_id FK "nullable"
        uuid teacher_user_id FK
        bigint schedule_id FK "nullable"
        date session_date
        time start_time
        time end_time
        varchar audience "all|general|madrasa"
        varchar status "draft|published|cancelled"
        timestamp published_at "nullable"
        text cancel_reason "nullable"
        uuid created_by_id FK "nullable"
        timestamp created_at
    }

    QR_SCAN_TOKENS {
        bigint id PK
        bigint session_id FK
        varchar token_hash UK
        timestamp issued_at
        timestamp expires_at
        boolean is_revoked
    }

    ATTENDANCE_RECORDS {
        bigint id PK
        bigint session_id FK
        bigint student_id FK
        varchar status "present|late|absent|approved_leave"
        varchar method "qr|manual|auto_absent"
        uuid marked_by_id FK "nullable"
        text reason "mandatory on manual"
        timestamp marked_at
        timestamp updated_at
    }

    LEARNING_FEEDBACKS {
        bigint id PK
        bigint session_id FK
        bigint student_id FK
        bigint topic_id FK
        integer understanding_rating "1-5"
        boolean needs_help
        text student_comment "nullable"
        timestamp submitted_at
    }

    HELP_REQUESTS {
        bigint id PK
        bigint feedback_id FK UK "nullable"
        bigint student_id FK
        uuid teacher_user_id FK
        bigint session_id FK
        bigint topic_id FK
        text student_message "nullable"
        text teacher_note "nullable"
        varchar status "Pending|In_Progress|Resolved"
        timestamp resolved_at "nullable"
        uuid resolved_by_user_id FK "nullable"
        timestamp created_at
        timestamp updated_at
    }

    NOTIFICATIONS {
        bigint id PK
        uuid recipient_user_id FK
        varchar title
        text body
        varchar notification_type
        jsonb data_payload
        boolean is_read
        timestamp read_at "nullable"
        timestamp created_at
    }

    ANNOUNCEMENTS {
        bigint id PK
        uuid author_user_id FK
        varchar scope "Global|Course|Batch"
        bigint target_id "nullable"
        varchar title
        text content
        timestamp published_at
        boolean is_active
    }

    AUDIT_LOGS {
        bigint id PK
        uuid actor_user_id FK "nullable"
        varchar action
        varchar entity_name
        varchar entity_id
        jsonb old_values "nullable"
        jsonb new_values "nullable"
        varchar ip_address "nullable"
        timestamp created_at
    }
```

---

## 2. Hard Database Constraints & Rules

1. **Attendance Uniqueness (SRS Rule 2):**
   ```sql
   ALTER TABLE attendance_records 
   ADD CONSTRAINT uq_attendance_session_student UNIQUE (session_id, student_id);
   ```
2. **Feedback Uniqueness (SRS Rule 2):**
   ```sql
   ALTER TABLE learning_feedbacks 
   ADD CONSTRAINT uq_feedback_session_student UNIQUE (session_id, student_id);
   ```
3. **Coordinator Course Scoping (User Change 2):**
   ```sql
   ALTER TABLE coordinator_course_assignments 
   ADD CONSTRAINT uq_coord_course UNIQUE (user_id, course_id);
   ```
4. **Curriculum-Level Topics (User Change 1):**
   `class_topics` is tied directly to `subject_id`, decoupling it from a single batch session. `class_sessions.topic_id` points to `class_topics.id`. This enables comparing topic understanding curves across multiple batches (e.g., Batch 42 vs 43 vs 44).
5. **Teacher Assignment Uniqueness:**
   ```sql
   ALTER TABLE teacher_assignments 
   ADD CONSTRAINT uq_batch_subject_teacher UNIQUE (batch_id, subject_id, teacher_user_id);
   ```
6. **Enrollment Uniqueness (Partial Unique Index):**
   ```sql
   CREATE UNIQUE INDEX uq_active_enrollment_per_student 
   ON enrollments (student_id) WHERE status = 'active';
   ```
7. **Audience-Aware Batch Overlap Rule:**
   Two sessions for the same batch cannot overlap in time on the same date UNLESS their audiences do not intersect:
   - `'all'` intersects with all (`'all'`, `'general'`, `'madrasa'`).
   - `'general'` and `'madrasa'` do NOT intersect with each other, allowing parallel Islamic Basics classes for General and Madrasa cohorts at the same time.
8. **Strict Teacher Overlap Invariant:**
   One teacher cannot be scheduled or assigned to two non-cancelled sessions that overlap in time on the same date, across any batches or audiences.
9. **Weekday Convention:**
   Standard ASSDI academic weekday mapping starts on Sunday (Bangladesh academic week):
   `0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday`.
   Formula from Python's standard `date.weekday()` (where Monday is 0): `day_of_week = (d.weekday() + 1) % 7`.
10. **Session Visibility Invariant:**
    Students and Observers can ONLY see sessions with `status = 'published'` OR `(status = 'cancelled' AND published_at IS NOT NULL)`. Drafts and cancelled sessions that were never published are strictly hidden.
11. **Feedback Partial Uniqueness for Offline Idempotency:**
    ```sql
    CREATE UNIQUE INDEX uq_learning_feedback_client_sub_id 
    ON learning_feedbacks (client_submission_id) WHERE client_submission_id IS NOT NULL;
    ```
12. **Help Request Forward-Only Lifecycle:**
    Transitions strictly follow: `pending` -> `in_progress` -> `resolved`. Direct jumps or backwards transitions are blocked. Resolving requires optional `teacher_note`, sets `resolved_at`, records `resolved_by`, and generates an `AuditLog` entry.
13. **Observer Access Restriction to Aggregates:**
    Observers are strictly restricted to aggregate analytics (`feedback-summary` and `topics/{id}/understanding/`). Individual feedback rows, help requests, and individual student progress metrics return HTTP 403 Forbidden.

---

## 3. Data Dictionary & Table Definitions

### 3.1 `users`
Core authentication table. Extended Django AbstractBaseUser model using UUID primary keys.
* `id` (UUID, PK, default `gen_random_uuid()`): Unique user ID.
* `login_id` (VARCHAR(100), UNIQUE, NOT NULL, INDEX): Primary login identifier (`USERNAME_FIELD`). Students log in with Student ID / Registration No, staff log in with staff ID or email.
* `email` (VARCHAR(255), NULL, blank=True): Optional email for notifications or email-based password reset.
* `phone` (VARCHAR(32), NULL, blank=True): Optional phone number (dummy numbers in dev).
* `password_hash` (VARCHAR(255)): PBKDF2 / Argon2 hashed password.
* `full_name` (VARCHAR(150)): User's display name.
* `role` (VARCHAR(20), NOT NULL): Enum `['super_admin', 'coordinator', 'teacher', 'student', 'observer']`.
* `must_change_password` (BOOLEAN, default FALSE): Set to TRUE when admin resets password; user must change it at next login.
* `is_active` (BOOLEAN, default TRUE): Deactivated users cannot log in.
* `soft_deleted_at` (TIMESTAMP WITH TIME ZONE, NULL): Deletion timestamp for soft deletes.
* `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE).

### 3.2 `device_tokens` (Push Notifications)
Stores Firebase Cloud Messaging (FCM) device registration tokens.
* `id` (BIGINT, PK, GENERATED ALWAYS AS IDENTITY).
* `user_id` (UUID, FK -> `users.id`, ON DELETE CASCADE).
* `fcm_token` (TEXT, UNIQUE, NOT NULL).
* `platform` (VARCHAR(20), NOT NULL): `'android'`, `'ios'`, `'web'`.
* `last_seen_at` (TIMESTAMP WITH TIME ZONE, default NOW()).
* `is_active` (BOOLEAN, default TRUE).
* `created_at` (TIMESTAMP WITH TIME ZONE, default NOW()).

### 3.3 `campuses`
Represents physical campus facilities.
* `id` (BIGINT, PK).
* `name` (VARCHAR(100), NOT NULL): e.g., "Kazi Bari Campus".
* `code` (VARCHAR(20), UNIQUE, NOT NULL): e.g., "KBC-NB".
* `gender_campus` (VARCHAR(10), NOT NULL): `'male'` or `'female'`.
* `address` (TEXT): North Badda, Dhaka.
* `is_active` (BOOLEAN, default TRUE).

### 3.4 `courses`
Curriculum courses. Designed for zero-schema-change multi-course expansion.
* `id` (BIGINT, PK).
* `name` (VARCHAR(150), NOT NULL): e.g., "Small Business Management Course (SBMC)".
* `code` (VARCHAR(20), UNIQUE, NOT NULL): e.g., "SBMC".
* `description` (TEXT).
* `duration_months` (INTEGER, NOT NULL): e.g., 3.
* `is_active` (BOOLEAN, default TRUE).

### 3.5 `coordinator_course_assignments`
Enforces coordinator course-level scoping.
* `id` (BIGINT, PK).
* `user_id` (UUID, FK -> `users.id`, ON DELETE CASCADE).
* `course_id` (BIGINT, FK -> `courses.id`, ON DELETE CASCADE).
* `assigned_at` (TIMESTAMP WITH TIME ZONE, default NOW()).
* *Constraint:* `UNIQUE(user_id, course_id)`.

### 3.6 `departments`
Departments within a course (e.g., Business Operations, Creative).
* `id` (BIGINT, PK).
* `course_id` (BIGINT, FK -> `courses.id`, ON DELETE CASCADE).
* `name` (VARCHAR(100), NOT NULL): e.g., "Business Operations".
* `code` (VARCHAR(30), NOT NULL): e.g., "BIZ-OPS".
* `is_active` (BOOLEAN, default TRUE).

### 3.7 `subjects`
Subjects taught within a department or common to the course.
* `id` (BIGINT, PK).
* `course_id` (BIGINT, FK -> `courses.id`, ON DELETE CASCADE).
* `department_id` (BIGINT, FK -> `departments.id`, ON DELETE SET NULL, NULL): NULL for common subjects (e.g., English, Islamic Basics).
* `name` (VARCHAR(100), NOT NULL): e.g., "Meta Marketing", "Islamic Basics (Madrasa)".
* `code` (VARCHAR(30), NOT NULL): e.g., "MKTG-101".
* `audience_type` (VARCHAR(20), default `'all'`): `'all'`, `'general'`, `'madrasa'`.
* `is_active` (BOOLEAN, default TRUE).

### 3.8 `class_topics` (Curriculum-Level)
Curriculum topics decoupled from sessions for cross-batch comparative analytics.
* `id` (BIGINT, PK).
* `subject_id` (BIGINT, FK -> `subjects.id`, ON DELETE CASCADE).
* `created_by_teacher_id` (UUID, FK -> `users.id`, ON DELETE SET NULL, NULL): Teacher who added this topic.
* `title` (VARCHAR(200), NOT NULL): e.g., "Facebook Pixel & Conversion API Setup".
* `description` (TEXT).
* `learning_objectives` (TEXT).
* `is_active` (BOOLEAN, default TRUE).
* `created_at` (TIMESTAMP WITH TIME ZONE, default NOW()).

### 3.9 `batches`
An intake cohort for a course at a campus.
* `id` (BIGINT, PK).
* `course_id` (BIGINT, FK -> `courses.id`, ON DELETE RESTRICT).
* `campus_id` (BIGINT, FK -> `campuses.id`, ON DELETE RESTRICT).
* `batch_number` (INTEGER, NOT NULL): e.g., 42, 43, 44.
* `name` (VARCHAR(100), NOT NULL): e.g., "SBMC Batch 42".
* `start_date` (DATE, NOT NULL).
* `end_date` (DATE, NOT NULL).
* `status` (VARCHAR(20), default `'upcoming'`): `'upcoming'`, `'active'`, `'completed'`.
* `created_at` (TIMESTAMP WITH TIME ZONE, default NOW()).

### 3.10 `teacher_assignments`
Assigns teachers to subjects within a specific batch.
* `id` (BIGINT, PK).
* `batch_id` (BIGINT, FK -> `batches.id`, ON DELETE CASCADE).
* `subject_id` (BIGINT, FK -> `subjects.id`, ON DELETE CASCADE).
* `teacher_user_id` (UUID, FK -> `users.id`, ON DELETE RESTRICT).
* `is_primary` (BOOLEAN, default TRUE).
* `assigned_at` (TIMESTAMP WITH TIME ZONE, default NOW()).
* *Constraint:* `UNIQUE(batch_id, subject_id, teacher_user_id)`.

### 3.11 `students`
Student profile linking to User account.
* `id` (BIGINT, PK).
* `user_id` (UUID, FK -> `users.id`, ON DELETE CASCADE, UNIQUE).
* `student_id_number` (VARCHAR(50), UNIQUE, NOT NULL): e.g., "STD-2026-042-001".
* `registration_no` (VARCHAR(50), UNIQUE, NOT NULL).
* `education_background` (VARCHAR(20), NOT NULL): `'General'`, `'Aliya'`, `'Qawmi'`.
* `campus_id` (BIGINT, FK -> `campuses.id`, ON DELETE RESTRICT).
* `guardian_phone` (VARCHAR(32), NULL): Dummy number in dev.
* `status` (VARCHAR(20), default `'active'`): `'active'`, `'dropped'`, `'transferred'`.
* `created_at` (TIMESTAMP WITH TIME ZONE, default NOW()).

### 3.12 `enrollments`
Links a student to a batch.
* `id` (BIGINT, PK).
* `student_id` (BIGINT, FK -> `students.id`, ON DELETE CASCADE).
* `batch_id` (BIGINT, FK -> `batches.id`, ON DELETE CASCADE).
* `enrolled_at` (TIMESTAMP WITH TIME ZONE, default NOW()).
* `status` (VARCHAR(20), default `'active'`): `'active'`, `'completed'`, `'transferred'`.
* *Constraint:* `UNIQUE(student_id, batch_id)`.

### 3.13 `class_schedules`
Weekly recurring timetable slot.
* `id` (BIGINT, PK).
* `batch_id` (BIGINT, FK -> `batches.id`, ON DELETE CASCADE).
* `subject_id` (BIGINT, FK -> `subjects.id`, ON DELETE CASCADE).
* `teacher_user_id` (UUID, FK -> `users.id`, ON DELETE RESTRICT).
* `day_of_week` (SMALLINT, NOT NULL): 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday.
* `start_time` (TIME, NOT NULL).
* `end_time` (TIME, NOT NULL).
* `room` (VARCHAR(50), default "").
* `valid_from` (DATE, NULL).
* `valid_to` (DATE, NULL).
* `is_active` (BOOLEAN, default TRUE).

### 3.14 `class_sessions`
A concrete class instance on a specific calendar date.
* `id` (BIGINT, PK).
* `batch_id` (BIGINT, FK -> `batches.id`, ON DELETE RESTRICT).
* `subject_id` (BIGINT, FK -> `subjects.id`, ON DELETE RESTRICT).
* `topic_id` (BIGINT, FK -> `class_topics.id`, ON DELETE RESTRICT, NULL).
* `teacher_user_id` (UUID, FK -> `users.id`, ON DELETE RESTRICT).
* `schedule_id` (BIGINT, FK -> `class_schedules.id`, ON DELETE SET NULL, NULL).
* `session_date` (DATE, NOT NULL, INDEX).
* `start_time` (TIME, NOT NULL).
* `end_time` (TIME, NOT NULL).
* `description` (TEXT, default "").
* `learning_objectives` (TEXT, default "").
* `audience` (VARCHAR(20), default `'all'`): `'all'`, `'general'`, `'madrasa'`.
* `status` (VARCHAR(20), default `'draft'`): `'draft'`, `'published'`, `'cancelled'`.
* `published_at` (TIMESTAMP WITH TIME ZONE, NULL): Set upon first publication.
* `cancel_reason` (TEXT, default ""): Required explanation when session is cancelled.
* `created_by_id` (UUID, FK -> `users.id`, ON DELETE SET NULL, NULL).
* `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE).

### 3.15 `qr_scan_tokens`
Time-limited rotating signed tokens for QR attendance.
* `id` (BIGINT, PK).
* `session_id` (BIGINT, FK -> `class_sessions.id`, ON DELETE CASCADE).
* `token_hash` (VARCHAR(128), UNIQUE, NOT NULL): SHA-256 hash of signed token payload.
* `issued_at` (TIMESTAMP WITH TIME ZONE, NOT NULL).
* `expires_at` (TIMESTAMP WITH TIME ZONE, NOT NULL).
* `is_revoked` (BOOLEAN, default FALSE).

### 3.16 `attendance_records`
Daily attendance per student per session.
* `id` (BIGINT, PK).
* `session_id` (BIGINT, FK -> `class_sessions.id`, ON DELETE RESTRICT).
* `student_id` (BIGINT, FK -> `students.id`, ON DELETE RESTRICT).
* `status` (VARCHAR(20), NOT NULL): `'present'`, `'late'`, `'absent'`, `'approved_leave'`.
* `method` (VARCHAR(20), NOT NULL): `'qr'`, `'manual'`, `'auto_absent'`.
* `marked_by` (UUID, FK -> `users.id`, ON DELETE SET NULL, NULL): NULL if student scanned QR.
* `reason` (TEXT, default ''): Mandatory explanation when marked or corrected manually.
* `marked_at` (TIMESTAMP WITH TIME ZONE, default NOW()).
* `updated_at` (TIMESTAMP WITH TIME ZONE, auto NOW()).
* *Constraint:* `UNIQUE(session_id, student_id)` (`uq_attendance_session_student`).
* *Indexes:* `(session_id, status)`, `(student_id, status)`, `(marked_at)`.

### 3.17 `learning_feedbacks`
Daily 10–15s student feedback.
* `id` (BIGINT, PK).
* `session_id` (BIGINT, FK -> `class_sessions.id`, ON DELETE RESTRICT).
* `student_id` (BIGINT, FK -> `students.id`, ON DELETE RESTRICT).
* `topic_id` (BIGINT, FK -> `class_topics.id`, ON DELETE RESTRICT).
* `understanding_rating` (SMALLINT, NOT NULL): 1 (Poor) to 5 (Full).
* `needs_help` (BOOLEAN, NOT NULL, default FALSE): Triggers help request if TRUE.
* `student_comment` (TEXT, NULL): Optional free text.
* `client_submission_id` (UUID, NULL): Client-generated UUID for offline safe idempotency.
* `submitted_at` (TIMESTAMP WITH TIME ZONE, default NOW()).
* *Constraint:* `UNIQUE(session_id, student_id)`.
* *Constraint:* `UNIQUE(client_submission_id) WHERE client_submission_id IS NOT NULL`.

### 3.18 `help_requests`
Teacher assistance requests triggered by feedback or manual student action.
* `id` (BIGINT, PK).
* `feedback_id` (BIGINT, FK -> `learning_feedbacks.id`, ON DELETE CASCADE, UNIQUE, NULL).
* `student_id` (BIGINT, FK -> `students.id`, ON DELETE CASCADE).
* `teacher_user_id` (UUID, FK -> `users.id`, ON DELETE RESTRICT): Assigned teacher responsible for this subject.
* `session_id` (BIGINT, FK -> `class_sessions.id`, ON DELETE CASCADE).
* `topic_id` (BIGINT, FK -> `class_topics.id`, ON DELETE RESTRICT).
* `student_message` (TEXT, NULL).
* `teacher_note` (TEXT, NULL): Teacher's follow-up or resolution note.
* `status` (VARCHAR(20), default `'Pending'`): `'Pending'`, `'In_Progress'`, `'Resolved'`.
* `resolved_at` (TIMESTAMP WITH TIME ZONE, NULL).
* `resolved_by_user_id` (UUID, FK -> `users.id`, ON DELETE SET NULL, NULL).
* `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE).

### 3.19 `notifications`
In-app and push notification log.
* `id` (BIGINT, PK).
* `recipient_user_id` (UUID, FK -> `users.id`, ON DELETE CASCADE).
* `title` (VARCHAR(200), NOT NULL).
* `body` (TEXT, NOT NULL).
* `notification_type` (VARCHAR(50), NOT NULL): `'help_reply'`, `'attendance_alert'`, `'class_reminder'`, `'announcement'`.
* `data_payload` (JSONB, default `'{}'`).
* `is_read` (BOOLEAN, default FALSE).
* `read_at` (TIMESTAMP WITH TIME ZONE, NULL).
* `created_at` (TIMESTAMP WITH TIME ZONE, default NOW()).

### 3.20 `announcements`
Broadcast notices.
* `id` (BIGINT, PK).
* `author_user_id` (UUID, FK -> `users.id`, ON DELETE RESTRICT).
* `scope` (VARCHAR(20), NOT NULL): `'Global'`, `'Course'`, `'Batch'`.
* `target_id` (BIGINT, NULL): course_id or batch_id depending on scope.
* `title` (VARCHAR(250), NOT NULL).
* `content` (TEXT, NOT NULL).
* `published_at` (TIMESTAMP WITH TIME ZONE, default NOW()).
* `is_active` (BOOLEAN, default TRUE).

### 3.21 `audit_logs`
Immutable record of sensitive operations.
* `id` (BIGINT, PK).
* `actor_user_id` (UUID, FK -> `users.id`, ON DELETE SET NULL, NULL).
* `action` (VARCHAR(100), NOT NULL): e.g., `'ATTENDANCE_CORRECTION'`, `'STUDENT_BATCH_TRANSFER'`.
* `entity_name` (VARCHAR(100), NOT NULL).
* `entity_id` (VARCHAR(100), NOT NULL).
* `old_values` (JSONB, NULL).
* `new_values` (JSONB, NULL).
* `ip_address` (VARCHAR(45), NULL).
* `created_at` (TIMESTAMP WITH TIME ZONE, default NOW()).
