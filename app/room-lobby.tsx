import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Snackbar, Text } from "react-native-paper";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { resolveAvatarSource } from "@/constants/avatarAssets";
import { getCurrentProfile } from "@/lib/auth";
import { updatePokerMatchState } from "@/lib/pokerArena";
import {
  createPokerRoom,
  dealPokerTable,
  getMyOpenRoom,
  getRoomSeats,
  joinPokerRoom,
  RoomSeat,
  stacksFromBuyIns
} from "@/lib/pokerRooms";
import { createTableState } from "@/lib/pokerTable";

const homeFont = Platform.OS === "ios" ? "System" : "InstrumentSans_400Regular";
const homeMediumFont = Platform.OS === "ios" ? "System" : "InstrumentSans_500Medium";

const SEAT_COUNT = 6;

export default function RoomLobbyScreen() {
  const insets = useSafeAreaInsets();
  const [myId, setMyId] = useState<string | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [seats, setSeats] = useState<RoomSeat[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshSeats = useCallback(async (id: string) => {
    try {
      setSeats(await getRoomSeats(id));
    } catch {
      // A failed refresh is not worth interrupting the lobby for; the next tick retries.
    }
  }, []);

  useEffect(() => {
    void getCurrentProfile()
      .then((profile) => setMyId(profile?.id ?? null))
      .catch(() => undefined);
    void getMyOpenRoom()
      .then((room) => {
        if (!room) return;
        setMatchId(room.match_id);
        setRoomCode(room.room_code);
        void refreshSeats(room.match_id);
      })
      .catch(() => undefined);
  }, [refreshSeats]);

  // Friends arrive while this screen is open, so the seat list has to keep looking.
  useFocusEffect(
    useCallback(() => {
      if (!matchId) return;
      void refreshSeats(matchId);
      pollRef.current = setInterval(() => void refreshSeats(matchId), 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      };
    }, [matchId, refreshSeats])
  );

  const onCreate = useCallback(async () => {
    setBusy(true);
    try {
      const room = await createPokerRoom();
      setMatchId(room.match_id);
      setRoomCode(room.room_code);
      await refreshSeats(room.match_id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not open a table.");
    } finally {
      setBusy(false);
    }
  }, [refreshSeats]);

  const onJoin = useCallback(async () => {
    const code = joinCode.trim();
    if (code.length < 6) {
      setMessage("Room codes are six characters.");
      return;
    }
    setBusy(true);
    try {
      const result = await joinPokerRoom(code);
      setMatchId(result.match_id);
      setRoomCode(code.toUpperCase());
      setJoinCode("");
      await refreshSeats(result.match_id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not join that table.");
    } finally {
      setBusy(false);
    }
  }, [joinCode, refreshSeats]);

  const onDeal = useCallback(async () => {
    if (!matchId) return;
    setBusy(true);
    try {
      const dealt = await dealPokerTable(matchId);
      // The server owns the cards. Blind positions and who acts first are engine rules, so the
      // host builds the opening state and publishes it for everyone on the table.
      // Each player buys in from their own chip balance, so stacks differ at the table.
      const opening = createTableState(dealt.seats, 20, stacksFromBuyIns(dealt.buy_ins), dealt.button_seat);
      const firstToAct = seats.find((seat) => seat.seat === opening.currentTurnSeat);
      await updatePokerMatchState(
        matchId,
        "deal",
        { buttonSeat: dealt.button_seat },
        opening as unknown as Record<string, unknown>,
        firstToAct?.user_id ?? null
      );
      router.replace(`/tabs/live-match/${matchId}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not deal.");
    } finally {
      setBusy(false);
    }
  }, [matchId, seats]);

  const mySeat = seats.find((seat) => seat.user_id === myId);
  const isHost = Boolean(mySeat?.is_host);
  const canDeal = seats.length >= 2;
  const openSeats = Math.max(0, SEAT_COUNT - seats.length);

  return (
    <View style={styles.routeSurface}>
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            accessibilityLabel="Close custom tables"
            hitSlop={10}
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons color="rgba(247,248,250,0.86)" name="arrow-left" size={24} />
          </Pressable>
          <Text style={styles.topBarTitle}>Custom table</Text>
          <View style={styles.iconButton} />
        </View>

        {matchId ? (
          <View style={styles.stage}>
            <Text style={styles.eyebrow}>ROOM CODE</Text>
            <Text style={styles.code}>{roomCode}</Text>
            <Text style={styles.codeHint}>
              Share this with your friends. Up to six players, {openSeats} seat
              {openSeats === 1 ? "" : "s"} still open.
            </Text>

            <View style={styles.seatList}>
              {seats.map((seat) => (
                <View key={seat.seat} style={styles.seatRow}>
                  <Text style={styles.seatNumber}>{seat.seat}</Text>
                  <ProfileAvatar name={seat.display_name} size={34} source={resolveAvatarSource(seat)} />
                  <Text numberOfLines={1} style={styles.seatName}>
                    {seat.display_name}
                  </Text>
                  {seat.is_host ? <Text style={styles.hostTag}>HOST</Text> : null}
                </View>
              ))}
              {Array.from({ length: openSeats }).map((_, index) => (
                <View key={`empty-${index}`} style={[styles.seatRow, styles.seatRowEmpty]}>
                  <Text style={styles.seatNumber}>{seats.length + index + 1}</Text>
                  <View style={styles.emptySeatDot} />
                  <Text style={styles.seatWaiting}>Waiting for a player</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.stage}>
            <Text style={styles.eyebrow}>CUSTOM TABLES</Text>
            <Text style={styles.title}>Play your friends.</Text>
            <Text style={styles.codeHint}>
              Open a table and share the code, or type in one a friend sent you. You buy in with
              your own chips here, so what you lose at the table leaves your balance. Chips are
              play money and have no cash value.
            </Text>

            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              onChangeText={(value) => setJoinCode(value.toUpperCase())}
              placeholder="ENTER CODE"
              placeholderTextColor="rgba(247,248,250,0.34)"
              style={styles.codeInput}
              value={joinCode}
            />
            <Pressable
              accessibilityLabel="Join a table with this code"
              disabled={busy || joinCode.trim().length < 6}
              onPress={() => void onJoin()}
              style={({ pressed }) => [
                styles.secondaryButton,
                (busy || joinCode.trim().length < 6) && styles.buttonDisabled,
                pressed && styles.buttonPressed
              ]}
            >
              <Text style={styles.secondaryText}>JOIN TABLE</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {matchId ? (
            isHost ? (
              <Pressable
                accessibilityLabel={canDeal ? "Deal the first hand" : "Waiting for another player"}
                disabled={busy || !canDeal}
                onPress={() => void onDeal()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (busy || !canDeal) && styles.buttonDisabled,
                  pressed && styles.buttonPressed
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#0b0c0f" />
                ) : (
                  <Text style={styles.primaryText}>{canDeal ? "DEAL" : "WAITING FOR PLAYERS"}</Text>
                )}
              </Pressable>
            ) : (
              <Text style={styles.waitingNote}>Waiting for the host to deal.</Text>
            )
          ) : (
            <Pressable
              accessibilityLabel="Open a new table"
              disabled={busy}
              onPress={() => void onCreate()}
              style={({ pressed }) => [
                styles.primaryButton,
                busy && styles.buttonDisabled,
                pressed && styles.buttonPressed
              ]}
            >
              {busy ? <ActivityIndicator color="#0b0c0f" /> : <Text style={styles.primaryText}>OPEN A TABLE</Text>}
            </Pressable>
          )}
        </View>
      </SafeAreaView>

      <Snackbar duration={3200} onDismiss={() => setMessage("")} visible={Boolean(message)}>
        {message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  routeSurface: { flex: 1, backgroundColor: "#000000" },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: 472,
    alignSelf: "center",
    backgroundColor: "#000000"
  },
  topBar: {
    minHeight: 58,
    paddingBottom: 6,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  topBarTitle: {
    color: "rgba(247,248,250,0.82)",
    fontFamily: homeMediumFont,
    fontSize: 13,
    fontWeight: "600"
  },
  iconButton: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  stage: { flex: 1, paddingHorizontal: 24, paddingTop: 8, alignItems: "center" },
  eyebrow: {
    color: "rgba(247,248,250,0.48)",
    fontFamily: homeMediumFont,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600"
  },
  title: {
    color: "#f7f8fa",
    fontFamily: homeMediumFont,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    marginTop: 10
  },
  code: {
    color: "#f7f8fa",
    fontFamily: homeMediumFont,
    fontSize: 44,
    lineHeight: 52,
    fontWeight: "700",
    letterSpacing: 8,
    marginTop: 6
  },
  codeHint: {
    color: "rgba(247,248,250,0.58)",
    fontFamily: homeFont,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 320
  },
  codeInput: {
    width: "100%",
    maxWidth: 280,
    height: 60,
    marginTop: 22,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    color: "#f7f8fa",
    fontFamily: homeMediumFont,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 6,
    textAlign: "center"
  },
  seatList: { width: "100%", marginTop: 24, gap: 8 },
  seatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.055)"
  },
  seatRowEmpty: { backgroundColor: "rgba(255,255,255,0.018)" },
  seatNumber: {
    width: 18,
    color: "rgba(247,248,250,0.42)",
    fontFamily: homeMediumFont,
    fontSize: 12,
    fontWeight: "600"
  },
  seatName: { flex: 1, color: "#f7f8fa", fontFamily: homeFont, fontSize: 15 },
  seatWaiting: { flex: 1, color: "rgba(247,248,250,0.34)", fontFamily: homeFont, fontSize: 14 },
  emptySeatDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.14)"
  },
  hostTag: {
    color: "rgba(247,248,250,0.48)",
    fontFamily: homeMediumFont,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1
  },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f8fa"
  },
  primaryText: {
    color: "#0b0c0f",
    fontFamily: homeMediumFont,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1
  },
  secondaryButton: {
    height: 52,
    marginTop: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)"
  },
  secondaryText: {
    color: "#f7f8fa",
    fontFamily: homeMediumFont,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1
  },
  buttonDisabled: { opacity: 0.38 },
  buttonPressed: { opacity: 0.86 },
  waitingNote: {
    color: "rgba(247,248,250,0.58)",
    fontFamily: homeFont,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 18
  }
});
