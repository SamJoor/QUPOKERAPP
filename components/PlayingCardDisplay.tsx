import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Card, suitSymbols } from "@/lib/poker";
import { colors } from "@/constants/theme";

export function PlayingCardDisplay({
  card,
  variant = "light",
  size = "regular"
}: {
  card: Card;
  variant?: "light" | "dark";
  size?: "regular" | "board" | "large";
}) {
  const red = card.suit === "H" || card.suit === "D";
  const faceIcon = card.rank === "K" ? "crown-outline" : card.rank === "Q" ? "chess-queen" : card.rank === "J" ? "shield-account-outline" : null;
  const inkStyle = red ? styles.red : variant === "dark" ? styles.lightInk : styles.blackInk;
  return (
    <View style={[styles.card, variant === "dark" && styles.darkCard, size === "board" && styles.boardCard, size === "large" && styles.largeCard]}>
      <View style={[styles.corner, variant === "dark" && styles.darkCorner, size === "large" && styles.largeCorner]}>
        <Text style={[styles.rank, size === "board" && styles.boardRank, size === "large" && styles.largeRank, inkStyle]}>{card.rank}</Text>
        {variant === "dark" && size === "large" ? null : (
          <Text style={[styles.cornerSuit, size === "large" && styles.largeCornerSuit, inkStyle]}>{suitSymbols[card.suit]}</Text>
        )}
      </View>

      {faceIcon && size === "large" ? (
        <View style={styles.faceArtwork}>
          <MaterialCommunityIcons color={red ? colors.red : "rgba(247,248,250,0.62)"} name={faceIcon} size={34} />
          <Text style={[styles.faceLetter, red ? styles.faceLetterRed : styles.faceLetterLight]}>{card.rank}</Text>
        </View>
      ) : (
        <Text style={[styles.centerSuit, size === "board" && styles.boardCenterSuit, size === "large" && styles.largeCenterSuit, variant === "dark" && styles.darkCenterSuit, red ? styles.red : variant === "dark" ? styles.lightInk : styles.blackInk]}>
          {suitSymbols[card.suit]}
        </Text>
      )}

      {variant === "dark" ? (
        <View style={[styles.bottomSuitBadge, styles.darkBottomSuitBadge]}>
          <Text style={[styles.bottomSuit, size === "large" && styles.largeBottomSuit, inkStyle]}>{suitSymbols[card.suit]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 54,
    height: 76,
    position: "relative",
    borderRadius: 12,
    backgroundColor: "#F5F7F4",
    borderColor: "rgba(0,0,0,0.08)",
    borderWidth: 1,
    overflow: "hidden"
  },
  darkCard: {
    backgroundColor: "#121419",
    borderColor: "rgba(247,248,250,0.18)",
    borderWidth: 1
  },
  boardCard: { width: 66, height: 94, borderRadius: 13 },
  largeCard: { width: 104, height: 142, borderRadius: 15 },
  corner: {
    position: "absolute",
    top: 7,
    left: 7,
    zIndex: 2,
    alignItems: "center"
  },
  darkCorner: {
    top: 10,
    left: 11,
    alignItems: "flex-start"
  },
  largeCorner: {
    minWidth: 30
  },
  rank: { fontWeight: "900", fontSize: 16, lineHeight: 18 },
  boardRank: { fontSize: 18, lineHeight: 20 },
  largeRank: { fontSize: 31, lineHeight: 32 },
  cornerSuit: { marginTop: -1, fontWeight: "900", fontSize: 13, lineHeight: 14 },
  largeCornerSuit: { fontSize: 19, lineHeight: 20 },
  centerSuit: {
    position: "absolute",
    right: 8,
    top: 27,
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900"
  },
  boardCenterSuit: { right: 9, top: 34, fontSize: 28, lineHeight: 32 },
  largeCenterSuit: { right: 15, top: 51, fontSize: 49, lineHeight: 53 },
  darkCenterSuit: { opacity: 0.2 },
  faceArtwork: {
    position: "absolute",
    right: 10,
    top: 39,
    alignItems: "center",
    justifyContent: "center"
  },
  faceLetter: { marginTop: -5, fontSize: 17, lineHeight: 20, fontWeight: "900" },
  faceLetterLight: { color: "rgba(247,248,250,0.78)" },
  faceLetterRed: { color: colors.red },
  bottomSuitBadge: {
    position: "absolute",
    left: 8,
    bottom: 7
  },
  darkBottomSuitBadge: {
    left: 12,
    bottom: 10
  },
  bottomSuit: { fontWeight: "900", fontSize: 16, lineHeight: 18 },
  largeBottomSuit: { fontSize: 27, lineHeight: 29 },
  blackInk: { color: "#080A0D" },
  lightInk: { color: "rgba(247,248,250,0.78)" },
  red: { color: colors.red }
});
