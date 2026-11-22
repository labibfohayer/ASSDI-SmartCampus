// Madrasat-us-Sunnah Reference Design Tokens for Expo Mobile App
// Source: https://madrasatussunnah.org/

export const tokens = {
  colors: {
    // Brand Teals
    primary: '#0F766E', // --hm-teal (Deep Teal)
    primaryHover: '#115E59',
    teal2: '#0D9488', // --hm-teal-2 (Accent border / quotes)
    teal3: '#14B8A6', // --hm-teal-3 (Focus / active indicator)
    tealSoft: '#F0FDFA', // --hm-teal-soft (Soft surface)
    tealLine: '#CCFBF1', // --hm-teal-line (Divider line)
    tealPill: '#99F6E4', // --hm-teal-pill (Highlights)

    // Gold & Accents
    gold: '#C1982E', // Islamic Ochre Gold
    goldLight: '#E5C378',
    greenDome: '#00A14A',
    ocean: '#016C90',

    // App Shell & Backgrounds
    background: '#F8FAFC', // --hm-bg (Slate 50)
    surface: '#FFFFFF',
    surfaceSoft: '#F1F5F9',
    border: '#E2E8F0', // --hm-line

    // Dark Navy Shell / Footer
    navyDark: '#0A1420',
    navyStart: '#0B1A2B',
    navyPanel: '#122036',

    // Ink / Typography
    textPrimary: '#0F172A', // --hm-ink
    textBody: '#334155',
    textMuted: '#475569', // --hm-muted
    textSubtle: '#94A3B8',
    textInverse: '#FFFFFF',

    // Semantic Status Colors
    status: {
      present: '#16A34A',
      late: '#D97706',
      absent: '#DC2626',
      leave: '#0F766E',
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
