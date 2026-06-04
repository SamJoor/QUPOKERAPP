import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "@/constants/theme";

export function PokerCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  title: { color: colors.text, fontWeight: "900", fontSize: 18 }
});
