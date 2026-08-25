import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors, fonts } from "@/constants/theme";
import { resendSignupCode, upsertProfile, verifySignupCode } from "@/lib/auth";

const RESEND_COOLDOWN = 60;

/** Signup confirmation by 6-digit code rather than by emailed link. Supabase links are
 * single-use and mail providers fetch them in transit, so users were arriving with a token
 * that had already been spent. A code cannot be consumed by anything that does not submit it. */
export default function VerifyCodeScreen() {
  const params = useLocalSearchParams<{ email?: string; fullName?: string; next?: string }>();
  const email = (params.email ?? "").trim().toLowerCase();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit() {
    if (code.trim().length < 6) {
      setMessage("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      const user = await verifySignupCode(email, code);
      // signUp only writes a profile when it gets a session back, and it never does while
      // confirmation is required, so the row is created here instead.
      if (user?.id) {
        await upsertProfile({ id: user.id, email: user.email ?? email, full_name: params.fullName ?? "" });
      }
      router.replace({
        pathname: "/onboarding/complete-profile",
        params: { id: user?.id, email, fullName: params.fullName, next: params.next }
      });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "That code did not work. Check it and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      await resendSignupCode(email);
      setCooldown(RESEND_COOLDOWN);
      setMessage("New code sent. It can take a minute to arrive.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to send a new code.");
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.form}>
        <BackButton fallback="/auth/login" />
        <View style={styles.header}>
          <Text style={styles.kicker}>Verify your email</Text>
          <Text style={styles.title}>Check your inbox.</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to {email || "your email"}. Enter it below to finish creating your account.
          </Text>
        </View>
        <View style={styles.panel}>
          <TextInput
            label="6-digit code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/[^0-9]/g, "").slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
            mode="outlined"
            style={styles.codeInput}
          />
          <AppButton icon="check-circle-outline" onPress={submit} disabled={loading || code.length < 6}>
            {loading ? "Verifying..." : "Verify Email"}
          </AppButton>
          <AppButton mode="text" onPress={resend} disabled={cooldown > 0}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </AppButton>
          <Text style={styles.help}>
            Not there? Check your spam folder. Codes expire after an hour.
          </Text>
        </View>
      </KeyboardAvoidingView>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>
        {message}
      </Snackbar>
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
  codeInput: { letterSpacing: 6 },
  help: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 }
});
