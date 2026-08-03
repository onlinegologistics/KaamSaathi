// Warm, trustworthy palette — terracotta/saffron primary with deep teal accent.
// Avoids harsh corporate blue; feels approachable for daily-wage & student users alike.
export const colors = {
  // Primary — warm saffron/terracotta (trust + energy, evokes Indian marketplace warmth)
  primary: '#F45B18',
  primaryDark: '#D9430A',
  primaryLight: '#FFF0E7',

  // Secondary — deep teal (grounded, trustworthy counterpoint)
  secondary: '#0F766E',
  secondaryDark: '#0B564F',
  secondaryLight: '#DFF3F1',

  // Accent — golden yellow for pay badges / highlights
  accent: '#F4A51C',
  accentDark: '#C97700',
  accentLight: '#FFF3CF',

  // Status
  success: '#2E9E5B',
  successLight: '#E3F6EA',
  warning: '#E4622A',
  danger: '#D64545',
  dangerLight: '#FBE6E6',
  verified: '#1D9BF0',

  // Neutrals
  background: '#FFF7F1',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F7F7',
  border: '#ECE6DE',
  divider: '#EFEAE3',

  // Promo banner gradient (home hero card)
  bannerStart: '#FFD9B8',
  bannerEnd: '#FFB877',

  text: '#171717',
  textSecondary: '#5C5C5C',
  textMuted: '#9A9A9A',
  textInverse: '#FFFFFF',

  overlay: 'rgba(35, 26, 20, 0.55)',
  shadow: 'rgba(33, 24, 15, 0.12)',

  // Category tag colors
  categoryHomeRepair: '#F45B18',
  categoryCleaning: '#E8632F',
  categoryDelivery: '#2E9E5B',
  categoryConstruction: '#E0A030',
  categoryElectrician: '#7C5BE0',
  categoryPlumbing: '#2F7FD4',
  categoryPainting: '#2E9E8B',
  categoryMore: '#8A8A8A',
};

export type Colors = typeof colors;
