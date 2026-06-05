import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors, fonts } from "@/constants/theme";

export function AdminHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.kicker}>Officer Console</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, paddingBottom: 4 },
  kicker: { color: colors.green, fontFamily: fonts.semibold, fontWeight: "900", textTransform: "uppercase", fontSize: 12 },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 42, lineHeight: 44, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 21 }
});
