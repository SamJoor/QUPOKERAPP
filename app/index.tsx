import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { FormShell, MissionTile } from "@/components/DesignSystem";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/StateViews";
import { colors, disclaimer, fonts, shadows } from "@/constants/theme";
import { getCurrentSession } from "@/lib/auth";

const highlights: Array<[keyof typeof MaterialCommunityIcons.glyphMap, string, string]> = [
  ["qrcode-scan", "Check in", "Scan at meetings and tournaments."],
  ["star-four-points", "Earn points", "Track lifetime and spendable club points."],
  ["trophy-outline", "Compete", "Register for friendly tournament nights."]
];

export default function WelcomeScreen() {
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getCurrentSession()
      .then((session) => {
        if (session?.user) {
          router.replace("/tabs/dashboard");
        }
      })
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return (
      <ScreenContainer>
        <LoadingState label="Checking your signed-in session..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.topBadge}>
        <Image source={require("../assets/icon.png")} style={styles.logo} />
        <View>
          <Text style={styles.club}>QU Poker</Text>
          <Text style={styles.clubSub}>Strategy Club</Text>
        </View>
      </View>
      <FormShell title="Level up with the club." subtitle="Events, check-ins, rewards, tournaments, and strategy practice in one non-gambling member app.">
        <View style={styles.actions}>
          <AppButton icon="account-plus-outline" onPress={() => router.push("/auth/signup")}>
            Join the Club
          </AppButton>
          <AppButton mode="outlined" icon="login" onPress={() => router.push("/auth/login")}>
            Log In
          </AppButton>
        </View>
      </FormShell>
      <View style={styles.panel}>
        {highlights.map(([icon, title, body], index) => (
          <MissionTile key={title} icon={icon} title={title} body={body} badge={`0${index + 1}`} gold={index === 1} />
        ))}
      </View>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBadge: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 18 },
  logo: { width: 72, height: 72, borderRadius: 22 },
  club: { color: colors.text, fontFamily: fonts.headingSemibold, fontWeight: "900", fontSize: 28, lineHeight: 30 },
  clubSub: { color: colors.gold, fontFamily: fonts.semibold, fontWeight: "900", fontSize: 13, textTransform: "uppercase" },
  actions: { gap: 12, marginTop: 4 },
  panel: { gap: 12, padding: 16, borderRadius: 30, backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, ...shadows.card },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
