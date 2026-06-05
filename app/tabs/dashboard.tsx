import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
import { ClubEvent, LeaderboardEntry, LedgerEntry, Profile } from "@/lib/types";

function ActionNode({
  icon,
  title,
  body,
  tone = "blue",
  onPress
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body: string;
  tone?: "blue" | "gold";
  onPress: () => void;
}) {
  const accent = tone === "gold" ? colors.gold : colors.green;
  return (
    <Pressable style={({ pressed }) => [styles.node, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.nodeIcon, { backgroundColor: accent }]}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.navyInk} />
      </View>
      <View style={styles.nodeText}>
        <Text style={styles.nodeTitle}>{title}</Text>
        <Text style={styles.nodeBody}>{body}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={26} color={colors.muted} />
    </Pressable>
  );
}

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
          <Text style={styles.hello}>Today at QU Poker</Text>
          <Text style={styles.name}>{profile?.full_name?.split(" ")[0] ?? "Strategist"}</Text>
        </View>
        <Pressable style={styles.profileBubble} onPress={() => router.push("/profile")}>
          <MaterialCommunityIcons name="account" size={24} color={colors.navyInk} />
        </Pressable>
      </View>
      <View style={styles.stats}>
        <StatCard label="Lifetime points" value={profile?.lifetime_points ?? profile?.total_points ?? 0} tone="gold" />
        <StatCard label="Spendable" value={profile?.spendable_points ?? profile?.total_points ?? 0} />
      </View>
      <View style={styles.rankHero}>
        <View>
          <Text style={styles.rankLabel}>Monthly rank</Text>
          <Text style={styles.rankValue}>{rank === "-" ? "Earn points to rank" : `#${rank}`}</Text>
        </View>
        <MaterialCommunityIcons name="podium-gold" size={34} color={colors.gold} />
      </View>

      <View style={styles.path}>
        <Text style={styles.pathTitle}>Your club path</Text>
        <ActionNode icon="gift-outline" title="Redeem points" body="Use spendable points for club-approved perks." tone="gold" onPress={() => router.push("/tabs/rewards")} />
        <ActionNode icon="trophy-outline" title="Find a tournament" body="Register, get a table, and track results." onPress={() => router.push("/tabs/tournaments")} />
        <ActionNode icon="school-outline" title="Practice strategy" body="Train hand recognition and claim daily practice points." onPress={() => router.push("/tabs/play")} />
        {profile?.role === "admin" ? (
          <ActionNode icon="shield-account-outline" title="Officer tools" body="Manage events, rewards, points, and tournaments." onPress={() => router.push("/admin")} />
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
  stats: { flexDirection: "row", gap: 12 },
  rankHero: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18, borderRadius: 26, backgroundColor: colors.greenSoft, borderColor: colors.borderStrong, borderWidth: 1.5 },
  rankLabel: { color: colors.muted, fontWeight: "800", textTransform: "uppercase", fontSize: 12 },
  rankValue: { color: colors.text, fontSize: 24, fontWeight: "900" },
  path: { gap: 12, padding: 16, borderRadius: 30, backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1.5 },
  pathTitle: { color: colors.text, fontSize: 22, fontWeight: "900" },
  node: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 22, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  nodeIcon: { width: 48, height: 48, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  nodeText: { flex: 1, gap: 2 },
  nodeTitle: { color: colors.text, fontWeight: "900", fontSize: 16 },
  nodeBody: { color: colors.muted, lineHeight: 18, fontSize: 12 },
  activity: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceRaised, borderRadius: 22, padding: 14, borderColor: colors.borderStrong, borderWidth: 1.5 },
  activityText: { flex: 1, gap: 3 },
  activityReason: { color: colors.text, flex: 1, fontWeight: "700" },
  activityMeta: { color: colors.muted, fontSize: 12 },
  activityPoints: { color: colors.green, fontWeight: "900", fontSize: 18 },
  negative: { color: colors.red },
  empty: { color: colors.muted, lineHeight: 20 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
