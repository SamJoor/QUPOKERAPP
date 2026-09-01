import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Text } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/StateViews";
import { colors } from "@/constants/theme";
import { checkInToEvent } from "@/lib/events";

export default function CheckInScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    checkInToEvent(code)
      .then((result) => {
        setMessage(result.status === "success" ? `You checked into ${result.event_title} and earned ${result.points_awarded} points.` : result.status === "duplicate" ? "You already checked into this event." : "This check-in link is invalid or expired.");
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Unable to check in."))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return <ScreenContainer><LoadingState label="Checking you in..." /></ScreenContainer>;

  return (
    <ScreenContainer>
      <BackButton fallback="/tabs/events" />
      <Text style={styles.title}>Check-In</Text>
      <Text style={styles.message}>{message}</Text>
      <AppButton icon="view-dashboard-outline" onPress={() => router.replace("/tabs/dashboard")}>Back to Dashboard</AppButton>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 34, fontWeight: "900" },
  message: { color: colors.gold, fontSize: 20, lineHeight: 28, fontWeight: "800" }
});
