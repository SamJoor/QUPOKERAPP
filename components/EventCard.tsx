import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { router } from "expo-router";
import { ClubEvent } from "@/lib/types";
import { colors, fonts, shadows } from "@/constants/theme";
import { PointsPill } from "./PointsPill";

export function EventCard({ event }: { event: ClubEvent }) {
  const date = new Date(event.starts_at);
  const month = date.toLocaleString([], { month: "short" }).toUpperCase();
  const day = date.toLocaleString([], { day: "2-digit" });
  const time = date.toLocaleString([], {
    hour: "numeric",
    minute: "2-digit"
  });
  const startsAt = date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/events/${event.id}`)}>
      <View style={styles.dateBlock}>
        <Text style={styles.month}>{month}</Text>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.ticketBody}>
        <View style={styles.notchTop} />
        <View style={styles.notchBottom} />
        <View style={styles.row}>
          <View style={styles.badge}>
            <Text style={styles.type}>{event.event_type.toUpperCase()}</Text>
          </View>
          <PointsPill points={event.points_awarded} />
        </View>
        <Text variant="titleMedium" style={styles.title}>
          {event.title}
        </Text>
        <Text style={styles.meta}>
          {startsAt} / {event.location}
        </Text>
        <Text style={styles.description}>{event.description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderStrong,
    borderWidth: 1.5,
    borderRadius: 26,
    overflow: "hidden",
    ...shadows.card
  },
  dateBlock: { width: 88, alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: colors.gold, paddingVertical: 18 },
  month: { color: colors.navyInk, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12 },
  day: { color: colors.navyInk, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 33, lineHeight: 34 },
  time: { color: colors.navyInk, fontFamily: fonts.semibold, fontWeight: "900", fontSize: 11 },
  ticketBody: { flex: 1, gap: 11, padding: 16, position: "relative" },
  notchTop: { position: "absolute", left: -13, top: -13, width: 26, height: 26, borderRadius: 999, backgroundColor: colors.background },
  notchBottom: { position: "absolute", left: -13, bottom: -13, width: 26, height: 26, borderRadius: 999, backgroundColor: colors.background },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  badge: { backgroundColor: colors.greenSoft, borderColor: colors.green, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  type: { color: colors.green, fontFamily: fonts.bold, fontSize: 11, fontWeight: "900", letterSpacing: 0 },
  title: { color: colors.text, fontFamily: fonts.bold, fontWeight: "900", fontSize: 19, lineHeight: 23 },
  meta: { color: colors.gold, fontFamily: fonts.semibold, fontWeight: "700", fontSize: 12 },
  description: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 20 }
});
