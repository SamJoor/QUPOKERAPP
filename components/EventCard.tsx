import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import { ClubEvent } from "@/lib/types";
import { colors, fonts } from "@/constants/theme";
import { GlassPanel } from "./GlassPanel";
import { PointsPill } from "./PointsPill";

export function EventCard({ event }: { event: ClubEvent }) {
  return (
    <Pressable style={({ pressed }) => [styles.pressable, pressed && styles.pressed]} onPress={() => router.push(`/events/${event.id}`)}>
      <GlassPanel contentStyle={styles.card}>
        <View style={styles.row}>
          <Text style={styles.type}>{event.event_type.toUpperCase()}</Text>
          <PointsPill points={event.points_awarded} />
        </View>
        <Text variant="titleMedium" style={styles.title}>
          {event.title}
        </Text>
        <Text style={styles.meta}>
          {new Date(event.starts_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} - {event.location}
        </Text>
        <Text style={styles.description}>{event.description}</Text>
      </GlassPanel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { borderRadius: 24 },
  pressed: { opacity: 0.82 },
  card: { padding: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { backgroundColor: colors.greenSoft, borderColor: colors.green, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  type: { color: colors.green, fontFamily: fonts.bold, fontSize: 11, fontWeight: "900", letterSpacing: 0 },
  title: { color: colors.text, fontFamily: fonts.bold, fontWeight: "900", fontSize: 19, lineHeight: 23 },
  meta: { color: colors.gold, fontFamily: fonts.semibold, fontWeight: "700", fontSize: 12 },
  description: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 20 }
});
