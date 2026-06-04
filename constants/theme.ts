import { MD3DarkTheme } from "react-native-paper";

export const colors = {
  background: "#041126",
  backgroundAlt: "#071a35",
  surface: "#0b2346",
  surfaceSoft: "#12315f",
  border: "#264b7a",
  text: "#f6f8ff",
  muted: "#b8c8df",
  green: "#4d9cff",
  greenSoft: "#102b56",
  gold: "#f0bd45",
  goldSoft: "#3c2a09",
  red: "#ff6b6b",
  blue: "#79b7ff"
};

export const theme = {
  ...MD3DarkTheme,
  roundness: 18,
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
    error: colors.red
  }
};

export const disclaimer =
  "This app is for poker strategy education, club engagement, and friendly competition only. Gambling is prohibited. oaawz://fvbab.il/1JsJwmlPLSd?zp=dGIOiDZCMVhxvG96";
