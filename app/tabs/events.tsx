import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SegmentedButtons, Text } from "react-native-paper";
import { StyleSheet, View } from "react-native";
import { QRScanner } from "@/components/QRScanner";
import { EventCard } from "@/components/EventCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState, LoadingState } from "@/components/StateViews";
import { colors, fonts, shadows } from "@/constants/theme";
import { getEvents, getPastEvents } from "@/lib/events";
import { ClubEvent } from "@/lib/types";
import { router } from "expo-router";

export default function EventsScreen() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<ClubEvent[]>([]);
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [upcomingRows, pastRows] = await Promise.all([getEvents(), getPastEvents()]);
    setEvents(upcomingRows);
    setPastEvents(pastRows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setLoading(false));
    }, [load])
  );

  if (loading) return <ScreenContainer><LoadingState label="Loading campus events..." /></ScreenContainer>;

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Campus schedule</Text>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.subtitle}>Scan in at club nights, workshops, and friendly tournaments.</Text>
      </View>
      <SectionHeader title="Check In" />
      <View style={styles.scannerWrap}>
        <QRScanner onCode={(code) => router.push(`/check-in/${code}`)} />
      </View>
      <SegmentedButtons
        value={view}
        onValueChange={(value) => setView(value as "upcoming" | "past")}
        buttons={[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past Events" }
        ]}
      />
      <SectionHeader title={view === "upcoming" ? "Upcoming" : "Past Events"} />
      {view === "upcoming" ? (
        events.length ? events.map((event) => <EventCard key={event.id} event={event} />) : <EmptyState title="No upcoming events" body="Officers have not posted the next meeting or tournament night yet." />
      ) : (
        pastEvents.length ? pastEvents.map((event) => <EventCard key={event.id} event={event} />) : <EmptyState title="No past events" body="Completed meetings and tournament nights will appear here after they end." />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 6, padding: 18, borderRadius: 30, backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong, borderWidth: 1.5, ...shadows.card },
  kicker: { color: colors.gold, fontFamily: fonts.bold, fontWeight: "900", fontSize: 12, textTransform: "uppercase" },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 42, lineHeight: 44, fontWeight: "900" },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 21 },
  scannerWrap: { borderRadius: 26, overflow: "hidden", borderColor: colors.borderStrong, borderWidth: 1.5 }
});
