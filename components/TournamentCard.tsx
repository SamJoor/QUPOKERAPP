import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { PointsPill } from "@/components/PointsPill";
import { colors, fonts, shadows } from "@/constants/theme";
import { TournamentOverview } from "@/lib/tournaments";
import { CardFan, ChipStack, SuitRail } from "./PokerMotifs";

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
      <View style={styles.crownBand}>
        <Text style={styles.crownText}>{featured ? "Featured Sit & Go" : "Club Tournament"}</Text>
        <ChipStack />
      </View>
      <View style={styles.fanRow}>
        <CardFan small />
        <View style={styles.fanCopy}>
          <Text style={styles.fanLabel}>Table draw</Text>
          <Text style={styles.fanText}>Register to claim a seat</Text>
        </View>
      </View>
      <View style={styles.topRow}>
        <View style={[styles.statusBadge, { borderColor: statusTone[tournament.status] }]}>
          <Text style={[styles.status, { color: statusTone[tournament.status] }]}>{tournament.status.replace("_", " ").toUpperCase()}</Text>
        </View>
        {tournament.entry_cost_points ? <PointsPill points={tournament.entry_cost_points} /> : <Text style={styles.free}>Free entry</Text>}
      </View>
      <Text style={featured ? styles.featuredName : styles.name}>{tournament.title}</Text>
      <Text style={styles.meta}>{new Date(tournament.starts_at).toLocaleString()}</Text>
      <Text style={styles.body} numberOfLines={featured ? 4 : 2}>{tournament.description}</Text>
      <View style={styles.capacityHeader}>
        <Text style={styles.capacityText}>{tournament.registered_count}/{tournament.max_players} seats claimed</Text>
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
      <View style={styles.railWrap}>
        <SuitRail />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 0, borderRadius: 28, overflow: "hidden", backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, ...shadows.card },
  featured: { borderColor: colors.gold, backgroundColor: colors.greenSoft },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  crownBand: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.gold },
  crownText: { color: colors.navyInk, fontFamily: fonts.bold, fontWeight: "900", textTransform: "uppercase", fontSize: 12 },
  crownMark: { color: colors.navyInk, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 17 },
  fanRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  fanCopy: { flex: 1, gap: 2 },
  fanLabel: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  fanText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, paddingHorizontal: 16 },
  statusBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.backgroundAlt },
  status: { fontFamily: fonts.bold, fontWeight: "900", fontSize: 12 },
  free: { color: colors.green, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 19, fontWeight: "900", lineHeight: 24, paddingHorizontal: 16 },
  featuredName: { color: colors.text, fontFamily: fonts.extraBold, fontSize: 25, fontWeight: "900", lineHeight: 30, paddingHorizontal: 16 },
  meta: { color: colors.gold, fontFamily: fonts.semibold, fontWeight: "800", fontSize: 12, paddingHorizontal: 16 },
  body: { color: colors.muted, lineHeight: 20, paddingHorizontal: 16 },
  capacityHeader: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingHorizontal: 16 },
  capacityText: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12, fontWeight: "800" },
  capacityTrack: { height: 10, borderRadius: 99, backgroundColor: colors.track, overflow: "hidden", borderColor: colors.border, borderWidth: 1, marginHorizontal: 16 },
  capacityFill: { height: "100%", borderRadius: 99, backgroundColor: colors.green },
  prizeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16 },
  railWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  prize: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12 }
});
