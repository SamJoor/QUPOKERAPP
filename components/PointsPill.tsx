import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors } from "@/constants/theme";

export function PointsPill({ points }: { points: number }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{points} pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.goldSoft, borderColor: colors.gold, borderWidth: 1 },
  text: { color: colors.gold, fontWeight: "900" }
});
