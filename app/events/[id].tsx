import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native-paper";
import { BackButton } from "@/components/BackButton";
import { PointsPill } from "@/components/PointsPill";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/StateViews";
import { colors, disclaimer } from "@/constants/theme";
import { getEvent } from "@/lib/events";
import { ClubEvent } from "@/lib/types";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<ClubEvent | null>(null);

  useEffect(() => {
    if (id) getEvent(id).then(setEvent).catch(() => setEvent(null));
  }, [id]);

  if (!event) return <ScreenContainer><LoadingState label="Loading event..." /></ScreenContainer>;
  const activeEvent = event;

  return (
    <ScreenContainer>
      <BackButton fallback="/tabs/events" />
      <View style={styles.header}>
        <Text style={styles.type}>{activeEvent.event_type.toUpperCase()}</Text>
        <PointsPill points={activeEvent.points_awarded} />
      </View>
      <Text style={styles.title}>{activeEvent.title}</Text>
      <Text style={styles.meta}>{new Date(activeEvent.starts_at).toLocaleString()} - {activeEvent.location}</Text>
      <Text style={styles.description}>{activeEvent.description}</Text>
      <View style={styles.checkInInfo}>
        <Text style={styles.infoTitle}>Attendance check-in</Text>
        <Text style={styles.infoText}>To check in and earn points, scan the officer's QR code in person during the event window.</Text>
      </View>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  type: { color: colors.gold, fontWeight: "900" },
  title: { color: colors.text, fontSize: 32, fontWeight: "900", lineHeight: 38 },
  meta: { color: colors.gold, fontWeight: "800" },
  description: { color: colors.muted, lineHeight: 22 },
  checkInInfo: { gap: 8, padding: 16, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  infoTitle: { color: colors.text, fontWeight: "900", fontSize: 17 },
  infoText: { color: colors.muted, lineHeight: 21 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
