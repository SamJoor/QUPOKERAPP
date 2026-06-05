import { Pressable, StyleSheet, View } from "react-native";
import { Avatar, Text } from "react-native-paper";
import { LeaderboardEntry } from "@/lib/types";
import { colors, fonts, shadows } from "@/constants/theme";

export function LeaderboardRow({ entry, onPress }: { entry: LeaderboardEntry; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.rankBadge, entry.rank <= 3 && styles.topRank]}>
        <Text style={styles.rank}>#{entry.rank}</Text>
      </View>
      <Avatar.Text size={42} label={entry.full_name.slice(0, 2).toUpperCase()} style={styles.avatar} labelStyle={styles.avatarText} />
      <View style={styles.info}>
        <Text style={styles.name}>{entry.full_name}</Text>
        <Text style={styles.meta}>Tap to view profile</Text>
      </View>
      <Text style={styles.points}>{entry.total_points}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, borderRadius: 24, padding: 12, ...shadows.card },
  pressed: { opacity: 0.78 },
  rankBadge: { width: 42, height: 42, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: colors.green },
  topRank: { backgroundColor: colors.gold },
  rank: { color: colors.navyInk, fontFamily: fonts.extraBold, fontWeight: "900" },
  avatar: { backgroundColor: colors.greenSoft },
  avatarText: { color: colors.green, fontWeight: "900" },
  info: { flex: 1, gap: 4 },
  name: { color: colors.text, fontFamily: fonts.bold, fontWeight: "900" },
  meta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  points: { color: colors.gold, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 18 }
});
