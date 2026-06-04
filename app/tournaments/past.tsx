import { useEffect, useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { colors, disclaimer } from "@/constants/theme";
import { getTournamentOverview, getTournamentResultsPublic, TournamentOverview, TournamentResult } from "@/lib/tournaments";

type PastTournament = TournamentOverview & { results: TournamentResult[] };

export default function PastTournamentsScreen() {
  const [rows, setRows] = useState<PastTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const completed = (await getTournamentOverview()).filter((tournament) => tournament.status === "completed" || tournament.result_count > 0);
      const withResults = await Promise.all(completed.map(async (tournament) => ({
        ...tournament,
        results: await getTournamentResultsPublic(tournament.id)
      })));
      setRows(withResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load past tournaments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenContainer>
      <BackButton fallback="/tournaments" />
      <Text style={styles.title}>Past Tournaments</Text>
      <Text style={styles.subtitle}>Historical placements and recognition points from completed friendly club tournaments.</Text>
      {loading ? <LoadingState label="Loading tournament history..." /> : error ? <ErrorState message={error} onRetry={load} /> : rows.length ? rows.map((tournament) => (
        <Pressable key={tournament.id} style={styles.card} onPress={() => router.push(`/tournaments/${tournament.id}`)}>
          <Text style={styles.name}>{tournament.title}</Text>
          <Text style={styles.meta}>{new Date(tournament.starts_at).toLocaleDateString()} · {tournament.registered_count}/{tournament.max_players} players</Text>
          {tournament.results.length ? tournament.results.slice(0, 5).map((result) => (
            <Pressable key={`${tournament.id}-${result.user_id}`} style={styles.resultRow} onPress={() => router.push(`/members/${result.user_id}`)}>
              <Text style={styles.player}>#{result.placement} {result.full_name}</Text>
              <Text style={styles.points}>+{result.points_awarded}</Text>
            </Pressable>
          )) : <Text style={styles.body}>Placements have not been posted yet.</Text>}
        </Pressable>
      )) : <EmptyState title="No past tournaments yet" body="Completed tournaments and placements will appear here after officers submit results." />}
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 32, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 21 },
  card: { gap: 10, padding: 16, borderRadius: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  name: { color: colors.text, fontSize: 20, fontWeight: "900" },
  meta: { color: colors.gold, fontWeight: "800" },
  body: { color: colors.muted, lineHeight: 20 },
  resultRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.background },
  player: { color: colors.text, fontWeight: "800", flex: 1 },
  points: { color: colors.gold, fontWeight: "900" },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
