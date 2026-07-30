import { useMemo, useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "react-native-paper";
import { PlayingCardDisplay } from "@/components/PlayingCardDisplay";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { Card, evaluatePokerHand, suitSymbols } from "@/lib/poker";
import { BotLevel, createPokerGame, playerBetOrRaise, playerCheckOrCall, playerFold, PokerGameState } from "@/lib/pokerGame";

type ActionType = "fold" | "call" | "raise";
type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const levelOptions: BotLevel[] = ["Beginner", "Club Regular", "Final Table Bot"];

const studySources = [
  "Pot odds",
  "Starting hands",
  "Range equity",
  "Position"
];

const oddsRows = [
  { label: "Flush draw", outs: 9, turnRiver: "36%", oneCard: "18%" },
  { label: "Open-ended straight", outs: 8, turnRiver: "32%", oneCard: "16%" },
  { label: "Two overcards", outs: 6, turnRiver: "24%", oneCard: "12%" },
  { label: "Gutshot", outs: 4, turnRiver: "16%", oneCard: "8%" }
];

const rankOrder: Card["rank"][] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getStreetLabel(street: PokerGameState["street"]) {
  if (street === "preflop") return "Pre-flop";
  if (street === "flop") return "Flop";
  if (street === "turn") return "Turn";
  if (street === "river") return "River";
  return "Showdown";
}

function cardText(card: Card) {
  return `${card.rank}${suitSymbols[card.suit]}`;
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
        <MaterialCommunityIcons name="cards-playing-spade-multiple" size={20} color="rgba(247,248,250,0.34)" />
      </View>
    );
  }
  return <PlayingCardDisplay card={card} />;
}

function StatPill({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <View style={styles.statPill}>
      <MaterialCommunityIcons name={icon} size={16} color={colors.gold} />
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function PlayScreen() {
  const [botLevel, setBotLevel] = useState<BotLevel>("Club Regular");
  const [game, setGame] = useState(() => createPokerGame("Club Regular"));
  const [handNumber, setHandNumber] = useState(1);
  const [lastCoachNote, setLastCoachNote] = useState("Pick an action and the coach will compare it against pot odds, outs, and hand strength.");

  const coach = useMemo(() => getDecisionCoach(game), [game]);
  const communitySlots = [0, 1, 2, 3, 4].map((index) => game.visibleCommunity[index]);
  const callLabel = coach.toCall > 0 ? `Call ${coach.toCall}` : "Check";

  function startNewHand(nextLevel = botLevel) {
    setBotLevel(nextLevel);
    setGame(createPokerGame(nextLevel));
    setHandNumber((value) => value + 1);
    setLastCoachNote("New training hand. Start with position, hand quality, and price before committing chips.");
  }

  function chooseLevel(nextLevel: BotLevel) {
    startNewHand(nextLevel);
  }

  function chooseAction(action: ActionType) {
    if (game.handOver) return;
    const beforeCoach = getDecisionCoach(game);
    const nextGame = action === "fold" ? playerFold(game) : action === "raise" ? playerBetOrRaise(game, 60) : playerCheckOrCall(game);
    setGame(nextGame);
    setLastCoachNote(actionFeedback(action, game, beforeCoach));
  }

  return (
    <ScreenContainer padded={false}>
      <LinearGradient colors={["#06080c", "#020407", "#030304"]} locations={[0, 0.55, 1]} style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Texas Hold'em</Text>
            <Text style={styles.title}>AI Lobby</Text>
          </View>
          <Pressable accessibilityLabel="Start a new AI hand" onPress={() => startNewHand()} style={({ pressed }) => [styles.newHandButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="reload" size={18} color={colors.ink} />
            <Text style={styles.newHandText}>New hand</Text>
          </Pressable>
        </View>

        <View style={styles.levelRail}>
          {levelOptions.map((level) => {
            const selected = botLevel === level;
            return (
              <Pressable key={level} onPress={() => chooseLevel(level)} style={({ pressed }) => [styles.levelChip, selected && styles.levelChipActive, pressed && styles.pressed]}>
                <Text style={[styles.levelText, selected && styles.levelTextActive]}>{level}</Text>
              </Pressable>
            );
          })}
        </View>

        <LinearGradient colors={["rgba(12,53,95,0.28)", "rgba(255,255,255,0.045)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tableCard}>
          <View style={styles.tableTop}>
            <View>
              <Text style={styles.tableLabel}>Hand {handNumber}</Text>
              <Text style={styles.street}>{getStreetLabel(game.street)}</Text>
            </View>
            <View style={styles.potPill}>
              <Text style={styles.potLabel}>Pot</Text>
              <Text style={styles.potValue}>{formatNumber(game.pot)}</Text>
            </View>
          </View>

          <View style={styles.opponentRow}>
            <View style={styles.aiAvatar}>
              <MaterialCommunityIcons name="robot-outline" size={22} color={colors.gold} />
            </View>
            <View style={styles.opponentCopy}>
              <Text style={styles.opponentName}>{botLevel}</Text>
              <Text style={styles.opponentMeta}>{formatNumber(game.botStack)} practice chips</Text>
            </View>
            <View style={styles.hiddenHand}>
              <CardSlot hidden />
              <CardSlot hidden />
            </View>
          </View>

          <View style={styles.boardRow}>
            {communitySlots.map((card, index) => (
              <CardSlot key={`${card?.rank ?? "empty"}-${card?.suit ?? index}`} card={card} />
            ))}
          </View>

          <View style={styles.heroPanel}>
            <View style={styles.heroHeader}>
              <View>
                <Text style={styles.heroLabel}>Your hand</Text>
                <Text style={styles.heroCards}>{game.playerHand.map(cardText).join("  ")}</Text>
              </View>
              <Text style={styles.handStrength}>{coach.evaluation.hand}</Text>
            </View>
            <View style={styles.heroCardsRow}>
              {game.playerHand.map((card) => (
                <PlayingCardDisplay key={`${card.rank}-${card.suit}`} card={card} />
              ))}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <StatPill icon="calculator-variant-outline" label="Pot odds" value={coach.toCall ? `${coach.potOdds}%` : "Free"} />
          <StatPill icon="target" label="Clean outs" value={`${coach.outs}`} />
          <StatPill icon="chart-line" label="Est. equity" value={game.street === "preflop" ? "Pre" : `${coach.equity}%`} />
        </View>

        <View style={styles.actionRow}>
          <Pressable disabled={game.handOver} onPress={() => chooseAction("fold")} style={({ pressed }) => [styles.actionButton, styles.foldButton, game.handOver && styles.disabledButton, pressed && styles.pressed]}>
            <Text style={styles.actionText}>Fold</Text>
          </Pressable>
          <Pressable disabled={game.handOver} onPress={() => chooseAction("call")} style={({ pressed }) => [styles.actionButton, styles.callButton, game.handOver && styles.disabledButton, pressed && styles.pressed]}>
            <Text style={[styles.actionText, styles.callText]}>{callLabel}</Text>
          </Pressable>
          <Pressable disabled={game.handOver} onPress={() => chooseAction("raise")} style={({ pressed }) => [styles.actionButton, styles.raiseButton, game.handOver && styles.disabledButton, pressed && styles.pressed]}>
            <Text style={styles.raiseText}>Raise 60</Text>
          </Pressable>
        </View>

        <View style={styles.coachCard}>
          <View style={styles.coachHeader}>
            <Text style={styles.sectionTitle}>Decision coach</Text>
            <View style={styles.recommendationPill}>
              <Text style={styles.recommendationText}>{coach.recommendation}</Text>
            </View>
          </View>
          <Text style={styles.coachText}>{lastCoachNote}</Text>
          <Text style={styles.coachMeta}>{game.message}</Text>
        </View>

        <View style={styles.sourceCard}>
          <Text style={styles.sectionTitle}>Course concepts in this lobby</Text>
          <View style={styles.sourceRail}>
            {studySources.map((source) => (
              <View key={source} style={styles.sourceChip}>
                <Text style={styles.sourceText}>{source}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.sourceNote}>The trainer is built around EV thinking: compare the price of calling with your equity, then adjust for position, ranges, and fold pressure.</Text>
        </View>

        <View style={styles.oddsCard}>
          <View style={styles.oddsHeader}>
            <Text style={styles.sectionTitle}>Quick probability chart</Text>
            <Text style={styles.oddsMeta}>Rule of 2 / 4</Text>
          </View>
          {oddsRows.map((row) => (
            <View key={row.label} style={styles.oddsRow}>
              <View>
                <Text style={styles.oddsName}>{row.label}</Text>
                <Text style={styles.oddsSub}>{row.outs} outs</Text>
              </View>
              <View style={styles.oddsValues}>
                <Text style={styles.oddsValue}>{row.turnRiver}</Text>
                <Text style={styles.oddsSub}>turn + river</Text>
              </View>
              <View style={styles.oddsValues}>
                <Text style={styles.oddsValue}>{row.oneCard}</Text>
                <Text style={styles.oddsSub}>one card</Text>
              </View>
            </View>
          ))}
        </View>
      </LinearGradient>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    width: "100%",
    maxWidth: 430,
    minHeight: 900,
    alignSelf: "center",
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 112
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  eyebrow: {
    color: colors.muted,
    fontSize: typography.meta,
    lineHeight: 16,
    fontWeight: "800"
  },
  title: {
    color: colors.text,
    marginTop: 2,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900"
  },
  newHandButton: {
    minHeight: 42,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.gold
  },
  newHandText: {
    color: colors.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900"
  },
  levelRail: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.lg
  },
  levelChip: {
    flex: 1,
    minHeight: 36,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(247,248,250,0.055)",
    borderColor: colors.border,
    borderWidth: 1
  },
  levelChipActive: {
    backgroundColor: "rgba(247,248,250,0.96)"
  },
  levelText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textAlign: "center"
  },
  levelTextActive: {
    color: colors.ink
  },
  tableCard: {
    marginTop: spacing.lg,
    borderRadius: radii.xl,
    padding: spacing.md,
    borderColor: colors.border,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.26,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 }
  },
  tableTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
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
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900"
  },
  potPill: {
    minWidth: 82,
    minHeight: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: colors.border,
    borderWidth: 1
  },
  potLabel: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800"
  },
  potValue: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  opponentRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center"
  },
  aiAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(214,165,54,0.11)",
    borderColor: "rgba(214,165,54,0.24)",
    borderWidth: 1
  },
  opponentCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: spacing.sm
  },
  opponentName: {
    color: colors.text,
    fontSize: typography.body,
    lineHeight: 19,
    fontWeight: "900"
  },
  opponentMeta: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700"
  },
  hiddenHand: {
    flexDirection: "row",
    gap: spacing.xs
  },
  boardRow: {
    minHeight: 86,
    marginTop: spacing.lg,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs
  },
  cardBack: {
    width: 54,
    height: 76,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: "rgba(255,255,255,0.08)",
    borderWidth: 1
  },
  heroPanel: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: "rgba(2,4,7,0.62)",
    borderColor: colors.border,
    borderWidth: 1
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md
  },
  heroLabel: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800"
  },
  heroCards: {
    color: colors.text,
    marginTop: 2,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900"
  },
  handStrength: {
    color: colors.gold,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    textAlign: "right"
  },
  heroCardsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md
  },
  statPill: {
    flex: 1,
    minHeight: 64,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: colors.border,
    borderWidth: 1
  },
  statValue: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.muted,
    marginTop: 1,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800"
  },
  coachCard: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderColor: colors.border,
    borderWidth: 1
  },
  coachHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sectionTitle,
    lineHeight: 23,
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
  actionRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md
  },
  actionButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1
  },
  foldButton: {
    backgroundColor: "rgba(226,90,95,0.12)",
    borderColor: "rgba(226,90,95,0.22)"
  },
  callButton: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(255,255,255,0.22)"
  },
  raiseButton: {
    backgroundColor: colors.gold,
    borderColor: "rgba(214,165,54,0.42)"
  },
  disabledButton: {
    opacity: 0.42
  },
  actionText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  callText: {
    color: colors.ink
  },
  raiseText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  sourceCard: {
    marginTop: spacing.lg,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderColor: colors.border,
    borderWidth: 1
  },
  sourceRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm
  },
  sourceChip: {
    minHeight: 30,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: colors.border,
    borderWidth: 1
  },
  sourceText: {
    color: colors.text,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800"
  },
  sourceNote: {
    color: colors.muted,
    marginTop: spacing.sm,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
  },
  oddsCard: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderColor: colors.border,
    borderWidth: 1
  },
  oddsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  oddsMeta: {
    color: colors.gold,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900"
  },
  oddsRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopColor: colors.borderSoft,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  oddsName: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  oddsSub: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "800"
  },
  oddsValues: {
    minWidth: 70,
    alignItems: "flex-end"
  },
  oddsValue: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900"
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }]
  }
});
