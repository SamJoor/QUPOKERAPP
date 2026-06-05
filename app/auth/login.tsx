import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors, fonts } from "@/constants/theme";
import { getCurrentProfile, signIn } from "@/lib/auth";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export default function LoginScreen() {
  const params = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signIn(normalizedEmail, password);
      const profile = await getCurrentProfile();
      if (!profile?.student_id || !profile?.full_name) {
        router.replace({
          pathname: "/onboarding/complete-profile",
          params: { email: normalizedEmail, fullName: profile?.full_name ?? "", next: params.next }
        });
        return;
      }
      router.replace(params.next ? (params.next as never) : "/tabs/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to log in.";
      setError(message.includes("Invalid login credentials") ? "Email or password is incorrect." : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <BackButton />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.form}>
        <View style={styles.brand}>
          <Image source={require("../../assets/icon.png")} style={styles.logo} />
          <Text style={styles.kicker}>QU Poker & Strategy Club</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Members use this login for events, points, rewards, tournaments, and strategy practice.</Text>
        </View>
        <View style={styles.panel}>
          <TextInput label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" mode="outlined" textContentType="emailAddress" />
          <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" textContentType="password" />
          <AppButton icon="login" onPress={submit} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </AppButton>
          <AppButton mode="text" onPress={() => router.push("/auth/forgot-password")}>
            Forgot password?
          </AppButton>
        </View>
      </KeyboardAvoidingView>
      <Snackbar visible={Boolean(error)} onDismiss={() => setError("")}>{error}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18, flex: 1, justifyContent: "center" },
  brand: { gap: 8 },
  logo: { width: 72, height: 72, borderRadius: 18 },
  kicker: { color: colors.gold, fontFamily: fonts.semibold, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 54, lineHeight: 54, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 22 },
  panel: { gap: 12, padding: 16, borderRadius: 22, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }
});
