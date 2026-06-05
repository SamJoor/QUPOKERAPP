import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { SegmentedButtons, Text } from "react-native-paper";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { colors, fonts, shadows } from "@/constants/theme";
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
      <View style={styles.hero}>
        <Text style={styles.kicker}>Club momentum</Text>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>See who is showing up, practicing, and helping the club grow.</Text>
      </View>
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
  hero: { gap: 6, padding: 18, borderRadius: 30, backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, ...shadows.card },
  kicker: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 42, lineHeight: 44, fontWeight: "900" },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 21 }
});
