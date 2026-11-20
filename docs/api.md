# REST API Specification (`/api/v1/`)

> **Document Status:** Complete  
> **Source of Truth:** `docs/SRS.md` + `AGENTS.md`  
> **Specification Standard:** OpenAPI 3.0 / drf-spectacular compatible  
> **Authentication:** SimpleJWT Bearer Token (`Authorization: Bearer <access_token>`)

---

## 1. Global Conventions & Standard Responses

### Base URL: `/api/v1`

### Standard Error Response Shape:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | PERMISSION_DENIED | CONFLICT",
    "message": "Human-readable description of error in English",
    "details": {}
  }
}
```

### Standard Success Response Wrapper:
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-11-20T17:45:00Z"
  }
}
```

---

## 2. Authentication & Device Tokens (`/auth`)

### 2.1 Login
* **POST** `/auth/login/`
* **Roles:** Public / Unauthenticated
* **Throttling:** 
  - Per-`login_id`: 5 failed attempts per 5 minutes lockout.
  - Per-IP: Generous limit (e.g. 100 requests/min) to accommodate shared campus Wi-Fi.
* **Request Body:**
  ```json
  {
    "login_id": "STD-2026-042-001", // Student ID / Reg No for students, staff ID / email for staff
    "password": "SecurePassword123#"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "access": "eyJhbGciOi...",
      "refresh": "eyJhbGciOi...",
      "user": {
        "id": "e4b2d308-417d-4df9-873f-5d15a513cfd1",
        "login_id": "STD-2026-042-001",
        "full_name": "Rahim Ahmed",
        "role": "student",
        "email": null,
        "phone": "01700000001",
        "must_change_password": false,
        "student_profile": {
          "id": 101,
          "student_id_number": "STD-2026-042-001",
          "batch_id": 42,
          "batch_name": "SBMC Batch 42",
          "campus_name": "Kazi Bari Campus"
        }
      }
    }
  }
  ```

### 2.2 Token Refresh
* **POST** `/auth/refresh/`
* **Roles:** Public
* **Request Body:** `{"refresh": "eyJhbGciOi..."}`
* **Success Response (200 OK):** `{"access": "eyJhbGciOi..."}`

### 2.3 Logout (Token Blacklist)
* **POST** `/auth/logout/`
* **Roles:** All Authenticated
* **Request Body:** `{"refresh": "eyJhbGciOi..."}`
* **Success Response (200 OK):** `{"success": true, "message": "Successfully logged out. Refresh token blacklisted."}`

### 2.4 Password Reset (Path A: Email-based)
* **POST** `/auth/password-reset/email/`
* **Roles:** Public
* **Request Body:** `{"email": "staff@assunnahskill.edu.bd"}`
* **Success Response (200 OK):** `{"success": true, "message": "If this email exists, a password reset link has been dispatched."}`

### 2.5 Password Reset Confirm
* **POST** `/auth/password-reset/confirm/`
* **Roles:** Public
* **Request Body:**
  ```json
  {
    "token": "reset_token_string",
    "uidb64": "user_id_b64",
    "new_password": "NewSecurePassword123#"
  }
  ```
* **Success Response (200 OK):** `{"success": true, "message": "Password reset successful."}`

### 2.6 Admin-Initiated Temporary Password Reset (Path B)
* **POST** `/auth/admin-reset-password/`
* **Roles:** `super_admin`, `coordinator` (for students in own course)
* **Description:** Used when students do not possess an email. Sets a temporary password and flags `must_change_password = True`.
* **Request Body:**
  ```json
  {
    "user_id": "e4b2d308-417d-4df9-873f-5d15a513cfd1",
    "temporary_password": "TempPassword2026#"
  }
  ```
* **Success Response (200 OK):** `{"success": true, "message": "Temporary password set. User must change password at next login."}`

### 2.7 Change Password (User / Mandatory)
* **POST** `/auth/change-password/`
* **Roles:** All Authenticated
* **Request Body:**
  ```json
  {
    "old_password": "TempPassword2026#",
    "new_password": "MyPermanentPassword123#"
  }
  ```
* **Success Response (200 OK):** `{"success": true, "message": "Password changed successfully. must_change_password cleared."}`

### 2.8 Current User Profile
* **GET** `/auth/me/`
* **Roles:** All Authenticated (`super_admin`, `coordinator`, `teacher`, `student`, `observer`)
* **Success Response (200 OK):** Returns current user profile with role, `must_change_password`, and role-specific assignments.

### 2.9 Register / Update Device Token (FCM)
* **POST** `/auth/device-tokens/`
* **Roles:** All Authenticated
* **Request Body:**
  ```json
  {
    "fcm_token": "fcm_token_string_from_firebase_sdk...",
    "platform": "android" // "android" | "ios" | "web"
  }
  ```
* **Success Response (201 Created):** `{"success": true, "message": "Device token registered."}`

---

## 3. Academic Structure & Course Management (`/courses`, `/campuses`)

### 3.1 List Courses
* **GET** `/courses/`
* **Roles:** All Authenticated (Coordinator sees assigned via `coordinator_course_assignments`; Teacher/Student see own enrolled course).
* **Success Response (200 OK):** List of courses with departments and duration.

### 3.2 Create Course
* **POST** `/courses/`
* **Roles:** `super_admin` only
* **Request Body:**
  ```json
  {
    "name": "Small Business Management Course (SBMC)",
    "code": "SBMC",
    "description": "3-month residential business management course",
    "duration_months": 3
  }
  ```

### 3.3 Assign Coordinator to Course
* **POST** `/courses/{id}/coordinators/`
* **Roles:** `super_admin` only
* **Request Body:** `{"user_id": "uuid-of-coordinator"}`
* **Success Response (201 Created):** Created entry in `coordinator_course_assignments`.

### 3.4 Manage Departments & Subjects
* **POST** `/courses/{course_id}/departments/` (Roles: `super_admin`, `coordinator` [own course])
* **POST** `/courses/{course_id}/subjects/` (Roles: `super_admin`, `coordinator` [own course])
* **Request Body for Subject:**
  ```json
  {
    "name": "Meta Marketing",
    "code": "MKTG-101",
    "department_id": 2, // optional, null for common subjects
    "audience_type": "all" // "all" | "general" | "madrasa"
  }
  ```

---

## 4. Curriculum Topics (`/topics`)

### 4.1 List Topics by Subject
* **GET** `/subjects/{subject_id}/topics/`
* **Roles:** All Authenticated (Scoped by course/subject visibility)
* **Success Response (200 OK):** List of curriculum topics under the subject.

### 4.2 Create Curriculum Topic
* **POST** `/subjects/{subject_id}/topics/`
* **Roles:** `super_admin`, `coordinator` (own course), `teacher` (assigned to this subject)
* **Request Body:**
  ```json
  {
    "title": "Facebook Conversion API and Server-Side Tracking",
    "description": "Deep dive into setup with Meta Business Manager",
    "learning_objectives": "1. Understand CAPI vs Pixel. 2. Implement test event."
  }
  ```
* **Success Response (201 Created):** Created record in `class_topics`.

---

## 5. Batches & Staff Allocations (`/batches`)

### 5.1 Create Batch
* **POST** `/batches/`
* **Roles:** `super_admin`, `coordinator` (own course)
* **Request Body:**
  ```json
  {
    "course_id": 1,
    "campus_id": 1,
    "batch_number": 42,
    "name": "SBMC Batch 42",
    "start_date": "2026-11-01",
    "end_date": "2027-01-31"
  }
  ```

### 5.2 Assign Teacher to Batch & Subject
* **POST** `/batches/{batch_id}/teachers/`
* **Roles:** `super_admin`, `coordinator` (own course)
* **Request Body:**
  ```json
  {
    "subject_id": 4,
    "teacher_user_id": "uuid-of-teacher",
    "is_primary": true
  }
  ```

---

## 6. Students Management (`/students`)

### 6.1 List Students
* **GET** `/students/?batch_id=42&search=Rahim`
* **Roles:** `super_admin`, `coordinator` (own course), `teacher` (own batches), `observer` (RO)

### 6.2 Add Single Student
* **POST** `/students/`
* **Roles:** `super_admin`, `coordinator` (own course)
* **Request Body:**
  ```json
  {
    "full_name": "Abdullah Al Mamun",
    "phone": "01711000002",
    "password": "InitialPassword123#",
    "student_id_number": "STD-2026-042-015",
    "registration_no": "REG-2026-015",
    "education_background": "Qawmi", // "General" | "Aliya" | "Qawmi"
    "campus_id": 1,
    "batch_id": 42
  }
  ```

### 6.3 Bulk Import Students (Excel / CSV)
* **POST** `/students/bulk-import/`
* **Roles:** `super_admin`, `coordinator` (own course)
* **Content-Type:** `multipart/form-data` (file = .xlsx / .csv)
* **Success Response (200 OK):**
  ```json
  {
    "total_rows": 50,
    "imported_count": 50,
    "failed_rows": []
  }
  ```

### 6.4 Student My Learning Progress
* **GET** `/students/me/progress/`
* **Roles:** `student` (own record only)
* **Success Response (200 OK):**
  ```json
  {
    "total_classes": 24,
    "attendance_percentage": 95.8,
    "feedback_submitted_count": 24,
    "average_understanding": 4.25,
    "total_help_requests": 3,
    "resolved_help_requests": 3,
    "weekly_progress": [
      {"week": "Week 1", "avg_rating": 4.5},
      {"week": "Week 2", "avg_rating": 4.0}
    ]
  }
  ```

---

## 7. Class Sessions & Timetables (`/sessions`)

### 7.1 Today's Sessions (Student App & Teacher Dashboard)
* **GET** `/sessions/today/`
* **Roles:** `student` (returns today's sessions for student's batch & audience), `teacher` (returns today's sessions assigned to teacher).
* **Success Response (200 OK):**
  ```json
  [
    {
      "id": 501,
      "subject_name": "Meta Marketing",
      "topic": {
        "id": 12,
        "title": "Facebook Pixel Setup",
        "objectives": "Install base code and standard events."
      },
      "teacher_name": "Master Trainer Hasan",
      "start_time": "10:00:00",
      "end_time": "12:00:00",
      "status": "in_progress",
      "has_submitted_feedback": false,
      "attendance_status": "Present"
    }
  ]
  ```

### 7.2 Create Class Session
* **POST** `/sessions/`
* **Roles:** `super_admin`, `coordinator` (own course), `teacher` (own assigned batch/subject)
* **Request Body:**
  ```json
  {
    "batch_id": 42,
    "subject_id": 4,
    "topic_id": 12,
    "session_date": "2026-11-21",
    "start_time": "10:00:00",
    "end_time": "12:00:00",
    "audience": "all"
  }
  ```

---

## 8. Attendance Management (`/attendance`)

### 8.1 Generate Rotating QR Code Token
* **POST** `/sessions/{session_id}/attendance/qr-token/`
* **Roles:** `teacher` (assigned to this session), `coordinator`, `super_admin`
* **Success Response (200 OK):**
  ```json
  {
    "token": "signed_jwt_or_hmac_rotating_string",
    "expires_at": "2026-11-21T10:00:45Z",
    "refresh_interval_seconds": 30
  }
  ```

### 8.2 Scan QR Code (Student App)
* **POST** `/attendance/scan/`
* **Roles:** `student`
* **Request Body:**
  ```json
  {
    "qr_token": "signed_jwt_or_hmac_rotating_string"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "status": "Present", // Or "Late" if scanned after on-time limit
    "scanned_at": "2026-11-21T10:04:12Z"
  }
  ```
* **Error Response (409 Conflict):** If already recorded for this session.

### 8.3 Manual Attendance Entry (Individual or Bulk)
* **POST** `/sessions/{session_id}/attendance/manual/`
* **Roles:** `super_admin`, `coordinator`, `teacher` (own batch)
* **Request Body:**
  ```json
  {
    "records": [
      {"student_id": 101, "status": "Present"},
      {"student_id": 102, "status": "Absent"},
      {"student_id": 103, "status": "Approved_Leave"}
    ]
  }
  ```

### 8.4 Attendance Correction (With Audit Reason)
* **PATCH** `/attendance/{id}/correct/`
* **Roles:** `super_admin`, `coordinator`, `teacher` (within 24-hour window)
* **Request Body:**
  ```json
  {
    "status": "Present",
    "reason": "Student had network disconnection during QR scan; verified physically."
  }
  ```

---

## 9. Daily Learning Feedback (`/feedback`)

### 9.1 Submit Daily Feedback (Student Only)
* **POST** `/sessions/{session_id}/feedback/`
* **Roles:** `student` (Must be enrolled in session's batch)
* **Constraint:** Enforces `UNIQUE(session_id, student_id)`.
* **Execution Time Target:** 10–15 seconds flow.
* **Request Body:**
  ```json
  {
    "understanding_rating": 4, // 1 to 5
    "needs_help": true, // If true, auto-generates HelpRequest
    "student_comment": "Could you please explain the custom conversion event again?" // Optional
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Feedback submitted successfully.",
    "help_request_created": true
  }
  ```
* **Error Response (409 Conflict):** `{"code": "ALREADY_SUBMITTED", "message": "Feedback already submitted for this class."}`

### 9.2 Session Feedback Distribution Summary
* **GET** `/sessions/{session_id}/feedback/summary/`
* **Roles:** `super_admin`, `coordinator`, `teacher` (own batch), `observer`
* **Success Response (200 OK):**
  ```json
  {
    "session_id": 501,
    "total_students": 40,
    "feedback_count": 38,
    "average_rating": 3.85,
    "distribution_bands": {
      "band_81_100_pct": 14, // Rating 5
      "band_61_80_pct": 15,  // Rating 4
      "band_41_60_pct": 6,   // Rating 3
      "band_21_40_pct": 2,   // Rating 2
      "band_0_20_pct": 1     // Rating 1
    },
    "help_requests_count": 5
  }
  ```

---

## 10. Help Requests Board (`/help-requests`)

### 10.1 List Help Requests
* **GET** `/help-requests/?status=Pending&batch_id=42`
* **Roles:** `super_admin`, `coordinator` (own course), `teacher` (own batches), `student` (own only), `observer`

### 10.2 Resolve Help Request
* **PATCH** `/help-requests/{id}/`
* **Roles:** `teacher` (assigned teacher), `coordinator`, `super_admin`
* **Request Body:**
  ```json
  {
    "status": "Resolved", // "In_Progress" | "Resolved"
    "teacher_note": "Explained one-on-one after practical lab session. Student demonstrated correct setup."
  }
  ```
* **Success Response (200 OK):** Updates status and sends automated notification to student.

---

## 11. Reports & Analytics (`/reports`)

All report endpoints support query parameters `format=json` (default), `format=pdf`, `format=excel`.

* **GET** `/reports/daily-attendance/?date=2026-11-21&batch_id=42`
* **GET** `/reports/topic-understanding/?topic_id=12` (Cross-batch comparison across batches 42, 43, 44)
* **GET** `/reports/repeated-absences/?threshold=3` (Flags students with 3+ consecutive or 5+ total absences)
* **GET** `/reports/teacher-performance/?teacher_id=uuid` (Average feedback score, help resolution time)
