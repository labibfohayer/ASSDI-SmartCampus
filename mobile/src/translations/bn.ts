export const bn = {
  appName: 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট',
  appSubtitle: 'শিক্ষার্থী লার্নিং প্রগ্রেস ও ফিডব্যাক সিস্টেম',
  courseName: 'স্মল বিজনেস ম্যানেজমেন্ট কোর্স (SBMC)',

  // Auth
  login: {
    title: 'শিক্ষার্থী লগইন',
    subtitle: 'আপনার স্টুডেন্ট আইডি ও পাসওয়ার্ড দিয়ে প্রবেশ করুন',
    studentIdLabel: 'স্টুডেন্ট আইডি / রেজিস্ট্রেশন নম্বর',
    studentIdPlaceholder: 'যেমন: STD-2026-042-001',
    passwordLabel: 'পাসওয়ার্ড',
    passwordPlaceholder: 'আপনার পাসওয়ার্ড লিখুন',
    submit: 'প্রবেশ করুন',
    loggingIn: 'যাচাই করা হচ্ছে...',
    errorInvalid: 'ভুল স্টুডেন্ট আইডি বা পাসওয়ার্ড।',
    errorNetwork: 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি।',
    demoHint: 'ডেমো আইডি: STD-2026-042-001 | পাসওয়ার্ড: StudentPass2026!',
    logout: 'লগআউট',
    logoutConfirm: 'আপনি কি নিশ্চিত লগআউট করতে চান?',
  },

  // Navigation / Tabs
  tabs: {
    today: 'আজকের ক্লাস',
    progress: 'অগ্রগতি',
    qrScan: 'হাজিরা স্ক্যান',
    notifications: 'বিজ্ঞপ্তি',
  },

  // Today Screen
  today: {
    title: 'আজকের ক্লাস শিডিউল',
    noClasses: 'আজকে কোনো নির্ধারিত ক্লাস নেই।',
    upcoming: 'আসন্ন সেশন',
    room: 'রুম',
    teacher: 'শিক্ষক',
    topic: 'টপিক',
    time: 'সময়',
    attendanceStatus: 'উপস্থিতির অবস্থা',
    present: 'উপস্থিত',
    late: 'দেরি',
    absent: 'অনুপস্থিত',
    notMarked: 'হাজিরা অমীমাংসিত',
    giveFeedback: '১০ সেকেন্ডে মূল্যায়ন দিন',
    feedbackGiven: 'মূল্যায়ন সম্পন্ন হয়েছে',
    scanQR: 'কিউআর দিয়ে হাজিরা দিন',
  },

  // Fast Feedback Modal (10-15s)
  feedback: {
    title: 'আজকের ক্লাস মূল্যায়ন (১০-১৫ সেকেন্ড)',
    subtitle: 'ক্লাসের টপিকটি আপনি কতটুকু বুঝতে পেরেছেন?',
    ratingQuestion: 'আপনার অনুধাবনের মাত্রা নির্বাচন করুন:',
    rating1: 'একদমই বুঝিনি',
    rating2: 'সামান্য বুঝেছি',
    rating3: 'মোটামুটি বুঝেছি',
    rating4: 'ভালো বুঝেছি',
    rating5: 'সম্পূর্ণ স্পষ্ট',
    helpQuestion: 'শিক্ষকের কাছে বিশেষ সহায়তা বা ব্যাখ্যা প্রয়োজন?',
    helpYes: 'হ্যাঁ, প্রয়োজন',
    helpNo: 'না, প্রয়োজন নেই',
    commentPlaceholder: 'কোনো নির্দিষ্ট সমস্যা থাকলে সংক্ষেপে লিখুন (ঐচ্ছিক)...',
    submitting: 'জমা দেওয়া হচ্ছে...',
    submitBtn: 'মূল্যায়ন জমা দিন',
    successMsg: 'আপনার মূল্যায়ন সফলভাবে জমা হয়েছে। ধন্যবাদ!',
    alreadySubmitted: 'এই ক্লাসের মূল্যায়ন আপনি ইতিমধ্যে জমা দিয়েছেন।',
  },

  // QR Scan
  scanner: {
    title: 'হাজিরা কিউআর কোড স্ক্যানার',
    instruction: 'প্রজেক্টরে প্রদর্শিত শিক্ষকের লাইভ কিউআর কোডটি ফ্রেমের ভেতরে ধরুন।',
    permissionDenied: 'ক্যামেরা ব্যবহারের অনুমতি প্রয়োজন। ফোনের সেটিংসে গিয়ে অনুমতি দিন।',
    requestPermission: 'অনুমতি দিন',
    scanning: 'যাচাই করা হচ্ছে...',
    scanSuccess: 'হাজিরা সফলভাবে লিপিবদ্ধ হয়েছে!',
    scanLate: 'দেরিতে উপস্থিত হিসেবে হাজিরা গণ্য হয়েছে।',
    alreadyMarked: 'আপনার হাজিরা ইতিমধ্যে লিপিবদ্ধ হয়েছে।',
    invalidToken: 'কিউআর কোডটির মেয়াদ উত্তীর্ণ হয়েছে বা অবৈধ।',
    close: 'বন্ধ করুন',
  },

  // Progress
  progress: {
    title: 'আমার শিখন অগ্রগতি ও হাজিরা',
    attendanceRate: 'মোট উপস্থিতি হার',
    classesAttended: 'উপস্থিত ক্লাস',
    avgUnderstanding: 'গড় অনুধাবন',
    helpRequests: 'হেল্প রিকোয়েস্ট',
    resolved: 'সমাধান হয়েছে',
    pending: 'অপেক্ষমাণ',
    attendanceHistory: 'সাম্প্রতিক হাজিরা লগ',
    teacherReplies: 'শিক্ষকের উত্তর ও সমাধান',
  },

  // Notifications
  notifications: {
    title: 'বিজ্ঞপ্তি ও নোটিফিকেশন',
    empty: 'কোনো নতুন বিজ্ঞপ্তি নেই।',
    markAllRead: 'সব পঠিত',
  },
};
