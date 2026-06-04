import { useCallback, useEffect, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Snackbar, Text } from "react-native-paper";
import { AdminHeader } from "@/components/AdminHeader";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { colors } from "@/constants/theme";
import { AttendanceRow, getEventAttendance, regenerateEventQr } from "@/lib/admin";
import { getEvent } from "@/lib/events";
import { ClubEvent } from "@/lib/types";

export default function AdminEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [fullScreenQr, setFullScreenQr] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    const [eventRow, attendanceRows] = await Promise.all([getEvent(id), getEventAttendance(id)]);
    setEvent(eventRow);
    setAttendance(attendanceRows);
  }, [id]);

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load event."))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      load().catch(() => undefined);
    }, 8000);
    return () => clearInterval(interval);
  }, [load]);

  async function regenerate() {
    if (!event) return;
    setRegenerating(true);
    try {
      const result = await regenerateEventQr(event.id);
      setEvent({ ...event, qr_code_token: result.qr_code_token });
      setMessage("QR code regenerated. The old QR code no longer works.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to regenerate QR code.");
    } finally {
      setRegenerating(false);
      setConfirmVisible(false);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Loading event operations..." />
      </ScreenContainer>
    );
  }

  if (error || !event) {
    return (
      <ScreenContainer>
        <BackButton fallback="/admin/events" />
        <ErrorState message={error || "Event not found."} onRetry={load} />
      </ScreenContainer>
    );
  }

  const checkInUrl = `qupoker://check-in/${event.qr_code_token}`;
  const opensAt = new Date(new Date(event.starts_at).getTime() - 15 * 60000);

  return (
    <ScreenContainer>
      <BackButton fallback="/admin/events" />
      <AdminHeader title={event.title} subtitle="Display the QR code during the event, regenerate it if it leaks, and monitor attendance." />

      <View style={styles.qrPanel}>
        <QRCode value={checkInUrl} size={240} backgroundColor="#f7fff9" color="#06110f" />
        <Text style={styles.qrText}>QR opens {opensAt.toLocaleString()} and expires {new Date(event.ends_at).toLocaleString()}.</Text>
        <Text style={styles.token}>Token: {event.qr_code_token}</Text>
        <AppButton icon="fullscreen" onPress={() => setFullScreenQr(true)}>Display Fullscreen</AppButton>
        <AppButton icon="refresh" mode="outlined" onPress={() => setConfirmVisible(true)} disabled={regenerating}>
          {regenerating ? "Regenerating..." : "Regenerate QR"}
        </AppButton>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryNumber}>{attendance.length}</Text>
        <Text style={styles.summaryLabel}>checked in</Text>
      </View>

      {attendance.map((row) => (
        <View key={row.attendance_id} style={styles.attendanceRow}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{row.full_name}</Text>
            <Text style={styles.memberEmail}>{row.email}</Text>
          </View>
          <Text style={styles.checkTime}>{new Date(row.checked_in_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</Text>
        </View>
      ))}

      <ConfirmModal
        visible={confirmVisible}
        title="Regenerate QR code?"
        body="The current QR code will stop working immediately. Members already checked in will stay checked in."
        confirmLabel="Regenerate"
        onConfirm={regenerate}
        onDismiss={() => setConfirmVisible(false)}
      />
      <Modal visible={fullScreenQr} animationType="slide" onRequestClose={() => setFullScreenQr(false)}>
        <View style={styles.fullscreen}>
          <Text style={styles.fullscreenTitle}>{event.title}</Text>
          <QRCode value={checkInUrl} size={310} backgroundColor="#f7fff9" color="#06110f" />
          <Text style={styles.fullscreenCopy}>Scan in the QU Poker app to check in.</Text>
          <AppButton mode="outlined" icon="close" onPress={() => setFullScreenQr(false)}>Close</AppButton>
        </View>
      </Modal>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  qrPanel: { alignItems: "center", gap: 14, padding: 20, borderRadius: 22, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  qrText: { color: colors.muted, textAlign: "center", lineHeight: 20 },
  token: { color: colors.gold, fontSize: 12, fontWeight: "800", textAlign: "center" },
  summary: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  summaryNumber: { color: colors.green, fontSize: 34, fontWeight: "900" },
  summaryLabel: { color: colors.muted, fontWeight: "800" },
  attendanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  memberInfo: { flex: 1, gap: 3 },
  memberName: { color: colors.text, fontWeight: "900" },
  memberEmail: { color: colors.muted },
  checkTime: { color: colors.gold, fontWeight: "900" },
  fullscreen: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24, gap: 24 },
  fullscreenTitle: { color: colors.text, fontWeight: "900", fontSize: 28, textAlign: "center" },
  fullscreenCopy: { color: colors.muted, fontWeight: "800", textAlign: "center" }
});
