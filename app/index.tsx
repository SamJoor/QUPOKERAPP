import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/StateViews";
import { colors, disclaimer, fonts } from "@/constants/theme";
import { getCurrentSession } from "@/lib/auth";

const highlights = [
  ["Check in", "Scan at meetings and tournaments."],
  ["Earn points", "Track lifetime and spendable club points."],
  ["Compete", "Register for friendly tournament nights."]
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
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <Image source={require("../assets/icon.png")} style={styles.logo} />
          <View>
            <Text style={styles.club}>QU Poker</Text>
            <Text style={styles.clubSub}>Strategy Club</Text>
          </View>
        </View>
        <Text style={styles.eyebrow}>Events. Points. Tournaments. Strategy.</Text>
        <Text style={styles.title}>The home base for QU Poker.</Text>
        <Text style={styles.subtitle}>
          Sign in for check-ins, club points, rewards, leaderboards, and friendly poker strategy nights.
        </Text>
        <View style={styles.actions}>
          <AppButton icon="account-plus-outline" onPress={() => router.push("/auth/signup")}>
            Join the Club
          </AppButton>
          <AppButton mode="outlined" icon="login" onPress={() => router.push("/auth/login")}>
            Log In
          </AppButton>
        </View>
      </View>
      <View style={styles.panel}>
        {highlights.map(([title, body]) => (
          <View key={title} style={styles.highlight}>
            <MaterialCommunityIcons name="cards-diamond-outline" size={20} color={colors.gold} />
            <View style={styles.highlightText}>
              <Text style={styles.highlightTitle}>{title}</Text>
              <Text style={styles.highlightBody}>{body}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 16, paddingTop: 18 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 68, height: 68, borderRadius: 18 },
  club: { color: colors.text, fontFamily: fonts.headingSemibold, fontWeight: "900", fontSize: 28, lineHeight: 30 },
  clubSub: { color: colors.gold, fontFamily: fonts.semibold, fontWeight: "900", fontSize: 13, textTransform: "uppercase" },
  eyebrow: { color: colors.gold, fontFamily: fonts.semibold, fontWeight: "900", fontSize: 12, textTransform: "uppercase", lineHeight: 18 },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 50, lineHeight: 50, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  actions: { gap: 12, marginTop: 4 },
  panel: { gap: 12, padding: 16, borderRadius: 24, backgroundColor: colors.surface, borderColor: colors.borderStrong, borderWidth: 1 },
  highlight: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  highlightText: { flex: 1, gap: 2 },
  highlightTitle: { color: colors.text, fontFamily: fonts.semibold, fontWeight: "900" },
  highlightBody: { color: colors.muted, lineHeight: 19, fontSize: 13 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
