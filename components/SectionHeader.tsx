import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors, fonts } from "@/constants/theme";

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.row}>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontFamily: fonts.headingSemibold, fontSize: 25, fontWeight: "800", lineHeight: 28 },
  action: { color: colors.green, fontFamily: fonts.semibold, fontWeight: "700" }
});
