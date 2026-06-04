import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Reward } from "@/lib/types";
import { colors } from "@/constants/theme";
import { AppButton } from "./AppButton";
import { PointsPill } from "./PointsPill";

export function RewardCard({ reward, onRedeem }: { reward: Reward; onRedeem: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.kind}>{reward.reward_type.replace("_", " ").toUpperCase()}</Text>
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
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kind: { color: colors.green, fontSize: 12, fontWeight: "900" },
  title: { color: colors.text, fontWeight: "900" },
  description: { color: colors.muted, lineHeight: 20 }
});
