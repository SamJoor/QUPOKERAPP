import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native-paper";
import { BackButton } from "@/components/BackButton";
import { PlayingCardDisplay } from "@/components/PlayingCardDisplay";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { colors, fonts, radii, spacing } from "@/constants/theme";
import { getCurrentUser } from "@/lib/auth";
import {
  dealPokerMatch,
  getMyHoleCards,
  getPokerMatch,
  getShowdownHoleCards,
  PokerMatchWithPlayers,
  revealCommunityStreet,
  subscribeToPokerMatch,
  updatePokerMatchState
} from "@/lib/pokerArena";
import { Card } from "@/lib/poker";
import {
  advanceStreet,
  applyBetOrRaise,
  applyCheckOrCall,
  applyFold,
  createInitialMatchState,
  isBettingRoundClosed,
  MatchGameState,
  nextStreet,
  resolveShowdown,
  SeatNumber
} from "@/lib/pokerMatch";

type Meta = {
  myUserId: string;
  mySeat: SeatNumber;
  opponentSeat: SeatNumber;
  opponentUserId: string;
  opponentName: string;
};

function seatState(state: MatchGameState, seat: SeatNumber) {
  return seat === 1 ? state.seat1 : state.seat2;
}

function getStreetLabel(street: MatchGameState["street"]) {
  if (street === "preflop") return "Pre-flop";
  if (street === "flop") return "Flop";
  if (street === "turn") return "Turn";
  if (street === "river") return "River";
  return "Showdown";
}

function CardSlot({ card, hidden = false }: { card?: Card; hidden?: boolean }) {
  if (!card || hidden) {
    return (
      <View style={styles.cardBack}>
        <MaterialCommunityIcons name="cards-playing-spade-multiple" size={20} color="rgba(247,248,250,0.34)" />
      </View>
    );
  }
  return <PlayingCardDisplay card={card} />;
}

export default function LiveMatchScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [state, setState] = useState<MatchGameState | null>(null);
  const [myHoleCards, setMyHoleCards] = useState<Card[]>([]);
  const [opponentHoleCards, setOpponentHoleCards] = useState<Card[] | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const metaRef = useRef<Meta | null>(null);
  metaRef.current = meta;

  const loadShowdownIfNeeded = useCallback(async (nextState: MatchGameState) => {
    if (nextState.street !== "showdown" || !metaRef.current) return;
    try {
      const rows = await getShowdownHoleCards(matchId);
      const opponentRow = rows.find((row) => row.user_id === metaRef.current?.opponentUserId);
      if (opponentRow) setOpponentHoleCards(opponentRow.cards);
    } catch {
      // showdown reveal not ready yet - the realtime refresh will retry
    }
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;
    let pollHandle: ReturnType<typeof setInterval> | undefined;
    let unsubscribe: () => void = () => undefined;

    async function refreshFromRow(row: PokerMatchWithPlayers) {
      const gs = (row.game_state && Object.keys(row.game_state).length ? row.game_state : createInitialMatchState()) as unknown as MatchGameState;
      if (cancelled) return;
      setState(gs);
      await loadShowdownIfNeeded(gs);
    }

    async function startMatch(row: PokerMatchWithPlayers, myUserId: string) {
      const mine = row.players.find((player) => player.user_id === myUserId);
      const theirs = row.players.find((player) => player.user_id !== myUserId);
      if (!mine || !theirs) return;
      const nextMeta: Meta = {
        myUserId,
        mySeat: mine.seat,
        opponentSeat: theirs.seat,
        opponentUserId: theirs.user_id ?? "",
        opponentName: theirs.display_name
      };
      setMeta(nextMeta);

      let freshRow = row;
      if (!row.game_state || !Object.keys(row.game_state).length) {
        await dealPokerMatch(matchId);
        freshRow = (await getPokerMatch(matchId)) ?? row;
      }
      const cards = await getMyHoleCards(matchId);
      if (cancelled) return;
      setMyHoleCards(cards);
      await refreshFromRow(freshRow);

      unsubscribe = subscribeToPokerMatch(matchId, async () => {
        const refreshed = await getPokerMatch(matchId).catch(() => null);
        if (!refreshed || cancelled) return;
        await refreshFromRow(refreshed);
      }).unsubscribe;
    }

    async function bootstrap() {
      try {
        const user = await getCurrentUser();
        if (!user) throw new Error("Sign in required.");
        const row = await getPokerMatch(matchId);
        if (!row) throw new Error("This match could not be found.");

        if (row.players.length < 2) {
          setWaitingForOpponent(true);
          pollHandle = setInterval(async () => {
            const refreshed = await getPokerMatch(matchId).catch(() => null);
            if (refreshed && refreshed.players.length === 2 && !cancelled) {
              clearInterval(pollHandle);
              setWaitingForOpponent(false);
              startMatch(refreshed, user.id);
            }
          }, 2500);
          return;
        }
        await startMatch(row, user.id);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load this match.");
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
      if (pollHandle) clearInterval(pollHandle);
      unsubscribe();
    };
  }, [matchId, loadShowdownIfNeeded]);

  async function pushState(actionType: string, nextState: MatchGameState, nextTurnUserId: string | null) {
    setState(nextState);
    await updatePokerMatchState(matchId, actionType, {}, nextState as unknown as Record<string, unknown>, nextTurnUserId);
  }

  async function settleBettingRoundIfClosed(candidate: MatchGameState) {
    if (!isBettingRoundClosed(candidate) || candidate.handOver) return candidate;
    const upcoming = nextStreet(candidate.street);

    if (upcoming === "showdown") {
      const response = (await revealCommunityStreet(matchId, "showdown")) as { community?: Card[] };
      const revealed = advanceStreet(candidate, response.community ?? []);
      const opponentCards = (await getShowdownHoleCards(matchId)).find((row) => row.user_id === metaRef.current?.opponentUserId)?.cards ?? [];
      const mySeat = metaRef.current?.mySeat ?? 1;
      const seat1Hand = mySeat === 1 ? myHoleCards : opponentCards;
      const seat2Hand = mySeat === 1 ? opponentCards : myHoleCards;
      const settled = resolveShowdown(revealed, seat1Hand, seat2Hand);
      if (mySeat === 1) setOpponentHoleCards(seat2Hand);
      else setOpponentHoleCards(seat1Hand);
      return settled;
    }

    const response = (await revealCommunityStreet(matchId, upcoming)) as { community?: Card[] };
    return advanceStreet(candidate, response.community ?? []);
  }

  async function handleAction(action: "fold" | "call" | "raise") {
    if (!state || !meta || acting) return;
    const myTurnUserId = meta.myUserId;
    if (state.currentTurnSeat !== meta.mySeat) return;
    setActing(true);
    try {
      let next =
        action === "fold" ? applyFold(state, meta.mySeat) : action === "raise" ? applyBetOrRaise(state, meta.mySeat, 60) : applyCheckOrCall(state, meta.mySeat);

      if (action !== "fold") {
        next = await settleBettingRoundIfClosed(next);
      }

      const nextTurnUserId = next.handOver ? null : next.currentTurnSeat === meta.mySeat ? myTurnUserId : meta.opponentUserId;
      await pushState(action, next, nextTurnUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit that action.");
    } finally {
      setActing(false);
    }
  }

  if (error) {
    return (
      <ScreenContainer>
        <BackButton fallback="/tabs/dashboard" />
        <ErrorState message={error} />
      </ScreenContainer>
    );
  }

  if (waitingForOpponent) {
    return (
      <ScreenContainer>
        <BackButton fallback="/tabs/dashboard" />
        <LoadingState label="Waiting for your opponent to join..." />
      </ScreenContainer>
    );
  }

  if (!meta || !state) {
    return (
      <ScreenContainer>
        <BackButton fallback="/tabs/dashboard" />
        <LoadingState label="Loading the table..." />
      </ScreenContainer>
    );
  }

  const mine = seatState(state, meta.mySeat);
  const theirs = seatState(state, meta.opponentSeat);
  const myTurn = !state.handOver && state.currentTurnSeat === meta.mySeat;
  const toCall = Math.max(0, state.currentBet - mine.committed);
  const callLabel = toCall > 0 ? `Call ${toCall}` : "Check";
  const communitySlots = [0, 1, 2, 3, 4].map((index) => state.community[index]);
  const resultLabel =
    state.result === null
      ? ""
      : state.result === "split"
        ? "Split pot"
        : state.result === meta.mySeat
          ? "You win the practice pot"
          : `${meta.opponentName} wins the practice pot`;

  return (
    <ScreenContainer padded={false}>
      <LinearGradient colors={["#06080c", "#020407", "#030304"]} locations={[0, 0.55, 1]} style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Live practice match</Text>
            <Text style={styles.title}>vs {meta.opponentName}</Text>
          </View>
          <Pressable accessibilityLabel="Back to dashboard" hitSlop={10} onPress={() => router.replace("/tabs/dashboard")}>
            <MaterialCommunityIcons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        <LinearGradient colors={["rgba(12,53,95,0.28)", "rgba(255,255,255,0.045)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tableCard}>
          <View style={styles.tableTop}>
            <Text style={styles.street}>{getStreetLabel(state.street)}</Text>
            <View style={styles.potPill}>
              <Text style={styles.potLabel}>Pot</Text>
              <Text style={styles.potValue}>{state.pot}</Text>
            </View>
          </View>

          <View style={styles.opponentRow}>
            <View style={styles.aiAvatar}>
              <MaterialCommunityIcons name="account" size={22} color={colors.gold} />
            </View>
            <View style={styles.opponentCopy}>
              <Text style={styles.opponentName}>{meta.opponentName}</Text>
              <Text style={styles.opponentMeta}>{theirs.stack} practice chips {theirs.status === "folded" ? "· folded" : ""}</Text>
            </View>
            <View style={styles.hiddenHand}>
              <CardSlot hidden={state.street !== "showdown"} card={opponentHoleCards?.[0]} />
              <CardSlot hidden={state.street !== "showdown"} card={opponentHoleCards?.[1]} />
            </View>
          </View>

          <View style={styles.boardRow}>
            {communitySlots.map((card, index) => (
              <CardSlot key={`${card?.rank ?? "empty"}-${card?.suit ?? index}`} card={card} />
            ))}
          </View>

          <View style={styles.heroPanel}>
            <Text style={styles.heroLabel}>Your hand · {mine.stack} practice chips</Text>
            <View style={styles.heroCardsRow}>
              {myHoleCards.map((card) => (
                <PlayingCardDisplay key={`${card.rank}-${card.suit}`} card={card} />
              ))}
            </View>
          </View>
        </LinearGradient>

        {state.handOver ? (
          <View style={styles.coachCard}>
            <Text style={styles.resultText}>{resultLabel}</Text>
            <Text style={styles.coachMeta}>{state.message}</Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <Pressable disabled={!myTurn || acting} onPress={() => handleAction("fold")} style={({ pressed }) => [styles.actionButton, styles.foldButton, (!myTurn || acting) && styles.disabledButton, pressed && styles.pressed]}>
              <Text style={styles.actionText}>Fold</Text>
            </Pressable>
            <Pressable disabled={!myTurn || acting} onPress={() => handleAction("call")} style={({ pressed }) => [styles.actionButton, styles.callButton, (!myTurn || acting) && styles.disabledButton, pressed && styles.pressed]}>
              <Text style={[styles.actionText, styles.callText]}>{callLabel}</Text>
            </Pressable>
            <Pressable disabled={!myTurn || acting} onPress={() => handleAction("raise")} style={({ pressed }) => [styles.actionButton, styles.raiseButton, (!myTurn || acting) && styles.disabledButton, pressed && styles.pressed]}>
              <Text style={styles.raiseText}>Raise 60</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.coachCard}>
          <Text style={styles.coachMeta}>{myTurn ? "Your turn." : state.handOver ? "Hand complete." : `Waiting on ${meta.opponentName}...`}</Text>
          <Text style={styles.coachMeta}>{state.message}</Text>
        </View>
      </LinearGradient>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { width: "100%", maxWidth: 430, minHeight: 900, alignSelf: "center", paddingHorizontal: 22, paddingTop: 26, paddingBottom: 112 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { color: colors.muted, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, fontWeight: "800" },
  title: { color: colors.text, fontFamily: fonts.heading, marginTop: 2, fontSize: 28, lineHeight: 34, fontWeight: "900" },
  tableCard: { marginTop: spacing.lg, borderRadius: radii.xl, padding: spacing.md, borderColor: colors.border, borderWidth: 1 },
  tableTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  street: { color: colors.text, fontSize: 20, lineHeight: 25, fontWeight: "900" },
  potPill: { minWidth: 82, minHeight: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)", borderColor: colors.border, borderWidth: 1 },
  potLabel: { color: colors.muted, fontSize: 10, lineHeight: 12, fontWeight: "800" },
  potValue: { color: colors.text, fontSize: 16, lineHeight: 20, fontWeight: "900" },
  opponentRow: { marginTop: spacing.lg, flexDirection: "row", alignItems: "center" },
  aiAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(214,165,54,0.11)", borderColor: "rgba(214,165,54,0.24)", borderWidth: 1 },
  opponentCopy: { flex: 1, minWidth: 0, marginLeft: spacing.sm },
  opponentName: { color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: "900" },
  opponentMeta: { color: colors.muted, marginTop: 2, fontSize: 11, lineHeight: 14, fontWeight: "700" },
  hiddenHand: { flexDirection: "row", gap: spacing.xs },
  boardRow: { minHeight: 86, marginTop: spacing.lg, flexDirection: "row", justifyContent: "center", gap: spacing.xs },
  cardBack: { width: 54, height: 76, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.055)", borderColor: "rgba(255,255,255,0.08)", borderWidth: 1 },
  heroPanel: { marginTop: spacing.md, borderRadius: radii.lg, padding: spacing.md, backgroundColor: "rgba(2,4,7,0.62)", borderColor: colors.border, borderWidth: 1 },
  heroLabel: { color: colors.muted, fontSize: 11, lineHeight: 14, fontWeight: "800" },
  heroCardsRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md },
  actionButton: { flex: 1, minHeight: 50, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  foldButton: { backgroundColor: "rgba(226,90,95,0.12)", borderColor: "rgba(226,90,95,0.22)" },
  callButton: { backgroundColor: "rgba(255,255,255,0.92)", borderColor: "rgba(255,255,255,0.22)" },
  raiseButton: { backgroundColor: colors.gold, borderColor: "rgba(214,165,54,0.42)" },
  disabledButton: { opacity: 0.42 },
  actionText: { color: colors.text, fontSize: 13, lineHeight: 17, fontWeight: "900" },
  callText: { color: colors.ink },
  raiseText: { color: colors.ink, fontSize: 13, lineHeight: 17, fontWeight: "900" },
  coachCard: { marginTop: spacing.md, borderRadius: radii.lg, padding: spacing.md, backgroundColor: "rgba(255,255,255,0.055)", borderColor: colors.border, borderWidth: 1, gap: 4 },
  resultText: { color: colors.gold, fontFamily: fonts.extraBold, fontSize: 16, lineHeight: 20, fontWeight: "900" },
  coachMeta: { color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }
});
