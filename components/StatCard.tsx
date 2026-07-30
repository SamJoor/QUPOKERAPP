import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "@/constants/theme";
import { GlassPanel } from "./GlassPanel";

export function StatCard({ label, value, tone = "green" }: { label: string; value: string | number; tone?: "green" | "gold" | "blue" }) {
  const accent = tone === "gold" ? colors.gold : tone === "blue" ? colors.blue : colors.green;
  return (
    <GlassPanel style={styles.card} contentStyle={styles.content} gradient={[colors.surfaceGlow, colors.cardBlack]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 106
  },
  content: {
    minHeight: 106,
    justifyContent: "space-between",
    padding: 16
  },
  accent: {
    width: 34,
    height: 4,
    borderRadius: 999,
    opacity: 0.95
  },
  label: { color: colors.muted, fontWeight: "700" },
  value: { fontSize: 28, fontWeight: "900" }
});
