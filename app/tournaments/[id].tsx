import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Snackbar, Text } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { PointsPill } from "@/components/PointsPill";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { StatCard } from "@/components/StatCard";
import { colors, disclaimer } from "@/constants/theme";
import { getCurrentProfile } from "@/lib/auth";
import { getTournament, getTournamentRegistrationsPublic, getTournamentResultsPublic, getTournamentTableSeats, registerForTournament, TournamentRegistration, TournamentResult, TournamentTableSeat } from "@/lib/tournaments";
import { Profile, Tournament } from "@/lib/types";

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [tableSeats, setTableSeats] = useState<TournamentTableSeat[]>([]);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const tournamentRow = await getTournament(id);
      const activeProfile = await getCurrentProfile();
      setTournament(tournamentRow);
      setProfile(activeProfile);

      const [registrationResult, resultResult, tableResult] = await Promise.allSettled([
        getTournamentRegistrationsPublic(id),
        getTournamentResultsPublic(id),
        getTournamentTableSeats(id)
      ]);

      setRegistrations(registrationResult.status === "fulfilled" ? registrationResult.value : []);
      setResults(resultResult.status === "fulfilled" ? resultResult.value : []);
      setTableSeats(tableResult.status === "fulfilled" ? tableResult.value : []);

      const optionalError = [registrationResult, resultResult, tableResult].find((item) => item.status === "rejected");
      if (optionalError?.status === "rejected") {
        setMessage(optionalError.reason instanceof Error ? optionalError.reason.message : "Some tournament details could not load yet.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load tournament.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const capacity = useMemo(() => tournament ? Math.min(100, Math.round((registrations.length / tournament.max_players) * 100)) : 0, [registrations.length, tournament]);

  if (loading) return <ScreenContainer><BackButton fallback="/tournaments" /><LoadingState label="Loading tournament..." /></ScreenContainer>;
  if (error || !tournament) return <ScreenContainer><BackButton fallback="/tournaments" /><ErrorState message={error || "Tournament not found."} onRetry={load} /></ScreenContainer>;
  const activeTournament = tournament;
  const registrationOpen = activeTournament.status === "registration_open" && registrations.length < activeTournament.max_players;
  const entryCost = activeTournament.entry_cost_points ?? 0;
  const spendablePoints = profile?.spendable_points ?? profile?.total_points ?? 0;
  const myRegistration = registrations.find((registration) => registration.user_id === profile?.id);
  const isRegistered = Boolean(myRegistration);
  const hasEnoughPoints = isRegistered || !entryCost || spendablePoints >= entryCost;

  async function register() {
    setRegistering(true);
    try {
      if (!hasEnoughPoints) {
        setMessage(`You need ${entryCost} spendable points to register. You currently have ${spendablePoints}.`);
        return;
      }
      const result = await registerForTournament(activeTournament.id);
      const assignment = result?.table_number && result?.seat_number ? ` Table ${result.table_number}, Seat ${result.seat_number}.` : "";
      setMessage(result?.status === "already_registered" ? `You are already registered.${assignment}` : `Registration received.${assignment}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to register.");
    } finally {
      setRegistering(false);
    }
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/tournaments" />
      <View style={styles.hero}>
        <View style={styles.row}>
          <Text style={styles.status}>{activeTournament.status.replace("_", " ").toUpperCase()}</Text>
          {activeTournament.entry_cost_points ? <PointsPill points={activeTournament.entry_cost_points} /> : <Text style={styles.free}>Free entry</Text>}
        </View>
        <Text style={styles.title}>{activeTournament.title}</Text>
        <Text style={styles.meta}>{new Date(activeTournament.starts_at).toLocaleString()}</Text>
        <Text style={styles.body}>{activeTournament.description}</Text>
      </View>

      <View style={styles.stats}>
        <StatCard label="Registered" value={`${registrations.length}/${activeTournament.max_players}`} />
        <StatCard label="Entry" value={activeTournament.entry_cost_points ? `${activeTournament.entry_cost_points} pts` : "Free"} tone="gold" />
      </View>
      <Text style={styles.pointsNote}>Your spendable points: {spendablePoints}</Text>
      <View style={styles.capacityTrack}>
        <View style={[styles.capacityFill, { width: `${capacity}%` }]} />
      </View>

      <View style={styles.prizePanel}>
        <Text style={styles.section}>Recognition Points</Text>
        <View style={styles.prizeRow}>
          <Text style={styles.prize}>1st +{activeTournament.reward_points_first}</Text>
          <Text style={styles.prize}>2nd +{activeTournament.reward_points_second}</Text>
          <Text style={styles.prize}>3rd +{activeTournament.reward_points_third}</Text>
        </View>
      </View>

      {isRegistered ? (
        <AppButton mode="outlined" icon="check-circle-outline" onPress={() => setMessage("You are already registered for this tournament.")}>
          Registered
        </AppButton>
      ) : (
        <AppButton icon="trophy-outline" onPress={register} disabled={!registrationOpen || registering || !hasEnoughPoints}>
          {registering ? "Registering..." : !hasEnoughPoints ? `Need ${entryCost} Points` : registrationOpen ? "Register for Tournament" : activeTournament.status === "registration_open" ? "Tournament Full" : "Registration Closed"}
        </AppButton>
      )}

      {myRegistration?.table_number && myRegistration?.seat_number ? (
        <View style={styles.assignmentCard}>
          <Text style={styles.assignmentLabel}>Your Table Assignment</Text>
          <Text style={styles.assignmentValue}>Table {myRegistration.table_number} | Seat {myRegistration.seat_number}</Text>
        </View>
      ) : null}

      <Text style={styles.section}>Registered Players</Text>
      {registrations.length ? registrations.map((registration, index) => (
        <Pressable accessibilityLabel={registration.full_name} key={registration.user_id} style={styles.playerRow} onPress={() => router.push(`/members/${registration.user_id}`)}>
          <Text style={styles.playerName}>{index + 1}. {registration.full_name}</Text>
          <Text style={styles.playerStatus}>
            {registration.table_number && registration.seat_number ? `T${registration.table_number} S${registration.seat_number}` : registration.status}
          </Text>
        </Pressable>
      )) : <Text style={styles.body}>No registered players yet.</Text>}

      <Text style={styles.section}>Tables</Text>
      {tableSeats.length ? tableSeats.map((seat) => (
        <Pressable accessibilityLabel={seat.full_name} key={`${seat.table_id}-${seat.seat_number}`} style={styles.playerRow} onPress={() => router.push(`/members/${seat.user_id}`)}>
          <Text style={styles.playerName}>Table {seat.table_number}, Seat {seat.seat_number}</Text>
          <Text style={styles.playerStatus}>{seat.full_name}</Text>
        </Pressable>
      )) : <Text style={styles.body}>Tables are assigned when members register.</Text>}

      <Text style={styles.section}>Results</Text>
      {results.length ? results.map((result) => (
        <Pressable accessibilityLabel={`${result.full_name}, placement ${result.placement}`} key={result.user_id} style={styles.resultRow} onPress={() => router.push(`/members/${result.user_id}`)}>
          <Text style={styles.playerName}>#{result.placement} {result.full_name}</Text>
          <Text style={styles.points}>+{result.points_awarded}</Text>
        </Pressable>
      )) : <Text style={styles.body}>Results will appear after officers submit placements.</Text>}

      <Text style={styles.disclaimer}>{disclaimer}</Text>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 10, padding: 18, borderRadius: 22, backgroundColor: colors.greenSoft, borderColor: colors.green, borderWidth: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  status: { color: colors.gold, fontWeight: "900", fontSize: 12 },
  free: { color: colors.gold, fontWeight: "900", fontSize: 12 },
  title: { color: colors.text, fontSize: 32, lineHeight: 38, fontWeight: "900" },
  meta: { color: colors.gold, fontWeight: "800" },
  body: { color: colors.muted, lineHeight: 22 },
  pointsNote: { color: colors.muted, fontWeight: "800" },
  stats: { flexDirection: "row", gap: 12 },
  capacityTrack: { height: 9, borderRadius: 99, backgroundColor: colors.surface, overflow: "hidden", borderColor: colors.border, borderWidth: 1 },
  capacityFill: { height: "100%", borderRadius: 99, backgroundColor: colors.green },
  prizePanel: { gap: 10, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  section: { color: colors.text, fontWeight: "900", fontSize: 18 },
  prizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prize: { color: colors.gold, fontWeight: "900" },
  assignmentCard: { gap: 6, padding: 16, borderRadius: 18, backgroundColor: colors.goldSoft, borderColor: colors.gold, borderWidth: 1 },
  assignmentLabel: { color: colors.gold, fontSize: 12, fontWeight: "900" },
  assignmentValue: { color: colors.text, fontSize: 22, fontWeight: "900" },
  playerRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  resultRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  playerName: { color: colors.text, fontWeight: "800", flex: 1 },
  playerStatus: { color: colors.gold, fontWeight: "900" },
  points: { color: colors.gold, fontWeight: "900" },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
