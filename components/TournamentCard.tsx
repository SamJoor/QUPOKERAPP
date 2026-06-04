import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { PointsPill } from "@/components/PointsPill";
import { colors } from "@/constants/theme";
import { TournamentOverview } from "@/lib/tournaments";

const statusTone: Record<TournamentOverview["status"], string> = {
  upcoming: colors.blue,
  registration_open: colors.green,
  in_progress: colors.gold,
  completed: colors.muted,
  cancelled: colors.red
};

export function TournamentCard({ tournament, onPress, featured = false }: { tournament: TournamentOverview; onPress: () => void; featured?: boolean }) {
  const capacity = Math.min(100, Math.round((tournament.registered_count / tournament.max_players) * 100));
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, featured && styles.featured, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <Text style={[styles.status, { color: statusTone[tournament.status] }]}>{tournament.status.replace("_", " ").toUpperCase()}</Text>
        {tournament.entry_cost_points ? <PointsPill points={tournament.entry_cost_points} /> : <Text style={styles.free}>Free entry</Text>}
      </View>
      <Text style={featured ? styles.featuredName : styles.name}>{tournament.title}</Text>
      <Text style={styles.meta}>{new Date(tournament.starts_at).toLocaleString()}</Text>
      <Text style={styles.body} numberOfLines={featured ? 4 : 2}>{tournament.description}</Text>
      <View style={styles.capacityHeader}>
        <Text style={styles.capacityText}>{tournament.registered_count}/{tournament.max_players} registered</Text>
        <Text style={styles.capacityText}>{capacity}% full</Text>
      </View>
      <View style={styles.capacityTrack}>
        <View style={[styles.capacityFill, { width: `${capacity}%` }]} />
      </View>
      <View style={styles.prizeRow}>
        <Text style={styles.prize}>1st +{tournament.reward_points_first}</Text>
        <Text style={styles.prize}>2nd +{tournament.reward_points_second}</Text>
        <Text style={styles.prize}>3rd +{tournament.reward_points_third}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 16, borderRadius: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  featured: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  pressed: { opacity: 0.78 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  status: { fontWeight: "900", fontSize: 12 },
  free: { color: colors.green, fontWeight: "900", fontSize: 12 },
  name: { color: colors.text, fontSize: 19, fontWeight: "900", lineHeight: 24 },
  featuredName: { color: colors.text, fontSize: 25, fontWeight: "900", lineHeight: 30 },
  meta: { color: colors.gold, fontWeight: "800" },
  body: { color: colors.muted, lineHeight: 20 },
  capacityHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  capacityText: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  capacityTrack: { height: 8, borderRadius: 99, backgroundColor: colors.background, overflow: "hidden" },
  capacityFill: { height: "100%", borderRadius: 99, backgroundColor: colors.green },
  prizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  prize: { color: colors.gold, fontWeight: "900", fontSize: 12 }
});
