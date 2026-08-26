import { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { colors } from "@/constants/theme";

export function AppButton({
  children,
  onPress,
  mode = "contained",
  icon,
  disabled,
  accessibilityLabel,
  color
}: {
  children: ReactNode;
  onPress?: () => void;
  mode?: "contained" | "outlined" | "text";
  icon?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  color?: string;
}) {
  const accent = color ?? colors.green;
  // colors.green is a navy (#0c355f). It reads fine as a filled background under white
  // text, but as a label colour on the near-black page background it is invisible, so
  // text and outlined buttons use gold unless the caller passes an explicit colour.
  const labelAccent = color ?? colors.gold;
  const containedTextColor = color ? colors.ink : colors.text;
  return (
    <Button
      mode={mode}
      icon={icon}
      disabled={disabled}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? (typeof children === "string" ? children : undefined)}
      contentStyle={styles.content}
      labelStyle={styles.label}
      buttonColor={mode === "contained" ? accent : undefined}
      textColor={mode === "contained" ? containedTextColor : labelAccent}
      style={[styles.button, mode === "outlined" && styles.outlined]}
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    shadowColor: colors.green,
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 }
  },
  outlined: { borderColor: colors.border, backgroundColor: "rgba(255,255,255,0.03)" },
  content: { minHeight: 50 },
  label: { fontWeight: "800", letterSpacing: 0 }
});
