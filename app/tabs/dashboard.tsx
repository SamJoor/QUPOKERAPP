import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ClubPass } from "@/components/ClubPass";
import { EventCard } from "@/components/EventCard";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { QuestCard } from "@/components/QuestCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState, LoadingState } from "@/components/StateViews";
import { colors, disclaimer } from "@/constants/theme";
import { getCurrentProfile } from "@/lib/auth";
import { getNextEvent } from "@/lib/events";
import { getMonthlyLeaderboard } from "@/lib/leaderboard";
import { getMyPointHistory } from "@/lib/points";
import { ClubEvent, LeaderboardEntry, LedgerEntry, Profile } from "@/lib/types";

export default function DashboardScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nextEvent, setNextEvent] = useState<ClubEvent | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const activeProfile = await getCurrentProfile();
    setProfile(activeProfile);
    const [eventRow, leaderRows, pointRows] = await Promise.all([
      getNextEvent(),
      getMonthlyLeaderboard(),
      activeProfile ? getMyPointHistory(activeProfile.id) : []
    ]);
    setNextEvent(eventRow);
    setLeaders(leaderRows);
    setLedger(pointRows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setLoading(false));
    }, [load])
  );

  if (loading) return <ScreenContainer><LoadingState label="Building your club dashboard..." /></ScreenContainer>;

  const rank = leaders.find((entry) => entry.user_id === profile?.id)?.rank ?? "-";
  const firstName = profile?.full_name?.split(" ")[0] ?? "Strategist";
  const lifetimePoints = profile?.lifetime_points ?? profile?.total_points ?? 0;
  const spendablePoints = profile?.spendable_points ?? profile?.total_points ?? 0;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={styles.hello}>Today at QU Poker</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <Pressable style={styles.profileBubble} onPress={() => router.push("/profile")}>
          <MaterialCommunityIcons name="account" size={24} color={colors.navyInk} />
        </Pressable>
      </View>

      <ClubPass firstName={firstName} role={profile?.role} lifetimePoints={lifetimePoints} spendablePoints={spendablePoints} rank={rank} />

      <View style={styles.path}>
        <View style={styles.pathHeader}>
          <Text style={styles.pathTitle}>Today’s Quests</Text>
          <Text style={styles.pathMeta}>Pick one</Text>
        </View>
        <QuestCard step={1} icon="gift-outline" title="Redeem points" body="Use spendable points for club-approved perks." reward="Club perks" tone="gold" onPress={() => router.push("/tabs/rewards")} />
        <QuestCard step={2} icon="trophy-outline" title="Find a tournament" body="Register, get a table, and track results." reward="Table seat" onPress={() => router.push("/tabs/tournaments")} />
        <QuestCard step={3} icon="school-outline" title="Practice strategy" body="Train hand recognition and claim daily practice points." reward="+10 daily" onPress={() => router.push("/tabs/play")} />
        {profile?.role === "admin" ? (
          <QuestCard step={4} icon="shield-account-outline" title="Officer tools" body="Manage events, rewards, points, and tournaments." reward="Admin" onPress={() => router.push("/admin")} />
        ) : null}
      </View>

      <SectionHeader title="Next Event" />
      {nextEvent ? (
        <EventCard event={nextEvent} />
      ) : (
        <EmptyState title="No upcoming events" body="Once officers post meetings or tournament nights, the next one will show here." actionLabel={profile?.role === "admin" ? "Post Event" : "View Events"} onAction={() => router.push(profile?.role === "admin" ? "/admin/events" : "/tabs/events")} />
      )}

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
  hello: { color: colors.gold, fontWeight: "900", fontSize: 13, textTransform: "uppercase" },
  name: { color: colors.text, fontSize: 40, lineHeight: 42, fontWeight: "900" },
  profileBubble: { width: 52, height: 52, borderRadius: 999, backgroundColor: colors.gold, alignItems: "center", justifyContent: "center" },
  path: { gap: 12, padding: 16, borderRadius: 30, backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1.5 },
  pathHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pathTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  pathMeta: { color: colors.gold, fontWeight: "900", textTransform: "uppercase", fontSize: 12 },
  activity: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceRaised, borderRadius: 22, padding: 14, borderColor: colors.borderStrong, borderWidth: 1.5 },
  activityText: { flex: 1, gap: 3 },
  activityReason: { color: colors.text, flex: 1, fontWeight: "700" },
  activityMeta: { color: colors.muted, fontSize: 12 },
  activityPoints: { color: colors.green, fontWeight: "900", fontSize: 18 },
  negative: { color: colors.red },
  empty: { color: colors.muted, lineHeight: 20 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
