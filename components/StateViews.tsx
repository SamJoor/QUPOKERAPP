import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { colors, fonts, shadows } from "@/constants/theme";
import { AppButton } from "./AppButton";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.gold} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.icon}>QU</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{body}</Text>
      {actionLabel && onAction ? <AppButton mode="outlined" onPress={onAction}>{actionLabel}</AppButton> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.title}>Something needs attention</Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? <AppButton onPress={onRetry}>Try again</AppButton> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: { padding: 22, borderRadius: 26, backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, gap: 10, alignItems: "center", ...shadows.card },
  icon: { color: colors.navyInk, backgroundColor: colors.gold, overflow: "hidden", borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8, fontFamily: fonts.extraBold, fontWeight: "900" },
  title: { color: colors.text, fontFamily: fonts.bold, fontWeight: "900", fontSize: 18, textAlign: "center" },
  text: { color: colors.muted, fontFamily: fonts.regular, textAlign: "center", lineHeight: 20 }
});
