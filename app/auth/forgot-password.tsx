import { useState } from "react";
import { StyleSheet } from "react-native";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors, fonts } from "@/constants/theme";
import { resetPassword } from "@/lib/auth";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    try {
      await resetPassword(email.trim().toLowerCase());
      setMessage("Password reset email sent.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to send reset email.");
    }
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/auth/login" />
      <Text style={styles.title}>Reset password.</Text>
      <Text style={styles.subtitle}>We will send a secure reset link to your email. Open it on your phone to set a new password.</Text>
      <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" mode="outlined" />
      <AppButton icon="email-outline" onPress={submit} disabled={!email}>
        Send Reset Link
      </AppButton>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 34, fontWeight: "900" },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 22 }
});
