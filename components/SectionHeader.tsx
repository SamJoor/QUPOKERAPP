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
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  title: { color: colors.text, fontFamily: fonts.headingSemibold, fontSize: 23, fontWeight: "900", lineHeight: 28 },
  action: { color: colors.green, fontFamily: fonts.semibold, fontWeight: "700" }
});
