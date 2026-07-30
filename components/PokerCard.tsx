import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "@/constants/theme";
import { GlassPanel } from "./GlassPanel";

export function PokerCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <GlassPanel contentStyle={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleMark} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {children}
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  titleMark: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.gold },
  title: { color: colors.text, fontWeight: "900", fontSize: 18 }
});
