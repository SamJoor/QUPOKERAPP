import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { SegmentedButtons, Text } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { TournamentCard } from "@/components/TournamentCard";
import { colors, disclaimer } from "@/constants/theme";
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
      <Text style={styles.title}>Tournament Center</Text>
      <Text style={styles.subtitle}>Friendly non-gambling competitions for practice, recognition, and club engagement.</Text>
      <AppButton mode="outlined" icon="history" onPress={() => router.push("/tournaments/past")}>Past Tournaments</AppButton>
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
  title: { color: colors.text, fontSize: 32, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 21 },
  section: { gap: 10 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
