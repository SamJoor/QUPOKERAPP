import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Searchbar, SegmentedButtons, Text } from "react-native-paper";
import { LabHeader, PodiumStrip } from "@/components/DesignSystem";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { resolveAvatarSource } from "@/constants/avatarAssets";
import { colors } from "@/constants/theme";
import { getChipLeaderboard, getWeeklyLeaderboard } from "@/lib/chips";
import { getAllTimeLeaderboard } from "@/lib/leaderboard";
import { LeaderboardEntry } from "@/lib/types";

type Board = "chips" | "club" | "weekly";

const boards: Record<Board, { label: string; subtitle: string; load: () => Promise<LeaderboardEntry[]> }> = {
  chips: {
    label: "Chips",
    subtitle: "Chips are granted, not earned - 2,000 to start and 500 more each day.",
    load: getChipLeaderboard
  },
  club: {
    label: "Club points",
    subtitle: "Earned by checking in at club events. All time.",
    load: getAllTimeLeaderboard
  },
  weekly: {
    label: "This week",
    subtitle: "Club points earned in the last seven days.",
    load: getWeeklyLeaderboard
  }
};

export default function LeaderboardScreen() {
  const [board, setBoard] = useState<Board>("club");
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    boards[board]
      .load()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [board]);

  // Filtered here rather than through search_club_members: the RPCs already return the whole
  // board, so this is instant and everyone keeps their real rank while you type.
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((entry) => entry.full_name.toLowerCase().includes(needle));
  }, [query, rows]);

  return (
    <ScreenContainer>
      <LabHeader
        eyebrow="Club momentum"
        title="Leaderboard"
        subtitle={boards[board].subtitle}
        icon="podium-gold"
      />

      <SegmentedButtons
        value={board}
        onValueChange={(value) => setBoard(value as Board)}
        buttons={(Object.keys(boards) as Board[]).map((key) => ({
          value: key,
          label: boards[key].label
        }))}
      />

      <Searchbar
        onChangeText={setQuery}
        placeholder="Search members"
        style={styles.search}
        value={query}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : visible.length ? (
        visible.map((entry) => (
          <PodiumStrip
            key={entry.user_id}
            rank={entry.rank}
            name={entry.full_name}
            points={entry.total_points}
            avatarSource={resolveAvatarSource(entry)}
            onPress={() => router.push(`/members/${entry.user_id}`)}
          />
        ))
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {query.trim()
              ? `Nobody matching "${query.trim()}".`
              : board === "weekly"
                ? "No club points earned this week yet."
                : "Nothing here yet."}
          </Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  search: {
    marginTop: 12,
    marginBottom: 4
  },
  empty: {
    paddingVertical: 32,
    alignItems: "center"
  },
  emptyText: {
    color: colors.muted,
    textAlign: "center"
  }
});
