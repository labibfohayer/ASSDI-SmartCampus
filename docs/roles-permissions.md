# Roles & Permissions Specification

> **Document Status:** Complete  
> **Source of Truth:** `docs/SRS.md` (Section 4 & Section 4.1)  
> **Application Scope:** As-Sunnah Skill Development Institute (ASSDI) — Student Learning Progress, Feedback & Management System

---

## 1. Overview of System Roles

The system enforces strict Server-Side Role-Based Access Control (RBAC). Every endpoint validates the user's role and data ownership scope before returning or modifying data.

| Role Code | Role Name | Primary Responsibilities | Scope Boundary |
|---|---|---|---|
| `super_admin` | Super Administrator | Full system governance, course creation, administrative account creation, system configuration, security auditing. | Entire Institute (All Campuses, Courses, Batches). |
| `coordinator` | Course Coordinator | Academic oversight of assigned course(s), batch performance, teacher assignments, student progress, help request monitoring, report generation. | **Strictly scoped to assigned course(s)** via `coordinator_course_assignments`. Cannot access other courses. |
| `teacher` | Instructor / Teacher | Daily class conduction, topic management for assigned subject(s), attendance taking & correction, student feedback review, help request resolution. | **Strictly scoped to assigned batches & subjects** via `teacher_assignments`. |
| `student` | Enrolled Student | Submitting daily understanding ratings (10–15s), requesting teacher help, scanning attendance QR, tracking personal learning progress. | **Strictly scoped to own student record and enrolled batch**. Cannot view other students' records. |
| `observer` | Management / Observer | Read-only executive visibility across academic metrics, attendance health, and course performance. | Read-only access across assigned courses/batches. Cannot create, edit, or delete any data. |

---

## 2. Comprehensive Permission Matrix

### Legend:
- **`Y`**: Allowed without restrictions.
- **`N`**: Strictly forbidden (Returns `403 Forbidden`).
- **`Own`**: Allowed only for entities directly owned by or assigned to the user:
  - *Coordinator:* Courses assigned via `coordinator_course_assignments`.
  - *Teacher:* Batches and subjects assigned via `teacher_assignments`.
  - *Student:* Own student record (`student.user_id == request.user.id`) and own enrolled batch.
- **`Window`**: Allowed only within a time-limited regulatory window (e.g., attendance correction within 24 hours).
- **`RO`**: Read-Only access.

---

### 2.1 Academic Structure & Course Management

| Feature / Action | Super Admin | Coordinator | Teacher | Student | Observer | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Create / Edit / Deactivate Courses | **Y** | **N** | **N** | **N** | **N** | Super Admin only to maintain schema integrity. |
| View Courses List & Details | **Y** | **Own** | **Own** | **Own** | **Y (RO)** | Coordinator sees assigned; Teacher/Student see enrolled course. |
| Create / Edit Departments | **Y** | **Own** | **N** | **N** | **N** | Coordinator can manage departments within assigned course. |
| Create / Edit Subjects | **Y** | **Own** | **N** | **N** | **N** | Scoped to assigned course. |
| View Subjects | **Y** | **Own** | **Own** | **Own** | **Y (RO)** | Visible across assigned curriculum. |
| Manage Campuses | **Y** | **N** | **N** | **N** | **Y (RO)** | Institute-wide physical campus infrastructure. |

---

### 2.2 User Accounts & Staff Allocations

| Feature / Action | Super Admin | Coordinator | Teacher | Student | Observer | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Create Admin / Coordinator Accounts | **Y** | **N** | **N** | **N** | **N** | Super Admin exclusive. |
| Assign Coordinator to Course (`coordinator_course_assignments`) | **Y** | **N** | **N** | **N** | **N** | Governs multi-course scoping. |
| Create / Manage Teacher Accounts | **Y** | **Own** | **N** | **N** | **N** | Coordinator can add teachers for their course. |
| Assign Teacher to Batch & Subject (`teacher_assignments`) | **Y** | **Own** | **N** | **N** | **N** | 1 batch has many teachers (1 per subject). |
| View Teacher Profiles & Assignments | **Y** | **Own** | **Own** | **Own (Batch)** | **Y (RO)** | Students see teachers teaching their batch. |
| Create Observer Accounts | **Y** | **N** | **N** | **N** | **N** | Super Admin exclusive. |

---

### 2.3 Batch & Student Lifecycle Management

| Feature / Action | Super Admin | Coordinator | Teacher | Student | Observer | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Create / Edit Batches | **Y** | **Own** | **N** | **N** | **N** | Coordinator creates batches for their course. |
| View Batches | **Y** | **Own** | **Own** | **Own** | **Y (RO)** | Filtered by assignment. |
| Add Student Individually | **Y** | **Own** | **N** | **N** | **N** | No student self-registration. |
| Bulk Import Students (Excel / CSV) | **Y** | **Own** | **N** | **N** | **N** | Validates dummy data constraints in development. |
| Edit Student Academic Profile | **Y** | **Own** | **N** | **N** | **N** | Name, Background, Campus, Roll/Reg. |
| Transfer Student to Another Batch | **Y** | **Own** | **N** | **N** | **N** | Audit logged. |
| Soft-Deactivate / Archive Student | **Y** | **Own** | **N** | **N** | **N** | Hard delete is strictly forbidden. |
| View Student Profile | **Y** | **Own** | **Own** | **Own** | **Y (RO)** | Teacher sees students in own assigned batches. |

---

### 2.4 Curriculum Topics & Daily Class Sessions

| Feature / Action | Super Admin | Coordinator | Teacher | Student | Observer | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Create Curriculum Topics (`class_topics`) | **Y** | **Own** | **Own (Subject)** | **N** | **N** | Teachers can add topics under their assigned subject. |
| View Curriculum Topics | **Y** | **Own** | **Own** | **Own** | **Y (RO)** | Curriculum-level across batches. |
| Create / Publish Class Sessions (`class_sessions`) | **Y** | **Own** | **Own** | **N** | **N** | Teacher schedules session for their assigned batch. |
| Edit Class Session Details | **Y** | **Own** | **Own** | **N** | **N** | Allowed before session starts. |
| View Class Schedule & Today's Classes | **Y** | **Own** | **Own** | **Own** | **Y (RO)** | Filtered by date, batch, and audience. |
| Cancel / Reschedule Session | **Y** | **Own** | **Own** | **N** | **N** | Triggers automated student notification. |

---

### 2.5 Attendance Management

| Feature / Action | Super Admin | Coordinator | Teacher | Student | Observer | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Generate Rotating Attendance QR Code | **Y** | **Own** | **Own** | **N** | **N** | Active for configured window; rotates every 30–60s. |
| Scan QR Code for Attendance | **N** | **N** | **N** | **Own** | **N** | Enforces `UNIQUE(class_session, student)`. |
| Manual Attendance Marking | **Y** | **Own** | **Own** | **N** | **N** | Present, Absent, Late, Approved Leave. |
| Correct Past Attendance | **Y** | **Own** | **Window** | **N** | **N** | Teacher within allowed window (24h); coordinator thereafter. |
| View Attendance Records | **Y** | **Own** | **Own** | **Own** | **Y (RO)** | Student sees own attendance history only. |
| View Repeated Absence Alerts | **Y** | **Own** | **Own** | **N** | **Y (RO)** | Threshold: 3 consecutive or 5 total absences. |

---

### 2.6 Daily Learning Feedback & Help Requests

| Feature / Action | Super Admin | Coordinator | Teacher | Student | Observer | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Submit Daily Feedback (Rating 1–5 + Help) | **N** | **N** | **N** | **Own** | **N** | **Strict constraint: 1 feedback per session/student**. Submittable in 10–15s. |
| View Individual Student Feedback | **Y** | **Own** | **Own** | **Own** | **N** | Protected student privacy. |
| View Aggregated Feedback & Charts | **Y** | **Own** | **Own** | **N** | **Y (RO)** | Topic understanding distribution (0–40, 41–60, etc.). |
| Create Help Request | **N** | **N** | **N** | **Own** | **N** | Auto-created on feedback `needs_help=True` or manual. |
| View Help Requests Queue | **Y** | **Own** | **Own** | **Own** | **Y (RO)** | Filterable by status (`Pending`, `In Progress`, `Resolved`). |
| Update Help Request Status | **Y** | **Own** | **Own** | **N** | **N** | Teacher transitions status and adds resolution note. |
| Add Teacher Response Note | **Y** | **Own** | **Own** | **N** | **N** | Triggers notification to student. |

---

### 2.7 Reports, Analytics & Exports

| Feature / Action | Super Admin | Coordinator | Teacher | Student | Observer | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| View Daily Class Progress Report | **Y** | **Own** | **Own** | **N** | **Y (RO)** | Aggregates attendance and understanding. |
| View Topic-Wise Analytics (Cross-Batch) | **Y** | **Own** | **Own (Subject)** | **N** | **Y (RO)** | Evaluates curriculum effectiveness. |
| View Teacher Performance Metrics | **Y** | **Own** | **Own (Self)** | **N** | **Y (RO)** | Feedback response rates and resolution times. |
| Export Reports (PDF & Excel) | **Y** | **Own** | **Own** | **N** | **Own (Permitted)** | Controlled export with audit logging. |

---

### 2.8 System Security, Notifications & Audit Logs

| Feature / Action | Super Admin | Coordinator | Teacher | Student | Observer | Notes |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Register Device FCM Token (`device_tokens`) | **Y** | **Y** | **Y** | **Y** | **Y** | Users register their own mobile/web devices. |
| Create Global Announcements | **Y** | **N** | **N** | **N** | **N** | Institute-wide. |
| Create Course / Batch Announcements | **Y** | **Own** | **Own (Batch)** | **N** | **N** | Scoped to course or batch. |
| View Announcements | **Y** | **Own** | **Own** | **Own** | **Y (RO)** | Target audience filtered. |
| View Audit Logs | **Y** | **N** | **N** | **N** | **N** | Records attendance edits, role changes, transfers. |
| Trigger Database Backups & Restore | **Y** | **N** | **N** | **N** | **N** | System administration level. |

---

## 3. Server-Side Enforcement Architecture

### 3.1 Django REST Framework Permission Classes
Every view in `/api/v1/` applies explicit permission classes inheriting from `rest_framework.permissions.BasePermission`:

1. `IsSuperAdmin`: Validates `request.user.role == 'super_admin'`.
2. `IsCoordinator`: Validates `request.user.role == 'coordinator'` and verifies target course against `CoordinatorCourseAssignments`.
3. `IsTeacher`: Validates `request.user.role == 'teacher'` and verifies target batch/subject against `TeacherAssignments`.
4. `IsStudent`: Validates `request.user.role == 'student'` and restricts `student_id` strictly to `request.user.student_profile.id`.
5. `IsObserverReadOnly`: Restricts HTTP methods strictly to `SAFE_METHODS` (`GET`, `HEAD`, `OPTIONS`).

### 3.2 QuerySet Level Filtering (`get_queryset`)
To prevent data leakage, model viewsets override `get_queryset()`:
```python
# Conceptual architecture for Coordinator & Teacher QuerySet isolation
def get_queryset(self):
    user = self.request.user
    if user.role == 'super_admin':
        return Batch.objects.all()
    if user.role == 'coordinator':
        assigned_courses = user.coordinator_course_assignments.values_list('course_id', flat=True)
        return Batch.objects.filter(course_id__in=assigned_courses)
    if user.role == 'teacher':
        assigned_batches = user.teacher_assignments.values_list('batch_id', flat=True)
        return Batch.objects.filter(id__in=assigned_batches)
    if user.role == 'student':
        return Batch.objects.filter(id=user.student_profile.enrollment.batch_id)
    return Batch.objects.none()
```
