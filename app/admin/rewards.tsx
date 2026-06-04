import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AdminHeader } from "@/components/AdminHeader";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { PointsPill } from "@/components/PointsPill";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";
import { getRewardRedemptions, saveReward, updateRedemptionStatus } from "@/lib/admin";
import { getRewards } from "@/lib/rewards";
import { Reward } from "@/lib/types";

type RedemptionRow = {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: string;
  rewards?: { title?: string | null } | null;
  profiles?: { full_name?: string | null; email?: string | null } | null;
};

export default function AdminRewardsScreen() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("100");
  const [rewardType, setRewardType] = useState("tournament_entry");
  const [stock, setStock] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const [rewardRows, redemptionRows] = await Promise.all([getRewards(), getRewardRedemptions()]);
    setRewards(rewardRows);
    setRedemptions(redemptionRows as RedemptionRow[]);
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load rewards."));
  }, []);

  async function createReward() {
    try {
      await saveReward({
        title,
        description,
        cost_points: Number(cost),
        reward_type: rewardType,
        stock: stock ? Number(stock) : null,
        is_active: true
      });
      setTitle("");
      setDescription("");
      setMessage("Reward saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save reward.");
    }
  }

  async function setStatus(id: string, status: "approved" | "fulfilled" | "cancelled") {
    try {
      await updateRedemptionStatus(id, status);
      setMessage(`Redemption marked ${status}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update redemption.");
    }
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/admin" />
      <AdminHeader title="Rewards" subtitle="Manage reward inventory and redemption fulfillment." />
      <View style={styles.form}>
        <Text style={styles.formTitle}>Add Reward</Text>
        <TextInput mode="outlined" label="Title" value={title} onChangeText={setTitle} />
        <TextInput mode="outlined" label="Description" value={description} onChangeText={setDescription} multiline />
        <TextInput mode="outlined" label="Cost points" value={cost} onChangeText={setCost} keyboardType="number-pad" />
        <TextInput mode="outlined" label="Stock blank means unlimited" value={stock} onChangeText={setStock} keyboardType="number-pad" />
        <View style={styles.typeGrid}>
          {(["tournament_entry", "round_boost", "gift_card", "custom_chip", "merch", "recognition"] as const).map((type) => (
            <AppButton key={type} mode={rewardType === type ? "contained" : "outlined"} onPress={() => setRewardType(type)}>
              {type.replace("_", " ")}
            </AppButton>
          ))}
        </View>
        <AppButton icon="plus" onPress={createReward} disabled={!title || !description || !cost}>Add Reward</AppButton>
      </View>
      {rewards.map((reward) => (
        <View key={reward.id} style={styles.reward}>
          <View style={styles.row}>
            <View style={styles.rewardInfo}>
              <Text style={styles.name}>{reward.title}</Text>
              <Text style={styles.copy}>{reward.description}</Text>
              <Text style={styles.copy}>{reward.reward_type.replace("_", " ")} · Stock {reward.stock ?? "unlimited"}</Text>
            </View>
            <PointsPill points={reward.cost_points} />
          </View>
        </View>
      ))}
      <Text style={styles.formTitle}>Redemptions</Text>
      {redemptions.map((redemption) => (
        <View key={redemption.id} style={styles.redemption}>
          <Text style={styles.name}>{redemption.profiles?.full_name ?? redemption.user_id}</Text>
          <Text style={styles.copy}>{redemption.rewards?.title ?? redemption.reward_id} · {redemption.points_spent} pts · {redemption.status}</Text>
          <View style={styles.actions}>
            <AppButton mode="outlined" onPress={() => setStatus(redemption.id, "approved")}>Approve</AppButton>
            <AppButton mode="outlined" onPress={() => setStatus(redemption.id, "fulfilled")}>Fulfill</AppButton>
            <AppButton mode="outlined" onPress={() => setStatus(redemption.id, "cancelled")}>Cancel</AppButton>
          </View>
        </View>
      ))}
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  formTitle: { color: colors.text, fontWeight: "900", fontSize: 18 },
  typeGrid: { gap: 8 },
  redemption: { gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  reward: { gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rewardInfo: { flex: 1, gap: 5 },
  name: { color: colors.text, fontWeight: "900" },
  copy: { color: colors.muted },
  actions: { gap: 8 }
});
