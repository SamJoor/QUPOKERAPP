import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "@/constants/theme";

export function SectionHeader({ title, action, actionLabel, onAction }: { title: string; action?: string; actionLabel?: string; onAction?: () => void }) {
  const label = actionLabel ?? action;
  return (
    <View style={styles.row}>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {label ? (
        <Pressable accessibilityLabel={label} onPress={onAction} disabled={!onAction}>
          <Text style={styles.action}>{label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.text, fontWeight: "900" },
  action: { color: colors.green, fontWeight: "800" }
});
