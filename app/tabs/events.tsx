import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SegmentedButtons, Text } from "react-native-paper";
import { QRScanner } from "@/components/QRScanner";
import { EventCard } from "@/components/EventCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState, LoadingState } from "@/components/StateViews";
import { colors } from "@/constants/theme";
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
      <Text style={{ color: colors.text, fontSize: 30, fontWeight: "900" }}>Events</Text>
      <SectionHeader title="QR Check-In" />
      <QRScanner onCode={(code) => router.push(`/check-in/${code}`)} />
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
