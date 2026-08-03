// Larger-than-usual base sizes: low-literacy users scan icons/numbers more than text,
// so text that IS shown must be easy to read at a glance.
export const typography = {
  h1: { fontSize: 27, fontWeight: '800' as const, lineHeight: 34 },
  h2: { fontSize: 21, fontWeight: '800' as const, lineHeight: 27 },
  h3: { fontSize: 18, fontWeight: '700' as const, lineHeight: 24 },
  bodyLg: { fontSize: 17, fontWeight: '500' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  bodyBold: { fontSize: 15, fontWeight: '700' as const, lineHeight: 21 },
  caption: { fontSize: 13, fontWeight: '500' as const, lineHeight: 17 },
  tiny: { fontSize: 11, fontWeight: '600' as const, lineHeight: 14 },
  button: { fontSize: 16, fontWeight: '700' as const, lineHeight: 20 },
};

export type Typography = typeof typography;
