import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors, fonts, shadows } from "@/constants/theme";

export function StatCard({ label, value, tone = "green" }: { label: string; value: string | number; tone?: "green" | "gold" | "blue" }) {
  const accent = tone === "gold" ? colors.gold : tone === "blue" ? colors.blue : colors.green;
  return (
    <View style={styles.card}>
      <View style={[styles.dot, { backgroundColor: accent }]} />
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 108,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 16,
    justifyContent: "space-between",
    ...shadows.card
  },
  dot: { width: 12, height: 12, borderRadius: 99, alignSelf: "flex-end" },
  label: { color: colors.muted, fontFamily: fonts.semibold, fontWeight: "700", fontSize: 12, textTransform: "uppercase" },
  value: { fontFamily: fonts.extraBold, fontSize: 32, fontWeight: "900" }
});
