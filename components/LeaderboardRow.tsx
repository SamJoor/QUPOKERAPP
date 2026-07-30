import { Pressable, StyleSheet, View } from "react-native";
import { Avatar, Text } from "react-native-paper";
import { LeaderboardEntry } from "@/lib/types";
import { colors } from "@/constants/theme";
import { GlassPanel } from "./GlassPanel";

export function LeaderboardRow({ entry, onPress }: { entry: LeaderboardEntry; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}>
      <GlassPanel contentStyle={styles.row} gradient={[colors.surface, colors.cardBlack]}>
        <Text style={styles.rank}>#{entry.rank}</Text>
        <Avatar.Text size={42} label={entry.full_name.slice(0, 2).toUpperCase()} style={styles.avatar} labelStyle={styles.avatarText} />
        <View style={styles.info}>
          <Text style={styles.name}>{entry.full_name}</Text>
          <Text style={styles.meta}>Tap to view profile</Text>
        </View>
        <Text style={styles.points}>{entry.total_points}</Text>
      </GlassPanel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: 22 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  pressed: { opacity: 0.78 },
  rank: { width: 34, color: colors.gold, fontWeight: "900" },
  avatar: { backgroundColor: colors.greenSoft },
  avatarText: { color: colors.green, fontWeight: "900" },
  info: { flex: 1, gap: 4 },
  name: { color: colors.text, fontWeight: "800" },
  meta: { color: colors.muted, fontSize: 12 },
  points: { color: colors.gold, fontWeight: "900", fontSize: 18 }
});
