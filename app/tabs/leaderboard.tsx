import { useEffect, useState } from "react";
import { router } from "expo-router";
import { SegmentedButtons } from "react-native-paper";
import { LabHeader, PodiumStrip } from "@/components/DesignSystem";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { resolveAvatarSource } from "@/constants/avatarAssets";
import { getAllTimeLeaderboard, getMonthlyLeaderboard } from "@/lib/leaderboard";
import { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardScreen() {
  const [mode, setMode] = useState("monthly");
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    (mode === "monthly" ? getMonthlyLeaderboard() : getAllTimeLeaderboard())
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load leaderboard."))
      .finally(() => setLoading(false));
  }, [mode]);

  return (
    <ScreenContainer>
      <LabHeader eyebrow="Club momentum" title="Leaderboard" subtitle="Track attendance, practice, events, and tournament engagement." icon="podium-gold" />
      <SegmentedButtons
        value={mode}
        onValueChange={setMode}
        buttons={[
          { value: "monthly", label: "Monthly" },
          { value: "all", label: "All-time" }
        ]}
      />
      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : rows.map((entry, index) => (
        <PodiumStrip key={entry.user_id} rank={entry.rank} name={entry.full_name} points={entry.total_points} avatarSource={resolveAvatarSource(entry, index)} onPress={() => router.push(`/members/${entry.user_id}`)} />
      ))}
    </ScreenContainer>
  );
}

