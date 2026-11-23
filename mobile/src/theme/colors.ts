import { tokens } from '../../theme/tokens';

export const colors = {
  primary: tokens.colors.primary, // #0F766E
  primaryLight: tokens.colors.tealSoft, // #F0FDFA
  primaryDark: tokens.colors.primaryHover, // #115E59
  accent: tokens.colors.teal3, // #14B8A6
  gold: tokens.colors.gold, // #C1982E
  white: '#FFFFFF',
  background: tokens.colors.background, // #F8FAFC
  surface: tokens.colors.surface, // #FFFFFF
  border: tokens.colors.border, // #E2E8F0
  borderLight: tokens.colors.tealLine, // #CCFBF1

  text: {
    primary: tokens.colors.textPrimary, // #0F172A
    secondary: tokens.colors.textBody, // #334155
    muted: tokens.colors.textMuted, // #475569
    inverse: '#FFFFFF',
  },

  // Rating colors per SRS Section 14 (1 red, 2 orange, 3 yellow, 4 light green, 5 green) tuned to palette
  rating: {
    1: '#DC2626', // Red
    2: '#EA580C', // Orange
    3: '#0D9488', // Amber/Yellow
    4: '#16A34A', // Light green
    5: '#0F766E', // Warm Amber Brand
  },

  status: {
    present: tokens.colors.status.present,
    late: tokens.colors.status.late,
    absent: tokens.colors.status.absent,
    leave: tokens.colors.status.leave,
  },
};

export default colors;
