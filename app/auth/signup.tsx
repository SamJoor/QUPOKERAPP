import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { FormShell } from "@/components/DesignSystem";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors, fonts } from "@/constants/theme";
import { signUp } from "@/lib/auth";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

export default function SignupScreen() {
  const params = useLocalSearchParams<{ next?: string }>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!firstName.trim() || !lastName.trim()) {
      setMessage("Enter your first and last name.");
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
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    setLoading(true);
    try {
      const result = await signUp(normalizedEmail, password, fullName);
      if (!result.session) {
        setMessage("Account created. Confirm your email if required, then log in to complete your profile.");
        router.replace({ pathname: "/auth/login", params: params.next ? { next: params.next } : undefined });
        return;
      }
      router.push({ pathname: "/onboarding/complete-profile", params: { id: result.user?.id, email: normalizedEmail, fullName, next: params.next } });
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
        <View style={styles.brandRow}>
          <Image source={require("../../assets/icon.png")} style={styles.logo} />
          <Text style={styles.kicker}>QU Poker membership</Text>
        </View>
        <FormShell title="Join the club" subtitle="Create your member login for check-ins, point progress, tournament entries, and rewards.">
          <View style={styles.nameRow}>
            <TextInput label="First name" value={firstName} onChangeText={setFirstName} mode="outlined" textContentType="givenName" style={styles.nameInput} />
            <TextInput label="Last name" value={lastName} onChangeText={setLastName} mode="outlined" textContentType="familyName" style={styles.nameInput} />
          </View>
          <TextInput label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" mode="outlined" textContentType="emailAddress" />
          <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" textContentType="newPassword" />
          <Text style={styles.passwordHelp}>Minimum 8 characters.</Text>
          <AppButton icon="account-plus-outline" onPress={submit} disabled={loading || !firstName.trim() || !lastName.trim() || !email || password.length < 8}>
            {loading ? "Creating..." : "Create Account"}
          </AppButton>
        </FormShell>
      </KeyboardAvoidingView>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18, flex: 1, justifyContent: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 72, height: 72, borderRadius: 18 },
  nameRow: { flexDirection: "row", gap: 12 },
  nameInput: { flex: 1 },
  kicker: { color: colors.gold, fontFamily: fonts.semibold, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  passwordHelp: { color: colors.muted, fontSize: 12, fontWeight: "700" }
});
