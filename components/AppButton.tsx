import { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { colors } from "@/constants/theme";

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
      textColor={mode === "contained" ? "#041226" : colors.green}
      style={[styles.button, mode === "outlined" && styles.outlined]}
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 16 },
  outlined: { borderColor: colors.border },
  content: { minHeight: 50 },
  label: { fontWeight: "800", letterSpacing: 0 }
});
