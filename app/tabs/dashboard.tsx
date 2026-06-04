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
import { LoadingState } from "@/components/StateViews";
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
      <AppButton icon="gift-outline" onPress={() => router.push("/tabs/rewards")}>Redeem Points</AppButton>
      <SectionHeader title="Upcoming Event" />
      {nextEvent ? <EventCard event={nextEvent} /> : <Text style={styles.empty}>No upcoming active events yet.</Text>}
      <SectionHeader title="Recent Point Activity" />
      {ledger.slice(0, 3).map((entry) => (
        <View key={entry.id} style={styles.activity}>
          <Text style={styles.activityReason}>{entry.reason}</Text>
          <Text style={[styles.activityPoints, entry.points < 0 && styles.negative]}>{entry.points > 0 ? "+" : ""}{entry.points}</Text>
        </View>
      ))}
      <SectionHeader title="Monthly Leaders" />
      {leaders.slice(0, 3).map((entry) => <LeaderboardRow key={entry.user_id} entry={entry} />)}
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  hello: { color: colors.muted, fontWeight: "700" },
  name: { color: colors.text, fontSize: 34, fontWeight: "900" },
  stats: { flexDirection: "row", gap: 12 },
  activity: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderColor: colors.border, borderWidth: 1 },
  activityReason: { color: colors.text, flex: 1, fontWeight: "700" },
  activityPoints: { color: colors.green, fontWeight: "900", fontSize: 18 },
  negative: { color: colors.red },
  empty: { color: colors.muted, lineHeight: 20 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
