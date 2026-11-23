// Madrasat-us-Sunnah Reference Design Tokens for Expo Mobile App
// Source: https://madrasatussunnah.org/

export const tokens = {
  colors: {
    // Brand Amber / Cream Palette per User Feedback
    primary: '#B45309', // Warm Amber Primary
    primaryHover: '#92400E',
    teal2: '#D97706', // Warm Amber Accent 2
    teal3: '#F59E0B', // Warm Amber Accent 3
    tealSoft: '#F0FDFA', // Soft Sky Surface Tint (Preserved)
    tealLine: '#CCFBF1', // Sky Border Line (Preserved)
    tealPill: '#FEF3C7', // Warm Cream Pill

    // Gold & Accents
    gold: '#C1982E', // Islamic Ochre Gold
    goldLight: '#E5C378',
    greenDome: '#00A14A',
    ocean: '#016C90',

    // App Shell & Backgrounds
    background: '#F8FAFC', // Slate 50
    surface: '#FFFFFF',
    surfaceSoft: '#F1F5F9',
    border: '#E2E8F0',

    // Dark Institutional Shell
    navyDark: '#0A1420',
    navyStart: '#1E293B',
    navyPanel: '#1E293B',

    // Ink / Typography
    textPrimary: '#0F172A',
    textBody: '#334155',
    textMuted: '#475569',
    textSubtle: '#94A3B8',
    textInverse: '#FFFFFF',

    // Semantic Status Colors
    status: {
      present: '#16A34A',
      late: '#D97706',
      absent: '#DC2626',
      leave: '#0284C7',
    },

    // 5-Level Understanding Rating Scale
    rating: {
      1: { bg: '#FEF2F2', text: '#991B1B', border: '#FCA5A5' },
      2: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
      3: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
      4: { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' },
      5: { bg: '#F0FDFA', text: '#0F766E', border: '#5EEAD4' },
    },

    // Chart Palette
    charts: ['#0F766E', '#14B8A6', '#C1982E', '#16A34A', '#016C90'],
  },

  typography: {
    fontFamily: {
      serif: 'NotoSerifBengali',
      sans: 'HindSiliguri',
    },
    lineHeight: {
      tight: 1.3,
      normal: 1.6,
      relaxed: 1.8,
    },
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};

export default tokens;
