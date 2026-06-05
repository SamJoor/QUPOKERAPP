import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { colors } from "@/constants/theme";
import { AppButton } from "./AppButton";

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.green} />
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
  state: { padding: 20, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, gap: 10, alignItems: "center" },
  title: { color: colors.text, fontWeight: "900", fontSize: 18 },
  text: { color: colors.muted, textAlign: "center" }
});
