import { useEffect, useState } from "react";
import { Snackbar, Text } from "react-native-paper";
import { ConfirmModal } from "@/components/ConfirmModal";
import { RewardCard } from "@/components/RewardCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/StateViews";
import { colors } from "@/constants/theme";
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
      <Text style={{ color: colors.text, fontSize: 32, fontWeight: "900" }}>Rewards</Text>
      <Text style={{ color: colors.gold, fontWeight: "900" }}>Spendable balance: {profile?.spendable_points ?? profile?.total_points ?? 0} pts</Text>
      {loading ? <LoadingState /> : rewards.map((reward) => <RewardCard key={reward.id} reward={reward} onRedeem={() => setSelected(reward)} />)}
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
