// Design tokens mirrored from the Stitch "Utilitarian Financial Kernel" design system,
// extended with a dark palette derived from the same hue relationships.

export const lightColors = {
  surface: '#f8f9ff',
  surfaceDim: '#cbdbf5',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#3d4a3d',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',
  outline: '#6d7b6c',
  outlineVariant: '#bccbb9',
  primary: '#006e2f',
  onPrimary: '#ffffff',
  primaryContainer: '#22c55e',
  onPrimaryContainer: '#004b1e',
  primaryFixed: '#6bff8f',
  primaryFixedDim: '#4ae176',
  onPrimaryFixed: '#002109',
  onPrimaryFixedVariant: '#005321',
  secondary: '#545f73',
  onSecondary: '#ffffff',
  secondaryContainer: '#d5e0f8',
  onSecondaryContainer: '#586377',
  tertiary: '#855300',
  onTertiary: '#ffffff',
  tertiaryContainer: '#ef9900',
  onTertiaryContainer: '#5c3800',
  tertiaryFixed: '#ffddb8',
  tertiaryFixedDim: '#ffb95f',
  onTertiaryFixed: '#2a1700',
  onTertiaryFixedVariant: '#653e00',
  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
  background: '#f8f9ff',
  onBackground: '#0b1c30',
};

export const darkColors = {
  surface: '#0b1420',
  surfaceDim: '#0b1420',
  surfaceBright: '#33404f',
  surfaceContainerLowest: '#060d16',
  surfaceContainerLow: '#131d2b',
  surfaceContainer: '#182231',
  surfaceContainerHigh: '#222d3d',
  surfaceContainerHighest: '#2d3848',
  onSurface: '#dfe4ec',
  onSurfaceVariant: '#aeb8c6',
  inverseSurface: '#dfe4ec',
  inverseOnSurface: '#182231',
  outline: '#7c8794',
  outlineVariant: '#3d4a3d',
  primary: '#4ae176',
  onPrimary: '#00390f',
  primaryContainer: '#00622a',
  onPrimaryContainer: '#a1f6b6',
  primaryFixed: '#6bff8f',
  primaryFixedDim: '#4ae176',
  onPrimaryFixed: '#002109',
  onPrimaryFixedVariant: '#a1f6b6',
  secondary: '#bcc7de',
  onSecondary: '#263041',
  secondaryContainer: '#3c475a',
  onSecondaryContainer: '#d8e3fb',
  tertiary: '#ffb95f',
  onTertiary: '#452b00',
  tertiaryContainer: '#653e00',
  onTertiaryContainer: '#ffddb8',
  tertiaryFixed: '#ffddb8',
  tertiaryFixedDim: '#ffb95f',
  onTertiaryFixed: '#2a1700',
  onTertiaryFixedVariant: '#ffddb8',
  error: '#ffb4ab',
  onError: '#690005',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  background: '#0b1420',
  onBackground: '#dfe4ec',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  gutter: 16,
  margin: 16,
};

export const radius = {
  sm: 4,
  default: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const typography = {
  displayLg: { fontFamily: 'System', fontSize: 32, fontWeight: '700', lineHeight: 40, letterSpacing: -0.4 },
  headlineLg: { fontFamily: 'System', fontSize: 24, fontWeight: '600', lineHeight: 32, letterSpacing: -0.3 },
  headlineSm: { fontFamily: 'System', fontSize: 18, fontWeight: '600', lineHeight: 24, letterSpacing: -0.15 },
  bodyLg: { fontFamily: 'System', fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMd: { fontFamily: 'System', fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySm: { fontFamily: 'System', fontSize: 12, fontWeight: '400', lineHeight: 16, letterSpacing: 0.1 },
  labelLg: { fontFamily: 'System', fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: 0.1 },
  labelSm: { fontFamily: 'System', fontSize: 11, fontWeight: '600', lineHeight: 14, letterSpacing: 0.4 },
  currencyDisplay: { fontFamily: 'System', fontSize: 28, fontWeight: '700', lineHeight: 34, letterSpacing: -0.5 },
};

// Glassmorphism tokens — translucent surfaces over a BlurView, with a soft light
// border to fake a refracted edge and a diffused shadow underneath for depth.
export const glassLight = {
  tint: 'light',
  intensity: 55,
  background: 'rgba(255,255,255,0.55)',
  backgroundStrong: 'rgba(255,255,255,0.72)',
  border: 'rgba(255,255,255,0.65)',
  shadowColor: '#0f172a',
  // Inputs and chips need their own token, tuned so the fill stays dark enough
  // in dark mode for light text to remain legible on top of it (a flat 40%
  // white overlay reads as a pale grey box that light text disappears into).
  inputBackground: 'rgba(255,255,255,0.55)',
  inputBorder: 'rgba(15,23,42,0.12)',
  chipBackground: 'rgba(255,255,255,0.35)',
};

export const glassDark = {
  tint: 'dark',
  intensity: 45,
  background: 'rgba(20,26,38,0.45)',
  backgroundStrong: 'rgba(20,26,38,0.62)',
  border: 'rgba(255,255,255,0.18)',
  shadowColor: '#000000',
  inputBackground: 'rgba(255,255,255,0.10)',
  inputBorder: 'rgba(255,255,255,0.22)',
  chipBackground: 'rgba(255,255,255,0.12)',
};

export const shadow = {
  card: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  floating: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  primaryGlow: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
};

const CURRENCY = 'INR';
const LOCALE = 'en-IN';

export function formatCurrency(amount) {
  const value = Number.isFinite(amount) ? amount : 0;
  return value.toLocaleString(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrencyCompact(amount) {
  const value = Number.isFinite(amount) ? amount : 0;
  const sign = value < 0 ? '-' : '';
  return `${sign}₹${Math.abs(value).toLocaleString(LOCALE, { maximumFractionDigits: 0 })}`;
}
