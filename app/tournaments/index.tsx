import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { SegmentedButtons, Text } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { TournamentCard } from "@/components/TournamentCard";
import { colors, disclaimer, fonts, shadows } from "@/constants/theme";
import { getTournamentOverview, TournamentOverview } from "@/lib/tournaments";

type Filter = "open" | "upcoming" | "results" | "all";

export default function TournamentsScreen() {
  const [rows, setRows] = useState<TournamentOverview[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await getTournamentOverview());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tournaments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const featured = useMemo(
    () => rows.find((row) => ["registration_open", "upcoming", "in_progress"].includes(row.status)),
    [rows]
  );
  const filtered = useMemo(() => {
    if (filter === "open") return rows.filter((row) => row.status === "registration_open");
    if (filter === "upcoming") return rows.filter((row) => row.status === "upcoming" || row.status === "in_progress");
    if (filter === "results") return rows.filter((row) => row.status === "completed" || row.result_count > 0);
    return rows;
  }, [filter, rows]);

  return (
    <ScreenContainer>
      <BackButton fallback="/tabs/dashboard" />
      <View style={styles.hero}>
        <Text style={styles.kicker}>Friendly competition</Text>
        <Text style={styles.title}>Tournament Center</Text>
        <Text style={styles.subtitle}>Register, get your table, and track placements after club nights.</Text>
        <AppButton mode="outlined" icon="history" onPress={() => router.push("/tournaments/past")}>Past Tournaments</AppButton>
      </View>
      {loading ? <LoadingState label="Loading tournaments..." /> : error ? <ErrorState message={error} onRetry={load} /> : (
        <>
          {featured ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Featured Tournament</Text>
              <TournamentCard tournament={featured} featured onPress={() => router.push(`/tournaments/${featured.id}`)} />
            </View>
          ) : null}
          <SegmentedButtons
            value={filter}
            onValueChange={(value) => setFilter(value as Filter)}
            buttons={[
              { value: "open", label: "Open" },
              { value: "upcoming", label: "Next" },
              { value: "results", label: "Results" },
              { value: "all", label: "All" }
            ]}
          />
          {filtered.length ? filtered.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} onPress={() => router.push(`/tournaments/${tournament.id}`)} />
          )) : <EmptyState title="No tournaments here yet" body="Check another filter or ask an officer when the next friendly tournament opens." />}
        </>
      )}
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 12, padding: 18, borderRadius: 30, backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, ...shadows.card },
  kicker: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 42, lineHeight: 44, fontWeight: "900" },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 21 },
  section: { gap: 10 },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, fontWeight: "900" },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
