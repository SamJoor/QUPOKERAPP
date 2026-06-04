import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";
import { signUp } from "@/lib/auth";

export default function SignupScreen() {
  const params = useLocalSearchParams<{ next?: string }>();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      const result = await signUp(email.trim(), password, fullName.trim());
      if (!result.session) {
        setMessage("Account created. Confirm your email if required, then log in to complete your profile.");
        router.replace({ pathname: "/auth/login", params: params.next ? { next: params.next } : undefined });
        return;
      }
      router.push({ pathname: "/onboarding/complete-profile", params: { id: result.user?.id, email, fullName, next: params.next } });
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
        <Text style={styles.title}>Join the club.</Text>
        <Text style={styles.subtitle}>Create your member profile. QU Student ID is required for officer membership verification.</Text>
        <TextInput label="Full name" value={fullName} onChangeText={setFullName} mode="outlined" />
        <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" mode="outlined" />
        <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" />
        <AppButton icon="account-plus-outline" onPress={submit} disabled={loading || !fullName || !email || password.length < 6}>
          {loading ? "Creating..." : "Create Account"}
        </AppButton>
      </KeyboardAvoidingView>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, flex: 1, justifyContent: "center" },
  title: { color: colors.text, fontSize: 34, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 22 }
});
