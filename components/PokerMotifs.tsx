import { StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";
import { VectorCardFan, VectorChip, VectorPerforation, VectorSuit } from "./VectorMotifs";

type Suit = "spade" | "heart" | "diamond" | "club";

export function SuitPip({ suit = "spade", size = 26, gold = false }: { suit?: Suit; size?: number; gold?: boolean }) {
  return (
    <View style={[styles.pip, { width: size * 1.55, height: size * 1.55, borderRadius: size * 0.52, borderColor: gold ? colors.gold : colors.green }]}>
      <VectorSuit suit={suit} size={size} color={gold ? colors.gold : colors.green} />
    </View>
  );
}

export function QUChip({ size = 58, label: _label = "QU" }: { size?: number; label?: string }) {
  return <VectorChip size={size} />;
}

export function CardFan({ small = false }: { small?: boolean }) {
  return <VectorCardFan width={small ? 96 : 124} height={small ? 86 : 110} />;
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
        <VectorSuit key={suit} suit={suit} size={18} color={index % 2 ? colors.gold : colors.green} />
      ))}
    </View>
  );
}

export function TicketPerforation() {
  return <VectorPerforation />;
}

const styles = StyleSheet.create({
  pip: { alignItems: "center", justifyContent: "center", backgroundColor: colors.backgroundAlt, borderWidth: 1.5 },
  stack: { width: 70, height: 58, alignItems: "center", justifyContent: "flex-end" },
  stackChip: { position: "absolute", width: 44, height: 44, borderRadius: 999, backgroundColor: colors.green, borderColor: colors.navyInk, borderWidth: 2 },
  stackBack: { left: 8, bottom: 10, opacity: 0.55 },
  stackMid: { left: 18, bottom: 5, opacity: 0.75 },
  rail: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(3,16,37,0.32)", borderColor: "rgba(255,255,255,0.12)", borderWidth: 1 }
});
