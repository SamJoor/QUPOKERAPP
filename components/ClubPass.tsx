import { StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";
import { colors, fonts, shadows } from "@/constants/theme";

export function ClubPass({
  firstName,
  role,
  lifetimePoints,
  spendablePoints,
  rank
}: {
  firstName: string;
  role?: string;
  lifetimePoints: number;
  spendablePoints: number;
  rank: string | number;
}) {
  const progress = lifetimePoints ? Math.min(100, Math.round((spendablePoints / lifetimePoints) * 100)) : 0;

  return (
    <View style={styles.pass}>
      <View style={styles.orbLarge} />
      <View style={styles.orbSmall} />
      <View style={styles.topRow}>
        <View style={styles.seal}>
          <Text style={styles.sealText}>QU</Text>
        </View>
        <View style={styles.rolePill}>
          <MaterialCommunityIcons name={role === "admin" ? "shield-star" : "account-star"} size={16} color={colors.navyInk} />
          <Text style={styles.roleText}>{role === "admin" ? "Officer" : "Member"}</Text>
        </View>
      </View>

      <View style={styles.identity}>
        <Text style={styles.kicker}>Club Pass</Text>
        <Text style={styles.name}>{firstName}</Text>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{spendablePoints}</Text>
          <Text style={styles.metricLabel}>Spendable</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{lifetimePoints}</Text>
          <Text style={styles.metricLabel}>Lifetime</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{rank === "-" ? "--" : `#${rank}`}</Text>
          <Text style={styles.metricLabel}>Rank</Text>
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Point balance</Text>
          <Text style={styles.progressLabel}>{progress}% available</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pass: {
    overflow: "hidden",
    gap: 18,
    padding: 20,
    borderRadius: 34,
    backgroundColor: colors.cardTop,
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    ...shadows.card
  },
  orbLarge: { position: "absolute", right: -46, top: -44, width: 150, height: 150, borderRadius: 999, backgroundColor: "rgba(255,208,82,0.2)" },
  orbSmall: { position: "absolute", left: -28, bottom: -34, width: 98, height: 98, borderRadius: 999, backgroundColor: "rgba(143,196,255,0.24)" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  seal: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.gold, borderColor: "rgba(3,16,37,0.28)", borderWidth: 2 },
  sealText: { color: colors.navyInk, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 20 },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: colors.gold, paddingHorizontal: 12, paddingVertical: 8 },
  roleText: { color: colors.navyInk, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  identity: { gap: 2 },
  kicker: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  name: { color: colors.text, fontFamily: fonts.heading, fontSize: 46, lineHeight: 48, fontWeight: "900" },
  metrics: { flexDirection: "row", gap: 10 },
  metric: { flex: 1, gap: 2, borderRadius: 22, padding: 12, backgroundColor: "rgba(3,16,37,0.34)", borderColor: "rgba(255,255,255,0.13)", borderWidth: 1 },
  metricValue: { color: colors.text, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 22 },
  metricLabel: { color: colors.muted, fontFamily: fonts.semibold, fontWeight: "800", fontSize: 11, textTransform: "uppercase" },
  progressWrap: { gap: 8 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { color: colors.muted, fontFamily: fonts.semibold, fontWeight: "800", fontSize: 12 },
  track: { height: 12, borderRadius: 999, backgroundColor: colors.track, overflow: "hidden", borderColor: "rgba(255,255,255,0.16)", borderWidth: 1 },
  fill: { height: "100%", borderRadius: 999, backgroundColor: colors.gold }
});
