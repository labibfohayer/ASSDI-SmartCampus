# Open Questions & Architectural Clarifications

> **Document Status:** Active Tracker  
> **Source of Truth:** `docs/SRS.md` (Section 16) + Technical Analysis  
> **Instructions:** Items marked **[BLOCKING FOR BACKEND]** require client confirmation or alignment on default assumptions before building the respective backend modules. Items marked **[CAN WAIT]** do not block initial MVP API implementation.

---

## 1. BLOCKING FOR BACKEND IMPLEMENTATION

These business logic parameters directly affect database calculations, token validation algorithms, and API rules. Defaults are proposed for initial implementation.

### 🔴 Question B-1: Late Threshold Limit
* **SRS Reference:** Section 7 & Section 16 (Q1)
* **Question:** Exactly how many minutes after class start time does an attendance scan switch from `Present` to `Late`?
* **Impacted Module:** `/api/v1/attendance/scan/` validation service.
* **Proposed Default [ASSUMPTION]:** **10 minutes**. A scan between `0` and `10` minutes after class start is marked `Present`. A scan between `11` and `15` minutes is marked `Late`.
* **Action Required:** Client confirmation required before finalizing attendance scan service.

---

### 🔴 Question B-2: Attendance QR Active Window & Rotation Period
* **SRS Reference:** Section 7 & Section 16 (Q1)
* **Question:** How long is the session's QR code active in total, and how frequently does the cryptographic signed payload rotate on the teacher's screen to prevent photo sharing?
* **Impacted Module:** `QRScanTokens` generation service and cron expiry.
* **Proposed Default [ASSUMPTION]:**
  - **Total active window:** **15 minutes** from class start time (e.g., for a 10:00 AM class, QR closes at 10:15 AM).
  - **Payload rotation frequency:** Every **30 seconds**. Each token expires in 45 seconds (allowing a 15-second clock skew grace period).
* **Action Required:** Client confirmation of classroom operational logistics.

---

### 🔴 Question B-3: Attendance Percentage Calculation Formula
* **SRS Reference:** Section 7 & Section 16 (Q2)
* **Question:** How exactly is a student's attendance percentage calculated when `Approved_Leave` records exist?
* **Impacted Module:** Attendance reports and `Student.my_progress` API calculations.
* **Proposed Default [ASSUMPTION]:**
  $$\text{Attendance } \% = \frac{\text{Present} + \text{Late}}{\text{Total Sessions Held} - \text{Approved Leave}} \times 100$$
  *Note:* Late scans count fully towards attendance percentage but are flagged separately in coordinator reports.
* **Action Required:** Confirmation of institute academic policy.

---

### 🔴 Question B-4: Teacher Attendance Correction Window
* **SRS Reference:** Section 4.1 & Section 16 (Q2)
* **Question:** For how long after a class session can a teacher manually correct or update an attendance record before it locks and requires coordinator authorization?
* **Impacted Module:** `/api/v1/attendance/{id}/correct/` permission validator.
* **Proposed Default [ASSUMPTION]:** **24 hours** from session end time. Within 24 hours, teachers can edit with a mandatory audit reason. After 24 hours, only `coordinator` or `super_admin` can edit.
* **Action Required:** Academic administration sign-off.

---

### 🔴 Question B-5: Student Device Binding (Anti-Proxy QR Scanning)
* **SRS Reference:** Section 7 & Section 13
* **Question:** To prevent one residential student from taking photos of the QR code and sending it to classmates outside the room, should a student account be strictly bound to a single mobile device ID?
* **Impacted Module:** `DeviceTokens` and `/api/v1/attendance/scan/`.
* **Proposed Default [ASSUMPTION]:** For MVP v1, the combination of 30-second token rotation, short-lived HMAC signatures, and server-side timestamp validation is enforced. Strict single-device hardware UUID binding will be introduced in Phase 2 if physical proxy scanning is observed.
* **Action Required:** Decision on whether device-binding is required for Day 1.

---

## 2. NON-BLOCKING (CAN WAIT / OPERATIONAL / PHASE 2)

These questions do not block database schema or initial API build and can be finalized during frontend integration or Phase 2.

### 🟡 Question W-1: Daily Feedback Window
* **SRS Reference:** Section 5 & Section 16 (Q5)
* **Question:** Until what time can a student submit their daily class feedback?
* **Proposed Default [ASSUMPTION]:** Until **midnight (11:59 PM)** of the class day.

### 🟡 Question W-2: Feedback Editability
* **SRS Reference:** Section 5 & Section 16 (Q4)
* **Question:** Can a student edit or update their feedback after submitting?
* **Proposed Default [ASSUMPTION]:** **No**. Feedback is strictly immutable once submitted to preserve real-time honesty.

### 🟡 Question W-3: Input Mechanism for Feedback v1
* **SRS Reference:** Section 5 (FR-S4) & Section 16 (Q3)
* **Question:** Rating (1–5) or 0–100% percentage slider?
* **Status:** Confirmed for v1 as **Rating 1–5** (mapped internally to 20/40/60/80/100% for charts).

### 🟡 Question W-4: Multi-Teacher Co-Teaching Sessions
* **SRS Reference:** Section 3 & Section 16 (Q6)
* **Question:** Can several teachers teach the same session simultaneously?
* **Proposed Default [ASSUMPTION]:** Each class session has one primary assigned teacher (`teacher_user_id FK`). Co-teachers can be added to the batch via `teacher_assignments`.

### 🟡 Question W-5: Female Campus Rollout Schedule
* **SRS Reference:** Section 1 & Section 16 (Q7)
* **Question:** Are female-campus batches included in the first pilot?
* **Status:** The schema supports `gender_campus` on `campuses` from day one with zero changes needed when the female campus goes live.

### 🟡 Question W-6: Student ID & Registration Number Format
* **SRS Reference:** Section 5 (FR-S1) & Section 16 (Q8)
* **Question:** What is the official numbering convention for Student ID numbers?
* **Proposed Default [ASSUMPTION]:** `STD-[YEAR]-[BATCH]-[SERIAL]` (e.g., `STD-2026-042-001`).

### 🟡 Question W-7: Repeated-Absence and At-Risk Alert Thresholds
* **SRS Reference:** Section 7 & Section 16 (Q11)
* **Question:** What threshold triggers an automatic coordinator notification for at-risk attendance?
* **Proposed Default [ASSUMPTION]:** **3 consecutive sessions** or **5 total sessions** absent.

### 🟡 Question W-8: Residential / Hostel Attendance Scope
* **SRS Reference:** Section 16 (Q12)
* **Question:** Is hostel/night attendance in scope?
* **Status:** Out of scope for MVP v1. System focuses purely on academic classroom attendance.

### 🟡 Question W-9: Islamic Basics Auto-Assignment Rule
* **SRS Reference:** Section 3 & Section 12
* **Question:** How are students routed to Madrasa vs General Islamic Basics modules?
* **Proposed Default [ASSUMPTION]:** Automatic assignment based on `Student.education_background`:
  - `General` ➔ Islamic Basics (General Module).
  - `Aliya` / `Qawmi` ➔ Islamic Basics (Madrasa Module).

### 🟡 Question W-10: Cloud Hosting & Third-Party Credentials Ownership
* **SRS Reference:** Section 15 & Section 16 (Q10)
* **Question:** Domain names, VPS provider, Firebase project, and Google Play Console accounts ownership.
* **Action Required:** Institute IT management must register these under ASSDI's official name prior to production deployment.
