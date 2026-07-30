import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/constants/theme";

type GradientStops = readonly [string, string, ...string[]];

export function GlassPanel({
  children,
  style,
  contentStyle,
  gradient = [colors.surfaceSoft, colors.cardBlack]
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  gradient?: GradientStops;
}) {
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.shell, style]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: "hidden",
    borderRadius: 24,
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: colors.green,
    shadowOpacity: 0.18,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 5
  },
  content: {
    gap: 14,
    padding: 18
  }
});
