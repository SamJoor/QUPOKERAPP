import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { Card, suitSymbols } from "@/lib/poker";
import { colors } from "@/constants/theme";

export function PlayingCardDisplay({ card }: { card: Card }) {
  const red = card.suit === "H" || card.suit === "D";
  return (
    <View style={styles.card}>
      <Text style={[styles.rank, red && styles.red]}>{card.rank}</Text>
      <Text style={[styles.suit, red && styles.red]}>{suitSymbols[card.suit]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 54, height: 76, borderRadius: 12, backgroundColor: "#f7fff9", padding: 8, justifyContent: "space-between" },
  rank: { color: "#06110f", fontWeight: "900", fontSize: 16 },
  suit: { color: "#06110f", fontWeight: "900", fontSize: 24, alignSelf: "flex-end" },
  red: { color: colors.red }
});
