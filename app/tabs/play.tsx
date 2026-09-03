import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native-paper";
import { PlayingCardDisplay } from "@/components/PlayingCardDisplay";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ScreenContainer } from "@/components/ScreenContainer";
import { resolveAvatarSource } from "@/constants/avatarAssets";
import { getCurrentProfile } from "@/lib/auth";
import { Profile } from "@/lib/types";
import { colors, fonts, radii, spacing, typography } from "@/constants/theme";
import { Card, compareHands, evaluatePokerHand, suitSymbols } from "@/lib/poker";
import { BotLevel, createPokerGame, playerBetOrRaise, playerCheckOrCall, playerFold, PokerGameState } from "@/lib/pokerGame";
import { calculateHoldemInsights, startingHandStrength } from "@/lib/pokerOdds";

type ActionType = "fold" | "call" | "raise";
type TrainingMode = "Beginner" | "Advanced";
type TableSeatState = {
  hand: Card[];
  bet: number;
  lastBet: number;
  folded: boolean;
  stack: number;
};

const quickRaiseDistance = 215;
const botThinkIntervals = [760, 1100] as const;

function getBotThinkTime() {
  return botThinkIntervals[Math.random() < 0.5 ? 0 : 1];
}

const tablePlayers = [
  { name: "Rook", avatar: require("../../assets/profile-photos/demo-rook.png") },
  { name: "Nova", avatar: require("../../assets/profile-photos/demo-nova.png") },
  { name: "Echo", avatar: require("../../assets/profile-photos/demo-echo.png") },
  { name: "Jett", avatar: require("../../assets/profile-photos/demo-jett.png") },
  { name: "Vale", avatar: require("../../assets/profile-photos/demo-vale.png") }
] as const;

const studySources = ["Pot odds", "Starting hands", "Range equity", "Position"] as const;

const oddsRows = [
  { label: "Flush draw", outs: 9, turnRiver: "36%", oneCard: "18%" },
  { label: "Open-ended straight", outs: 8, turnRiver: "32%", oneCard: "16%" },
  { label: "Two overcards", outs: 6, turnRiver: "24%", oneCard: "12%" },
  { label: "Gutshot", outs: 4, turnRiver: "16%", oneCard: "8%" }
] as const;

type HandRanking = {
  name: string;
  description: string;
  cards: Card[];
};

const handRankings: HandRanking[] = [
  {
    name: "Royal flush",
    description: "A, K, Q, J, 10 of one suit",
    cards: [{ rank: "A", suit: "H" }, { rank: "K", suit: "H" }, { rank: "Q", suit: "H" }, { rank: "J", suit: "H" }, { rank: "10", suit: "H" }]
  },
  {
    name: "Straight flush",
    description: "Five consecutive cards of one suit",
    cards: [{ rank: "9", suit: "S" }, { rank: "8", suit: "S" }, { rank: "7", suit: "S" }, { rank: "6", suit: "S" }, { rank: "5", suit: "S" }]
  },
  {
    name: "Four of a kind",
    description: "Four cards of the same rank",
    cards: [{ rank: "A", suit: "S" }, { rank: "A", suit: "H" }, { rank: "A", suit: "D" }, { rank: "A", suit: "C" }, { rank: "7", suit: "S" }]
  },
  {
    name: "Full house",
    description: "Three of a kind plus a pair",
    cards: [{ rank: "K", suit: "S" }, { rank: "K", suit: "H" }, { rank: "K", suit: "D" }, { rank: "5", suit: "C" }, { rank: "5", suit: "H" }]
  },
  {
    name: "Flush",
    description: "Five cards of one suit",
    cards: [{ rank: "A", suit: "D" }, { rank: "J", suit: "D" }, { rank: "8", suit: "D" }, { rank: "5", suit: "D" }, { rank: "2", suit: "D" }]
  },
  {
    name: "Straight",
    description: "Five consecutive ranks",
    cards: [{ rank: "9", suit: "S" }, { rank: "8", suit: "H" }, { rank: "7", suit: "D" }, { rank: "6", suit: "C" }, { rank: "5", suit: "S" }]
  },
  {
    name: "Three of a kind",
    description: "Three cards of the same rank",
    cards: [{ rank: "Q", suit: "S" }, { rank: "Q", suit: "H" }, { rank: "Q", suit: "D" }, { rank: "9", suit: "C" }, { rank: "4", suit: "S" }]
  },
  {
    name: "Two pair",
    description: "Two different pairs",
    cards: [{ rank: "J", suit: "S" }, { rank: "J", suit: "H" }, { rank: "4", suit: "D" }, { rank: "4", suit: "C" }, { rank: "9", suit: "S" }]
  },
  {
    name: "One pair",
    description: "Two cards of the same rank",
    cards: [{ rank: "10", suit: "S" }, { rank: "10", suit: "H" }, { rank: "A", suit: "D" }, { rank: "7", suit: "C" }, { rank: "3", suit: "S" }]
  },
  {
    name: "High card",
    description: "The highest card plays",
    cards: [{ rank: "A", suit: "S" }, { rank: "J", suit: "H" }, { rank: "8", suit: "D" }, { rank: "5", suit: "C" }, { rank: "2", suit: "S" }]
  }
];

function createTableSeatStates(game: PokerGameState, startingStacks = tablePlayers.map(() => 500)): TableSeatState[] {
  const hands = [
    game.botHand,
    game.deck.slice(0, 2),
    game.deck.slice(2, 4),
    game.deck.slice(4, 6),
    game.deck.slice(6, 8)
  ];

  return hands.map((hand, index) => {
    const bankroll = Math.max(0, startingStacks[index] ?? 500);
    if (index === 0) {
      const bet = Math.min(bankroll, game.botCommitted);
      return { hand, bet, lastBet: bet, folded: false, stack: bankroll - bet };
    }
    return { hand, bet: 0, lastBet: 0, folded: false, stack: bankroll };
  });
}

function advanceTableSeatStates(
  seats: TableSeatState[],
  game: PokerGameState,
  action: ActionType,
  matchingContribution: number,
  decisionBoard: Card[]
) {
  return seats.map((seat, index) => {
    if (index === 0) {
      const folded = game.handOver && game.result === "player" && game.message.toLowerCase().includes("fold");
      const lastBet = game.handOver ? 0 : Math.max(0, seat.stack - game.botStack);
      return { ...seat, bet: game.handOver ? seat.bet : game.botCommitted, lastBet, folded, stack: game.botStack };
    }
    if (seat.folded) return { ...seat, lastBet: 0 };
    if (action === "fold" || matchingContribution <= 0) return { ...seat, lastBet: 0 };

    const startingStrength = startingHandStrength(seat.hand);
    const madeHandStrength = evaluatePokerHand([...seat.hand, ...decisionBoard]).rankValue / 8;
    const strength = startingStrength * (decisionBoard.length ? 0.42 : 0.8) + madeHandStrength * (decisionBoard.length ? 0.58 : 0.2);
    const actionPressure = action === "raise" ? 0.16 : action === "call" ? 0.05 : 0;
    const strategicFold = (0.08 + actionPressure) * (1.15 - strength);
    const surpriseFold = Math.random() < 0.045;
    if (surpriseFold || Math.random() < strategicFold) return { ...seat, lastBet: 0, folded: true };

    const addedBet = Math.min(seat.stack, matchingContribution);
    return { ...seat, bet: seat.bet + addedBet, lastBet: addedBet, stack: seat.stack - addedBet };
  });
}

function resolveTableShowdown(game: PokerGameState, seats: TableSeatState[]) {
  const corePot = game.pot;
  const sidePot = seats.slice(1).reduce((total, seat) => total + seat.bet, 0);
  let playerStack = game.playerStack;
  let normalizedSeats = seats.map((seat) => ({ ...seat }));

  if (game.result === "player") playerStack -= corePot;
  if (game.result === "bot") normalizedSeats[0].stack -= corePot;
  if (game.result === "split") {
    playerStack -= Math.floor(corePot / 2);
    normalizedSeats[0].stack -= Math.ceil(corePot / 2);
  }

  const candidates = [
    { seatIndex: -1, evaluation: evaluatePokerHand([...game.playerHand, ...game.visibleCommunity]) },
    ...normalizedSeats
      .map((seat, seatIndex) => ({ seat, seatIndex }))
      .filter(({ seat }) => !seat.folded)
      .map(({ seat, seatIndex }) => ({ seatIndex, evaluation: evaluatePokerHand([...seat.hand, ...game.visibleCommunity]) }))
  ];
  let winners = [candidates[0]];
  candidates.slice(1).forEach((candidate) => {
    const comparison = compareHands(candidate.evaluation, winners[0].evaluation);
    if (comparison > 0) winners = [candidate];
    else if (comparison === 0) winners.push(candidate);
  });

  const totalPot = corePot + sidePot;
  const share = Math.floor(totalPot / winners.length);
  let remainder = totalPot - share * winners.length;
  winners.forEach((winner) => {
    const payout = share + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    if (winner.seatIndex === -1) playerStack += payout;
    else normalizedSeats[winner.seatIndex].stack += payout;
  });

  const playerWon = winners.some((winner) => winner.seatIndex === -1);
  const soleWinner = winners.length === 1 ? winners[0] : null;
  const winnerName = soleWinner?.seatIndex === -1 ? "Sebastian" : soleWinner ? tablePlayers[soleWinner.seatIndex].name : "Table";
  const winningHand = winners[0].evaluation.hand;
  return {
    game: {
      ...game,
      playerStack,
      botStack: normalizedSeats[0].stack,
      result: winners.length > 1 ? "split" as const : playerWon ? "player" as const : "bot" as const,
      playerEvaluation: candidates[0].evaluation,
      message: winners.length > 1 ? `Split demo pot with ${winningHand}.` : `${winnerName} wins the demo pot with ${winningHand}.`
    },
    seats: normalizedSeats
  };
}

const rankOrder: Card["rank"][] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function getBotLevel(value?: string): BotLevel {
  if (value === "Beginner" || value === "Club Regular" || value === "Final Table Bot") return value;
  return "Club Regular";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDemo(value: number) {
  return `D${formatNumber(value)}`;
}

function formatDemoMessage(value: string) {
  return value.replace(/practice chips/gi, "demo credits").replace(/practice pot/gi, "demo pot");
}

function formatTableResult(value: string) {
  return formatDemoMessage(value)
    .replace(/The table folds\.\s*/i, "")
    .replace(/ wins the demo pot with /i, " wins - ")
    .replace(/ wins the demo pot\./i, " wins.");
}

function getStreetLabel(street: PokerGameState["street"]) {
  if (street === "preflop") return "Pre-flop";
  if (street === "flop") return "Flop";
  if (street === "turn") return "Turn";
  if (street === "river") return "River";
  return "Showdown";
}

function advanceMultiwayStreet(state: PokerGameState, intro: string): PokerGameState {
  const nextStreet = state.street === "preflop" ? "flop" : state.street === "flop" ? "turn" : state.street === "turn" ? "river" : "showdown";
  const visibleCount = nextStreet === "flop" ? 3 : nextStreet === "turn" ? 4 : nextStreet === "river" || nextStreet === "showdown" ? 5 : 0;
  return {
    ...state,
    street: nextStreet,
    visibleCommunity: state.community.slice(0, visibleCount),
    currentBet: 0,
    playerCommitted: 0,
    botCommitted: 0,
    handOver: nextStreet === "showdown",
    result: null,
    message: `${intro} ${nextStreet === "showdown" ? "Showdown." : `${getStreetLabel(nextStreet)} dealt.`}`
  };
}

function continueMultiwayHandAfterFold(state: PokerGameState): PokerGameState {
  return advanceMultiwayStreet(
    { ...state, playerStack: Math.max(0, state.playerStack - state.pot) },
    "Rook folds."
  );
}

function playWithoutEngineBot(state: PokerGameState, action: ActionType, raiseAmount: number): PokerGameState {
  if (action === "fold") {
    return { ...state, handOver: true, result: "bot", message: "You folded." };
  }

  const toCall = Math.max(0, state.currentBet - state.playerCommitted);
  const requested = action === "raise" ? toCall + raiseAmount : toCall;
  const contribution = Math.min(state.playerStack, requested);
  return advanceMultiwayStreet(
    {
      ...state,
      playerStack: state.playerStack - contribution,
      playerCommitted: state.playerCommitted + contribution,
      currentBet: action === "raise" ? state.playerCommitted + contribution : state.currentBet,
      pot: state.pot + contribution
    },
    action === "raise" ? "Raise placed." : toCall > 0 ? "Call placed." : "Checked."
  );
}

function getCardRanks(cards: Card[]) {
  return cards.map((card) => rankOrder.indexOf(card.rank) + 2);
}

function countOuts(cards: Card[], visibleCommunity: Card[]) {
  if (visibleCommunity.length === 0) return { outs: 0, notes: ["Use position and starting-hand quality first"] };

  const notes: string[] = [];
  let outs = 0;
  const suitCounts = cards.reduce<Record<Card["suit"], number>>(
    (acc, card) => ({ ...acc, [card.suit]: (acc[card.suit] ?? 0) + 1 }),
    { S: 0, H: 0, D: 0, C: 0 }
  );

  const flushSuit = Object.entries(suitCounts).find(([, count]) => count === 4)?.[0] as Card["suit"] | undefined;
  if (flushSuit) {
    outs += 13 - (suitCounts[flushSuit] ?? 0);
    notes.push("Flush draw");
  }

  const uniqueRanks = new Set(getCardRanks(cards));
  if (uniqueRanks.has(14)) uniqueRanks.add(1);
  const straightMissing = new Set<number>();
  for (let low = 1; low <= 10; low += 1) {
    const run = [low, low + 1, low + 2, low + 3, low + 4];
    const present = run.filter((value) => uniqueRanks.has(value));
    if (present.length === 4) {
      run.filter((value) => !uniqueRanks.has(value)).forEach((value) => straightMissing.add(value === 1 ? 14 : value));
    }
  }
  if (straightMissing.size > 0) {
    outs += Math.min(straightMissing.size * 4, 8);
    notes.push(straightMissing.size > 1 ? "Open-ended straight draw" : "Gutshot straight draw");
  }

  const overcards = gameOvercards(cards.slice(0, 2), visibleCommunity);
  if (outs === 0 && overcards > 0) {
    outs += overcards * 3;
    notes.push(overcards === 2 ? "Two overcards" : "One overcard");
  }

  return { outs: Math.min(outs, 15), notes: notes.length ? notes : ["No clean draw yet"] };
}

function gameOvercards(hand: Card[], visibleCommunity: Card[]) {
  const boardHigh = Math.max(...getCardRanks(visibleCommunity));
  return hand.filter((card) => rankOrder.indexOf(card.rank) + 2 > boardHigh).length;
}

function getStartingHandRead(hand: Card[]) {
  const [first, second] = hand;
  const values = [rankOrder.indexOf(first.rank) + 2, rankOrder.indexOf(second.rank) + 2].sort((a, b) => b - a);
  const pair = first.rank === second.rank;
  const suited = first.suit === second.suit;
  const connected = Math.abs(values[0] - values[1]) <= 1;
  const broadway = values.every((value) => value >= 10);

  if (pair && values[0] >= 10) return "Premium pair. Strong open or value raise spot.";
  if (pair) return "Pocket pair. Better in position or when stacks are deep.";
  if (broadway && suited) return "Suited broadway. Good playability and nut potential.";
  if (broadway) return "Broadway cards. Solid, but watch reverse implied odds.";
  if (suited && connected) return "Suited connector. Play best with position and fold equity.";
  if (values[0] >= 14 && suited) return "Suited ace. Nut-flush potential, but kicker matters.";
  return "Marginal opener. Position and pot price should drive the choice.";
}

function getDecisionCoach(game: PokerGameState) {
  const visibleCards = [...game.playerHand, ...game.visibleCommunity];
  const evaluation = evaluatePokerHand(visibleCards);
  const toCall = Math.max(0, game.currentBet - game.playerCommitted);
  const potOdds = toCall > 0 ? Math.round((toCall / (game.pot + toCall)) * 100) : 0;
  const outRead = countOuts(visibleCards, game.visibleCommunity);
  const multiplier = game.street === "flop" ? 4 : game.street === "turn" ? 2 : 0;
  const drawEquity = multiplier > 0 ? Math.min(95, outRead.outs * multiplier) : 0;
  const madeHandEquity = game.visibleCommunity.length ? Math.min(88, evaluation.rankValue * 11 + 8) : 0;
  const estimatedEquity = game.street === "preflop" ? 0 : Math.max(drawEquity, madeHandEquity);

  let recommendation = "Check";
  if (game.handOver) recommendation = "Review";
  else if (toCall > 0 && estimatedEquity + 3 < potOdds && evaluation.rankValue < 1) recommendation = "Fold";
  else if (toCall > 0 && (estimatedEquity >= potOdds || evaluation.rankValue >= 1)) recommendation = "Call";
  else if (toCall === 0 && (evaluation.rankValue >= 2 || outRead.outs >= 8)) recommendation = "Bet";

  return {
    evaluation,
    toCall,
    potOdds,
    outs: outRead.outs,
    notes: outRead.notes,
    equity: estimatedEquity,
    recommendation
  };
}

function actionFeedback(action: ActionType, before: PokerGameState, coach: ReturnType<typeof getDecisionCoach>) {
  const actionLabel = action === "raise" ? "raise" : action === "call" ? (coach.toCall ? "call" : "check") : "fold";
  if (before.street === "preflop") {
    return `You chose to ${actionLabel}. ${getStartingHandRead(before.playerHand)}`;
  }
  if (action === "fold") {
    return `Fold chosen. Required equity was about ${coach.potOdds}%; your current estimate was ${coach.equity}%.`;
  }
  if (action === "raise") {
    return `Raise chosen. Best when your made hand, nut advantage, or fold equity can pressure the AI range.`;
  }
  return `${coach.toCall ? "Call" : "Check"} chosen. You had about ${coach.equity}% estimated equity with ${coach.outs} clean outs.`;
}

function CardSlot({ card, hidden = false }: { card?: Card; hidden?: boolean }) {
  if (!card || hidden) {
    return (
      <View style={styles.cardBack}>
        {Array.from({ length: 10 }, (_, stripe) => (
          <View key={stripe} style={[styles.cardBackStripe, { top: -17 + stripe * 14 }]} />
        ))}
      </View>
    );
  }
  return <PlayingCardDisplay card={card} size="board" />;
}

function WinnerConfetti() {
  const pieces = [
    { left: 4, top: 13, color: "#5CBED6" },
    { left: 15, top: 1, color: "#79C99E" },
    { left: 57, top: 7, color: "#E86B75" },
    { left: 67, top: 27, color: colors.gold },
    { left: 2, top: 52, color: "#E86B75" },
    { left: 59, top: 59, color: "#5CBED6" }
  ];
  return (
    <View pointerEvents="none" style={styles.winnerConfetti}>
      {pieces.map((piece, index) => (
        <View
          key={index}
          style={[
            styles.confettiPiece,
            { left: piece.left, top: piece.top, backgroundColor: piece.color, transform: [{ rotate: `${index * 23}deg` }] }
          ]}
        />
      ))}
    </View>
  );
}

function SeatHoleCards({ cards }: { cards: Card[] }) {
  return (
    <View style={styles.seatRevealCards}>
      {cards.map((card, index) => {
        const red = card.suit === "H" || card.suit === "D";
        return (
          <View key={`${card.rank}-${card.suit}`} style={[styles.seatRevealCard, index > 0 && styles.seatRevealCardOverlap]}>
            <Text style={[styles.seatRevealRank, red && styles.seatRevealRed]}>{card.rank}</Text>
            <Text style={[styles.seatRevealSuit, red && styles.seatRevealRed]}>{suitSymbols[card.suit]}</Text>
          </View>
        );
      })}
    </View>
  );
}

function RankingCards({ cards }: { cards: Card[] }) {
  return (
    <View style={styles.rankingCards}>
      {cards.map((card, index) => {
        const red = card.suit === "H" || card.suit === "D";
        return (
          <View key={`${card.rank}-${card.suit}-${index}`} style={[styles.rankingCard, index > 0 && styles.rankingCardOverlap]}>
            <Text style={[styles.rankingCardRank, red && styles.rankingCardRed]}>{card.rank}</Text>
            <Text style={[styles.rankingCardSuit, red && styles.rankingCardRed]}>{suitSymbols[card.suit]}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function PlayScreen() {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ botLevel?: string; transition?: string }>();
  const initialBotLevel = getBotLevel(params.botLevel);
  const fadeEntry = params.transition === "fade";
  const gameConfig = useMemo(() => ({ startingStack: 500, openingBet: 10 }), []);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>("Advanced");
  const [game, setGame] = useState(() => createPokerGame(initialBotLevel, gameConfig));
  const [tableSeats, setTableSeats] = useState<TableSeatState[]>(() => createTableSeatStates(game));
  const [displayPot, setDisplayPot] = useState(0);
  const [handNumber, setHandNumber] = useState(1);
  const [lastCoachNote, setLastCoachNote] = useState("Pick an action and the coach will compare it against pot odds, outs, and hand strength.");
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [selectedRaise, setSelectedRaise] = useState(2);
  const [showProfileEquity, setShowProfileEquity] = useState(false);
  const [foldArmed, setFoldArmed] = useState(false);
  const [handRankingsVisible, setHandRankingsVisible] = useState(false);
  const [quickRaiseReady, setQuickRaiseReady] = useState(false);
  const [activeSeat, setActiveSeat] = useState<number | null>(null);
  const [roundResolving, setRoundResolving] = useState(true);
  const [displayPlayerBet, setDisplayPlayerBet] = useState(game.playerCommitted);
  const entrance = useRef(new Animated.Value(0)).current;
  const exitProgress = useRef(new Animated.Value(0)).current;
  const [viewer, setViewer] = useState<Profile | null>(null);
  const profileOutline = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void getCurrentProfile().then(setViewer).catch(() => undefined);
  }, []);

  const handRankingSheetTranslateY = useRef(new Animated.Value(Math.max(windowHeight, 720))).current;
  const raiseTransition = useRef(new Animated.Value(0)).current;
  const quickRaiseProgress = useRef(new Animated.Value(0)).current;
  const quickRaiseReadyRef = useRef(false);
  const suppressRaiseTap = useRef(false);
  const betCollectAnimations = useRef(tablePlayers.map(() => new Animated.Value(0))).current;
  const boardDealAnimations = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(1))).current;
  const previousBoardCount = useRef(0);
  const playerDealAnimation = useRef(new Animated.Value(0)).current;
  const potPulse = useRef(new Animated.Value(1)).current;
  const playerBetCollect = useRef(new Animated.Value(0)).current;
  const foldResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundResolutionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTurnTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const roundResolvingRef = useRef(true);
  const openingSequenceHand = useRef(0);
  const tableSeatsRef = useRef(tableSeats);
  const [raiseSliderWidth, setRaiseSliderWidth] = useState(1);
  const closing = useRef(false);
  const profilePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          profileOutline.stopAnimation();
          profileOutline.setValue(1);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -24) setShowProfileEquity(true);
          if (gesture.dy > 24) setShowProfileEquity(false);
          Animated.sequence([
            Animated.delay(180),
            Animated.timing(profileOutline, { toValue: 0, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true })
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.timing(profileOutline, { toValue: 0, duration: 300, useNativeDriver: true }).start();
        }
      }),
    [profileOutline]
  );

  const closeHandRankings = useCallback(() => {
    Animated.timing(handRankingSheetTranslateY, {
      toValue: Math.max(windowHeight, 720),
      duration: 240,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setHandRankingsVisible(false);
    });
  }, [handRankingSheetTranslateY, windowHeight]);

  const handRankingPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => handRankingSheetTranslateY.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 90 || gesture.vy > 0.85) {
            closeHandRankings();
            return;
          }
          Animated.spring(handRankingSheetTranslateY, {
            toValue: 0,
            damping: 22,
            stiffness: 220,
            mass: 0.8,
            useNativeDriver: true
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(handRankingSheetTranslateY, {
            toValue: 0,
            damping: 22,
            stiffness: 220,
            mass: 0.8,
            useNativeDriver: true
          }).start();
        }
      }),
    [closeHandRankings, handRankingSheetTranslateY]
  );

  const openHandRankings = useCallback(() => {
    handRankingSheetTranslateY.setValue(Math.max(windowHeight, 720));
    setHandRankingsVisible(true);
  }, [handRankingSheetTranslateY, windowHeight]);

  useEffect(() => {
    if (!handRankingsVisible) return;
    const animation = Animated.spring(handRankingSheetTranslateY, {
      toValue: 0,
      damping: 24,
      stiffness: 220,
      mass: 0.82,
      useNativeDriver: true
    });
    animation.start();
    return () => animation.stop();
  }, [handRankingSheetTranslateY, handRankingsVisible]);

  useEffect(() => {
    const animation = Animated.timing(entrance, {
      toValue: 1,
      duration: fadeEntry ? 360 : 420,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true
    });
    animation.start();
    return () => animation.stop();
  }, [entrance, fadeEntry]);

  useEffect(
    () => () => {
      if (foldResetTimeout.current) clearTimeout(foldResetTimeout.current);
      if (roundResolutionTimeout.current) clearTimeout(roundResolutionTimeout.current);
      botTurnTimeouts.current.forEach(clearTimeout);
    },
    []
  );

  useEffect(() => {
    playerDealAnimation.setValue(0);
    const animation = Animated.timing(playerDealAnimation, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [handNumber, playerDealAnimation]);

  useEffect(() => {
    tableSeatsRef.current = tableSeats;
  }, [tableSeats]);

  useEffect(() => {
    if (openingSequenceHand.current === handNumber) return;
    openingSequenceHand.current = handNumber;
    botTurnTimeouts.current.forEach(clearTimeout);
    botTurnTimeouts.current = [];
    roundResolvingRef.current = true;
    setRoundResolving(true);
    setActiveSeat(null);
    setDisplayPot(0);
    playerBetCollect.setValue(0);
    betCollectAnimations.forEach((animation) => animation.setValue(0));

    const targetSeats = tableSeatsRef.current;
    setTableSeats(
      targetSeats.map((seat, index) =>
        index === 0 ? { ...seat, lastBet: 0, stack: seat.stack + seat.lastBet } : seat
      )
    );

    botTurnTimeouts.current.push(setTimeout(() => setActiveSeat(0), 120));
    botTurnTimeouts.current.push(
      setTimeout(() => {
        setTableSeats((current) => current.map((seat, index) => (index === 0 ? targetSeats[0] : seat)));
      }, 470)
    );

    roundResolutionTimeout.current = setTimeout(() => {
      setActiveSeat(null);
      Animated.parallel([
        ...betCollectAnimations.map((animation) =>
          Animated.timing(animation, {
            toValue: 1,
            duration: 340,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true
          })
        ),
        Animated.timing(playerBetCollect, {
          toValue: 1,
          duration: 340,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true
        })
      ]).start(({ finished }) => {
        if (!finished) return;
        setDisplayPot(game.pot + targetSeats.slice(1).reduce((total, seat) => total + seat.bet, 0));
        setDisplayPlayerBet(0);
        setTableSeats(targetSeats.map((seat) => ({ ...seat, lastBet: 0 })));
        roundResolvingRef.current = false;
        setRoundResolving(false);
        roundResolutionTimeout.current = null;
      });
    }, 560);
  }, [betCollectAnimations, game.pot, handNumber, playerBetCollect]);

  useEffect(() => {
    const visibleCount = game.visibleCommunity.length;
    if (visibleCount === 0) {
      previousBoardCount.current = 0;
      boardDealAnimations.forEach((value) => value.setValue(1));
      return;
    }
    if (visibleCount <= previousBoardCount.current) return;

    const newlyDealt = boardDealAnimations.slice(previousBoardCount.current, visibleCount);
    newlyDealt.forEach((value) => value.setValue(0));
    previousBoardCount.current = visibleCount;
    const animation = Animated.stagger(
      75,
      newlyDealt.map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      )
    );
    animation.start();
    return () => animation.stop();
  }, [boardDealAnimations, game.visibleCommunity.length]);

  const coach = useMemo(() => getDecisionCoach(game), [game]);
  const communitySlots = [0, 1, 2, 3, 4].map((index) => game.visibleCommunity[index]);
  const callLabel = coach.toCall > 0 ? `Call ${formatNumber(coach.toCall)}` : "Check";
  const playerFunds = game.playerStack;
  const activeOpponentCount = Math.max(1, tableSeats.filter((seat) => !seat.folded).length);
  const holdemInsights = useMemo(
    () => calculateHoldemInsights(game.playerHand, game.visibleCommunity, activeOpponentCount),
    [activeOpponentCount, game.playerHand, game.visibleCommunity]
  );
  const showOpponentCards = game.street === "showdown";
  const winnerSeatIndex = game.handOver
    ? tablePlayers.findIndex((player) => game.message.toLowerCase().includes(`${player.name.toLowerCase()} wins`))
    : -1;
  const playerIsWinner = game.handOver && game.result === "player";
  const isPlayerTurn = !game.handOver && !roundResolving;
  const potChipCount = Math.min(8, Math.max(3, Math.ceil(displayPot / 40)));
  const minRaiseAmount = 2;
  const maxRaiseAmount = Math.max(minRaiseAmount, playerFunds);
  const clampRaiseAmount = useCallback(
    (value: number) => Math.min(maxRaiseAmount, Math.max(minRaiseAmount, Math.round(value / 2) * 2)),
    [maxRaiseAmount]
  );
  const doubleRaiseAmount = clampRaiseAmount(Math.max(minRaiseAmount, game.currentBet || game.betUnit) * 2);
  const raiseAmount = selectedRaise;
  const raiseSliderProgress = maxRaiseAmount === minRaiseAmount ? 0 : (selectedRaise - minRaiseAmount) / (maxRaiseAmount - minRaiseAmount);
  const actionPageTranslateX = raiseTransition.interpolate({ inputRange: [0, 1], outputRange: [0, windowWidth] });
  const raisePageTranslateX = raiseTransition.interpolate({ inputRange: [0, 1], outputRange: [windowWidth, 0] });
  const actionDockHeight = raiseTransition.interpolate({ inputRange: [0, 1], outputRange: [132, 196] });
  const updateRaiseFromPosition = useCallback(
    (position: number) => {
      const ratio = Math.min(1, Math.max(0, position / raiseSliderWidth));
      const amount = minRaiseAmount + ratio * (maxRaiseAmount - minRaiseAmount);
      setSelectedRaise(clampRaiseAmount(amount));
    },
    [clampRaiseAmount, maxRaiseAmount, raiseSliderWidth]
  );
  const dismissRaiseComposer = useCallback(() => {
    Animated.timing(raiseTransition, {
      toValue: 0,
      duration: 230,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false
    }).start(({ finished }) => {
      if (finished) setRaiseOpen(false);
    });
  }, [raiseTransition]);
  const raiseSliderPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2,
        onPanResponderGrant: (event) => updateRaiseFromPosition(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateRaiseFromPosition(event.nativeEvent.locationX)
      }),
    [updateRaiseFromPosition]
  );
  const entranceTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [fadeEntry ? 0 : Math.max(windowHeight, 720), 0]
  });
  const exitTranslateY = exitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0]
  });
  const exitOpacity = exitProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });
  const screenOpacity = fadeEntry ? Animated.multiply(entrance, exitOpacity) : exitOpacity;
  const screenTranslateY = Animated.add(entranceTranslateY, exitTranslateY);

  const closeScreen = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(exitProgress, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        router.dismissTo("/tabs/dashboard");
        return;
      }
      closing.current = false;
    });
  }, [exitProgress]);

  function startNewHand() {
    if (foldResetTimeout.current) clearTimeout(foldResetTimeout.current);
    foldResetTimeout.current = null;
    setFoldArmed(false);
    raiseTransition.setValue(0);
    const nextBotStacks = tableSeats.map((seat) => Math.max(40, seat.stack));
    const nextGame = createPokerGame(initialBotLevel, {
      startingStack: Math.max(40, game.playerStack),
      botStartingStack: nextBotStacks[0],
      openingBet: gameConfig.openingBet
    });
    setGame(nextGame);
    setTableSeats(createTableSeatStates(nextGame, nextBotStacks));
    setDisplayPot(0);
    setDisplayPlayerBet(nextGame.playerCommitted);
    playerBetCollect.setValue(0);
    setHandNumber((value) => value + 1);
    setRaiseOpen(false);
    roundResolvingRef.current = true;
    setRoundResolving(true);
    setLastCoachNote("New training hand. Start with position, hand quality, and price before committing chips.");
  }

  const chooseAction = useCallback(
    (action: ActionType, requestedRaiseAmount = raiseAmount) => {
      if (game.handOver || roundResolvingRef.current) return;
      if (foldResetTimeout.current) clearTimeout(foldResetTimeout.current);
      foldResetTimeout.current = null;
      setFoldArmed(false);
      raiseTransition.setValue(0);
      setRaiseOpen(false);
      const beforeCoach = getDecisionCoach(game);
      const engineAlreadyFolded = tableSeats[0].folded;
      let nextGame = engineAlreadyFolded
        ? playWithoutEngineBot(game, action, requestedRaiseAmount)
        : action === "fold"
          ? playerFold(game)
          : action === "raise"
            ? playerBetOrRaise(game, requestedRaiseAmount)
            : playerCheckOrCall(game);
      const engineBotFolded =
        nextGame.handOver && nextGame.result === "player" && nextGame.message.toLowerCase().includes("folds");
      const hasAnotherOpponent = tableSeats.slice(1).some((seat) => !seat.folded);
      if (engineBotFolded && hasAnotherOpponent) nextGame = continueMultiwayHandAfterFold(nextGame);

      const playerActionBet =
        action === "fold"
          ? 0
          : action === "raise"
            ? Math.max(0, Math.min(game.currentBet + requestedRaiseAmount, game.playerCommitted + game.playerStack) - game.playerCommitted)
            : Math.min(beforeCoach.toCall, game.playerStack);
      let actionSeats = advanceTableSeatStates(tableSeats, nextGame, action, playerActionBet, game.visibleCommunity);
      if (engineAlreadyFolded || engineBotFolded) {
        actionSeats = actionSeats.map((seat, index) => (index === 0 ? { ...seat, folded: true, lastBet: 0 } : seat));
      }
      let nextSeats = actionSeats;
      const sidePot = nextSeats.slice(1).reduce((total, seat) => total + seat.bet, 0);
      if (nextGame.handOver && nextGame.street === "showdown") {
        const showdown = resolveTableShowdown(nextGame, nextSeats);
        nextGame = showdown.game;
        nextSeats = showdown.seats;
      } else if (engineAlreadyFolded && action === "fold") {
        const winnerIndex = nextSeats.findIndex((seat, index) => index > 0 && !seat.folded);
        const totalPot = nextGame.pot + sidePot;
        if (winnerIndex >= 0) {
          nextSeats = nextSeats.map((seat, index) => (index === winnerIndex ? { ...seat, stack: seat.stack + totalPot } : seat));
          nextGame = { ...nextGame, message: `${tablePlayers[winnerIndex].name} wins the demo pot.` };
        }
      } else if (!nextGame.handOver && nextSeats.every((seat) => seat.folded)) {
        nextGame = {
          ...nextGame,
          playerStack: nextGame.playerStack + nextGame.pot + sidePot,
          handOver: true,
          result: "player",
          message: "The table folds. Sebastian wins the demo pot."
        };
      } else if (nextGame.handOver) {
        if (nextGame.result === "player") {
          if (nextGame.message.toLowerCase().includes("folds")) {
            nextSeats = nextSeats.map((seat, index) => (index === 0 ? { ...seat, folded: true } : seat));
          }
          nextGame = { ...nextGame, playerStack: nextGame.playerStack + sidePot };
        } else if (nextGame.result === "bot") {
          nextSeats = nextSeats.map((seat, index) => index === 0 ? { ...seat, stack: seat.stack + sidePot } : seat);
        } else if (nextGame.result === "split") {
          nextGame = { ...nextGame, playerStack: nextGame.playerStack + Math.floor(sidePot / 2) };
          nextSeats = nextSeats.map((seat, index) => index === 0 ? { ...seat, stack: seat.stack + Math.ceil(sidePot / 2) } : seat);
        }
      }

      roundResolvingRef.current = true;
      setRoundResolving(true);
      setDisplayPlayerBet(playerActionBet);
      playerBetCollect.setValue(0);
      betCollectAnimations.forEach((animation) => animation.setValue(0));
      setLastCoachNote(actionFeedback(action, game, beforeCoach));

      if (roundResolutionTimeout.current) clearTimeout(roundResolutionTimeout.current);
      botTurnTimeouts.current.forEach(clearTimeout);
      botTurnTimeouts.current = [];

      const actingSeats = action === "fold" ? [] : tablePlayers.map((_, index) => index).filter((index) => !tableSeats[index].folded);
      let elapsed = action === "fold" ? 120 : 180;
      actingSeats.forEach((index) => {
        const thinkTime = getBotThinkTime();
        botTurnTimeouts.current.push(setTimeout(() => setActiveSeat(index), elapsed));
        elapsed += thinkTime;
        botTurnTimeouts.current.push(
          setTimeout(() => {
            setTableSeats((current) => current.map((seat, seatIndex) => (seatIndex === index ? actionSeats[index] : seat)));
          }, elapsed)
        );
      });

      const settledGame = nextGame;
      const settledSeats = nextSeats;
      roundResolutionTimeout.current = setTimeout(() => {
        setActiveSeat(null);
        Animated.parallel([
          ...betCollectAnimations.map((animation) =>
            Animated.timing(animation, {
              toValue: 1,
              duration: 340,
              easing: Easing.inOut(Easing.cubic),
              useNativeDriver: true
            })
          ),
          Animated.timing(playerBetCollect, {
            toValue: 1,
            duration: 340,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true
          })
        ]).start(({ finished }) => {
          if (!finished) return;
          setDisplayPot(settledGame.pot + settledSeats.slice(1).reduce((total, seat) => total + seat.bet, 0));
          setGame(settledGame);
          setTableSeats(settledSeats.map((seat) => ({ ...seat, lastBet: 0 })));
          setDisplayPlayerBet(0);
          playerBetCollect.setValue(0);
          roundResolvingRef.current = false;
          setRoundResolving(false);
          roundResolutionTimeout.current = null;
        });
      }, elapsed + 80);
    },
    [betCollectAnimations, game, playerBetCollect, raiseAmount, raiseTransition, tableSeats]
  );

  function openRaiseComposer() {
    if (foldResetTimeout.current) clearTimeout(foldResetTimeout.current);
    foldResetTimeout.current = null;
    setFoldArmed(false);
    setSelectedRaise(minRaiseAmount);
    setRaiseOpen(true);
    raiseTransition.stopAnimation();
    Animated.timing(raiseTransition, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: false
    }).start();
  }

  function requestFold() {
    if (foldArmed) {
      chooseAction("fold");
      return;
    }

    setFoldArmed(true);
    if (foldResetTimeout.current) clearTimeout(foldResetTimeout.current);
    foldResetTimeout.current = setTimeout(() => {
      setFoldArmed(false);
      foldResetTimeout.current = null;
    }, 2600);
  }

  const resetQuickRaiseIndicator = useCallback(() => {
    quickRaiseReadyRef.current = false;
    setQuickRaiseReady(false);
    Animated.timing(quickRaiseProgress, {
      toValue: 0,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [quickRaiseProgress]);

  const raiseActionPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => !roundResolvingRef.current && gesture.dy < -8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_, gesture) => !roundResolvingRef.current && gesture.dy < -8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          suppressRaiseTap.current = true;
          quickRaiseReadyRef.current = false;
          setQuickRaiseReady(false);
        },
        onPanResponderMove: (_, gesture) => {
          const progress = Math.min(1, Math.max(0, -gesture.dy / quickRaiseDistance));
          quickRaiseProgress.setValue(progress);
          const ready = progress >= 1;
          if (ready !== quickRaiseReadyRef.current) {
            quickRaiseReadyRef.current = ready;
            setQuickRaiseReady(ready);
          }
        },
        onPanResponderRelease: () => {
          const shouldRaise = quickRaiseReadyRef.current;
          if (shouldRaise) {
            quickRaiseReadyRef.current = false;
            setQuickRaiseReady(false);
            quickRaiseProgress.stopAnimation();
            quickRaiseProgress.setValue(0);
            chooseAction("raise", doubleRaiseAmount);
          } else {
            resetQuickRaiseIndicator();
          }
          setTimeout(() => {
            suppressRaiseTap.current = false;
          }, 80);
        },
        onPanResponderTerminate: () => {
          resetQuickRaiseIndicator();
          suppressRaiseTap.current = false;
        },
        onPanResponderTerminationRequest: () => false
      }),
    [chooseAction, doubleRaiseAmount, quickRaiseProgress, resetQuickRaiseIndicator]
  );

  const quickRaiseIndicatorOpacity = quickRaiseProgress.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, 1, 1] });
  const quickRaiseFloatingTranslateY = quickRaiseProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -quickRaiseDistance] });
  const quickRaiseOriginOpacity = quickRaiseProgress.interpolate({ inputRange: [0, 0.05, 1], outputRange: [1, 0.28, 0.28] });
  const handRankingBackdropOpacity = handRankingSheetTranslateY.interpolate({
    inputRange: [0, Math.max(windowHeight, 720)],
    outputRange: [1, 0],
    extrapolate: "clamp"
  });

  useEffect(() => {
    potPulse.setValue(0.9);
    Animated.spring(potPulse, {
      toValue: 1,
      damping: 14,
      stiffness: 180,
      mass: 0.7,
      useNativeDriver: true
    }).start();
  }, [displayPot, potPulse]);

  return (
    <Animated.View
      style={[
        styles.entrance,
        {
          opacity: screenOpacity,
          transform: [{ translateY: screenTranslateY }]
        }
      ]}
    >
      <ScreenContainer fill={trainingMode === "Advanced"} padded={false} reserveTabBarSpace={false} scroll={trainingMode === "Beginner"}>
        <View style={[styles.screen, trainingMode === "Advanced" && styles.advancedScreen]}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="Back to dashboard"
              accessibilityRole="button"
              hitSlop={10}
              onPress={closeScreen}
              style={({ pressed }) => [styles.topBackButton, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons color="rgba(247,248,250,0.86)" name="arrow-left" size={24} />
            </Pressable>

            <View accessibilityLabel="Training mode" accessibilityRole="tablist" style={styles.modeToggle}>
              {(["Beginner", "Advanced"] as TrainingMode[]).map((mode) => {
                const selected = trainingMode === mode;
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    key={mode}
                    onPress={() => {
                      if (foldResetTimeout.current) clearTimeout(foldResetTimeout.current);
                      foldResetTimeout.current = null;
                      setFoldArmed(false);
                      setTrainingMode(mode);
                    }}
                    style={({ pressed }) => [styles.modeOption, selected && styles.modeOptionActive, pressed && styles.pressed]}
                  >
                    <Text style={[styles.modeText, selected && styles.modeTextActive]}>{mode}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.tableStage, trainingMode === "Advanced" && styles.advancedTableStage]}>
            {trainingMode === "Beginner" ? (
              <View style={styles.tableTop}>
                <View style={styles.tableEdgeCopy}>
                  <Text style={styles.tableLabel}>HAND {handNumber}</Text>
                  <Text style={styles.street}>{getStreetLabel(game.street)}</Text>
                </View>
                <View style={styles.potReadout}>
                  <Text style={styles.potLabel}>POT</Text>
                  <Text style={styles.potValue}>{formatNumber(displayPot)}</Text>
                </View>
                <View style={[styles.tableEdgeCopy, styles.tableEdgeRight]}>
                  <Text style={styles.tableLabel}>YOUR STACK</Text>
                  <Text style={styles.stackValue}>{formatDemo(playerFunds)}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.tableTopSpacer} />
            )}

            <View style={[styles.seatRow, trainingMode === "Advanced" && styles.advancedSeatRow]}>
              {tablePlayers.map((player, index) => {
                const seatState = tableSeats[index];
                const collectAnimation = betCollectAnimations[index];
                return (
                <View key={player.name} style={[styles.seat, seatState.folded && styles.foldedSeat]}>
                  <View style={styles.avatarShell}>
                    {activeSeat === index ? <View style={styles.seatTurnHalo} /> : null}
                    {winnerSeatIndex === index ? <WinnerConfetti /> : null}
                    <Image source={player.avatar} resizeMode="cover" style={styles.seatAvatar} />
                    {index === (handNumber - 1) % tablePlayers.length ? (
                      <View style={styles.dealerBadge}><Text style={styles.dealerText}>D</Text></View>
                    ) : null}
                  </View>
                  {showOpponentCards && !seatState.folded ? <SeatHoleCards cards={seatState.hand} /> : null}
                  <Text numberOfLines={1} style={[styles.seatName, showOpponentCards && !seatState.folded && styles.seatNameWithCards]}>{player.name}</Text>
                  <Text style={styles.seatStack}>{formatDemo(seatState.stack)}</Text>
                  {!seatState.folded && seatState.lastBet > 0 ? (
                    <Animated.View
                      accessibilityLabel={`${player.name} bet ${formatNumber(seatState.lastBet)}`}
                      style={[
                        styles.seatBetToken,
                        {
                          opacity: collectAnimation.interpolate({ inputRange: [0, 0.76, 1], outputRange: [1, 1, 0] }),
                          transform: [
                            { translateX: collectAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, (4 - index) * 72] }) },
                            { translateY: collectAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, trainingMode === "Advanced" ? 224 : 310] }) },
                            { scale: collectAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }) }
                          ]
                        }
                      ]}
                    >
                      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.seatBetTokenText}>{formatNumber(seatState.lastBet)}</Text>
                    </Animated.View>
                  ) : <View style={styles.seatBetTokenSpacer} />}
                </View>
                );
              })}
            </View>

            <Pressable
              accessibilityHint="Opens the poker hand ranking guide"
              accessibilityLabel="Community cards and hand rankings"
              accessibilityRole="button"
              onPress={openHandRankings}
              style={[styles.boardArea, trainingMode === "Advanced" ? styles.advancedBoardArea : styles.beginnerBoardArea]}
            >
              <View style={styles.boardRow}>
                {communitySlots.map((card, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.boardCardSlot,
                      {
                        opacity: boardDealAnimations[index],
                        transform: [
                          { translateY: boardDealAnimations[index].interpolate({ inputRange: [0, 1], outputRange: [-22, 0] }) },
                          { scale: boardDealAnimations[index].interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }
                        ]
                      }
                    ]}
                  >
                    <CardSlot card={card} />
                  </Animated.View>
                ))}
              </View>

              <Text numberOfLines={1} style={styles.tableTurnStatus}>
                {game.handOver
                  ? formatTableResult(game.message)
                  : activeSeat !== null
                    ? `${tablePlayers[activeSeat].name} is thinking`
                    : roundResolving
                      ? "Collecting bets"
                      : `${getStreetLabel(game.street)} · Your turn`}
              </Text>

              <Animated.View
                accessibilityLabel={`Pot ${formatNumber(displayPot)}`}
                accessible
                style={[styles.tablePot, { transform: [{ scale: potPulse }] }]}
              >
                <View style={styles.potChipRail}>
                  {Array.from({ length: potChipCount }, (_, index) => {
                    const chipColor = ["#5CBED6", colors.gold, "#E86B75", "#79C99E"][index % 4];
                    return (
                      <View
                        key={index}
                        style={[styles.potChip, index > 0 && styles.potChipOverlap, { backgroundColor: chipColor }]}
                      >
                        <View style={styles.potChipCore} />
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.tablePotValue}>{formatNumber(displayPot)}</Text>
              </Animated.View>
            </Pressable>
          </View>

          <View style={styles.playerArea}>
            <View style={styles.heroPanel}>
              {displayPlayerBet > 0 ? (
                <Animated.View
                  accessibilityLabel={`Your bet ${formatNumber(displayPlayerBet)}`}
                  style={[
                    styles.playerBetToken,
                    {
                      opacity: playerBetCollect.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
                      transform: [
                        { translateX: playerBetCollect.interpolate({ inputRange: [0, 1], outputRange: [0, 132] }) },
                        { translateY: playerBetCollect.interpolate({ inputRange: [0, 1], outputRange: [0, -52] }) },
                        { scale: playerBetCollect.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }) }
                      ]
                    }
                  ]}
                >
                  <Text adjustsFontSizeToFit numberOfLines={1} style={styles.seatBetTokenText}>{formatNumber(displayPlayerBet)}</Text>
                </Animated.View>
              ) : null}
              <Animated.View
                style={[
                  styles.heroCardsRow,
                  {
                    transform: [
                      { translateY: playerDealAnimation.interpolate({ inputRange: [0, 1], outputRange: [-42, 0] }) },
                      { scale: playerDealAnimation.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }
                    ]
                  }
                ]}
              >
                {game.playerHand.map((card, index) => (
                  <View
                    key={`${card.rank}-${card.suit}`}
                    style={[styles.heroCardWrap, index === 0 ? styles.heroCardLeft : styles.heroCardRight]}
                  >
                    <PlayingCardDisplay card={card} size="large" variant="dark" />
                  </View>
                ))}
              </Animated.View>
              <Animated.View
                {...profilePanResponder.panHandlers}
                accessibilityHint="Swipe up for percentages or down for your profile"
                accessibilityLabel={
                  showProfileEquity
                    ? `Win chance ${holdemInsights.winPercentage} percent. Next likely improvement ${holdemInsights.nextHand}, ${holdemInsights.nextHandPercentage} percent`
                    : `Sebastian, ${formatDemo(playerFunds)}. ${coach.evaluation.hand}. Win chance ${holdemInsights.winPercentage} percent`
                }
                accessible
                style={[styles.heroCopy, isPlayerTurn && styles.heroCopyActive, playerIsWinner && styles.heroCopyWinner]}
              >
                <Animated.View pointerEvents="none" style={[styles.profileOutline, { opacity: profileOutline }]} />
                {showProfileEquity ? (
                  <>
                    <Text style={styles.profileEyebrow}>WIN CHANCE</Text>
                    <Text style={styles.equityValue}>{holdemInsights.winPercentage}%</Text>
                    <View style={styles.nextHandRow}>
                      <Text numberOfLines={1} style={styles.nextHandName}>{holdemInsights.nextHand}</Text>
                      <Text style={styles.nextHandPercentage}>{holdemInsights.nextHandPercentage}%</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.handStrength}>{coach.evaluation.hand}</Text>
                    <View style={styles.playerAvatarShell}>
                      {playerIsWinner ? <WinnerConfetti /> : null}
                      <ProfileAvatar edgeToEdge name={viewer?.full_name} size={48} source={resolveAvatarSource(viewer)} />
                    </View>
                    <Text style={styles.playerStack}>{formatDemo(playerFunds)}</Text>
                    <Text style={styles.profileMiniStat}>
                      {(viewer?.full_name?.trim().split(/\s+/)[0] ?? "YOU").toUpperCase()}
                    </Text>
                  </>
                )}
                <View pointerEvents="none" style={styles.profilePageDots}>
                  <View style={[styles.profilePageDot, !showProfileEquity && styles.profilePageDotActive]} />
                  <View style={[styles.profilePageDot, showProfileEquity && styles.profilePageDotActive]} />
                </View>
              </Animated.View>
            </View>
          </View>

          <View style={styles.actionDockWrap}>
            <Animated.View
              pointerEvents="none"
              style={[styles.quickRaiseGuide, { opacity: quickRaiseIndicatorOpacity }]}
            >
              <Animated.View
                style={[
                  styles.actionCircle,
                  styles.quickRaiseFloatingCircle,
                  quickRaiseReady && styles.quickRaiseCircleReady,
                  { transform: [{ translateY: quickRaiseFloatingTranslateY }] }
                ]}
              >
                {quickRaiseReady ? (
                  <Text style={styles.quickRaiseFloatingText}>2x</Text>
                ) : (
                  <MaterialCommunityIcons name="arrow-up" size={23} color={colors.text} />
                )}
              </Animated.View>
            </Animated.View>

            <Animated.View style={[styles.actionDock, { height: actionDockHeight }]}>
            {game.handOver ? (
              <Pressable accessibilityRole="button" onPress={() => startNewHand()} style={({ pressed }) => [styles.newHandButton, pressed && styles.pressed]}>
                <MaterialCommunityIcons name="refresh" size={18} color={colors.ink} />
                <Text style={styles.newHandText}>New hand</Text>
              </Pressable>
            ) : (
              <View style={styles.actionViewport}>
                <Animated.View
                  accessibilityElementsHidden={raiseOpen}
                  aria-hidden={raiseOpen}
                  importantForAccessibility={raiseOpen ? "no-hide-descendants" : "auto"}
                  pointerEvents={raiseOpen ? "none" : "auto"}
                  style={[styles.actionPage, { transform: [{ translateX: actionPageTranslateX }] }]}
                >
                  <View style={styles.actionRow}>
                  <Pressable
                    accessibilityLabel={callLabel}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: roundResolving }}
                    disabled={roundResolving}
                    onPress={() => {
                      setRaiseOpen(false);
                      chooseAction("call");
                    }}
                    style={({ pressed }) => [styles.actionControl, roundResolving && styles.actionControlDisabled, pressed && styles.pressed]}
                  >
                    <View style={styles.actionCircle}>
                      <MaterialCommunityIcons name="hand-back-right-outline" size={22} color={colors.text} />
                    </View>
                    <Text style={styles.actionLabel}>{callLabel}</Text>
                  </Pressable>
                  <View {...raiseActionPanResponder.panHandlers} style={[styles.actionControl, roundResolving && styles.actionControlDisabled]}>
                    <Pressable
                      accessibilityLabel="Set raise"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: roundResolving }}
                      accessibilityHint="Tap for raise controls, or swipe upward for a two-times quick raise"
                      disabled={roundResolving}
                      onPress={() => {
                        if (suppressRaiseTap.current) {
                          suppressRaiseTap.current = false;
                          return;
                        }
                        openRaiseComposer();
                      }}
                      style={({ pressed }) => [styles.actionControlInner, pressed && styles.pressed]}
                    >
                      <Animated.View
                        style={[
                          styles.actionCircle,
                          { opacity: quickRaiseOriginOpacity }
                        ]}
                      >
                        <MaterialCommunityIcons name="arrow-up" size={23} color={colors.text} />
                      </Animated.View>
                      <Text style={styles.actionLabel}>Raise</Text>
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityHint="Tap once to arm, then tap again to fold"
                    accessibilityLabel={foldArmed ? "Confirm fold" : "Fold, double tap required"}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: roundResolving }}
                    disabled={roundResolving}
                    onPress={() => {
                      setRaiseOpen(false);
                      requestFold();
                    }}
                    style={({ pressed }) => [styles.actionControl, roundResolving && styles.actionControlDisabled, pressed && styles.pressed]}
                  >
                    <View style={[styles.actionCircle, foldArmed && styles.foldCircleArmed]}>
                      <MaterialCommunityIcons name="close" size={23} color={foldArmed ? "#F2878C" : "rgba(247,248,250,0.66)"} />
                    </View>
                    <Text style={[styles.actionLabel, foldArmed && styles.foldLabelArmed]}>{foldArmed ? "Are you sure?" : "Fold"}</Text>
                  </Pressable>
                  </View>
                </Animated.View>

                <Animated.View
                  accessibilityElementsHidden={!raiseOpen}
                  aria-hidden={!raiseOpen}
                  importantForAccessibility={raiseOpen ? "auto" : "no-hide-descendants"}
                  pointerEvents={raiseOpen ? "auto" : "none"}
                  style={[styles.raisePage, { transform: [{ translateX: raisePageTranslateX }] }]}
                >
                  <View style={styles.raiseSliderBlock}>
                    <View style={styles.raiseSliderHeading}>
                      <Text style={styles.raiseEyebrow}>RAISE AMOUNT</Text>
                      <Text style={styles.raiseValue}>{formatNumber(selectedRaise)}</Text>
                    </View>
                    <View style={styles.raiseSliderRow}>
                      <Text style={styles.raiseRangeText}>{formatNumber(minRaiseAmount)}</Text>
                      <View
                        {...raiseSliderPanResponder.panHandlers}
                        accessibilityActions={[{ name: "decrement" }, { name: "increment" }]}
                        accessibilityLabel="Raise amount"
                        accessibilityRole="adjustable"
                        accessibilityValue={{ min: minRaiseAmount, max: maxRaiseAmount, now: selectedRaise, text: `Raise by ${formatNumber(selectedRaise)}` }}
                        onAccessibilityAction={({ nativeEvent }) => {
                          const direction = nativeEvent.actionName === "increment" ? 1 : -1;
                          setSelectedRaise((value) => clampRaiseAmount(value + 2 * direction));
                        }}
                        onLayout={(event) => setRaiseSliderWidth(event.nativeEvent.layout.width)}
                        style={styles.raiseSlider}
                      >
                        <View style={styles.raiseSliderTrack}>
                          <View style={[styles.raiseSliderFill, { width: `${raiseSliderProgress * 100}%` }]} />
                          <View style={[styles.raiseSliderThumb, { left: `${raiseSliderProgress * 100}%` }]} />
                        </View>
                      </View>
                      <Text style={styles.raiseRangeText}>{formatNumber(maxRaiseAmount)}</Text>
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityLabel="Back to poker actions"
                      accessibilityRole="button"
                      onPress={dismissRaiseComposer}
                      style={({ pressed }) => [styles.actionControl, pressed && styles.pressed]}
                    >
                      <View style={styles.actionCircle}>
                        <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
                      </View>
                      <Text style={styles.actionLabel}>Back</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Raise two times, ${doubleRaiseAmount}`}
                      accessibilityRole="button"
                      onPress={() => chooseAction("raise", doubleRaiseAmount)}
                      style={({ pressed }) => [styles.actionControl, pressed && styles.pressed]}
                    >
                      <View style={styles.actionCircle}>
                        <Text style={styles.raiseDoubleText}>2x</Text>
                      </View>
                      <Text style={styles.actionLabel}>Raise 2x</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Raise by ${selectedRaise}`}
                      accessibilityRole="button"
                      onPress={() => chooseAction("raise")}
                      style={({ pressed }) => [styles.actionControl, pressed && styles.pressed]}
                    >
                      <View style={[styles.actionCircle, styles.raiseConfirmCircle]}>
                        <MaterialCommunityIcons name="arrow-up" size={23} color={colors.ink} />
                      </View>
                      <Text style={styles.actionLabel}>Raise {formatNumber(selectedRaise)}</Text>
                    </Pressable>
                  </View>
                </Animated.View>
              </View>
            )}
            </Animated.View>
          </View>

          {trainingMode === "Beginner" ? (
            <View style={styles.beginnerLearning}>
              <View accessibilityLabel="Current hand learning metrics" style={styles.learningMetrics}>
                {[
                  {
                    icon: "calculator-variant-outline" as const,
                    label: "Pot odds",
                    value: coach.toCall ? `${coach.potOdds}%` : "Free",
                    color: "#5CBED6"
                  },
                  { icon: "target" as const, label: "Clean outs", value: `${coach.outs}`, color: colors.gold },
                  {
                    icon: "chart-line" as const,
                    label: "Est. equity",
                    value: game.street === "preflop" ? "Pre" : `${coach.equity}%`,
                    color: "#67D7A5"
                  }
                ].map((metric) => (
                  <View key={metric.label} style={styles.learningMetric}>
                    <MaterialCommunityIcons name={metric.icon} size={17} color={metric.color} />
                    <Text style={styles.learningMetricValue}>{metric.value}</Text>
                    <Text numberOfLines={1} style={styles.learningMetricLabel}>{metric.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.learningSection}>
                <View style={styles.coachHeader}>
                  <View>
                    <Text style={styles.coachEyebrow}>AFTER THE ACTION</Text>
                    <Text style={styles.sectionTitle}>Decision coach</Text>
                  </View>
                  <View style={styles.recommendationPill}>
                    <Text style={styles.recommendationText}>{coach.recommendation}</Text>
                  </View>
                </View>
                <Text style={styles.coachText}>{lastCoachNote}</Text>
                <Text style={styles.coachMeta}>{formatDemoMessage(game.message)}</Text>
                <View style={styles.coachReads}>
                  <View style={styles.coachRead}>
                    <Text style={styles.coachReadLabel}>CURRENT HAND</Text>
                    <Text numberOfLines={1} style={styles.coachReadValue}>{coach.evaluation.hand}</Text>
                  </View>
                  <View style={styles.coachRead}>
                    <Text style={styles.coachReadLabel}>NEXT DRAW</Text>
                    <Text numberOfLines={1} style={styles.coachReadValue}>
                      {holdemInsights.nextHandPercentage}% {holdemInsights.nextHand}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.learningSection}>
                <Text style={styles.coachEyebrow}>FOUNDATIONS</Text>
                <Text style={styles.sectionTitle}>Course concepts in this lobby</Text>
                <View style={styles.sourceRail}>
                  {studySources.map((source) => (
                    <View key={source} style={styles.sourceChip}>
                      <Text style={styles.sourceText}>{source}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.sourceNote}>
                  Compare the price of calling with your equity, then adjust for position, ranges, and fold pressure.
                </Text>
              </View>

              <View style={[styles.learningSection, styles.probabilitySection]}>
                <View style={styles.oddsHeader}>
                  <View>
                    <Text style={styles.coachEyebrow}>DRAW REFERENCE</Text>
                    <Text style={styles.sectionTitle}>Quick probability chart</Text>
                  </View>
                  <Text style={styles.oddsMeta}>Rule of 2 / 4</Text>
                </View>
                <View style={styles.oddsColumnHeader}>
                  <Text style={styles.oddsColumnDraw}>DRAW</Text>
                  <Text style={styles.oddsColumnValue}>TURN + RIVER</Text>
                  <Text style={styles.oddsColumnValue}>ONE CARD</Text>
                </View>
                {oddsRows.map((row) => (
                  <View key={row.label} style={styles.oddsRow}>
                    <View style={styles.oddsDraw}>
                      <Text numberOfLines={1} style={styles.oddsName}>{row.label}</Text>
                      <Text style={styles.oddsSub}>{row.outs} outs</Text>
                    </View>
                    <Text style={styles.oddsValue}>{row.turnRiver}</Text>
                    <Text style={styles.oddsValue}>{row.oneCard}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </ScreenContainer>

      <Modal
        animationType="none"
        onRequestClose={closeHandRankings}
        statusBarTranslucent
        transparent
        visible={handRankingsVisible}
      >
        <View style={styles.handRankingSheetRoot}>
          <Animated.View style={[styles.handRankingBackdrop, { opacity: handRankingBackdropOpacity }]}>
            <Pressable
              accessibilityLabel="Close hand rankings"
              onPress={closeHandRankings}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <Animated.View
            accessibilityViewIsModal
            style={[
              styles.handRankingSheet,
              {
                maxHeight: Math.min(windowHeight * 0.86, 720),
                transform: [{ translateY: handRankingSheetTranslateY }]
              }
            ]}
          >
            <View style={styles.handRankingGrabArea} {...handRankingPanResponder.panHandlers}>
              <View style={styles.handRankingHandle} />
            </View>
            <View style={styles.handRankingHeader}>
              <View style={styles.handRankingHeaderCopy}>
                <Text style={styles.handRankingEyebrow}>STRONGEST TO WEAKEST</Text>
                <Text style={styles.handRankingTitle}>Poker hand rankings</Text>
              </View>
              <Pressable
                accessibilityLabel="Close hand rankings"
                accessibilityRole="button"
                hitSlop={8}
                onPress={closeHandRankings}
                style={({ pressed }) => [styles.handRankingClose, pressed && styles.pressed]}
              >
                <MaterialCommunityIcons color="rgba(247,248,250,0.78)" name="close" size={21} />
              </Pressable>
            </View>
            <View style={styles.currentHandRead}>
              <Text style={styles.currentHandLabel}>YOUR CURRENT HAND</Text>
              <Text numberOfLines={1} style={styles.currentHandValue}>{coach.evaluation.hand}</Text>
            </View>
            <ScrollView
              contentContainerStyle={styles.handRankingList}
              fadingEdgeLength={24}
              showsVerticalScrollIndicator={false}
            >
              {handRankings.map((ranking, index) => (
                <View key={ranking.name} style={styles.handRankingRow}>
                  <Text style={styles.handRankingNumber}>{index + 1}</Text>
                  <View style={styles.handRankingCopy}>
                    <Text style={styles.handRankingName}>{ranking.name}</Text>
                    <Text numberOfLines={1} style={styles.handRankingDescription}>{ranking.description}</Text>
                  </View>
                  <RankingCards cards={ranking.cards} />
                </View>
              ))}
              <Text style={styles.handRankingDismissHint}>Swipe down from the handle to close</Text>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entrance: {
    flex: 1,
    backgroundColor: "#000000"
  },
  screen: {
    width: "100%",
    maxWidth: 430,
    minHeight: 940,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 96,
    backgroundColor: "#000000"
  },
  advancedScreen: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 0
  },
  topBar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  topBackButton: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  modeToggle: {
    width: 178,
    height: 36,
    padding: 3,
    borderRadius: radii.pill,
    flexDirection: "row",
    backgroundColor: "#141416",
    borderColor: "rgba(247,248,250,0.07)",
    borderWidth: 1
  },
  modeOption: {
    flex: 1,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center"
  },
  modeOptionActive: {
    backgroundColor: "rgba(247,248,250,0.14)"
  },
  modeText: {
    color: "rgba(247,248,250,0.48)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800"
  },
  modeTextActive: {
    color: colors.text
  },
  tableStage: {
    minHeight: 510,
    position: "relative",
    paddingTop: 8,
    paddingBottom: 22
  },
  advancedTableStage: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 0
  },
  tableTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  tableEdgeCopy: {
    width: 88
  },
  tableEdgeRight: {
    alignItems: "flex-end"
  },
  tableTopSpacer: {
    height: 38
  },
  tableLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800"
  },
  street: {
    color: colors.text,
    marginTop: 2,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  stackValue: {
    color: colors.text,
    marginTop: 2,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  potReadout: {
    minWidth: 70,
    alignItems: "center"
  },
  potLabel: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800"
  },
  potValue: {
    color: colors.text,
    marginTop: 1,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "900"
  },
  seatRow: {
    position: "absolute",
    top: 42,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  advancedSeatRow: {
    top: 18
  },
  seat: {
    width: 68,
    minHeight: 111,
    paddingTop: 4,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 0
  },
  foldedSeat: {
    opacity: 0.26
  },
  avatarShell: {
    width: 60,
    height: 60,
    borderRadius: 30,
    position: "relative",
    backgroundColor: "transparent",
    overflow: "visible"
  },
  seatTurnHalo: {
    position: "absolute",
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderRadius: 34,
    borderColor: "#67D7A5",
    borderWidth: 2
  },
  winnerConfetti: {
    width: 76,
    height: 76,
    position: "absolute",
    top: -8,
    left: -8,
    zIndex: 8
  },
  confettiPiece: {
    width: 4,
    height: 8,
    position: "absolute",
    borderRadius: 2
  },
  seatAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  dealerBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: "absolute",
    right: -3,
    top: -6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,248,250,0.96)"
  },
  dealerText: {
    color: colors.ink,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "900"
  },
  seatName: {
    width: "100%",
    color: "rgba(247,248,250,0.68)",
    marginTop: 6,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "capitalize"
  },
  seatNameWithCards: {
    marginTop: 24
  },
  seatStack: {
    color: colors.text,
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700"
  },
  seatRevealCards: {
    width: 42,
    height: 34,
    position: "absolute",
    top: 43,
    left: 13,
    zIndex: 5,
    flexDirection: "row",
    alignItems: "center"
  },
  seatRevealCard: {
    width: 26,
    height: 36,
    paddingTop: 3,
    paddingLeft: 4,
    borderRadius: 5,
    backgroundColor: "#15171B",
    borderColor: "rgba(247,248,250,0.30)",
    borderWidth: 1
  },
  seatRevealCardOverlap: {
    marginLeft: -9,
    marginTop: 3
  },
  seatRevealRank: {
    color: "rgba(247,248,250,0.86)",
    fontSize: 9,
    lineHeight: 10,
    fontWeight: "900"
  },
  seatRevealSuit: {
    color: "rgba(247,248,250,0.72)",
    fontSize: 8,
    lineHeight: 9,
    fontWeight: "900"
  },
  seatRevealRed: {
    color: "#F06E75"
  },
  seatBetToken: {
    width: 23,
    height: 23,
    marginTop: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,248,250,0.08)",
    borderColor: "rgba(247,248,250,0.28)",
    borderWidth: 1
  },
  seatBetTokenText: {
    maxWidth: 17,
    color: "rgba(247,248,250,0.78)",
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "800",
    textAlign: "center"
  },
  seatBetTokenSpacer: {
    width: 23,
    height: 23,
    marginTop: 4
  },
  tablePot: {
    position: "absolute",
    right: 0,
    bottom: -28,
    alignItems: "center",
    justifyContent: "center"
  },
  potChipRail: {
    height: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  potChip: {
    width: 23,
    height: 23,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "rgba(247,248,250,0.68)",
    borderStyle: "dashed",
    borderWidth: 2
  },
  potChipCore: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#111216",
    borderColor: "rgba(247,248,250,0.36)",
    borderWidth: 1
  },
  potChipOverlap: {
    marginLeft: -9
  },
  tablePotValue: {
    color: "rgba(247,248,250,0.82)",
    marginTop: 2,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700"
  },
  boardArea: {
    position: "absolute",
    left: 4,
    right: 4,
    height: 124
  },
  beginnerBoardArea: {
    bottom: 22
  },
  advancedBoardArea: {
    top: "59%"
  },
  boardRow: {
    height: 94,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  boardCardSlot: {
    width: 66,
    height: 94
  },
  tableTurnStatus: {
    maxWidth: 210,
    position: "absolute",
    left: 0,
    bottom: -18,
    color: "rgba(247,248,250,0.42)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600"
  },
  cardBack: {
    width: 66,
    height: 94,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101115",
    borderColor: "rgba(255,255,255,0.11)",
    borderWidth: 1,
    overflow: "hidden"
  },
  cardBackStripe: {
    width: 122,
    height: 2,
    position: "absolute",
    left: -29,
    backgroundColor: "rgba(247,248,250,0.16)",
    transform: [{ rotate: "-54deg" }]
  },
  playerArea: {
    minHeight: 158,
    paddingVertical: 7,
    backgroundColor: "#000000"
  },
  heroPanel: {
    minHeight: 146,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  handStrength: {
    color: "rgba(247,248,250,0.68)",
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    textAlign: "center"
  },
  heroCardsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 5
  },
  heroCardWrap: {
    position: "relative"
  },
  heroCardLeft: {
    transform: [{ rotate: "-2deg" }]
  },
  heroCardRight: {
    zIndex: 2,
    marginLeft: -19,
    marginTop: 7,
    transform: [{ rotate: "3deg" }]
  },
  heroCopy: {
    width: 132,
    height: 138,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm,
    borderRadius: 8,
    backgroundColor: "#151519",
    borderColor: "rgba(247,248,250,0.10)",
    borderWidth: 1,
    overflow: "visible"
  },
  heroCopyActive: {
    borderColor: "#67D7A5",
    borderWidth: 2
  },
  heroCopyWinner: {
    borderColor: colors.gold,
    borderWidth: 2
  },
  profileOutline: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 8,
    borderColor: "rgba(247,248,250,0.48)",
    borderWidth: 1
  },
  playerAvatarShell: {
    width: 48,
    height: 48,
    position: "relative",
    marginTop: 4
  },
  playerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24
  },
  playerStack: {
    color: colors.text,
    marginTop: 2,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "700"
  },
  profileMiniStat: {
    color: "rgba(247,248,250,0.42)",
    marginTop: 2,
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "700"
  },
  profilePageDots: {
    position: "absolute",
    bottom: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  profilePageDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(247,248,250,0.18)"
  },
  profilePageDotActive: {
    backgroundColor: "rgba(247,248,250,0.72)"
  },
  profileEyebrow: {
    color: "rgba(247,248,250,0.42)",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700"
  },
  equityValue: {
    color: colors.text,
    marginTop: 3,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "500"
  },
  nextHandRow: {
    width: 106,
    marginTop: 7,
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopColor: "rgba(247,248,250,0.10)",
    borderTopWidth: 1
  },
  nextHandName: {
    maxWidth: 76,
    color: "rgba(247,248,250,0.52)",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "600"
  },
  nextHandPercentage: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700"
  },
  actionDockWrap: {
    position: "relative",
    zIndex: 10
  },
  quickRaiseGuide: {
    width: 92,
    height: 272,
    position: "absolute",
    left: "50%",
    bottom: 60,
    zIndex: 12,
    marginLeft: -46,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  quickRaiseFloatingCircle: {
    position: "absolute",
    bottom: 0,
    backgroundColor: "rgba(48,48,52,0.96)",
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  quickRaiseFloatingText: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "900"
  },
  actionDock: {
    minHeight: 132,
    marginHorizontal: -20,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#19191C",
    overflow: "hidden"
  },
  actionViewport: {
    flex: 1,
    position: "relative",
    overflow: "hidden"
  },
  actionPage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center"
  },
  raisePage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "center"
  },
  raiseSliderBlock: {
    marginBottom: 5
  },
  raiseSliderHeading: {
    height: 30,
    alignItems: "center",
    justifyContent: "center"
  },
  playerBetToken: {
    width: 24,
    height: 24,
    position: "absolute",
    top: 3,
    left: "52%",
    zIndex: 6,
    marginLeft: -12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,248,250,0.08)",
    borderColor: "rgba(247,248,250,0.30)",
    borderWidth: 1
  },
  raiseEyebrow: {
    color: "rgba(247,248,250,0.40)",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  raiseValue: {
    color: colors.text,
    marginTop: -1,
    fontSize: 16,
    lineHeight: 19,
    fontWeight: "700"
  },
  raiseDoubleText: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "800"
  },
  raiseConfirmCircle: {
    backgroundColor: "rgba(247,248,250,0.96)",
    borderColor: "rgba(247,248,250,0.96)"
  },
  raiseSliderRow: {
    height: 31,
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  raiseRangeText: {
    width: 34,
    color: "rgba(247,248,250,0.38)",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  raiseSlider: {
    height: 29,
    flex: 1,
    justifyContent: "center"
  },
  raiseSliderTrack: {
    height: 4,
    position: "relative",
    borderRadius: 2,
    backgroundColor: "rgba(247,248,250,0.14)"
  },
  raiseSliderFill: {
    height: 4,
    position: "relative",
    zIndex: 1,
    borderRadius: 2,
    backgroundColor: "rgba(247,248,250,0.72)"
  },
  raiseSliderThumb: {
    width: 17,
    height: 17,
    position: "absolute",
    top: -7,
    zIndex: 3,
    marginLeft: -8,
    borderRadius: 9,
    backgroundColor: colors.text,
    borderColor: "rgba(0,0,0,0.18)",
    borderWidth: 1
  },
  handRankingSheetRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  handRankingBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.70)"
  },
  handRankingSheet: {
    width: "100%",
    maxWidth: 430,
    height: "86%",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: 1,
    backgroundColor: "#202024",
    shadowColor: "#000000",
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -12 },
    elevation: 24,
    overflow: "hidden"
  },
  handRankingGrabArea: {
    height: 28,
    marginHorizontal: -20,
    alignItems: "center",
    justifyContent: "center"
  },
  handRankingHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(218,222,230,0.48)"
  },
  handRankingHeader: {
    minHeight: 59,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  handRankingHeaderCopy: {
    flex: 1,
    minWidth: 0
  },
  handRankingEyebrow: {
    color: "rgba(216,221,230,0.42)",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800"
  },
  handRankingTitle: {
    color: colors.text,
    marginTop: 3,
    fontFamily: fonts.headingSemibold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800"
  },
  handRankingClose: {
    width: 38,
    height: 38,
    marginTop: -3,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,248,250,0.06)"
  },
  currentHandRead: {
    minHeight: 48,
    marginBottom: 8,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 8,
    backgroundColor: "rgba(103,215,165,0.08)",
    borderColor: "rgba(103,215,165,0.20)",
    borderWidth: 1
  },
  currentHandLabel: {
    color: "rgba(216,221,230,0.46)",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800"
  },
  currentHandValue: {
    maxWidth: 170,
    color: "#7BDBB0",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    textAlign: "right"
  },
  handRankingList: {
    paddingBottom: 26
  },
  handRankingRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: "rgba(247,248,250,0.07)",
    borderBottomWidth: 1
  },
  handRankingNumber: {
    width: 22,
    color: "rgba(247,248,250,0.30)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800"
  },
  handRankingCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8
  },
  handRankingName: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800"
  },
  handRankingDescription: {
    color: "rgba(216,221,230,0.42)",
    marginTop: 2,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600"
  },
  rankingCards: {
    width: 111,
    height: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start"
  },
  rankingCard: {
    width: 31,
    height: 43,
    paddingTop: 4,
    paddingLeft: 5,
    borderRadius: 5,
    backgroundColor: "#111216",
    borderColor: "rgba(247,248,250,0.22)",
    borderWidth: 1
  },
  rankingCardOverlap: {
    marginLeft: -11
  },
  rankingCardRank: {
    color: "rgba(247,248,250,0.90)",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "900"
  },
  rankingCardSuit: {
    color: "rgba(247,248,250,0.72)",
    marginTop: 2,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "900"
  },
  rankingCardRed: {
    color: "#F06E75"
  },
  handRankingDismissHint: {
    color: "rgba(216,221,230,0.32)",
    marginTop: 18,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
    textAlign: "center"
  },
  beginnerLearning: {
    marginTop: 34,
    paddingBottom: 56
  },
  learningMetrics: {
    flexDirection: "row",
    gap: 8
  },
  learningMetric: {
    flex: 1,
    minWidth: 0,
    minHeight: 102,
    paddingHorizontal: 10,
    paddingVertical: 13,
    justifyContent: "space-between",
    borderRadius: 8,
    backgroundColor: "#151519",
    borderColor: "rgba(247,248,250,0.08)",
    borderWidth: 1
  },
  learningMetricValue: {
    color: colors.text,
    marginTop: 9,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "800"
  },
  learningMetricLabel: {
    color: "rgba(247,248,250,0.46)",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800"
  },
  learningSection: {
    marginTop: 34,
    paddingTop: 28,
    borderTopColor: "rgba(247,248,250,0.09)",
    borderTopWidth: 1
  },
  coachHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.headingSemibold,
    fontSize: typography.sectionTitle,
    lineHeight: 23,
    fontWeight: "900"
  },
  coachEyebrow: {
    color: "rgba(247,248,250,0.38)",
    marginBottom: 3,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900"
  },
  recommendationPill: {
    minHeight: 32,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(214,165,54,0.14)",
    borderColor: "rgba(214,165,54,0.24)",
    borderWidth: 1
  },
  recommendationText: {
    color: colors.gold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  coachText: {
    color: colors.text,
    marginTop: spacing.sm,
    fontSize: typography.body,
    lineHeight: 21,
    fontWeight: "700"
  },
  coachMeta: {
    color: colors.muted,
    marginTop: spacing.xs,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700"
  },
  coachReads: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22
  },
  coachRead: {
    flex: 1,
    minWidth: 0,
    gap: 4
  },
  coachReadLabel: {
    color: "rgba(247,248,250,0.35)",
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "900"
  },
  coachReadValue: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800"
  },
  sourceRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 17
  },
  sourceChip: {
    minHeight: 34,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(247,248,250,0.07)",
    borderColor: "rgba(247,248,250,0.08)",
    borderWidth: 1
  },
  sourceText: {
    color: "rgba(247,248,250,0.78)",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  sourceNote: {
    color: colors.muted,
    marginTop: 15,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600"
  },
  probabilitySection: {
    paddingBottom: 18
  },
  oddsHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12
  },
  oddsMeta: {
    color: "#67D7A5",
    paddingBottom: 2,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900"
  },
  oddsColumnHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingBottom: 9,
    borderBottomColor: "rgba(247,248,250,0.10)",
    borderBottomWidth: 1
  },
  oddsColumnDraw: {
    flex: 1,
    color: "rgba(247,248,250,0.32)",
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "900"
  },
  oddsColumnValue: {
    width: 78,
    color: "rgba(247,248,250,0.32)",
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "900",
    textAlign: "right"
  },
  oddsRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    borderBottomColor: "rgba(247,248,250,0.07)",
    borderBottomWidth: 1
  },
  oddsDraw: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8
  },
  oddsName: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
  },
  oddsSub: {
    color: "rgba(247,248,250,0.38)",
    marginTop: 2,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700"
  },
  oddsValue: {
    width: 78,
    color: "rgba(247,248,250,0.84)",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    textAlign: "right"
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    marginTop: 4
  },
  actionControl: {
    width: 92,
    alignItems: "center",
    justifyContent: "flex-start",
    outlineColor: "transparent",
    outlineStyle: "solid",
    outlineWidth: 0
  },
  actionControlInner: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    outlineColor: "transparent",
    outlineStyle: "solid",
    outlineWidth: 0
  },
  actionControlDisabled: {
    opacity: 0.42
  },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#303034",
    borderColor: "rgba(247,248,250,0.10)",
    borderWidth: 1
  },
  foldCircleArmed: {
    backgroundColor: "rgba(226,109,115,0.12)",
    borderColor: "rgba(242,135,140,0.42)"
  },
  quickRaiseCircleReady: {
    backgroundColor: "#67D7A5",
    borderColor: "#8BE6BC"
  },
  actionLabel: {
    color: "rgba(247,248,250,0.68)",
    marginTop: 7,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    textAlign: "center"
  },
  foldLabelArmed: {
    color: "#F2878C"
  },
  newHandButton: {
    minHeight: 52,
    marginTop: 14,
    borderRadius: radii.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(247,248,250,0.96)"
  },
  newHandText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }]
  }
});
