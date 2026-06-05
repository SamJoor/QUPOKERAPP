import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors, fonts } from "@/constants/theme";

type Suit = "spade" | "heart" | "diamond" | "club";

const suitGlyph: Record<Suit, string> = {
  spade: "♠",
  heart: "♥",
  diamond: "♦",
  club: "♣"
};

export function SuitPip({ suit = "spade", size = 26, gold = false }: { suit?: Suit; size?: number; gold?: boolean }) {
  return (
    <View style={[styles.pip, { width: size * 1.55, height: size * 1.55, borderRadius: size * 0.52, borderColor: gold ? colors.gold : colors.green }]}>
      <Text style={[styles.pipText, { fontSize: size, color: gold ? colors.gold : colors.green }]}>{suitGlyph[suit]}</Text>
    </View>
  );
}

export function QUChip({ size = 58, label = "QU" }: { size?: number; label?: string }) {
  const notchSize = Math.max(6, Math.round(size * 0.11));
  return (
    <View style={[styles.chip, { width: size, height: size, borderRadius: size / 2 }]}>
      {Array.from({ length: 8 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.chipNotch,
            {
              width: notchSize,
              height: notchSize * 1.8,
              left: size / 2 - notchSize / 2,
              top: -notchSize * 0.25,
              transform: [{ rotate: `${index * 45}deg` }, { translateY: size * 0.43 }]
            }
          ]}
        />
      ))}
      <View style={[styles.chipInner, { width: size * 0.62, height: size * 0.62, borderRadius: size * 0.31 }]}>
        <Text style={[styles.chipText, { fontSize: size * 0.25 }]}>{label}</Text>
      </View>
    </View>
  );
}

export function CardFan({ small = false }: { small?: boolean }) {
  const width = small ? 54 : 76;
  const height = small ? 72 : 102;
  return (
    <View style={[styles.fan, { width: width + 26, height: height + 10 }]}>
      <View style={[styles.playingCard, styles.cardLeft, { width, height }]}>
        <Text style={styles.cardCorner}>A</Text>
        <Text style={styles.cardSuit}>♠</Text>
      </View>
      <View style={[styles.playingCard, styles.cardRight, { width, height }]}>
        <Text style={styles.cardCorner}>K</Text>
        <Text style={styles.cardSuitGold}>♦</Text>
      </View>
    </View>
  );
}

export function ChipStack() {
  return (
    <View style={styles.stack}>
      <View style={[styles.stackChip, styles.stackBack]} />
      <View style={[styles.stackChip, styles.stackMid]} />
      <QUChip size={44} label="PTS" />
    </View>
  );
}

export function SuitRail() {
  return (
    <View style={styles.rail}>
      {(["spade", "heart", "diamond", "club"] as Suit[]).map((suit, index) => (
        <Text key={suit} style={[styles.railSuit, { color: index % 2 ? colors.gold : colors.green }]}>{suitGlyph[suit]}</Text>
      ))}
    </View>
  );
}

export function TicketPerforation() {
  return (
    <View style={styles.perforation}>
      {Array.from({ length: 8 }).map((_, index) => <View key={index} style={styles.perfDot} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  pip: { alignItems: "center", justifyContent: "center", backgroundColor: colors.backgroundAlt, borderWidth: 1.5 },
  pipText: { fontFamily: fonts.extraBold, fontWeight: "900", lineHeight: 30 },
  chip: { alignItems: "center", justifyContent: "center", backgroundColor: colors.gold, borderColor: colors.navyInk, borderWidth: 2, overflow: "hidden" },
  chipNotch: { position: "absolute", borderRadius: 3, backgroundColor: colors.navyInk, opacity: 0.95 },
  chipInner: { alignItems: "center", justifyContent: "center", backgroundColor: colors.gold, borderColor: colors.navyInk, borderWidth: 2 },
  chipText: { color: colors.navyInk, fontFamily: fonts.extraBold, fontWeight: "900" },
  fan: { position: "relative" },
  playingCard: { position: "absolute", top: 6, borderRadius: 12, backgroundColor: colors.text, borderColor: colors.gold, borderWidth: 2, padding: 8 },
  cardLeft: { left: 2, transform: [{ rotate: "-12deg" }] },
  cardRight: { right: 2, transform: [{ rotate: "12deg" }] },
  cardCorner: { color: colors.navyInk, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 15 },
  cardSuit: { color: colors.navyInk, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 30, textAlign: "center", marginTop: 8 },
  cardSuitGold: { color: colors.gold, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 30, textAlign: "center", marginTop: 8 },
  stack: { width: 70, height: 58, alignItems: "center", justifyContent: "flex-end" },
  stackChip: { position: "absolute", width: 44, height: 44, borderRadius: 999, backgroundColor: colors.green, borderColor: colors.navyInk, borderWidth: 2 },
  stackBack: { left: 8, bottom: 10, opacity: 0.55 },
  stackMid: { left: 18, bottom: 5, opacity: 0.75 },
  rail: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(3,16,37,0.32)", borderColor: "rgba(255,255,255,0.12)", borderWidth: 1 },
  railSuit: { fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 18 },
  perforation: { width: 12, alignItems: "center", justifyContent: "space-evenly", paddingVertical: 8 },
  perfDot: { width: 5, height: 5, borderRadius: 99, backgroundColor: colors.background }
});
