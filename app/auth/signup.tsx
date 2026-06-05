import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors, fonts } from "@/constants/theme";
import { signUp } from "@/lib/auth";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export default function SignupScreen() {
  const params = useLocalSearchParams<{ next?: string }>();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!fullName.trim()) {
      setMessage("Enter your full name.");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const result = await signUp(normalizedEmail, password, fullName.trim());
      if (!result.session) {
        setMessage("Account created. Confirm your email if required, then log in to complete your profile.");
        router.replace({ pathname: "/auth/login", params: params.next ? { next: params.next } : undefined });
        return;
      }
      router.push({ pathname: "/onboarding/complete-profile", params: { id: result.user?.id, email: normalizedEmail, fullName: fullName.trim(), next: params.next } });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to sign up.");
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
          <Text style={styles.kicker}>QU Poker membership</Text>
          <Text style={styles.title}>Join the club</Text>
          <Text style={styles.subtitle}>Create a member login for check-ins, points, tournament entries, and rewards.</Text>
        </View>
        <View style={styles.panel}>
          <TextInput label="Full name" value={fullName} onChangeText={setFullName} mode="outlined" textContentType="name" />
          <TextInput label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" mode="outlined" textContentType="emailAddress" />
          <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" textContentType="newPassword" />
          <Text style={styles.passwordHelp}>Minimum 8 characters.</Text>
          <AppButton icon="account-plus-outline" onPress={submit} disabled={loading || !fullName || !email || password.length < 8}>
            {loading ? "Creating..." : "Create Account"}
          </AppButton>
        </View>
      </KeyboardAvoidingView>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
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
  panel: { gap: 12, padding: 16, borderRadius: 22, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  passwordHelp: { color: colors.muted, fontSize: 12, fontWeight: "700" }
});
