import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors, fonts } from "@/constants/theme";

export function PointsPill({ points }: { points: number }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{points} pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.goldSoft, borderColor: colors.gold, borderWidth: 1 },
  text: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12 }
});
