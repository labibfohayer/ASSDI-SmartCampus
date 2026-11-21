export type Language = 'bn' | 'en';

export const TRANSLATIONS: Record<string, { bn: string; en: string }> = {
  // Brand & Institution
  'brand.name': {
    bn: 'আস-সুন্নাহ স্কিল ডেভেলপমেন্ট ইনস্টিটিউট',
    en: 'As-Sunnah Skill Development Institute',
  },
  'brand.shortName': {
    bn: 'এএসএসডিআই',
    en: 'ASSDI',
  },
  'brand.tagline': {
    bn: 'দক্ষতা উন্নয়ন ও কর্মসংস্থানমূলক প্রশিক্ষণ প্ল্যাটফর্ম',
    en: 'Skill Development & Employment Training Platform',
  },
  'brand.course': {
    bn: 'স্মল বিজনেস ম্যানেজমেন্ট কোর্স (SBMC)',
    en: 'Small Business Management Course (SBMC)',
  },
  'brand.systemTitle': {
    bn: 'শিক্ষার্থী লার্নিং প্রগ্রেস, ফিডব্যাক ও ম্যানেজমেন্ট সিস্টেম',
    en: 'Student Learning Progress, Feedback & Management System',
  },

  // Auth & Login
  'auth.loginTitle': {
    bn: 'লগ-ইন করুন',
    en: 'Sign In',
  },
  'auth.loginSubtitle': {
    bn: 'আপনার অ্যাকাউন্ট এন্টারপ্রাইজ পোর্টালে প্রবেশ করতে লগইন আইডি ও পাসওয়ার্ড দিন',
    en: 'Enter your Login ID and password to access the portal',
  },
  'auth.loginId': {
    bn: 'লগইন আইডি / ইউজারনেম',
    en: 'Login ID / Username',
  },
  'auth.loginIdPlaceholder': {
    bn: 'যেমন: ADM001, TCH001, COORD01, STU2026-001',
    en: 'e.g., ADM001, TCH001, COORD01, STU2026-001',
  },
  'auth.password': {
    bn: 'পাসওয়ার্ড',
    en: 'Password',
  },
  'auth.passwordPlaceholder': {
    bn: '••••••••',
    en: '••••••••',
  },
  'auth.loginBtn': {
    bn: 'প্রবেশ করুন',
    en: 'Sign In',
  },
  'auth.loggingIn': {
    bn: 'যাচাই করা হচ্ছে...',
    en: 'Verifying...',
  },
  'auth.loginSuccess': {
    bn: 'সফলভাবে লগইন হয়েছে!',
    en: 'Logged in successfully!',
  },
  'auth.logout': {
    bn: 'লগআউট',
    en: 'Logout',
  },
  'auth.logoutConfirm': {
    bn: 'আপনি কি নিশ্চিত যে লগআউট করতে চান?',
    en: 'Are you sure you want to sign out?',
  },
  'auth.forgotPassword': {
    bn: 'পাসওয়ার্ড ভুলে গেছেন?',
    en: 'Forgot Password?',
  },
  'auth.quickDemo': {
    bn: 'কুইক ডেমো রোল টেস্ট:',
    en: 'Quick Demo Role Testing:',
  },
  'auth.lockedError': {
    bn: 'অতিরিক্ত ব্যর্থ চেষ্টার কারণে অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে।',
    en: 'Account temporarily locked due to excessive failed attempts.',
  },
  'auth.invalidCredentials': {
    bn: 'ভুল লগইন আইডি অথবা পাসওয়ার্ড। অনুগ্রহ করে আবার চেষ্টা করুন।',
    en: 'Invalid login ID or password. Please try again.',
  },

  // Roles
  'role.super_admin': {
    bn: 'সুপার অ্যাডমিন',
    en: 'Super Admin',
  },
  'role.coordinator': {
    bn: 'কোর্স কোঅর্ডিনেটর',
    en: 'Course Coordinator',
  },
  'role.teacher': {
    bn: 'শিক্ষক / ট্রেইনার',
    en: 'Teacher / Trainer',
  },
  'role.student': {
    bn: 'শিক্ষার্থী',
    en: 'Student',
  },
  'role.observer': {
    bn: 'পর্যবেক্ষক (Observer)',
    en: 'Observer (Read-Only)',
  },

  // Navigation
  'nav.dashboard': { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  'nav.attendance': { bn: 'উপস্থিতি ও কিউআর', en: 'Attendance & QR' },
  'nav.feedback': { bn: 'লার্নিং ফিডব্যাক', en: 'Learning Feedback' },
  'nav.helpRequests': { bn: 'হেল্প রিকোয়েস্ট', en: 'Help Requests' },
  'nav.reports': { bn: 'রিপোর্ট ও অ্যানালিটিক্স', en: 'Reports & Analytics' },
  'nav.students': { bn: 'শিক্ষার্থী তালিকা', en: 'Students' },
  'nav.courses': { bn: 'কোর্স ও ব্যাচ', en: 'Courses & Batches' },
  'nav.settings': { bn: 'সেটিংস', en: 'Settings' },

  // Common UI
  'common.loading': { bn: 'লোড হচ্ছে...', en: 'Loading...' },
  'common.save': { bn: 'সংরক্ষণ করুন', en: 'Save' },
  'common.cancel': { bn: 'বাতিল', en: 'Cancel' },
  'common.search': { bn: 'অনুসন্ধান...', en: 'Search...' },
  'common.filter': { bn: 'ফিল্টার', en: 'Filter' },
  'common.export': { bn: 'ডাউনলোড', en: 'Export' },
  'common.pdf': { bn: 'পিডিএফ (PDF)', en: 'PDF Export' },
  'common.excel': { bn: 'এক্সেল (Excel)', en: 'Excel Export' },
  'common.active': { bn: 'সক্রিয়', en: 'Active' },
  'common.status': { bn: 'অবস্থা', en: 'Status' },
  'common.batch': { bn: 'ব্যাচ', en: 'Batch' },
  'common.date': { bn: 'তারিখ', en: 'Date' },
  'common.time': { bn: 'সময়', en: 'Time' },
  'common.present': { bn: 'উপস্থিত', en: 'Present' },
  'common.late': { bn: 'দেরিতে উপস্থিত', en: 'Late' },
  'common.absent': { bn: 'অনুপস্থিত', en: 'Absent' },
  'common.leave': { bn: 'ছুটি মঞ্জুর', en: 'Approved Leave' },

  // Language Switch
  'lang.bn': { bn: 'বাংলা', en: 'বাংলা' },
  'lang.en': { bn: 'English', en: 'English' },
};

export function getTranslation(key: string, lang: Language, fallback?: string): string {
  const item = TRANSLATIONS[key];
  if (item && item[lang]) {
    return item[lang];
  }
  return fallback || key;
}

export function formatNumberByLang(num: number | string, lang: Language): string {
  if (lang === 'en') return String(num);
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (digit) => banglaDigits[+digit] || digit);
}
