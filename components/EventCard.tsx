import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import { ClubEvent } from "@/lib/types";
import { colors } from "@/constants/theme";
import { PointsPill } from "./PointsPill";

export function EventCard({ event }: { event: ClubEvent }) {
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/events/${event.id}`)}>
      <View style={styles.row}>
        <Text style={styles.type}>{event.event_type.toUpperCase()}</Text>
        <PointsPill points={event.points_awarded} />
      </View>
      <Text variant="titleMedium" style={styles.title}>
        {event.title}
      </Text>
      <Text style={styles.meta}>
        {new Date(event.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ·{" "}
        {event.location}
      </Text>
      <Text style={styles.description}>{event.description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  type: { color: colors.green, fontSize: 12, fontWeight: "900", letterSpacing: 0 },
  title: { color: colors.text, fontWeight: "900" },
  meta: { color: colors.gold, fontWeight: "700" },
  description: { color: colors.muted, lineHeight: 20 }
});
