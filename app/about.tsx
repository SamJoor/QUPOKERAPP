import { StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { ScreenContainer } from "@/components/ScreenContainer";
import { BackButton } from "@/components/BackButton";
import { colors, disclaimer } from "@/constants/theme";

export default function AboutScreen() {
  return (
    <ScreenContainer>
      <BackButton fallback="/profile" />
      <Text style={styles.title}>About & Rules</Text>
      <Text style={styles.body}>
        QU Poker & Strategy Club helps members learn probability, decision-making, attendance habits, and friendly tournament structure in a campus club setting.
      </Text>
      <Text style={styles.rule}>No deposits. No withdrawals. No real-money balances. No cash-outs. No wagering.</Text>
      <Text style={styles.body}>
        Club points are engagement points only. They are earned through attendance, philanthropy, events, friendly tournaments, and strategy practice. They can be redeemed only for club-approved perks, merchandise, recognition, or non-cash competition entries.
      </Text>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
      <Text style={styles.privacy}>
        Privacy note: student ID is optional. The app requests camera access only for QR attendance scanning and photo library access only when a member chooses a profile photo.
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 34, fontWeight: "900" },
  body: { color: colors.muted, lineHeight: 23, fontSize: 16 },
  rule: { color: colors.green, lineHeight: 24, fontWeight: "900", fontSize: 17 },
  disclaimer: { color: colors.gold, lineHeight: 22, fontWeight: "800" },
  privacy: { color: colors.muted, fontSize: 13, lineHeight: 19 }
});
