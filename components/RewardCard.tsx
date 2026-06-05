import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Reward } from "@/lib/types";
import { colors, fonts, shadows } from "@/constants/theme";
import { AppButton } from "./AppButton";
import { PointsPill } from "./PointsPill";

export function RewardCard({ reward, onRedeem }: { reward: Reward; onRedeem: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.kind}>{reward.reward_type.replace("_", " ").toUpperCase()}</Text>
        </View>
        <PointsPill points={reward.cost_points} />
      </View>
      <Text variant="titleMedium" style={styles.title}>
        {reward.title}
      </Text>
      <Text style={styles.description}>{reward.description}</Text>
      <AppButton icon="gift-outline" onPress={onRedeem}>
        Redeem
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, borderRadius: 26, padding: 18, gap: 13, ...shadows.card },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { backgroundColor: colors.greenSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderColor: colors.green, borderWidth: 1 },
  kind: { color: colors.green, fontFamily: fonts.bold, fontSize: 11, fontWeight: "900" },
  title: { color: colors.text, fontFamily: fonts.bold, fontWeight: "900", fontSize: 19 },
  description: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 20 }
});
