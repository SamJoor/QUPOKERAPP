import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";
import { signIn } from "@/lib/auth";

export default function LoginScreen() {
  const params = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await signIn(email.trim(), password);
      router.replace(params.next ? (params.next as never) : "/tabs/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <BackButton />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.form}>
        <Text style={styles.title}>Welcome back.</Text>
        <Text style={styles.subtitle}>Log in to track points, attend events, and keep learning.</Text>
        <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" mode="outlined" />
        <TextInput label="Password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" />
        <AppButton icon="login" onPress={submit} disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </AppButton>
        <AppButton mode="text" onPress={() => router.push("/auth/forgot-password")}>
          Forgot password?
        </AppButton>
      </KeyboardAvoidingView>
      <Snackbar visible={Boolean(error)} onDismiss={() => setError("")}>{error}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, flex: 1, justifyContent: "center" },
  title: { color: colors.text, fontSize: 34, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 22 }
});
