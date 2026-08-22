import { PropsWithChildren, ReactNode } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";
import { colors, fonts, shadows } from "@/constants/theme";
import { CardFan, QUChip, SuitPip, SuitRail } from "./PokerMotifs";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
type SuitName = "spade" | "heart" | "diamond" | "club";

function stepSuit(title: string): SuitName {
  if (title.toLowerCase().includes("redeem")) return "diamond";
  if (title.toLowerCase().includes("tournament")) return "spade";
  if (title.toLowerCase().includes("practice")) return "club";
  return "heart";
}

export function LabHeader({
  eyebrow,
  title,
  subtitle,
  icon = "cards-playing-outline",
  right
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: IconName;
  right?: ReactNode;
}) {
  return (
    <View style={styles.labHeader}>
      <View style={styles.headerGlowA} />
      <View style={styles.headerGlowB} />
      <View style={styles.headerTop}>
        <View style={styles.headerMotif}>
          <CardFan small />
        </View>
        {right}
      </View>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.labTitle}>{title}</Text>
      {subtitle ? <Text style={styles.labSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function LabPanel({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function MissionTile({
  icon,
  title,
  body,
  badge,
  onPress,
  gold
}: {
  icon: IconName;
  title: string;
  body: string;
  badge?: string;
  onPress?: () => void;
  gold?: boolean;
}) {
  const accent = gold ? colors.gold : colors.green;
  return (
    <Pressable accessibilityLabel={`${title}. ${body}`} disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.mission, pressed && styles.pressed]}>
      <View style={[styles.missionIcon, { backgroundColor: accent }]}>
        {gold ? <QUChip size={42} label="PTS" /> : <SuitPip suit={stepSuit(title)} size={22} />}
      </View>
      <View style={styles.missionCopy}>
        <Text style={styles.missionTitle}>{title}</Text>
        <Text style={styles.missionBody}>{body}</Text>
      </View>
      {badge ? (
        <View style={[styles.badge, { borderColor: accent }]}>
          <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
        </View>
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={25} color={accent} />
      )}
    </Pressable>
  );
}

export function StrategyTile({
  icon,
  title,
  value,
  label,
  onPress
}: {
  icon: IconName;
  title: string;
  value: string | number;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable accessibilityLabel={`${title}, ${value} ${label}`} disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.strategyTile, pressed && styles.pressed]}>
      <View style={styles.strategyIcon}>
        <SuitPip suit={title.includes("Bot") ? "club" : title.includes("Trainer") ? "diamond" : "spade"} size={20} gold={title.includes("Trainer")} />
      </View>
      <Text style={styles.strategyTitle}>{title}</Text>
      <Text style={styles.strategyValue}>{value}</Text>
      <Text style={styles.strategyLabel}>{label}</Text>
    </Pressable>
  );
}

export function CollectibleFrame({
  title,
  subtitle,
  cost,
  type,
  onPress
}: {
  title: string;
  subtitle: string;
  cost: number;
  type: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityLabel={`${title}, ${cost} points`} onPress={onPress} style={({ pressed }) => [styles.collectible, pressed && styles.pressed]}>
      <View style={styles.collectibleStamp}>
        <QUChip size={58} />
      </View>
      <View style={styles.collectibleBody}>
        <Text style={styles.collectibleType}>{type.replace("_", " ").toUpperCase()}</Text>
        <Text style={styles.collectibleTitle}>{title}</Text>
        <Text style={styles.collectibleSubtitle}>{subtitle}</Text>
      </View>
      <View style={styles.costCoin}>
        <SuitPip suit="diamond" size={15} gold />
        <Text style={styles.costValue}>{cost}</Text>
        <Text style={styles.costLabel}>PTS</Text>
      </View>
    </Pressable>
  );
}

export function PodiumStrip({
  rank,
  name,
  points,
  onPress
}: {
  rank: number;
  name: string;
  points: number;
  onPress?: () => void;
}) {
  const isTop = rank <= 3;
  return (
    <Pressable accessibilityLabel={`${name}, rank ${rank}, ${points} points`} disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.podium, isTop && styles.podiumTop, pressed && styles.pressed]}>
      <View style={[styles.podiumRank, isTop && styles.podiumRankTop]}>
        <Text style={styles.podiumRankText}>{rank}</Text>
      </View>
      <View style={styles.podiumCopy}>
        <Text style={styles.podiumName}>{name}</Text>
        <Text style={styles.podiumMeta}>{isTop ? "Podium pace" : "Climbing"}</Text>
      </View>
      <Text style={styles.podiumPoints}>{points}</Text>
    </Pressable>
  );
}

export function FormShell({ children, title, subtitle }: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <View style={styles.formShell}>
      <View style={[styles.badge, styles.earlyAccessBadge, { borderColor: colors.gold }]}>
        <Text style={[styles.badgeText, { color: colors.gold }]}>Early Access</Text>
      </View>
      <SuitRail />
      <Text style={styles.formTitle}>{title}</Text>
      <Text style={styles.formSubtitle}>{subtitle}</Text>
      <View style={styles.formBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  labHeader: { gap: 8, overflow: "hidden", padding: 20, borderRadius: 34, backgroundColor: colors.cardTop, borderColor: colors.borderStrong, borderWidth: 1.5, ...shadows.card },
  headerGlowA: { position: "absolute", right: -44, top: -58, width: 162, height: 162, borderRadius: 999, backgroundColor: "rgba(255,208,82,0.24)" },
  headerGlowB: { position: "absolute", left: -48, bottom: -54, width: 130, height: 130, borderRadius: 999, backgroundColor: "rgba(143,196,255,0.18)" },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerMotif: { width: 94, height: 80, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  labTitle: { color: colors.text, fontFamily: fonts.heading, fontWeight: "900", fontSize: 43, lineHeight: 44 },
  labSubtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  panel: { gap: 13, padding: 16, borderRadius: 30, backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1.5, ...shadows.card },
  mission: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13, minHeight: 88, borderRadius: 26, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  missionIcon: { width: 58, height: 58, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  missionCopy: { flex: 1, gap: 3 },
  missionTitle: { color: colors.text, fontFamily: fonts.bold, fontWeight: "900", fontSize: 17 },
  missionBody: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  badge: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.backgroundAlt },
  badgeText: { fontFamily: fonts.bold, fontWeight: "900", fontSize: 11, textTransform: "uppercase" },
  strategyTile: { flex: 1, minHeight: 132, gap: 6, padding: 14, borderRadius: 26, backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5 },
  strategyIcon: { width: 46, height: 46, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.goldSoft },
  strategyTitle: { color: colors.text, fontFamily: fonts.bold, fontWeight: "900", fontSize: 14 },
  strategyValue: { color: colors.gold, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 28, lineHeight: 30 },
  strategyLabel: { color: colors.muted, fontFamily: fonts.semibold, fontWeight: "800", fontSize: 11, textTransform: "uppercase" },
  collectible: { flexDirection: "row", alignItems: "center", gap: 13, overflow: "hidden", padding: 14, borderRadius: 30, backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, ...shadows.card },
  collectibleStamp: { width: 70, height: 88, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.goldSoft, borderColor: colors.gold, borderWidth: 1.5 },
  collectibleStampText: { color: colors.navyInk, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 22 },
  collectibleBody: { flex: 1, gap: 4 },
  collectibleType: { color: colors.green, fontFamily: fonts.bold, fontWeight: "900", fontSize: 11 },
  collectibleTitle: { color: colors.text, fontFamily: fonts.bold, fontWeight: "900", fontSize: 18 },
  collectibleSubtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 18, fontSize: 12 },
  costCoin: { width: 66, minHeight: 74, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: colors.goldSoft, borderColor: colors.gold, borderWidth: 1.5, gap: 1 },
  costValue: { color: colors.gold, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 18, lineHeight: 20 },
  costLabel: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 9 },
  podium: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 24, backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1 },
  podiumTop: { borderColor: colors.gold, backgroundColor: colors.greenSoft },
  podiumRank: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.green },
  podiumRankTop: { backgroundColor: colors.gold },
  podiumRankText: { color: colors.navyInk, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 18 },
  podiumCopy: { flex: 1, gap: 2 },
  podiumName: { color: colors.text, fontFamily: fonts.bold, fontWeight: "900" },
  podiumMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  podiumPoints: { color: colors.gold, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 20 },
  formShell: { gap: 12, padding: 20, borderRadius: 34, backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, ...shadows.card },
  earlyAccessBadge: { alignSelf: "flex-start", backgroundColor: colors.goldSoft },
  formTitle: { color: colors.text, fontFamily: fonts.heading, fontWeight: "900", fontSize: 42, lineHeight: 43 },
  formSubtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 22 },
  formBody: { gap: 12, marginTop: 4 }
});
