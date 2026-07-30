import { useCallback, useState, type ComponentProps } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { avatarSources } from "@/constants/avatarAssets";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/StateViews";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { getCurrentProfile } from "@/lib/auth";
import { getMonthlyLeaderboard } from "@/lib/leaderboard";
import { LeaderboardEntry, Profile } from "@/lib/types";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
type PointMode = "CP" | "XP";
type PointValue = {
  label: string;
  marker: string;
  value: string;
};

const quickActions: { id: string; label: string; accessibilityLabel: string; icon?: IconName; avatars?: number[]; accent?: boolean; disabled?: boolean }[] = [
  { id: "create", label: "Create", accessibilityLabel: "Create game", icon: "plus", accent: true },
  { id: "wait", label: "Wait and Play", accessibilityLabel: "Join wait and play queue", avatars: [0, 1, 2] },
  { id: "ai", label: "AI Lobby", accessibilityLabel: "Open AI lobby practice", avatars: [1, 3, 0] },
  { id: "cash", label: "Cash Games", accessibilityLabel: "Cash games coming soon", icon: "earth", disabled: true },
  { id: "sitgo", label: "Sit & Go", accessibilityLabel: "Sit and go coming soon", icon: "trophy-outline", disabled: true },
  { id: "training", label: "Training", accessibilityLabel: "Training coming soon", icon: "target", disabled: true }
];

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function getFirstName(profile: Profile | null) {
  return profile?.full_name?.trim().split(/\s+/)[0] || "Sebastian";
}

function getHandle(name: string) {
  return `@${name.toLowerCase().replace(/[^a-z0-9]+/g, "") || "member"}`;
}

function getRankMovement(index: number) {
  return [1, -1, 0, 1, -1][index] ?? 0;
}

function getLeaderboardAvatar(player: LeaderboardEntry, index: number, currentUserId?: string) {
  if (player.avatar_url) return { uri: player.avatar_url };
  if (player.user_id === currentUserId) return avatarSources[0];
  return avatarSources[(index + 1) % avatarSources.length];
}

export default function DashboardScreen() {
  const [pointMode, setPointMode] = useState<PointMode>("CP");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const activeProfile = await getCurrentProfile();
    setProfile(activeProfile);
    const leaderRows = await getMonthlyLeaderboard();
    setLeaders(leaderRows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setLoading(false));
    }, [load])
  );

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Building your club dashboard..." />
      </ScreenContainer>
    );
  }

  const spendablePoints = profile?.spendable_points ?? profile?.total_points ?? 0;
  const pointValues: Record<PointMode, PointValue> = {
    CP: { label: "Club Points", marker: "Q", value: formatNumber(spendablePoints) },
    XP: { label: "Experience", marker: "XP", value: formatNumber(profile?.lifetime_points ?? profile?.total_points ?? 0) }
  };
  const activePoints = pointValues[pointMode];
  const leaderboardRows = leaders.slice(0, 5);

  return (
    <ScreenContainer padded={false}>
      <LinearGradient colors={["#0a0e15", "#05070a", "#020304"]} locations={[0, 0.52, 1]} start={{ x: 0.08, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.screen}>
        <View style={styles.topBar}>
          <Text style={styles.greeting}>Morning, {getFirstName(profile)}</Text>
          <View style={styles.topIcons}>
            <Pressable
              accessibilityLabel="Open QR check-in"
              hitSlop={10}
              onPress={() => router.push("/tabs/events")}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="qrcode-scan" size={21} color={colors.text} />
            </Pressable>
            <Pressable accessibilityLabel="Open notifications" hitSlop={10} style={({ pressed }) => [styles.iconButton, styles.notificationButton, pressed && styles.pressed]}>
              <MaterialCommunityIcons name="bell-outline" size={21} color={colors.text} />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>
        </View>

        <View style={styles.balanceBlock}>
          <Text style={styles.balanceLabel}>Club balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceMarker}>{activePoints.marker}</Text>
            <Text style={styles.balance}>{activePoints.value}</Text>
          </View>
          <View style={styles.pointsToggle}>
            {(["CP", "XP"] as PointMode[]).map((mode) => {
              const selected = pointMode === mode;
              return (
                <Pressable
                  accessibilityLabel={`Show ${pointValues[mode].label}`}
                  key={mode}
                  onPress={() => setPointMode(mode)}
                  style={({ pressed }) => [styles.toggleOption, selected && styles.toggleOptionActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.toggleText, selected && styles.toggleTextActive]}>{pointValues[mode].label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <LinearGradient colors={["rgba(12,53,95,0.24)", "rgba(255,255,255,0.045)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tournamentCard}>
          <View style={styles.tournamentIcon}>
            <MaterialCommunityIcons name="trophy-outline" size={23} color={colors.lime} />
          </View>
          <View style={styles.tournamentCopy}>
            <Text numberOfLines={1} style={styles.tournamentTitle}>
              Tournament sign-up
            </Text>
            <Text numberOfLines={1} style={styles.tournamentEmpty}>
              No tournaments right now
            </Text>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
          </View>
          <Pressable accessibilityLabel="Open tournaments" hitSlop={8} onPress={() => router.push("/tabs/tournaments")} style={({ pressed }) => [styles.tournamentAction, pressed && styles.pressed]}>
            <Text style={styles.tournamentActionText}>Notify</Text>
          </Pressable>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionScroll} contentContainerStyle={styles.quickActionRail}>
          {quickActions.map((action) => (
            <Pressable
              accessibilityLabel={action.accessibilityLabel}
              disabled={action.disabled}
              key={action.id}
              onPress={() => router.push("/tabs/play")}
              style={({ pressed }) => [styles.actionItem, action.disabled && styles.actionItemDisabled, pressed && styles.pressed]}
            >
              <View style={[styles.actionBubble, action.accent && styles.actionBubbleAccent]}>
                {action.icon ? (
                  <MaterialCommunityIcons name={action.icon} size={31} color={action.accent ? colors.gold : colors.text} />
                ) : (
                  <View style={styles.avatarCluster}>
                    {action.avatars?.map((avatarIndex, index) => (
                      <View key={`${action.label}-${avatarIndex}-${index}`} style={[styles.clusterAvatar, index === 0 && styles.clusterLeft, index === 1 && styles.clusterCenter, index === 2 && styles.clusterRight]}>
                        <ProfileAvatar size={36} source={avatarSources[avatarIndex]} />
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={styles.actionLabel}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.leaderboardHeader}>
          <Text style={styles.leaderboardTitle}>Weekly leaderboard</Text>
          <Pressable accessibilityLabel="View full weekly leaderboard" hitSlop={10} onPress={() => router.push("/tabs/leaderboard")} style={({ pressed }) => [styles.viewAllButton, pressed && styles.pressed]}>
            <Text style={styles.viewAllText}>View all</Text>
          </Pressable>
        </View>

        <View style={styles.leaderboardList}>
          {leaderboardRows.length > 0 ? (
            leaderboardRows.map((player, index) => {
              const movement = getRankMovement(index);
              return (
                <Pressable accessibilityLabel={`${player.full_name}, ${formatNumber(player.total_points)} experience points`} key={player.user_id} style={({ pressed }) => [styles.leaderRow, player.user_id === profile?.id && styles.leaderRowActive, pressed && styles.pressed]}>
                  <View style={styles.leaderLeft}>
                    <Text style={styles.leaderRank}>{player.rank || index + 1}</Text>
                    <ProfileAvatar size={46} source={getLeaderboardAvatar(player, index, profile?.id)} />
                    <View style={styles.leaderCopy}>
                      <Text numberOfLines={1} style={styles.leaderName}>
                        {player.full_name}
                      </Text>
                      <Text numberOfLines={1} style={styles.leaderHandle}>
                        {getHandle(player.full_name)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.leaderScoreWrap}>
                    {movement !== 0 ? (
                      <MaterialCommunityIcons name={movement > 0 ? "arrow-up" : "arrow-down"} size={14} color={movement > 0 ? colors.felt : colors.red} />
                    ) : null}
                    <Text style={styles.leaderXp}>{formatNumber(player.total_points)} XP</Text>
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyLeaderboard}>
              <Text style={styles.emptyLeaderboardText}>No leaderboard activity yet</Text>
            </View>
          )}
        </View>
        <View style={styles.bottomSpacer} />
      </LinearGradient>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: "100%",
    maxWidth: 430,
    minHeight: 780,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 94,
    overflow: "hidden"
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  greeting: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 20,
    fontWeight: "700"
  },
  topIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,246,240,0.055)",
    borderColor: colors.border,
    borderWidth: 1
  },
  notificationButton: {
    position: "relative"
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
    borderColor: colors.background,
    borderWidth: 1
  },
  balanceBlock: {
    alignItems: "center",
    marginTop: 42
  },
  balanceLabel: {
    color: colors.muted,
    fontSize: typography.meta,
    lineHeight: 16,
    fontWeight: "700"
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: 2
  },
  balanceMarker: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 36,
    fontWeight: "800",
    letterSpacing: 0
  },
  balance: {
    color: colors.text,
    fontSize: typography.balance,
    lineHeight: 76,
    fontWeight: "300",
    letterSpacing: 0
  },
  pointsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: 5,
    borderRadius: radii.pill,
    backgroundColor: "rgba(247,248,250,0.06)",
    borderColor: colors.borderSoft,
    borderWidth: 1
  },
  toggleOption: {
    minWidth: 120,
    minHeight: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  toggleOptionActive: {
    backgroundColor: "rgba(251,246,240,0.96)"
  },
  toggleText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  toggleTextActive: {
    color: colors.ink
  },
  tournamentCard: {
    marginTop: spacing.xl,
    minHeight: 88,
    borderRadius: radii.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 }
  },
  tournamentIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(214,165,54,0.09)",
    borderColor: "rgba(214,165,54,0.2)",
    borderWidth: 1
  },
  tournamentCopy: {
    flex: 1,
    minWidth: 0
  },
  tournamentTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900"
  },
  tournamentEmpty: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700"
  },
  progressTrack: {
    height: 4,
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.07)",
    overflow: "hidden"
  },
  progressFill: {
    width: "0%",
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.gold,
    opacity: 0.72
  },
  tournamentAction: {
    minWidth: 62,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,246,240,0.94)"
  },
  tournamentActionText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  quickActionScroll: {
    marginTop: spacing.xl,
    marginHorizontal: -28
  },
  quickActionRail: {
    paddingHorizontal: 28,
    flexDirection: "row",
    gap: spacing.lg
  },
  actionItem: {
    width: 92,
    minHeight: 118,
    alignItems: "center",
    justifyContent: "center"
  },
  actionItemDisabled: {
    opacity: 0.5
  },
  actionBubble: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,248,250,0.065)",
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 }
  },
  actionBubbleAccent: {
    backgroundColor: "rgba(12,53,95,0.62)",
    borderColor: "rgba(214,165,54,0.42)",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  avatarCluster: {
    width: 67,
    height: 54
  },
  clusterAvatar: {
    position: "absolute"
  },
  clusterLeft: {
    bottom: 0,
    left: 0
  },
  clusterCenter: {
    top: 0,
    left: 16
  },
  clusterRight: {
    bottom: 0,
    right: 0
  },
  actionLabel: {
    color: colors.text,
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    textAlign: "center"
  },
  leaderboardHeader: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  leaderboardTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    lineHeight: 23,
    fontWeight: "800"
  },
  viewAllButton: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.border,
    borderWidth: 1
  },
  viewAllText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  leaderboardList: {
    marginTop: spacing.md,
    gap: spacing.sm
  },
  leaderRow: {
    minHeight: 58,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent"
  },
  leaderRowActive: {
    backgroundColor: "rgba(255,255,255,0.045)",
    borderColor: "rgba(255,255,255,0.05)",
    borderWidth: 1
  },
  leaderLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  leaderRank: {
    width: 24,
    color: "rgba(247,248,250,0.68)",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  leaderCopy: {
    flex: 1,
    minWidth: 0
  },
  leaderName: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800"
  },
  leaderHandle: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600"
  },
  leaderScoreWrap: {
    minWidth: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
    marginLeft: spacing.sm
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  leaderXp: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  emptyLeaderboard: {
    minHeight: 58,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.045)",
    borderColor: colors.borderSoft,
    borderWidth: 1
  },
  emptyLeaderboardText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }]
  },
  bottomSpacer: {
    height: 0
  }
});
