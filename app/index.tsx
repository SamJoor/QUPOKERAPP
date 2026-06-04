import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppButton } from "@/components/AppButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/StateViews";
import { colors, disclaimer } from "@/constants/theme";
import { getCurrentSession } from "@/lib/auth";

const features = ["QR attendance", "Club points", "Rewards", "Leaderboards", "Strategy trainer", "Events and tournaments"];

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
        <View style={styles.mark}>
          <MaterialCommunityIcons name="cards-playing-outline" size={46} color={colors.green} />
        </View>
        <Text style={styles.club}>QU Poker & Strategy Club</Text>
        <Text style={styles.title}>Build the smartest poker club on campus.</Text>
        <Text style={styles.subtitle}>
          Track attendance, earn club points, join friendly tournaments, and sharpen your strategy — all in one non-gambling club app.
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
      <View style={styles.grid}>
        {features.map((feature) => (
          <View key={feature} style={styles.feature}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color={colors.green} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 18, paddingTop: 18 },
  mark: { width: 76, height: 76, borderRadius: 24, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center" },
  club: { color: colors.gold, fontWeight: "900" },
  title: { color: colors.text, fontSize: 42, lineHeight: 46, fontWeight: "900" },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  actions: { gap: 12, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  feature: { width: "48%", minHeight: 72, borderRadius: 18, padding: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, gap: 8 },
  featureText: { color: colors.text, fontWeight: "800" },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
