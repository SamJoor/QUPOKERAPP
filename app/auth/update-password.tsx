import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors, fonts } from "@/constants/theme";
import { establishSessionFromUrl, updatePassword } from "@/lib/auth";

export default function UpdatePasswordScreen() {
  const recoveryUrl = Linking.useURL();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function prepareSession() {
      try {
        const initialUrl = recoveryUrl ?? (await Linking.getInitialURL());
        await establishSessionFromUrl(initialUrl);
        if (mounted) setSessionReady(true);
      } catch (err) {
        if (mounted) setMessage(err instanceof Error ? err.message : "This reset link is invalid or expired.");
      }
    }

    prepareSession();
    return () => {
      mounted = false;
    };
  }, [recoveryUrl]);

  async function submit() {
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setMessage("Password updated. You can sign in now.");
      setTimeout(() => router.replace("/auth/login"), 900);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to update password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.form}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Account recovery</Text>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>Use at least 8 characters. After this, sign in with your email and new password.</Text>
        </View>
        <View style={styles.panel}>
          <TextInput label="New password" value={password} onChangeText={setPassword} secureTextEntry mode="outlined" textContentType="newPassword" />
          <TextInput label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry mode="outlined" textContentType="newPassword" />
          <AppButton icon="lock-reset" onPress={submit} disabled={loading || !sessionReady}>
            {loading ? "Updating..." : "Update Password"}
          </AppButton>
          {!sessionReady ? <Text style={styles.help}>Checking reset link...</Text> : null}
        </View>
      </KeyboardAvoidingView>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { flex: 1, justifyContent: "center", gap: 18 },
  header: { gap: 8 },
  kicker: { color: colors.gold, fontFamily: fonts.semibold, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 40, lineHeight: 42, fontWeight: "900" },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 22 },
  panel: { gap: 12, padding: 16, borderRadius: 22, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  help: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 }
});
