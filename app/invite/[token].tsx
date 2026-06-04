import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Snackbar, Text } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { PokerCard } from "@/components/PokerCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors, disclaimer } from "@/constants/theme";
import { getCurrentSession } from "@/lib/auth";
import { acceptPokerInvite } from "@/lib/pokerArena";

export default function PokerInviteScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    getCurrentSession()
      .then((session) => {
        if (!session?.user && token) {
          router.replace({ pathname: "/auth/login", params: { next: `/invite/${token}` } });
        }
      })
      .catch(() => undefined);
  }, [token]);

  async function acceptInvite() {
    if (!token) {
      setMessage("Invite link is missing a token.");
      return;
    }
    setLoading(true);
    try {
      const response = await acceptPokerInvite(token);
      setAccepted(true);
      setMessage(response?.message ?? "Practice match joined.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to accept invite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/tabs/play" />
      <Text style={styles.title}>Practice Match Invite</Text>
      <Text style={styles.subtitle}>Join a friendly QU Poker heads-up match. Practice chips are for learning only and have no cash value.</Text>
      <PokerCard title={accepted ? "You are in" : "Invite Ready"}>
        <Text style={styles.copy}>
          {accepted
            ? "The match invite has been accepted. Online live tables are being wired through Supabase Realtime, so head back to Play to keep practicing."
            : "Accept this invite to reserve your seat in the friendly practice match."}
        </Text>
        <View style={styles.actions}>
          {!accepted ? <AppButton icon="cards-playing-outline" onPress={acceptInvite} disabled={loading}>{loading ? "Joining..." : "Accept Invite"}</AppButton> : null}
          <AppButton mode="outlined" icon="play-circle-outline" onPress={() => router.replace("/tabs/play")}>Open Poker Arena</AppButton>
        </View>
      </PokerCard>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 32, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 21 },
  copy: { color: colors.text, lineHeight: 21 },
  actions: { gap: 10 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
