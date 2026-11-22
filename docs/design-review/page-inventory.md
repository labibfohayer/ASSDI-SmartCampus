# ASSDI Page & Component Design Inventory (Checklist)

Reference Visual Language: `https://madrasatussunnah.org/`  
Branch: `design-refresh`  
Audit Date: 2026-11-22  
Status: **100% COMPLETE & VERIFIED**

---

## 1. Global Shells, Layouts & System Components
- [x] **Root App Layout & Global Typography:** `web/src/app/layout.tsx` (Noto Serif Bengali + Hind Siliguri + Amiri, Theme Color `#0f766e`, Viewport, Manifest)
- [x] **Global CSS & Tailwind Token Mapping:** `web/src/app/globals.css` (Removal of zinc/slate, integration of `--hm-teal`, `--hm-teal-2`, `--hm-teal-3`, `--hm-bg`, `--hm-line`, `--hm-ink`, `--hm-muted`)
- [x] **Unified Dashboard App Shell:** `web/src/components/layout/DashboardShell.tsx` (Sidebar with Madrasat-us-Sunnah midnight/teal palette, active gold indicator, clean top header bar `#ffffff`, breadcrumbs, mobile drawer)
- [x] **Notification Bell & Toast Center:** `web/src/components/notifications/NotificationBell.tsx` (Teal badge, clean card dropdown, action buttons)
- [x] **Language Switcher Control:** `web/src/components/common/LanguageSwitcher.tsx` (Pill switcher, active teal state)
- [x] **Multi-Format Export Dropdown:** `web/src/components/common/MultiFormatExportDropdown.tsx` (PDF, Excel, Word, PPT, CSV export buttons)
- [x] **PWA Mobile Installer Banner & Modal:** `web/src/components/pwa/PwaInstaller.tsx` (Teal header bar, clean card, iOS share sheet guide)
- [x] **404 Not Found Page:** `web/src/app/not-found.tsx` (Institutional 404 with back-to-home button)
- [x] **Error Boundary Page:** `web/src/app/error.tsx` (Modest, informative error recovery screen)

---

## 2. Public & Authentication Pages
- [x] **Public Root Redirect / Landing:** `web/src/app/page.tsx` (Clean redirect or portal home)
- [x] **Unified Login Page:** `web/src/app/login/page.tsx` (Institutional As-Sunnah logo, plain and calm card, no marketing hero, role credential helpers, `#0f766e` primary CTA)

---

## 3. Student Portal (Role: `student`)
- [x] **Student Dashboard & Tab Container:** `web/src/app/student/page.tsx` (Hero profile card, attendance metric rings, streak counters)
- [x] **Today's Classes & Daily Feedback:** `web/src/app/student/page.tsx` (Class cards, 5-level understanding rating buttons, Yes/No toggle, fast submit)
- [x] **Student Attendance History Log:** `web/src/app/student/page.tsx` (Attendance summary, session logs, Present/Late/Absent badges)
- [x] **Help Request Submission & Teacher Q&A:** `web/src/app/student/page.tsx` (Doubt asking form, status pills, resolved teacher answers)
- [x] **Lecture Notes & Materials Hub Modal:** `web/src/components/student/LectureMaterialsModal.tsx` (Resource search, format badges, download button)
- [x] **Web QR Scanner Modal:** `web/src/components/student/WebQRScannerModal.tsx` (Camera viewport, scanning target frame, status feedback)
- [x] **Digital Student ID Card & Admit Card Modal:** `web/src/components/student/StudentIdCardModal.tsx` (Authentic institutional badge, QR code, flip view, print layout)
- [x] **Graduation & Certificate Eligibility Modal:** `web/src/components/student/GraduationCertificateModal.tsx` (Progress circular ring, eligibility status, printable certificate with gold seal)
- [x] **Student Navbar (Standalone View):** `web/src/components/student/StudentNavbar.tsx`

---

## 4. Teacher Web Portal (Role: `teacher`)
- [x] **Teacher Overview Dashboard:** `web/src/app/teacher/page.tsx` (Assigned batches, schedule cards, live attendance status)
- [x] **Teacher Attendance Hub:** `web/src/app/teacher/attendance/page.tsx` (Session selection, roster table, manual P/L/A/Leave status, 48h editing window)
- [x] **Teacher QR Code Display Session:** `web/src/app/teacher/qr/page.tsx` (Live rotating QR code card, session timer, scanned student counter)
- [x] **Help Requests Board:** `web/src/app/teacher/help-requests/page.tsx` (Student questions, subject filters, resolution reply form)
- [x] **Student Understanding & Topic Analytics:** `web/src/app/teacher/understanding/page.tsx` (Topic-wise 1-5 rating distribution, low-understanding topics)
- [x] **Teacher Navbar:** `web/src/components/teacher/TeacherNavbar.tsx`

---

## 5. Course Coordinator Portal (Role: `coordinator`)
- [x] **Coordinator Executive Dashboard:** `web/src/app/coordinator/page.tsx` (Aggregated attendance, feedback averages, at-risk highlights)
- [x] **At-Risk & Repeated Absence Watchlist:** `web/src/app/coordinator/at-risk/page.tsx` (3+ consecutive absences table, attendance < 80% filters)
- [x] **Batches & Curriculum Tracking:** `web/src/app/coordinator/batches/page.tsx` (SBMC batch progress, subject breakdown, teacher assignments)
- [x] **Coordinator Navbar:** `web/src/components/coordinator/CoordinatorNavbar.tsx`

---

## 6. Super Admin Portal (Role: `super_admin`)
- [x] **Admin Command Dashboard:** `web/src/app/admin/page.tsx` (System health, consecutive absence emergency banner, quick jump cards)
- [x] **Student Directory & Bulk Import:** `web/src/app/admin/students/page.tsx` (Excel/CSV drag-and-drop import, search & filter roster, ID card trigger)
- [x] **Courses, Departments & Batches Management:** `web/src/app/admin/courses/page.tsx` (Academic structure, seat counters, coordinator assignments)
- [x] **Class Sessions & Routine Schedule:** `web/src/app/admin/sessions/page.tsx` (Automated session generator, date filters, audit log triggers)
- [x] **Admin Navigation Menu & Archive Manager:** `web/src/components/admin/AdminMenuManagerModal.tsx` (Custom nav reordering, hide/archive toggles)
- [x] **Admin Navbar:** `web/src/components/admin/AdminNavbar.tsx`

---

## 7. Institutional Reports Hub & Observer Portal (Roles: `all`, `observer`)
- [x] **9 Institutional Reports Hub:** `web/src/app/reports/page.tsx` (Daily Attendance, Learning Progress, Weekly Progress, Monthly Performance, Batch Performance, Topic Analysis, Teacher Performance, Repeated Absences, Help Requests)
- [x] **Reports Print Layouts & Visualizations:** `web/src/app/reports/page.tsx` (`@media print` clean report layout, PDF/Excel ready)
- [x] **Reports Navbar:** `web/src/components/reports/ReportsNavbar.tsx`
- [x] **Notice & Announcements Board:** `web/src/app/announcements/page.tsx` (Broadcast notices, audience targeting, pinned announcements)

---

## 8. Mobile App Screens (Expo React Native: `mobile/src/screens/`)
- [x] **Theme Tokens for Expo:** `mobile/theme/tokens.ts` (Exporting `--hm-teal`, `--hm-teal-2`, `--hm-gold`, status & rating colors)
- [x] **Mobile Colors Palette:** `mobile/src/theme/colors.ts` (Synchronized with Madrasat-us-Sunnah reference)
- [x] **Login Screen:** `mobile/src/screens/LoginScreen.tsx`
- [x] **Home Screen:** `mobile/src/screens/HomeScreen.tsx`
- [x] **Feedback Modal:** `mobile/src/screens/FeedbackModal.tsx`
- [x] **Progress Screen:** `mobile/src/screens/ProgressScreen.tsx`
- [x] **Notifications Screen:** `mobile/src/screens/NotificationsScreen.tsx`
- [x] **QR Scanner Modal:** `mobile/src/screens/QRScannerModal.tsx`
