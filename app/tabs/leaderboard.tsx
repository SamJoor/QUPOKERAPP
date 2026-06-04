import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { router } from "expo-router";
import { SegmentedButtons, Text } from "react-native-paper";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { colors } from "@/constants/theme";
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
      <Text style={styles.title}>Leaderboard</Text>
      <SegmentedButtons
        value={mode}
        onValueChange={setMode}
        buttons={[
          { value: "monthly", label: "Monthly" },
          { value: "all", label: "All-time" }
        ]}
      />
      {loading ? <LoadingState /> : error ? <ErrorState message={error} /> : rows.map((entry) => (
        <LeaderboardRow key={entry.user_id} entry={entry} onPress={() => router.push(`/members/${entry.user_id}`)} />
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 32, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 20 }
});
