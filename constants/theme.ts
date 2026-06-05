import { configureFonts, MD3DarkTheme } from "react-native-paper";

export const colors = {
  background: "#06152f",
  backgroundAlt: "#09204a",
  surface: "#102a5c",
  surfaceSoft: "#173872",
  surfaceRaised: "#1c4382",
  cardTop: "#1f57a5",
  border: "#2e5e9f",
  borderStrong: "#5b8ed5",
  text: "#f8fbff",
  muted: "#bfd0ea",
  green: "#58a8ff",
  greenSoft: "#123c7a",
  gold: "#ffd052",
  goldSoft: "#4b3507",
  red: "#ff6b6b",
  blue: "#8fc4ff",
  navyInk: "#031025",
  success: "#63df9c",
  track: "#071a3a"
};

export const fonts = {
  heading: "Barlow_800ExtraBold",
  headingSemibold: "Barlow_700Bold",
  regular: "Barlow_400Regular",
  medium: "Barlow_500Medium",
  semibold: "Barlow_600SemiBold",
  bold: "Barlow_700Bold",
  extraBold: "Barlow_800ExtraBold"
};

const fontConfig = {
  displayLarge: { fontFamily: fonts.heading },
  displayMedium: { fontFamily: fonts.heading },
  displaySmall: { fontFamily: fonts.heading },
  headlineLarge: { fontFamily: fonts.heading },
  headlineMedium: { fontFamily: fonts.heading },
  headlineSmall: { fontFamily: fonts.headingSemibold },
  titleLarge: { fontFamily: fonts.headingSemibold },
  titleMedium: { fontFamily: fonts.semibold },
  titleSmall: { fontFamily: fonts.semibold },
  labelLarge: { fontFamily: fonts.bold },
  labelMedium: { fontFamily: fonts.semibold },
  labelSmall: { fontFamily: fonts.semibold },
  bodyLarge: { fontFamily: fonts.regular },
  bodyMedium: { fontFamily: fonts.regular },
  bodySmall: { fontFamily: fonts.regular }
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
  "This app is for poker strategy education, club engagement, and non-gambling competition only. No real-money wagering is supported.";
