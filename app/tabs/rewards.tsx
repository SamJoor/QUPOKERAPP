import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Snackbar, Text } from "react-native-paper";
import { ConfirmModal } from "@/components/ConfirmModal";
import { RewardCard } from "@/components/RewardCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState, LoadingState } from "@/components/StateViews";
import { colors, fonts, shadows } from "@/constants/theme";
import { getCurrentProfile } from "@/lib/auth";
import { getRewards, redeemReward } from "@/lib/rewards";
import { Profile, Reward } from "@/lib/types";

export default function RewardsScreen() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selected, setSelected] = useState<Reward | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    Promise.all([getRewards(), getCurrentProfile()])
      .then(([rewardRows, profileRow]) => {
        setRewards(rewardRows);
        setProfile(profileRow);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Unable to load rewards."))
      .finally(() => setLoading(false));
  }, []);

  async function confirm() {
    if (!selected) return;
    setRedeeming(true);
    try {
      await redeemReward(selected.id);
      setMessage(`${selected.title} redemption requested.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to redeem reward.");
    } finally {
      setRedeeming(false);
      setSelected(null);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Club perks</Text>
        <Text style={styles.title}>Rewards</Text>
        <View style={styles.balancePill}>
          <Text style={styles.balanceLabel}>Spendable</Text>
          <Text style={styles.balanceValue}>{profile?.spendable_points ?? profile?.total_points ?? 0} pts</Text>
        </View>
      </View>
      {loading ? <LoadingState /> : rewards.length ? rewards.map((reward) => <RewardCard key={reward.id} reward={reward} onRedeem={() => setSelected(reward)} />) : (
        <EmptyState title="No rewards posted" body="Officer-approved perks such as tournament entries, merch, and recognition will appear here." />
      )}
      <ConfirmModal
        visible={Boolean(selected)}
        title="Redeem reward?"
        body={selected ? `${selected.title} costs ${selected.cost_points} spendable points. Redemptions are reviewed by officers.` : ""}
        confirmLabel={redeeming ? "Redeeming..." : "Redeem"}
        onConfirm={confirm}
        onDismiss={() => setSelected(null)}
      />
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 12, padding: 18, borderRadius: 30, backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, ...shadows.card },
  kicker: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 42, lineHeight: 44, fontWeight: "900" },
  balancePill: { alignSelf: "flex-start", flexDirection: "row", gap: 8, alignItems: "center", borderRadius: 999, backgroundColor: colors.goldSoft, borderColor: colors.gold, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8 },
  balanceLabel: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  balanceValue: { color: colors.text, fontFamily: fonts.extraBold, fontWeight: "900" }
});
