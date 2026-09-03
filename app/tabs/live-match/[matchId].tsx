import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "react-native-paper";
import { PlayingCardDisplay } from "@/components/PlayingCardDisplay";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { ScreenContainer } from "@/components/ScreenContainer";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/lib/poker";
import {
  getMyHoleCards,
  getPokerMatch,
  getShowdownHoleCards,
  PokerMatchWithPlayers,
  revealCommunityStreet,
  subscribeToPokerMatch,
  updatePokerMatchState
} from "@/lib/pokerArena";
import { dealPokerTable, settlePokerTable, stacksFromBuyIns } from "@/lib/pokerRooms";
import {
  advanceStreet,
  createTableState,
  applyBetOrRaise,
  applyCheckOrCall,
  applyFold,
  isBettingRoundClosed,
  nextStreet,
  resolveShowdown,
  ShowdownHands,
  TableSeat,
  TableState
} from "@/lib/pokerTable";

const homeFont = Platform.OS === "ios" ? "System" : "InstrumentSans_400Regular";
const homeMediumFont = Platform.OS === "ios" ? "System" : "InstrumentSans_500Medium";

type SeatMeta = { seat: number; user_id: string | null; display_name: string };

function streetLabel(street: TableState["street"]) {
  if (street === "preflop") return "Pre-flop";
  if (street === "flop") return "Flop";
  if (street === "turn") return "Turn";
  if (street === "river") return "River";
  return "Showdown";
}

function CardSlot({ card, hidden = false, small = false }: { card?: Card; hidden?: boolean; small?: boolean }) {
  if (!card || hidden) {
    return <View style={[styles.cardBack, small && styles.cardBackSmall]} />;
  }
  return (
    <View style={small ? styles.cardSmall : undefined}>
      <PlayingCardDisplay card={card} />
    </View>
  );
}

/** One opponent. Shows their stack, what they have put in this street, and their state - the
 * three things you actually need to read to act. */
function OpponentSeat({
  seat,
  name,
  isTurn,
  cards
}: {
  seat: TableSeat;
  name: string;
  isTurn: boolean;
  cards?: Card[];
}) {
  const dimmed = seat.status === "folded" || seat.status === "out";
  return (
    <View style={[styles.opponent, dimmed && styles.opponentFolded, isTurn && styles.opponentTurn]}>
      <ProfileAvatar name={name} size={38} />
      <Text numberOfLines={1} style={styles.opponentName}>
        {name}
      </Text>
      <Text style={styles.opponentStack}>{seat.stack}</Text>
      {seat.status === "allin" ? (
        <Text style={styles.opponentTag}>ALL IN</Text>
      ) : seat.status === "folded" ? (
        <Text style={styles.opponentTag}>FOLDED</Text>
      ) : seat.committed > 0 ? (
        <Text style={styles.opponentBet}>{seat.committed}</Text>
      ) : null}
      {cards?.length ? (
        <View style={styles.opponentCards}>
          {cards.map((card, index) => (
            <CardSlot card={card} key={index} small />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function LiveMatchScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const insets = useSafeAreaInsets();

  const [state, setState] = useState<TableState | null>(null);
  const [seatMeta, setSeatMeta] = useState<SeatMeta[]>([]);
  const [mySeat, setMySeat] = useState<number | null>(null);
  const [myHoleCards, setMyHoleCards] = useState<Card[]>([]);
  const [revealed, setRevealed] = useState<Record<number, Card[]>>({});
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [waiting, setWaiting] = useState(false);

  // Both the realtime handler and the poll can see an undealt table at once; without this they
  // would both call deal_poker_table and the second would fail with "Hand already dealt".
  const dealingRef = useRef(false);

  const settledRef = useRef(false);

  const settleIfFinished = useCallback(
    async (next: TableState) => {
      if (!next.handOver || settledRef.current) return;
      settledRef.current = true;
      try {
        await settlePokerTable(matchId);
      } catch (err) {
        // A refusal here means the result did not balance, which the player needs to know:
        // their chips are still held against the table until it is settled.
        setError(err instanceof Error ? err.message : "Could not settle the table.");
      }
    },
    [matchId]
  );

  const loadShowdown = useCallback(
    async (next: TableState) => {
      if (next.street !== "showdown") return;
      try {
        const rows = await getShowdownHoleCards(matchId);
        setRevealed(Object.fromEntries(rows.map((row) => [row.seat, row.cards])));
      } catch {
        // Not published yet - the realtime refresh will come back around.
      }
    },
    [matchId]
  );

  useEffect(() => {
    let cancelled = false;
    let currentUserId: string | null = null;
    let unsubscribe: () => void = () => undefined;
    let pollHandle: ReturnType<typeof setInterval> | undefined;

    async function openTable(row: PokerMatchWithPlayers, seated: number[]) {
      const dealt = await dealPokerTable(row.id);
      const opening = createTableState(
        dealt.seats ?? seated,
        20,
        stacksFromBuyIns(dealt.buy_ins),
        dealt.button_seat
      );
      const firstUser = row.players.find((player) => player.seat === opening.currentTurnSeat)?.user_id ?? null;
      await updatePokerMatchState(
        row.id,
        "deal",
        { buttonSeat: dealt.button_seat },
        opening as unknown as Record<string, unknown>,
        firstUser
      );
      if (cancelled) return;
      setWaiting(false);
      setState(opening);
      setMyHoleCards(await getMyHoleCards(row.id).catch(() => []));
    }

    async function absorb(row: PokerMatchWithPlayers) {
      if (cancelled) return;
      setSeatMeta(
        row.players
          .map((player) => ({
            seat: player.seat,
            user_id: player.user_id ?? null,
            display_name: player.display_name
          }))
          .sort((a, b) => a.seat - b.seat)
      );

      const published = row.game_state && Object.keys(row.game_state).length
        ? (row.game_state as unknown as TableState)
        : null;

      // Rooms are dealt from the lobby, but friend invites, invite links and the queue drop
      // straight in here with no opening state. Whoever created the match deals in that case,
      // so those routes keep working without a lobby step.
      if (!published?.seats?.length) {
        const seated = row.players.filter((player) => player.user_id).map((player) => player.seat);
        const iAmCreator = Boolean(currentUserId && row.created_by === currentUserId);
        if (iAmCreator && seated.length >= 2 && !dealingRef.current) {
          dealingRef.current = true;
          try {
            await openTable(row, seated);
          } catch (err) {
            if (!cancelled) setError(err instanceof Error ? err.message : "Could not deal.");
          } finally {
            dealingRef.current = false;
          }
          return;
        }
        setWaiting(true);
        return;
      }
      setWaiting(false);
      setState(published);
      await loadShowdown(published);
      await settleIfFinished(published);
    }

    async function bootstrap() {
      try {
        const user = await getCurrentUser();
        if (!user) throw new Error("Sign in required.");
        currentUserId = user.id;
        const row = await getPokerMatch(matchId);
        if (!row) throw new Error("This table could not be found.");

        const mine = row.players.find((player) => player.user_id === user.id);
        if (!mine) throw new Error("You are not seated at this table.");
        setMySeat(mine.seat);

        await absorb(row);
        try {
          setMyHoleCards(await getMyHoleCards(matchId));
        } catch {
          // Cards arrive when the host deals.
        }

        unsubscribe = subscribeToPokerMatch(matchId, async () => {
          const refreshed = await getPokerMatch(matchId).catch(() => null);
          if (!refreshed || cancelled) return;
          if (!myHoleCards.length) {
            setMyHoleCards(await getMyHoleCards(matchId).catch(() => []));
          }
          await absorb(refreshed);
        }).unsubscribe;

        // Realtime can miss the very first publish if the host dealt a moment before this
        // screen subscribed, so poll gently until a state exists.
        pollHandle = setInterval(async () => {
          if (cancelled) return;
          const refreshed = await getPokerMatch(matchId).catch(() => null);
          if (refreshed?.game_state && Object.keys(refreshed.game_state).length) {
            if (!myHoleCards.length) setMyHoleCards(await getMyHoleCards(matchId).catch(() => []));
            await absorb(refreshed);
            if (pollHandle) clearInterval(pollHandle);
          }
        }, 2500);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load this table.");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      if (pollHandle) clearInterval(pollHandle);
      unsubscribe();
    };
    // settleIfFinished and myHoleCards are deliberately not dependencies - it would tear down the subscription on
    // every deal. The closures read it only to decide whether to fetch once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, loadShowdown, settleIfFinished]);

  const userIdForSeat = useCallback(
    (seat: number) => seatMeta.find((entry) => entry.seat === seat)?.user_id ?? null,
    [seatMeta]
  );

  const nameForSeat = useCallback(
    (seat: number) => seatMeta.find((entry) => entry.seat === seat)?.display_name ?? `Seat ${seat}`,
    [seatMeta]
  );

  const settleIfRoundClosed = useCallback(
    async (candidate: TableState): Promise<TableState> => {
      if (candidate.handOver || !isBettingRoundClosed(candidate)) return candidate;
      const upcoming = nextStreet(candidate.street);

      if (upcoming === "showdown") {
        const response = (await revealCommunityStreet(matchId, "showdown")) as { community?: Card[] };
        const atShowdown = advanceStreet(candidate, response.community ?? []);
        const rows = await getShowdownHoleCards(matchId);
        const hands: ShowdownHands = Object.fromEntries(rows.map((row) => [row.seat, row.cards]));
        setRevealed(hands);
        return resolveShowdown(atShowdown, hands);
      }

      const response = (await revealCommunityStreet(matchId, upcoming)) as { community?: Card[] };
      return advanceStreet(candidate, response.community ?? []);
    },
    [matchId]
  );

  const act = useCallback(
    async (action: "fold" | "call" | "raise") => {
      if (!state || mySeat === null || acting) return;
      if (state.handOver || state.currentTurnSeat !== mySeat) return;

      setActing(true);
      try {
        let next =
          action === "fold"
            ? applyFold(state, mySeat)
            : action === "raise"
              ? applyBetOrRaise(state, mySeat, Math.max(state.minRaise, state.bigBlind))
              : applyCheckOrCall(state, mySeat);

        next = await settleIfRoundClosed(next);
        setState(next);
        await settleIfFinished(next);
        await updatePokerMatchState(
          matchId,
          action,
          {},
          next as unknown as Record<string, unknown>,
          next.handOver ? null : userIdForSeat(next.currentTurnSeat)
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to submit that action.");
      } finally {
        setActing(false);
      }
    },
    [acting, matchId, mySeat, settleIfFinished, settleIfRoundClosed, state, userIdForSeat]
  );

  if (error) {
    return (
      <ScreenContainer>
        <ErrorState message={error} />
      </ScreenContainer>
    );
  }

  if (waiting || !state || mySeat === null) {
    return (
      <ScreenContainer>
        <LoadingState label={waiting ? "Waiting for the host to deal..." : "Loading the table..."} />
      </ScreenContainer>
    );
  }

  const me = state.seats.find((seat) => seat.seat === mySeat);
  const opponents = state.seats.filter((seat) => seat.seat !== mySeat);
  const myTurn = !state.handOver && state.currentTurnSeat === mySeat;
  const toCall = Math.max(0, state.currentBet - (me?.committed ?? 0));
  const pot = state.seats.reduce((sum, seat) => sum + seat.totalCommitted, 0);
  const canAct = myTurn && me?.status === "active" && !acting;

  return (
    <View style={styles.routeSurface}>
      <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <LinearGradient colors={["#0b1016", "#05070a", "#000000"]} locations={[0, 0.5, 1]} style={styles.felt}>
          <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
            <Pressable
              accessibilityLabel="Leave the table"
              hitSlop={10}
              onPress={() => router.back()}
              style={styles.iconButton}
            >
              <MaterialCommunityIcons color="rgba(247,248,250,0.86)" name="arrow-left" size={24} />
            </Pressable>
            <Text style={styles.street}>{streetLabel(state.street)}</Text>
            <View style={styles.iconButton} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opponentRow}>
            {opponents.map((seat) => (
              <OpponentSeat
                key={seat.seat}
                seat={seat}
                name={nameForSeat(seat.seat)}
                isTurn={!state.handOver && state.currentTurnSeat === seat.seat}
                cards={state.street === "showdown" ? revealed[seat.seat] : undefined}
              />
            ))}
          </ScrollView>

          <View style={styles.middle}>
            <Text style={styles.potLabel}>POT</Text>
            <Text style={styles.potValue}>{pot}</Text>
            <View style={styles.community}>
              {[0, 1, 2, 3, 4].map((index) => (
                <CardSlot card={state.community[index]} key={index} />
              ))}
            </View>
            <Text style={styles.message}>{state.message}</Text>
          </View>

          <View style={styles.myArea}>
            <View style={styles.myCards}>
              {myHoleCards.length ? (
                myHoleCards.map((card, index) => <CardSlot card={card} key={index} />)
              ) : (
                <>
                  <CardSlot hidden />
                  <CardSlot hidden />
                </>
              )}
            </View>
            <View style={styles.myMeta}>
              <Text style={styles.myName}>{nameForSeat(mySeat)}</Text>
              <Text style={styles.myStack}>{me?.stack ?? 0} chips</Text>
              {me?.status === "allin" ? <Text style={styles.opponentTag}>ALL IN</Text> : null}
              {me?.status === "folded" ? <Text style={styles.opponentTag}>FOLDED</Text> : null}
            </View>
          </View>

          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            {state.handOver ? (
              <Pressable
                accessibilityLabel="Back to the lobby"
                onPress={() => router.replace("/room-lobby")}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.primaryText}>BACK TO LOBBY</Text>
              </Pressable>
            ) : (
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityLabel="Fold"
                  disabled={!canAct}
                  onPress={() => void act("fold")}
                  style={({ pressed }) => [styles.actionButton, !canAct && styles.buttonDisabled, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.actionText}>FOLD</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={toCall > 0 ? `Call ${toCall}` : "Check"}
                  disabled={!canAct}
                  onPress={() => void act("call")}
                  style={({ pressed }) => [styles.actionButton, !canAct && styles.buttonDisabled, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.actionText}>{toCall > 0 ? `CALL ${toCall}` : "CHECK"}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Raise"
                  disabled={!canAct}
                  onPress={() => void act("raise")}
                  style={({ pressed }) => [styles.actionButtonPrimary, !canAct && styles.buttonDisabled, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.actionPrimaryText}>
                    {state.currentBet === 0 ? "BET" : `RAISE ${Math.max(state.minRaise, state.bigBlind)}`}
                  </Text>
                </Pressable>
              </View>
            )}
            {!state.handOver && !myTurn ? (
              <Text style={styles.turnNote}>Waiting for {nameForSeat(state.currentTurnSeat)}...</Text>
            ) : null}
          </View>
        </LinearGradient>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  routeSurface: { flex: 1, backgroundColor: "#000000" },
  safeArea: { flex: 1, width: "100%", maxWidth: 472, alignSelf: "center" },
  felt: { flex: 1 },
  topBar: {
    minHeight: 58,
    paddingBottom: 6,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  iconButton: { width: 44, height: 44, alignItems: "flex-start", justifyContent: "center" },
  street: {
    color: "rgba(247,248,250,0.82)",
    fontFamily: homeMediumFont,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1
  },
  opponentRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 4 },
  opponent: {
    width: 96,
    alignItems: "center",
    gap: 3,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.055)"
  },
  opponentFolded: { opacity: 0.4 },
  opponentTurn: { borderWidth: 1, borderColor: "rgba(247,248,250,0.42)" },
  opponentName: { color: "#f7f8fa", fontFamily: homeFont, fontSize: 12 },
  opponentStack: { color: "rgba(247,248,250,0.62)", fontFamily: homeMediumFont, fontSize: 13, fontWeight: "600" },
  opponentBet: { color: "rgba(247,248,250,0.82)", fontFamily: homeFont, fontSize: 11 },
  opponentTag: {
    color: "rgba(247,248,250,0.48)",
    fontFamily: homeMediumFont,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1
  },
  opponentCards: { flexDirection: "row", gap: 3, marginTop: 4 },
  middle: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  potLabel: {
    color: "rgba(247,248,250,0.48)",
    fontFamily: homeMediumFont,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2
  },
  potValue: {
    color: "#f7f8fa",
    fontFamily: homeMediumFont,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700"
  },
  community: { flexDirection: "row", gap: 6, marginTop: 14 },
  message: {
    color: "rgba(247,248,250,0.58)",
    fontFamily: homeFont,
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
    minHeight: 34
  },
  myArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 10
  },
  myCards: { flexDirection: "row", gap: 6 },
  myMeta: { alignItems: "flex-start" },
  myName: { color: "#f7f8fa", fontFamily: homeMediumFont, fontSize: 15, fontWeight: "600" },
  myStack: { color: "rgba(247,248,250,0.62)", fontFamily: homeFont, fontSize: 13, marginTop: 2 },
  cardBack: {
    width: 44,
    height: 62,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)"
  },
  cardBackSmall: { width: 24, height: 34, borderRadius: 5 },
  cardSmall: { transform: [{ scale: 0.55 }], width: 26, height: 36 },
  actions: { paddingHorizontal: 16, paddingTop: 6 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)"
  },
  actionButtonPrimary: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f8fa"
  },
  actionText: { color: "#f7f8fa", fontFamily: homeMediumFont, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  actionPrimaryText: { color: "#0b0c0f", fontFamily: homeMediumFont, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  primaryButton: {
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f8fa"
  },
  primaryText: { color: "#0b0c0f", fontFamily: homeMediumFont, fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  buttonDisabled: { opacity: 0.34 },
  buttonPressed: { opacity: 0.86 },
  turnNote: {
    color: "rgba(247,248,250,0.48)",
    fontFamily: homeFont,
    fontSize: 12,
    textAlign: "center",
    marginTop: 10
  }
});
