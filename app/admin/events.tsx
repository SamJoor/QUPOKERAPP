import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Dialog, Portal, Snackbar, Switch, Text, TextInput } from "react-native-paper";
import { AdminHeader } from "@/components/AdminHeader";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { EventCard } from "@/components/EventCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";
import { deactivateEvent, getAdminEvents, saveAdminEvent } from "@/lib/admin";
import { ClubEvent } from "@/lib/types";

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatTimeInput(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseLocalDateTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;

  const parsed = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export default function AdminEventsScreen() {
  const tomorrow = new Date(Date.now() + 86400000);
  const defaultEnd = new Date(Date.now() + 93600000);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("meeting");
  const [eventDate, setEventDate] = useState(formatDateInput(tomorrow));
  const [startTime, setStartTime] = useState(formatTimeInput(tomorrow));
  const [endTime, setEndTime] = useState(formatTimeInput(defaultEnd));
  const [points, setPoints] = useState("25");
  const [active, setActive] = useState(true);
  const [message, setMessage] = useState("");
  const [postedDialogVisible, setPostedDialogVisible] = useState(false);

  async function load() {
    setEvents(await getAdminEvents());
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load events."));
  }, []);

  async function createEvent() {
    try {
      const startDate = parseLocalDateTime(eventDate, startTime);
      const endDate = parseLocalDateTime(eventDate, endTime);

      if (!startDate || !endDate) {
        setMessage("Enter the event date as YYYY-MM-DD and times as HH:MM.");
        return;
      }

      if (endDate <= startDate) {
        setMessage("End time must be after start time.");
        return;
      }

      await saveAdminEvent({
        title,
        description,
        location,
        event_type: eventType as ClubEvent["event_type"],
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        points_awarded: Number(points),
        is_active: active
      });
      setTitle("");
      setDescription("");
      setLocation("");
      setPostedDialogVisible(true);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save event.");
    }
  }

  async function deactivate(id: string) {
    try {
      await deactivateEvent(id);
      setMessage("Event deactivated.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to deactivate event.");
    }
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/admin" />
      <AdminHeader title="Events" subtitle="Create events, display QR codes, and review attendance." />
      <View style={styles.form}>
        <Text style={styles.formTitle}>Create Event</Text>
        <TextInput mode="outlined" label="Title" value={title} onChangeText={setTitle} />
        <TextInput mode="outlined" label="Description" value={description} onChangeText={setDescription} multiline />
        <TextInput mode="outlined" label="Location" value={location} onChangeText={setLocation} />
        <View style={styles.dateRow}>
          <TextInput mode="outlined" label="Date" placeholder="YYYY-MM-DD" value={eventDate} onChangeText={setEventDate} style={styles.dateInput} />
          <TextInput mode="outlined" label="Start" placeholder="HH:MM" value={startTime} onChangeText={setStartTime} style={styles.timeInput} keyboardType="numbers-and-punctuation" />
          <TextInput mode="outlined" label="End" placeholder="HH:MM" value={endTime} onChangeText={setEndTime} style={styles.timeInput} keyboardType="numbers-and-punctuation" />
        </View>
        <TextInput mode="outlined" label="Points awarded" value={points} onChangeText={setPoints} keyboardType="number-pad" />
        <View style={styles.typeGrid}>
          {(["meeting", "tournament", "philanthropy", "social", "workshop"] as const).map((type) => (
            <AppButton key={type} mode={eventType === type ? "contained" : "outlined"} onPress={() => setEventType(type)}>
              {type}
            </AppButton>
          ))}
        </View>
        <View style={styles.row}>
          <Text style={styles.copy}>Active event</Text>
          <Switch value={active} onValueChange={setActive} />
        </View>
        <AppButton icon="plus" onPress={createEvent} disabled={!title || !description || !location}>Post Event</AppButton>
      </View>
      {events.map((event) => (
        <View key={event.id} style={styles.eventWrap}>
          <EventCard event={event} />
          <Text style={styles.token}>QR token: {event.qr_code_token}</Text>
          <AppButton mode="outlined" icon="qrcode" onPress={() => router.push(`/admin/events/${event.id}`)}>
            Manage QR & Attendance
          </AppButton>
          {event.is_active ? <AppButton mode="outlined" icon="close-circle-outline" onPress={() => deactivate(event.id)}>Deactivate</AppButton> : null}
        </View>
      ))}
      <Portal>
        <Dialog visible={postedDialogVisible} onDismiss={() => setPostedDialogVisible(false)}>
          <Dialog.Title>Event posted</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>Your event is now listed for club members.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton mode="text" onPress={() => setPostedDialogVisible(false)}>Done</AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  formTitle: { color: colors.text, fontWeight: "900", fontSize: 18 },
  dateRow: { flexDirection: "row", gap: 8 },
  dateInput: { flex: 1.3 },
  timeInput: { flex: 1 },
  typeGrid: { gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  copy: { color: colors.text, fontWeight: "800" },
  eventWrap: { gap: 10 },
  token: { color: colors.gold, fontSize: 12, fontWeight: "800" },
  dialogText: { color: colors.text, lineHeight: 21 }
});
