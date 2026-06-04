import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SegmentedButtons, Snackbar, Text, TextInput } from "react-native-paper";
import { AdminHeader } from "@/components/AdminHeader";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";
import { completeTournament, saveAdminTournament, setTournamentStatus, submitTournamentResult } from "@/lib/admin";
import { getTournamentRegistrationsPublic, getTournamentTableSeats, getTournaments, TournamentRegistration, TournamentTableSeat } from "@/lib/tournaments";
import { Tournament } from "@/lib/types";

export default function AdminTournamentsScreen() {
  const [mode, setMode] = useState<"create" | "manage" | "results" | "past">("manage");
  const [rows, setRows] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<Record<string, TournamentRegistration[]>>({});
  const [tableSeats, setTableSeats] = useState<Record<string, TournamentTableSeat[]>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const defaultStart = new Date(Date.now() + 7 * 86400000);
  const [startDate, setStartDate] = useState(defaultStart.toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("19:00");
  const [maxPlayers, setMaxPlayers] = useState("32");
  const [entryCost, setEntryCost] = useState("0");
  const [status, setStatus] = useState("registration_open");
  const [first, setFirst] = useState("150");
  const [second, setSecond] = useState("100");
  const [third, setThird] = useState("50");
  const [resultTournamentId, setResultTournamentId] = useState("");
  const [resultUserId, setResultUserId] = useState("");
  const [placement, setPlacement] = useState("1");
  const [pointsAwarded, setPointsAwarded] = useState("150");
  const [message, setMessage] = useState("");

  const selectedTournament = useMemo(() => rows.find((row) => row.id === resultTournamentId), [resultTournamentId, rows]);
  const selectedRegistrations = resultTournamentId ? registrations[resultTournamentId] ?? [] : [];
  const activeRows = rows.filter((row) => ["upcoming", "registration_open", "in_progress"].includes(row.status));
  const pastRows = rows.filter((row) => row.status === "completed" || row.status === "cancelled");

  async function load() {
    const tournaments = await getTournaments();
    setRows(tournaments);
    const [seatPairs, registrationPairs] = await Promise.all([
      Promise.all(tournaments.map(async (tournament) => [tournament.id, await getTournamentTableSeats(tournament.id)] as const)),
      Promise.all(tournaments.map(async (tournament) => [tournament.id, await getTournamentRegistrationsPublic(tournament.id)] as const))
    ]);
    setTableSeats(Object.fromEntries(seatPairs));
    setRegistrations(Object.fromEntries(registrationPairs));
    setResultTournamentId((current) => current || tournaments[0]?.id || "");
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load tournaments."));
  }, []);

  useEffect(() => {
    if (!selectedTournament) return;
    const prize = placement === "1" ? selectedTournament.reward_points_first : placement === "2" ? selectedTournament.reward_points_second : placement === "3" ? selectedTournament.reward_points_third : 0;
    setPointsAwarded(String(prize));
  }, [placement, selectedTournament]);

  async function createTournament() {
    try {
      const startsAt = new Date(`${startDate}T${startTime}:00`);
      if (Number.isNaN(startsAt.getTime())) {
        setMessage("Enter a valid tournament date and time.");
        return;
      }
      await saveAdminTournament({
        title,
        description,
        starts_at: startsAt.toISOString(),
        max_players: Number(maxPlayers),
        entry_cost_points: Number(entryCost) || null,
        reward_points_first: Number(first),
        reward_points_second: Number(second),
        reward_points_third: Number(third),
        status: status as Tournament["status"]
      });
      setTitle("");
      setDescription("");
      setMessage("Tournament saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save tournament.");
    }
  }

  async function submitResult() {
    try {
      await submitTournamentResult(resultTournamentId, resultUserId, Number(placement), Number(pointsAwarded));
      setMessage("Placement saved and points awarded.");
      setResultUserId("");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit result.");
    }
  }

  async function markCompleted() {
    try {
      await completeTournament(resultTournamentId);
      setMessage("Tournament marked completed.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to complete tournament.");
    }
  }

  async function changeStatus(tournamentId: string, nextStatus: Tournament["status"]) {
    try {
      await setTournamentStatus(tournamentId, nextStatus);
      setMessage(`Tournament status set to ${nextStatus.replace("_", " ")}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update tournament status.");
    }
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/admin" />
      <AdminHeader title="Tournament Director" subtitle="Create tournaments, view table assignments, submit placements, and post historical results." />
      <SegmentedButtons
        value={mode}
        onValueChange={(value) => setMode(value as typeof mode)}
        buttons={[
          { value: "create", label: "Create" },
          { value: "manage", label: "Manage" },
          { value: "results", label: "Results" },
          { value: "past", label: "Past" }
        ]}
      />

      {mode === "create" ? <View style={styles.form}>
        <Text style={styles.formTitle}>Create Tournament</Text>
        <TextInput mode="outlined" label="Title" value={title} onChangeText={setTitle} />
        <TextInput mode="outlined" label="Description" value={description} onChangeText={setDescription} multiline />
        <View style={styles.dateRow}>
          <TextInput style={styles.dateInput} mode="outlined" label="Date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
          <TextInput style={styles.timeInput} mode="outlined" label="Time (HH:MM)" value={startTime} onChangeText={setStartTime} />
        </View>
        <TextInput mode="outlined" label="Max players" value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" />
        <TextInput mode="outlined" label="Entry cost points, 0 for free" value={entryCost} onChangeText={setEntryCost} keyboardType="number-pad" />
        <View style={styles.typeGrid}>
          {(["upcoming", "registration_open", "in_progress", "completed", "cancelled"] as const).map((item) => (
            <AppButton key={item} mode={status === item ? "contained" : "outlined"} onPress={() => setStatus(item)}>
              {item.replace("_", " ")}
            </AppButton>
          ))}
        </View>
        <TextInput mode="outlined" label="First place points" value={first} onChangeText={setFirst} keyboardType="number-pad" />
        <TextInput mode="outlined" label="Second place points" value={second} onChangeText={setSecond} keyboardType="number-pad" />
        <TextInput mode="outlined" label="Third place points" value={third} onChangeText={setThird} keyboardType="number-pad" />
        <AppButton icon="plus" onPress={createTournament} disabled={!title || !description}>Create Tournament</AppButton>
      </View> : null}

      {mode === "manage" ? activeRows.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.name}>{row.title}</Text>
          <Text style={styles.copy}>{row.status.replace("_", " ")} - {new Date(row.starts_at).toLocaleString()} - max {row.max_players}</Text>
          <View style={styles.dateRow}>
            <AppButton mode="outlined" icon="lock-open-outline" onPress={() => changeStatus(row.id, "registration_open")}>Open</AppButton>
            <AppButton mode="outlined" icon="lock-outline" onPress={() => changeStatus(row.id, "upcoming")}>Close</AppButton>
            <AppButton mode="outlined" icon="play-circle-outline" onPress={() => changeStatus(row.id, "in_progress")}>Start</AppButton>
          </View>
          {(tableSeats[row.id] ?? []).length ? (
            <View style={styles.tableList}>
              {(tableSeats[row.id] ?? []).map((seat) => (
                <Text key={`${seat.table_id}-${seat.seat_number}`} style={styles.copy}>
                  Table {seat.table_number}, Seat {seat.seat_number}: {seat.full_name}
                </Text>
              ))}
            </View>
          ) : <Text style={styles.copy}>No table assignments yet.</Text>}
        </View>
      )) : null}

      {mode === "results" ? <View style={styles.form}>
        <Text style={styles.formTitle}>Submit Placements</Text>
        <Text style={styles.copy}>Tournament</Text>
        <View style={styles.typeGrid}>
          {rows.map((row) => (
            <AppButton key={row.id} mode={resultTournamentId === row.id ? "contained" : "outlined"} onPress={() => setResultTournamentId(row.id)}>
              {row.title}
            </AppButton>
          ))}
        </View>
        <Text style={styles.copy}>Placement</Text>
        <View style={styles.dateRow}>
          {["1", "2", "3"].map((value) => (
            <AppButton key={value} mode={placement === value ? "contained" : "outlined"} onPress={() => setPlacement(value)}>
              #{value}
            </AppButton>
          ))}
        </View>
        <Text style={styles.copy}>Registered Player</Text>
        <View style={styles.typeGrid}>
          {selectedRegistrations.map((registration) => (
            <AppButton key={registration.user_id} mode={resultUserId === registration.user_id ? "contained" : "outlined"} onPress={() => setResultUserId(registration.user_id)}>
              {registration.table_number ? `T${registration.table_number} S${registration.seat_number} - ` : ""}{registration.full_name}
            </AppButton>
          ))}
        </View>
        <TextInput mode="outlined" label="Points awarded" value={pointsAwarded} onChangeText={setPointsAwarded} keyboardType="number-pad" />
        <AppButton mode="outlined" icon="podium-gold" onPress={submitResult} disabled={!resultTournamentId || !resultUserId || !placement}>
          Save Placement
        </AppButton>
        <AppButton icon="check-decagram-outline" onPress={markCompleted} disabled={!resultTournamentId}>
          Mark Tournament Completed
        </AppButton>
      </View> : null}
      {mode === "past" ? pastRows.map((row) => (
        <View key={row.id} style={styles.card}>
          <Text style={styles.name}>{row.title}</Text>
          <Text style={styles.copy}>{row.status.replace("_", " ")} - {new Date(row.starts_at).toLocaleString()}</Text>
          <AppButton mode="outlined" icon="history" onPress={() => setResultTournamentId(row.id)}>Use For Result Edits</AppButton>
        </View>
      )) : null}
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  formTitle: { color: colors.text, fontWeight: "900", fontSize: 18 },
  dateRow: { flexDirection: "row", gap: 10 },
  dateInput: { flex: 1.2 },
  timeInput: { flex: 0.8 },
  typeGrid: { gap: 8 },
  card: { gap: 6, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  tableList: { gap: 4, paddingTop: 6 },
  name: { color: colors.text, fontWeight: "900", fontSize: 18 },
  copy: { color: colors.muted, lineHeight: 20 }
});
