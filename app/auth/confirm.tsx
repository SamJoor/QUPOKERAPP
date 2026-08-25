import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors, fonts } from "@/constants/theme";
import { establishSessionFromUrl, getCurrentProfile } from "@/lib/auth";

type ConfirmState = "checking" | "confirmed" | "failed";

/** Landing screen for the email-confirmation deep link (see emailRedirectTo in lib/auth.ts).
 * Supabase sends either an access/refresh token pair or a PKCE code; establishSessionFromUrl
 * handles both, so a confirmed user arrives already signed in. */
export default function ConfirmScreen() {
  const confirmUrl = Linking.useURL();
  const [state, setState] = useState<ConfirmState>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function confirm() {
      try {
        const initialUrl = confirmUrl ?? (await Linking.getInitialURL());
        await establishSessionFromUrl(initialUrl);
        const profile = await getCurrentProfile();
        if (!mounted) return;

        if (!profile) {
          setState("failed");
          setMessage("This confirmation link is invalid or has already been used.");
          return;
        }

        setState("confirmed");
        // A confirmed account still needs the onboarding fields the signup form skipped.
        const needsOnboarding = !profile.graduation_year || !profile.major;
        setTimeout(() => {
          router.replace(needsOnboarding ? "/onboarding/complete-profile" : "/tabs/dashboard");
        }, 900);
      } catch (err) {
        if (!mounted) return;
        setState("failed");
        setMessage(err instanceof Error ? err.message : "This confirmation link is invalid or expired.");
      }
    }

    confirm();
    return () => {
      mounted = false;
    };
  }, [confirmUrl]);

  return (
    <ScreenContainer>
      <View style={styles.form}>
        <BackButton fallback="/auth/login" />
        <View style={styles.header}>
          <Text style={styles.kicker}>Email confirmation</Text>
          <Text style={styles.title}>
            {state === "checking" ? "Confirming..." : state === "confirmed" ? "You're in." : "Link didn't work"}
          </Text>
          <Text style={styles.subtitle}>
            {state === "checking"
              ? "Checking your confirmation link."
              : state === "confirmed"
                ? "Your email is verified. Taking you to the club."
                : "Confirmation links expire and can only be used once. Log in to request a new one."}
          </Text>
        </View>
        {state === "failed" ? (
          <View style={styles.panel}>
            {message ? <Text style={styles.error}>{message}</Text> : null}
            <AppButton icon="login" onPress={() => router.replace("/auth/login")}>
              Back to Log In
            </AppButton>
          </View>
        ) : null}
      </View>
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
  error: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 }
});
