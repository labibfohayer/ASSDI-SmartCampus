export const en = {
  appName: 'As-Sunnah Skill Development Institute',
  appSubtitle: 'Student Learning Progress & Feedback System',
  courseName: 'Small Business Management Course (SBMC)',

  // Auth
  login: {
    title: 'Student Login',
    subtitle: 'Sign in with your Student ID and Password',
    studentIdLabel: 'Student ID / Registration No',
    studentIdPlaceholder: 'e.g., STD-2026-042-001',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    submit: 'Sign In',
    loggingIn: 'Verifying...',
    errorInvalid: 'Invalid student ID or password.',
    errorNetwork: 'Unable to connect to the server.',
    demoHint: 'Demo ID: STD-2026-042-001 | Password: StudentPass2026!',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to log out?',
  },

  // Navigation / Tabs
  tabs: {
    today: 'Today',
    progress: 'Progress',
    qrScan: 'QR Scan',
    notifications: 'Notices',
  },

  // Today Screen
  today: {
    title: "Today's Class Schedule",
    noClasses: 'No classes scheduled for today.',
    upcoming: 'Upcoming Session',
    room: 'Room',
    teacher: 'Teacher',
    topic: 'Topic',
    time: 'Time',
    attendanceStatus: 'Attendance Status',
    present: 'Present',
    late: 'Late',
    absent: 'Absent',
    notMarked: 'Pending',
    giveFeedback: '10s Fast Feedback',
    feedbackGiven: 'Feedback Submitted',
    scanQR: 'Scan Attendance QR',
  },

  // Fast Feedback Modal (10-15s)
  feedback: {
    title: 'Daily Class Feedback (10-15 Seconds)',
    subtitle: 'How well did you understand the topic today?',
    ratingQuestion: 'Select your understanding level:',
    rating1: 'Did not understand',
    rating2: 'Understood slightly',
    rating3: 'Understood partially',
    rating4: 'Understood well',
    rating5: 'Completely clear',
    helpQuestion: 'Do you need teacher assistance or explanation?',
    helpYes: 'Yes, I need help',
    helpNo: 'No, I am fine',
    commentPlaceholder: 'Briefly describe your question (optional)...',
    submitting: 'Submitting...',
    submitBtn: 'Submit Feedback',
    successMsg: 'Feedback submitted successfully. Thank you!',
    alreadySubmitted: 'Feedback for this session was already submitted.',
  },

  // QR Scan
  scanner: {
    title: 'Attendance QR Scanner',
    instruction: 'Point your camera at the rotating QR code projected by your teacher.',
    permissionDenied: 'Camera permission is required. Please grant it in phone settings.',
    requestPermission: 'Grant Permission',
    scanning: 'Verifying...',
    scanSuccess: 'Attendance recorded successfully!',
    scanLate: 'Recorded as Late attendance.',
    alreadyMarked: 'Your attendance is already marked.',
    invalidToken: 'QR token has expired or is invalid.',
    close: 'Close',
  },

  // Progress
  progress: {
    title: 'My Progress & Attendance',
    attendanceRate: 'Attendance Rate',
    classesAttended: 'Classes Attended',
    avgUnderstanding: 'Avg Understanding',
    helpRequests: 'Help Requests',
    resolved: 'Resolved',
    pending: 'Pending',
    attendanceHistory: 'Recent Attendance Log',
    teacherReplies: 'Teacher Solutions & Replies',
  },

  // Notifications
  notifications: {
    title: 'Announcements & Notifications',
    empty: 'No notifications at this time.',
    markAllRead: 'Mark all read',
  },
};
