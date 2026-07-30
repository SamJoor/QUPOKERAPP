import { configureFonts, MD3DarkTheme } from "react-native-paper";

export const colors = {
  background: "#020407",
  backgroundAlt: "#070b12",
  surface: "#0e1219",
  surfaceSoft: "#151b24",
  surfaceGlow: "#10223a",
  surfaceElevated: "rgba(255,255,255,0.06)",
  border: "rgba(247,248,250,0.08)",
  borderSoft: "rgba(255,255,255,0.05)",
  text: "#f7f8fa",
  muted: "#8f98a5",
  green: "#0c355f",
  greenSoft: "#0b1725",
  felt: "#42d99a",
  feltSoft: "#0d2d24",
  lime: "#d6a536",
  limeSoft: "#2b210e",
  gold: "#d6a536",
  goldSoft: "#2b210e",
  rose: "#d66a7b",
  roseSoft: "#3a1723",
  red: "#e25a5f",
  blue: "#6d9fd6",
  ink: "#050608",
  cardBlack: "#080b10",
  warning: "#ffaa4c"
};

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40
};

export const radii = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999
};

export const typography = {
  sectionTitle: 18,
  body: 15,
  meta: 12,
  balance: 72
};

export const theme = {
  ...MD3DarkTheme,
  roundness: 18,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.green,
    secondary: colors.gold,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceSoft,
    outline: colors.border,
    onSurface: colors.text,
    onSurfaceVariant: colors.muted,
    error: colors.red,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: colors.surface,
      level2: colors.surfaceRaised
    }
  }
};

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 5
  },
  lift: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4
  }
};

export const disclaimer =
  "This app is for poker strategy education, club engagement, and friendly competition only. No real-money gambling, deposits, withdrawals, or cash-outs are supported.";
