import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Snackbar, Text } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { LabHeader } from "@/components/DesignSystem";
import { EventCard } from "@/components/EventCard";
import { QRScanner } from "@/components/QRScanner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { colors, fonts } from "@/constants/theme";
import { checkInToEvent, getEvents, getPastEvents } from "@/lib/events";
import { ClubEvent } from "@/lib/types";

export default function EventsScreen() {
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [upcoming, past] = await Promise.all([getEvents(), getPastEvents()]);
      setEvents(upcoming);
      setPastEvents(past.slice(0, 3));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleScannedCode(code: string) {
    setScanning(false);
    try {
      const result = await checkInToEvent(code);
      setMessage(
        result.status === "success"
          ? `You checked into ${result.event_title} and earned ${result.points_awarded} points.`
          : result.status === "duplicate"
            ? "You already checked into this event."
            : "This check-in code is invalid or expired."
      );
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to check in.");
    }
  }

  const [nextEvent, ...restEvents] = events;

  return (
    <ScreenContainer>
      <LabHeader
        eyebrow="Club calendar"
        title="Events"
        subtitle="Meetings, tournaments, and philanthropy nights, plus QR check-in for attendance points."
        icon="calendar-star"
        right={
          <AppButton accessibilityLabel={scanning ? "Close QR scanner" : "Scan event QR code to check in"} icon="qrcode-scan" mode={scanning ? "contained" : "outlined"} onPress={() => setScanning((value) => !value)}>
            {scanning ? "Close scanner" : "Check in"}
          </AppButton>
        }
      />
      {scanning ? <QRScanner onCode={handleScannedCode} /> : null}
      {loading ? (
        <LoadingState label="Loading events..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : events.length ? (
        <>
          {nextEvent ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Next up</Text>
              <EventCard event={nextEvent} />
            </View>
          ) : null}
          {restEvents.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {restEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <EmptyState title="No upcoming events" body="Check back soon, or ask an officer when the next meeting or tournament is posted." />
      )}
      {pastEvents.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {pastEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>
      ) : null}
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>
        {message}
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, fontWeight: "900" }
});
