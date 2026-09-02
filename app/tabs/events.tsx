import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Snackbar, Text } from "react-native-paper";
import Svg, { Circle } from "react-native-svg";
import { ComingSoonModal } from "@/components/BlurOverlayModal";
import { QRScanner } from "@/components/QRScanner";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { colors } from "@/constants/theme";
import { useEventPoints } from "@/contexts/EventPointsContext";
import { checkInToEvent, getEvents, getPastEvents } from "@/lib/events";
import { ClubEvent } from "@/lib/types";

const homeFont = Platform.OS === "ios" ? "System" : "InstrumentSans_400Regular";
const homeMediumFont = Platform.OS === "ios" ? "System" : "InstrumentSans_500Medium";
const sheetHeight = 590;

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function getEventDate(event?: ClubEvent) {
  const date = event ? new Date(event.starts_at) : new Date();
  return {
    day: date.toLocaleDateString([], { day: "2-digit" }),
    month: date.toLocaleDateString([], { month: "short" }).toUpperCase()
  };
}

function getEventTime(event: ClubEvent) {
  return new Date(event.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function ClubPointMark({ size = 20 }: { size?: number }) {
  return (
    <View style={[styles.clubPointMark, { width: size, height: size }]}>
      <MaterialCommunityIcons color="#4ac7f4" name="hexagon-outline" size={size} />
      <MaterialCommunityIcons color="#4ac7f4" name="cards-club" size={Math.round(size * 0.44)} style={styles.clubPointGlyph} />
    </View>
  );
}

function RankRing({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Rank preview coming soon"
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.rankCounter, pressed && styles.rankCounterPressed]}
    >
      <Svg height={30} style={styles.rankProgress} viewBox="0 0 30 30" width={30}>
        <Circle cx={15} cy={15} fill="none" r={13.25} stroke="#1e2028" strokeWidth={1.75} />
      </Svg>
      <Text style={styles.rankCount}>0</Text>
    </Pressable>
  );
}

function EventRow({ event, past = false }: { event: ClubEvent; past?: boolean }) {
  const date = getEventDate(event);

  return (
    <Pressable
      accessibilityLabel={`${event.title}, ${event.event_type}`}
      accessibilityRole="button"
      onPress={() => router.push(`/events/${event.id}`)}
      style={({ pressed }) => [styles.eventRow, past && styles.pastEventRow, pressed && styles.eventRowPressed]}
    >
      <View style={[styles.eventDate, past && styles.pastEventDate]}>
        <Text style={[styles.eventMonth, past && styles.pastText]}>{date.month}</Text>
        <Text style={[styles.eventDay, past && styles.pastText]}>{date.day}</Text>
      </View>
      <View style={styles.eventCopy}>
        <View style={styles.eventEyebrowRow}>
          <Text numberOfLines={1} style={[styles.eventType, past && styles.pastText]}>{event.event_type}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.eventTitle, past && styles.pastTitle]}>{event.title}</Text>
        <View style={styles.eventMetaRow}>
          <MaterialCommunityIcons color={past ? "rgba(143,152,165,0.48)" : "rgba(143,152,165,0.82)"} name="map-marker-outline" size={14} />
          <Text numberOfLines={1} style={[styles.eventLocation, past && styles.pastText]}>{event.location}</Text>
          <View style={styles.eventStartTime}>
            <MaterialCommunityIcons color={past ? "rgba(143,152,165,0.46)" : "rgba(247,248,250,0.68)"} name="clock-outline" size={12} />
            <Text style={[styles.eventMetaTime, past && styles.pastText]}>Starts {getEventTime(event)}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.eventPoints, past && styles.pastPoints]}>
        {past ? (
          <MaterialCommunityIcons color="rgba(247,248,250,0.42)" name="check" size={16} />
        ) : (
          <>
            <Text style={styles.eventPointsValue}>+{event.points_awarded}</Text>
            <ClubPointMark size={13} />
          </>
        )}
      </View>
    </Pressable>
  );
}

function SectionHeader({ count, title }: { count?: number; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {typeof count === "number" ? <Text style={styles.sectionCount}>{String(count).padStart(2, "0")}</Text> : null}
    </View>
  );
}

export default function EventsScreen() {
  const { addEventPoints, eventPoints } = useEventPoints();
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [message, setMessage] = useState("");
  const scannerTranslateY = useRef(new Animated.Value(sheetHeight)).current;

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!scanning) return;
    scannerTranslateY.setValue(sheetHeight);
    Animated.timing(scannerTranslateY, {
      toValue: 0,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [scannerTranslateY, scanning]);

  const closeScanner = useCallback(() => {
    Animated.timing(scannerTranslateY, {
      toValue: sheetHeight,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setScanning(false);
    });
  }, [scannerTranslateY]);

  const scannerPanResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => scannerTranslateY.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 88 || gesture.vy > 0.75) {
          closeScanner();
          return;
        }
        Animated.spring(scannerTranslateY, {
          toValue: 0,
          damping: 24,
          stiffness: 240,
          mass: 0.8,
          useNativeDriver: true
        }).start();
      }
    }),
    [closeScanner, scannerTranslateY]
  );

  async function handleScannedCode(code: string) {
    closeScanner();
    try {
      const result = await checkInToEvent(code);
      if (result.status === "success") {
        addEventPoints(result.points_awarded);
      }
      setMessage(
        result.status === "success"
          ? `Checked into ${result.event_title}. +${result.points_awarded} club points.`
          : result.status === "duplicate"
            ? "You already checked into this event."
            : "This check-in code is invalid or expired."
      );
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to check in.");
    }
  }

  const scannerBackdropOpacity = scannerTranslateY.interpolate({
    inputRange: [0, sheetHeight],
    outputRange: [1, 0],
    extrapolate: "clamp"
  });

  return (
    <ScreenContainer fill padded={false} scroll={false}>
      <View style={styles.eventsShell}>
        <ScrollView contentContainerStyle={styles.eventsScrollContent} showsVerticalScrollIndicator={false} style={styles.eventsScroll}>
          <View style={styles.eventsScreen}>
            <View style={styles.topBarSpacer} />

            <LinearGradient colors={["#edf6fc", "#e7f4ef", "#e6f6de"]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.calendarHero}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>CLUB CALENDAR</Text>
                <Text style={styles.heroTitle}>Events</Text>
                <Text style={styles.heroSubtitle}>Meet, play, and keep up with what is happening next.</Text>
              </View>
              <View accessibilityLabel="QU Poker Club" style={styles.heroLogoWrap}>
                <Image
                  accessibilityIgnoresInvertColors
                  resizeMode="contain"
                  source={require("../../assets/branding/qu-poker-wordmark.png")}
                  style={styles.heroLogo}
                />
              </View>
            </LinearGradient>

            {loading ? (
              <View style={styles.stateWrap}><LoadingState label="Loading events..." /></View>
            ) : error ? (
              <View style={styles.stateWrap}><ErrorState message={error} onRetry={load} /></View>
            ) : (
              <>
                <View style={styles.section}>
                  <SectionHeader count={events.length} title="Upcoming events" />
                  {events.length ? (
                    <View style={styles.eventList}>
                      {events.map((event) => <EventRow event={event} key={event.id} />)}
                    </View>
                  ) : (
                    <View style={styles.emptyRow}>
                      <MaterialCommunityIcons color="rgba(247,248,250,0.36)" name="calendar-blank-outline" size={20} />
                      <View style={styles.emptyCopy}>
                        <Text style={styles.emptyTitle}>Nothing scheduled yet</Text>
                        <Text style={styles.emptyBody}>New club events will appear here.</Text>
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <SectionHeader count={pastEvents.length} title="Recent" />
                  {pastEvents.length ? (
                    <View style={styles.eventList}>
                      {pastEvents.map((event) => <EventRow event={event} key={event.id} past />)}
                    </View>
                  ) : (
                    <View style={styles.emptyRow}>
                      <MaterialCommunityIcons color="rgba(247,248,250,0.36)" name="check-circle-outline" size={20} />
                      <View style={styles.emptyCopy}>
                        <Text style={styles.emptyTitle}>No recent events</Text>
                        <Text style={styles.emptyBody}>Completed events will stay within reach here.</Text>
                      </View>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <View pointerEvents="box-none" style={styles.eventsTopBar}>
          <View style={styles.eventsTopBarContent}>
            <View accessibilityLabel={`${eventPoints} event check-in points earned`} style={styles.pointCounter}>
              <ClubPointMark />
              <Text style={styles.pointCount}>{formatNumber(eventPoints)}</Text>
            </View>
            <RankRing onPress={() => setComingSoonVisible(true)} />
          </View>
        </View>

        <View pointerEvents="box-none" style={styles.checkInDock}>
          <Pressable
            accessibilityLabel="Check in with event QR code"
            accessibilityRole="button"
            onPress={() => setScanning(true)}
            style={({ pressed }) => [styles.checkInButton, pressed && styles.checkInButtonPressed]}
          >
            <Text style={styles.checkInText}>Check in</Text>
            <MaterialCommunityIcons color="#050608" name="qrcode-scan" size={18} />
          </Pressable>
        </View>

        <Snackbar duration={4000} onDismiss={() => setMessage("")} style={styles.snackbar} visible={Boolean(message)}>{message}</Snackbar>
      </View>

      <ComingSoonModal onClose={() => setComingSoonVisible(false)} visible={comingSoonVisible} />

      <Modal animationType="none" onRequestClose={closeScanner} statusBarTranslucent transparent visible={scanning}>
        <View style={styles.scannerRoot}>
          <Animated.View style={[styles.scannerBackdrop, { opacity: scannerBackdropOpacity }]}>
            <Pressable accessibilityLabel="Close event check-in" onPress={closeScanner} style={StyleSheet.absoluteFillObject} />
          </Animated.View>
          <Animated.View accessibilityViewIsModal style={[styles.scannerSheet, { transform: [{ translateY: scannerTranslateY }] }]} {...scannerPanResponder.panHandlers}>
            <View style={styles.scannerHandle} />
            <View style={styles.scannerHeader}>
              <View>
                <Text style={styles.scannerEyebrow}>CLUB ATTENDANCE</Text>
                <Text style={styles.scannerTitle}>Event check-in</Text>
              </View>
              <Pressable accessibilityLabel="Close event check-in" hitSlop={12} onPress={closeScanner} style={({ pressed }) => [styles.scannerClose, pressed && styles.eventRowPressed]}>
                <MaterialCommunityIcons color="rgba(247,248,250,0.72)" name="close" size={20} />
              </Pressable>
            </View>
            <Text style={styles.scannerBody}>Point your camera at the QR code shared by the event host.</Text>
            <QRScanner onCode={handleScannedCode} />
            <Text style={styles.scannerHint}>Swipe down to close</Text>
          </Animated.View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eventsShell: { flex: 1, width: "100%", position: "relative", backgroundColor: "#000000" },
  eventsScroll: { flex: 1, width: "100%" },
  eventsScrollContent: { flexGrow: 1, alignItems: "center" },
  eventsScreen: { width: "100%", maxWidth: 472, minHeight: 760, paddingHorizontal: 20, paddingBottom: 190 },
  topBarSpacer: { height: 74 },
  eventsTopBar: { position: "absolute", top: 0, left: 0, right: 0, height: 58, zIndex: 100, elevation: 100, alignItems: "center", backgroundColor: "#000000" },
  eventsTopBarContent: { width: "100%", maxWidth: 472, minHeight: 58, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clubPointMark: { position: "relative", alignItems: "center", justifyContent: "center" },
  clubPointGlyph: { position: "absolute" },
  pointCounter: { minWidth: 44, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 },
  pointCount: { color: "#4ac7f4", fontFamily: homeFont, fontSize: 14, lineHeight: 18, fontWeight: "400", letterSpacing: 0 },
  rankCounter: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  rankCounterPressed: { opacity: 0.58 },
  rankProgress: { position: "absolute" },
  rankCount: { color: colors.text, fontFamily: homeFont, fontSize: 10, lineHeight: 13, fontWeight: "400", letterSpacing: 0 },
  calendarHero: { minHeight: 184, borderRadius: 30, paddingHorizontal: 24, paddingVertical: 24, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  heroCopy: { flex: 1, minWidth: 0, paddingRight: 12 },
  heroEyebrow: { color: "rgba(11,13,16,0.56)", fontFamily: homeMediumFont, fontSize: 9, lineHeight: 12, fontWeight: "600", letterSpacing: 0 },
  heroTitle: { marginTop: 8, color: "#0b0d10", fontFamily: homeFont, fontSize: 31, lineHeight: 37, fontWeight: "400", letterSpacing: 0 },
  heroSubtitle: { maxWidth: 230, marginTop: 8, color: "rgba(11,13,16,0.62)", fontFamily: homeFont, fontSize: 12.5, lineHeight: 18, fontWeight: "400", letterSpacing: 0 },
  heroLogoWrap: { width: 104, height: 82, alignItems: "center", justifyContent: "center" },
  heroLogo: { width: 100, height: 50 },
  stateWrap: { minHeight: 250, justifyContent: "center" },
  section: { marginTop: 42 },
  sectionHeader: { minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { color: colors.text, fontFamily: homeFont, fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: 0 },
  sectionCount: { color: "rgba(143,152,165,0.58)", fontFamily: homeFont, fontSize: 11, lineHeight: 15, fontWeight: "400", letterSpacing: 0 },
  eventList: { borderRadius: 22, overflow: "hidden", backgroundColor: "rgba(20,21,25,0.86)" },
  eventRow: { minHeight: 104, paddingHorizontal: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" },
  pastEventRow: { backgroundColor: "rgba(11,12,15,0.6)" },
  eventRowPressed: { opacity: 0.68 },
  eventDate: { width: 50, height: 58, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.07)" },
  pastEventDate: { backgroundColor: "rgba(255,255,255,0.035)" },
  eventMonth: { color: "#4ac7f4", fontFamily: homeMediumFont, fontSize: 8, lineHeight: 11, fontWeight: "600", letterSpacing: 0 },
  eventDay: { marginTop: 1, color: colors.text, fontFamily: homeFont, fontSize: 22, lineHeight: 27, fontWeight: "400", letterSpacing: 0 },
  eventCopy: { flex: 1, minWidth: 0, marginLeft: 14 },
  eventEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  eventType: { maxWidth: 110, color: "rgba(74,199,244,0.78)", fontFamily: homeMediumFont, fontSize: 8.5, lineHeight: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0 },
  eventTitle: { marginTop: 5, color: colors.text, fontFamily: homeFont, fontSize: 15, lineHeight: 19, fontWeight: "400", letterSpacing: 0 },
  pastTitle: { color: "rgba(247,248,250,0.58)" },
  eventMetaRow: { marginTop: 5, flexDirection: "row", alignItems: "center", gap: 3 },
  eventLocation: { flex: 1, color: "rgba(143,152,165,0.82)", fontFamily: homeFont, fontSize: 10, lineHeight: 14, fontWeight: "400", letterSpacing: 0 },
  eventStartTime: { marginLeft: 5, flexDirection: "row", alignItems: "center", gap: 3 },
  eventMetaTime: { color: "rgba(247,248,250,0.72)", fontFamily: homeMediumFont, fontSize: 10, lineHeight: 14, fontWeight: "500", letterSpacing: 0 },
  pastText: { color: "rgba(143,152,165,0.46)" },
  eventPoints: { minWidth: 48, height: 30, marginLeft: 8, borderRadius: 15, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.055)" },
  pastPoints: { minWidth: 30, width: 30, paddingHorizontal: 0, backgroundColor: "rgba(255,255,255,0.03)" },
  eventPointsValue: { color: "rgba(247,248,250,0.78)", fontFamily: homeFont, fontSize: 10, lineHeight: 13, fontWeight: "400", letterSpacing: 0 },
  emptyRow: { minHeight: 86, borderRadius: 20, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "rgba(20,21,25,0.58)" },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: "rgba(247,248,250,0.64)", fontFamily: homeFont, fontSize: 13, lineHeight: 17, fontWeight: "400", letterSpacing: 0 },
  emptyBody: { marginTop: 3, color: "rgba(143,152,165,0.56)", fontFamily: homeFont, fontSize: 10, lineHeight: 14, fontWeight: "400", letterSpacing: 0 },
  checkInDock: { position: "absolute", left: 0, right: 0, bottom: 14, alignItems: "center", zIndex: 120, elevation: 120 },
  checkInButton: { minWidth: 112, height: 46, borderRadius: 23, paddingHorizontal: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#f7f8fa", shadowColor: "#000000", shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  checkInButtonPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  checkInText: { color: "#050608", fontFamily: homeMediumFont, fontSize: 13, lineHeight: 17, fontWeight: "500", letterSpacing: 0 },
  snackbar: { marginBottom: 96, backgroundColor: "#202024" },
  scannerRoot: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  scannerBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.66)" },
  scannerSheet: { width: "100%", maxWidth: 430, minHeight: sheetHeight, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 28, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#202024", shadowColor: "#000000", shadowOpacity: 0.42, shadowRadius: 24, shadowOffset: { width: 0, height: -12 }, elevation: 24 },
  scannerHandle: { width: 50, height: 5, borderRadius: 3, alignSelf: "center", backgroundColor: "rgba(218,222,230,0.55)" },
  scannerHeader: { minHeight: 58, marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scannerEyebrow: { color: "rgba(74,199,244,0.74)", fontFamily: homeMediumFont, fontSize: 9, lineHeight: 12, fontWeight: "600", letterSpacing: 0 },
  scannerTitle: { marginTop: 4, color: colors.text, fontFamily: homeFont, fontSize: 25, lineHeight: 31, fontWeight: "400", letterSpacing: 0 },
  scannerClose: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.055)" },
  scannerBody: { marginTop: 6, marginBottom: 18, color: "rgba(216,221,230,0.58)", fontFamily: homeFont, fontSize: 12, lineHeight: 18, fontWeight: "400", letterSpacing: 0 },
  scannerHint: { marginTop: 14, color: "rgba(216,221,230,0.36)", fontFamily: homeFont, fontSize: 10, lineHeight: 14, fontWeight: "400", textAlign: "center", letterSpacing: 0 }
});
