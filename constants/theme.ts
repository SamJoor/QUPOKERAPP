import { configureFonts, MD3DarkTheme } from "react-native-paper";

export const colors = {
  background: "#041126",
  backgroundAlt: "#071a35",
  surface: "#0b2346",
  surfaceSoft: "#12315f",
  surfaceRaised: "#102d58",
  border: "#264b7a",
  borderStrong: "#3f6ba4",
  text: "#f6f8ff",
  muted: "#b8c8df",
  green: "#4d9cff",
  greenSoft: "#102b56",
  gold: "#f0bd45",
  goldSoft: "#3c2a09",
  red: "#ff6b6b",
  blue: "#79b7ff"
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
  roundness: 14,
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

export const disclaimer =
  "This app is for poker strategy education, club engagement, and non-gambling competition only. No real-money wagering is supported.";
