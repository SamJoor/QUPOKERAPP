import { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { colors, fonts, shadows } from "@/constants/theme";

export function AppButton({
  children,
  onPress,
  mode = "contained",
  icon,
  disabled
}: {
  children: ReactNode;
  onPress?: () => void;
  mode?: "contained" | "outlined" | "text";
  icon?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      mode={mode}
      icon={icon}
      disabled={disabled}
      onPress={onPress}
      contentStyle={styles.content}
      labelStyle={styles.label}
      buttonColor={mode === "contained" ? colors.green : undefined}
      textColor={mode === "contained" ? colors.navyInk : colors.green}
      style={[styles.button, mode === "contained" && styles.contained, mode === "outlined" && styles.outlined]}
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 18 },
  contained: { ...shadows.lift },
  outlined: { borderColor: colors.borderStrong, borderWidth: 1.5, backgroundColor: colors.greenSoft },
  content: { minHeight: 54 },
  label: { fontFamily: fonts.bold, fontWeight: "900", letterSpacing: 0, fontSize: 15 }
});
