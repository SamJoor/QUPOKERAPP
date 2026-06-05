import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { EventCard } from "@/components/EventCard";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState, LoadingState } from "@/components/StateViews";
import { colors, disclaimer } from "@/constants/theme";
import { getCurrentProfile } from "@/lib/auth";
import { getNextEvent } from "@/lib/events";
import { getMonthlyLeaderboard } from "@/lib/leaderboard";
import { getMyPointHistory } from "@/lib/points";
import { getMyTournamentRegistrations, MyTournamentRegistration } from "@/lib/tournaments";
import { ClubEvent, LeaderboardEntry, LedgerEntry, Profile } from "@/lib/types";

export default function DashboardScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nextEvent, setNextEvent] = useState<ClubEvent | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [myTournaments, setMyTournaments] = useState<MyTournamentRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const activeProfile = await getCurrentProfile();
    setProfile(activeProfile);
    const [eventRow, leaderRows, pointRows, tournamentRows] = await Promise.all([
      getNextEvent(),
      getMonthlyLeaderboard(),
      activeProfile ? getMyPointHistory(activeProfile.id) : [],
      getMyTournamentRegistrations()
    ]);
    setNextEvent(eventRow);
    setLeaders(leaderRows);
    setLedger(pointRows);
    setMyTournaments(tournamentRows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setLoading(false));
    }, [load])
  );

  if (loading) return <ScreenContainer><LoadingState label="Building your club dashboard..." /></ScreenContainer>;

  const rank = leaders.find((entry) => entry.user_id === profile?.id)?.rank ?? "-";

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Welcome back,</Text>
          <Text style={styles.name}>{profile?.full_name?.split(" ")[0] ?? "Strategist"}</Text>
        </View>
        <AppButton mode="outlined" icon="account-circle-outline" onPress={() => router.push("/profile")}>Profile</AppButton>
      </View>
      <View style={styles.stats}>
        <StatCard label="Lifetime points" value={profile?.lifetime_points ?? profile?.total_points ?? 0} tone="gold" />
        <StatCard label="Spendable" value={profile?.spendable_points ?? profile?.total_points ?? 0} />
      </View>
      <View style={styles.stats}>
        <StatCard label="Rank" value={rank} />
      </View>
      <View style={styles.actionPanel}>
        <Text style={styles.panelTitle}>Member Tools</Text>
        <View style={styles.toolGrid}>
          <AppButton icon="gift-outline" onPress={() => router.push("/tabs/rewards")}>Redeem Points</AppButton>
          <AppButton mode="outlined" icon="trophy-outline" onPress={() => router.push("/tabs/tournaments")}>Tournaments</AppButton>
        </View>
        {profile?.role === "admin" ? (
          <AppButton mode="outlined" icon="shield-account-outline" onPress={() => router.push("/admin")}>Officer Console</AppButton>
        ) : null}
      </View>
      <SectionHeader title="Upcoming Event" />
      {nextEvent ? (
        <EventCard event={nextEvent} />
      ) : (
        <EmptyState title="No upcoming events" body="Once officers post meetings or tournament nights, the next one will show here." actionLabel={profile?.role === "admin" ? "Post Event" : "View Events"} onAction={() => router.push(profile?.role === "admin" ? "/admin/events" : "/tabs/events")} />
      )}
      <SectionHeader title="My Tournaments" />
      {myTournaments.slice(0, 2).length ? myTournaments.slice(0, 2).map((registration) => (
        <View key={registration.id} style={styles.activity}>
          <View style={styles.activityText}>
            <Text style={styles.activityReason}>{registration.tournaments?.title ?? "Tournament"}</Text>
            <Text style={styles.activityMeta}>{registration.table_number ? `Table ${registration.table_number}, Seat ${registration.seat_number}` : registration.status}</Text>
          </View>
          <AppButton mode="text" onPress={() => router.push(`/tournaments/${registration.tournament_id}`)}>Open</AppButton>
        </View>
      )) : <EmptyState title="No tournament entries" body="Register for a tournament to see your table and seat assignment here." actionLabel="Browse Tournaments" onAction={() => router.push("/tabs/tournaments")} />}
      <SectionHeader title="Recent Point Activity" />
      {ledger.slice(0, 3).length ? ledger.slice(0, 3).map((entry) => (
        <View key={entry.id} style={styles.activity}>
          <Text style={styles.activityReason}>{entry.reason}</Text>
          <Text style={[styles.activityPoints, entry.points < 0 && styles.negative]}>{entry.points > 0 ? "+" : ""}{entry.points}</Text>
        </View>
      )) : <EmptyState title="No points yet" body="Check in at an event, practice strategy, or ask an officer to award test points." />}
      <SectionHeader title="Monthly Leaders" />
      {leaders.slice(0, 3).length ? leaders.slice(0, 3).map((entry) => <LeaderboardRow key={entry.user_id} entry={entry} />) : <EmptyState title="Leaderboard is empty" body="Members appear here after they earn club engagement points." />}
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  hello: { color: colors.muted, fontWeight: "700" },
  name: { color: colors.text, fontSize: 34, fontWeight: "900" },
  stats: { flexDirection: "row", gap: 12 },
  actionPanel: { gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  panelTitle: { color: colors.gold, fontWeight: "900", textTransform: "uppercase", fontSize: 12 },
  toolGrid: { gap: 10 },
  activity: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderColor: colors.border, borderWidth: 1 },
  activityText: { flex: 1, gap: 3 },
  activityReason: { color: colors.text, flex: 1, fontWeight: "700" },
  activityMeta: { color: colors.muted, fontSize: 12 },
  activityPoints: { color: colors.green, fontWeight: "900", fontSize: 18 },
  negative: { color: colors.red },
  empty: { color: colors.muted, lineHeight: 20 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
