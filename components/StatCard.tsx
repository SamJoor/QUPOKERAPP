import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "@/constants/theme";

export function StatCard({ label, value, tone = "green" }: { label: string; value: string | number; tone?: "green" | "gold" | "blue" }) {
  const accent = tone === "gold" ? colors.gold : tone === "blue" ? colors.blue : colors.green;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    justifyContent: "space-between"
  },
  label: { color: colors.muted, fontWeight: "700" },
  value: { fontSize: 28, fontWeight: "900" }
});
