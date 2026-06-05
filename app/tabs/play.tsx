import { useEffect, useMemo, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { SegmentedButtons, Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { LabHeader, StrategyTile } from "@/components/DesignSystem";
import { PlayingCardDisplay } from "@/components/PlayingCardDisplay";
import { PokerCard } from "@/components/PokerCard";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { colors, disclaimer } from "@/constants/theme";
import { createFriendPokerMatch, createPokerInvite, getMyActivePokerMatches, getMyPokerMatchHistory, joinPokerQueue, leavePokerQueue, PokerMatch } from "@/lib/pokerArena";
import { BotLevel, createPokerGame, playerBetOrRaise, playerCheckOrCall, playerFold } from "@/lib/pokerGame";
import { claimDailyPracticePoints, dealHand, evaluatePokerHand, HandName, handOptions } from "@/lib/poker";

type Mode = "arena" | "trainer" | "online";
const botLevels: BotLevel[] = ["Beginner", "Club Regular", "Final Table Bot"];

export default function PlayScreen() {
  const [mode, setMode] = useState<Mode>("arena");
  const [botLevel, setBotLevel] = useState<BotLevel>("Beginner");
  const [game, setGame] = useState(createPokerGame("Beginner"));
  const [deal, setDeal] = useState(dealHand());
  const [selected, setSelected] = useState<HandName | null>(null);
  const [feedback, setFeedback] = useState("");
  const [friendId, setFriendId] = useState("");
  const [queueing, setQueueing] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [activeMatches, setActiveMatches] = useState<PokerMatch[]>([]);
  const [matchHistory, setMatchHistory] = useState<PokerMatch[]>([]);
  const [snackbar, setSnackbar] = useState("");
  const [claiming, setClaiming] = useState(false);
  const result = useMemo(() => evaluatePokerHand([...deal.player, ...deal.community]), [deal]);
  const playerLiveHand = useMemo(() => evaluatePokerHand([...game.playerHand, ...game.visibleCommunity]), [game.playerHand, game.visibleCommunity]);

  async function loadOnlineMatches() {
    const [activeRows, historyRows] = await Promise.all([getMyActivePokerMatches(), getMyPokerMatchHistory()]);
    setActiveMatches(activeRows);
    setMatchHistory(historyRows);
  }

  useEffect(() => {
    if (mode === "online") {
      loadOnlineMatches().catch((error) => setSnackbar(error instanceof Error ? error.message : "Unable to load matches."));
    }
  }, [mode]);

  function startBotGame(level = botLevel) {
    setBotLevel(level);
    setGame(createPokerGame(level));
  }

  function check(hand: HandName) {
    setSelected(hand);
    setFeedback(hand === result.hand ? `Correct. ${result.explanation}` : `Not quite. This is ${result.hand}. ${result.explanation}`);
  }

  async function claim() {
    setClaiming(true);
    try {
      const response = await claimDailyPracticePoints();
      setSnackbar(response.status === "duplicate" ? "Daily practice points already claimed today." : `Daily practice points claimed: +${response.points_awarded ?? 10}`);
    } catch (err) {
      setSnackbar(err instanceof Error ? err.message : "Unable to claim practice points.");
    } finally {
      setClaiming(false);
    }
  }

  async function queueForMatch() {
    setQueueing(true);
    try {
      const response = await joinPokerQueue(botLevel);
      setSnackbar(response?.message ?? "You are in the friendly match queue.");
      await loadOnlineMatches();
    } catch (error) {
      setQueueing(false);
      setSnackbar(error instanceof Error ? error.message : "Unable to join queue.");
    }
  }

  async function stopQueue() {
    try {
      await leavePokerQueue();
      setQueueing(false);
      setSnackbar("You left the queue.");
      await loadOnlineMatches();
    } catch (error) {
      setSnackbar(error instanceof Error ? error.message : "Unable to leave queue.");
    }
  }

  async function inviteFriend() {
    if (!friendId.trim()) {
      setSnackbar("Enter a friend's profile user ID to create an invite.");
      return;
    }
    try {
      const response = await createFriendPokerMatch(friendId.trim());
      setSnackbar(response?.match_id ? "Friendly match invite created." : "Invite request sent.");
      setFriendId("");
      await loadOnlineMatches();
    } catch (error) {
      setSnackbar(error instanceof Error ? error.message : "Unable to create friend match.");
    }
  }

  async function shareInviteLink() {
    setCreatingInvite(true);
    try {
      const invite = await createPokerInvite();
      await Share.share({
        title: "QU Poker practice match",
        message: `Join my QU Poker practice match: ${invite.url}`,
        url: invite.url
      });
      setSnackbar("Invite link ready to send.");
      await loadOnlineMatches();
    } catch (error) {
      setSnackbar(error instanceof Error ? error.message : "Unable to create invite link.");
    } finally {
      setCreatingInvite(false);
    }
  }

  return (
    <ScreenContainer>
      <LabHeader eyebrow="Strategy lab" title="Poker Arena" subtitle="Practice against bots, train hand reading, and prepare friendly club matches. Practice chips have no cash value." icon="cards-playing-outline" />
      <View style={styles.strategyGrid}>
        <StrategyTile icon="robot-outline" title="Bot ladder" value="3" label="levels" onPress={() => setMode("arena")} />
        <StrategyTile icon="school-outline" title="Trainer" value="+10" label="daily pts" onPress={() => setMode("trainer")} />
        <StrategyTile icon="account-group-outline" title="Friends" value="Beta" label="matches" onPress={() => setMode("online")} />
      </View>
      <SegmentedButtons
        value={mode}
        onValueChange={(value) => setMode(value as Mode)}
        buttons={[
          { value: "arena", label: "Bots" },
          { value: "trainer", label: "Trainer" },
          { value: "online", label: "Friends" }
        ]}
      />

      {mode === "arena" ? (
        <>
          <PokerCard title="Bot Match">
            <View style={styles.levels}>
              {botLevels.map((level) => (
                <AppButton key={level} mode={botLevel === level ? "contained" : "outlined"} onPress={() => startBotGame(level)}>
                  {level}
                </AppButton>
              ))}
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Your Stack</Text>
                <Text style={styles.statValue}>{game.playerStack}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Pot</Text>
                <Text style={styles.statValueGold}>{game.pot}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Bot Stack</Text>
                <Text style={styles.statValue}>{game.botStack}</Text>
              </View>
            </View>
            <Text style={styles.meta}>Street: {game.street.toUpperCase()} | Current hand: {playerLiveHand.hand}</Text>
          </PokerCard>

          <PokerCard title="Your Cards">
            <View style={styles.cards}>{game.playerHand.map((card) => <PlayingCardDisplay key={`${card.rank}${card.suit}`} card={card} />)}</View>
          </PokerCard>

          <PokerCard title="Board">
            {game.visibleCommunity.length ? (
              <View style={styles.cards}>{game.visibleCommunity.map((card) => <PlayingCardDisplay key={`${card.rank}${card.suit}`} card={card} />)}</View>
            ) : (
              <Text style={styles.copy}>No community cards yet.</Text>
            )}
          </PokerCard>

          {game.handOver ? (
            <PokerCard title="Showdown">
              <Text style={styles.copy}>Bot cards</Text>
              <View style={styles.cards}>{game.botHand.map((card) => <PlayingCardDisplay key={`${card.rank}${card.suit}`} card={card} />)}</View>
              {game.playerEvaluation && game.botEvaluation ? (
                <Text style={styles.meta}>You: {game.playerEvaluation.hand} | Bot: {game.botEvaluation.hand}</Text>
              ) : null}
            </PokerCard>
          ) : null}

          <Text style={styles.feedback}>{game.message}</Text>
          <View style={styles.actions}>
            <AppButton icon="check-circle-outline" onPress={() => setGame((current) => playerCheckOrCall(current))} disabled={game.handOver}>
              {game.currentBet > game.playerCommitted ? `Call ${game.currentBet - game.playerCommitted}` : "Check"}
            </AppButton>
            <AppButton mode="outlined" icon="arrow-up-bold-outline" onPress={() => setGame((current) => playerBetOrRaise(current, 50))} disabled={game.handOver || game.playerStack <= 0}>
              Bet/Raise 50
            </AppButton>
            <AppButton mode="outlined" icon="close-circle-outline" onPress={() => setGame((current) => playerFold(current))} disabled={game.handOver}>
              Fold
            </AppButton>
            <AppButton mode="outlined" icon="cards-playing-outline" onPress={() => startBotGame()}>
              New Hand
            </AppButton>
          </View>
        </>
      ) : null}

      {mode === "trainer" ? (
        <>
          <SectionHeader title="Strategy Trainer" />
          <Text style={styles.meta}>Hand recognition and daily practice points.</Text>
          <PokerCard title="Your Cards">
            <View style={styles.cards}>{deal.player.map((card) => <PlayingCardDisplay key={`${card.rank}${card.suit}`} card={card} />)}</View>
          </PokerCard>
          <PokerCard title="Community Cards">
            <View style={styles.cards}>{deal.community.map((card) => <PlayingCardDisplay key={`${card.rank}${card.suit}`} card={card} />)}</View>
          </PokerCard>
          <PokerCard title="What hand do you have?">
            <View style={styles.options}>
              {handOptions.map((hand) => (
                <AppButton key={hand} mode={selected === hand ? "contained" : "outlined"} onPress={() => check(hand)}>
                  {hand}
                </AppButton>
              ))}
            </View>
          </PokerCard>
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          <View style={styles.actions}>
            <AppButton mode="outlined" icon="cards-playing-outline" onPress={() => { setDeal(dealHand()); setSelected(null); setFeedback(""); }}>New Deal</AppButton>
            <AppButton icon="star-outline" onPress={claim} disabled={claiming}>{claiming ? "Claiming..." : "Claim Daily Points"}</AppButton>
          </View>
        </>
      ) : null}

      {mode === "online" ? (
        <>
          <View style={styles.betaBanner}>
            <Text style={styles.betaLabel}>Beta</Text>
            <Text style={styles.betaText}>Friend invites and queueing are available for exec testing. The full live poker table is still in active development.</Text>
          </View>
          <PokerCard title="Friendly Matches">
            <Text style={styles.copy}>Create a private invite or join the practice queue. No real-money wagering or cash-value chips are supported.</Text>
            <View style={styles.actions}>
              <AppButton icon="share-variant-outline" onPress={shareInviteLink} disabled={creatingInvite}>
                {creatingInvite ? "Creating Link..." : "Share Invite Link"}
              </AppButton>
              <AppButton icon="account-clock-outline" onPress={queueForMatch} disabled={queueing}>{queueing ? "In Queue" : "Queue for Match"}</AppButton>
              <AppButton mode="outlined" icon="close" onPress={stopQueue} disabled={!queueing}>Leave Queue</AppButton>
            </View>
          </PokerCard>
          <PokerCard title="Invite a Friend">
            <TextInput mode="outlined" label="Friend profile user ID" value={friendId} onChangeText={setFriendId} autoCapitalize="none" />
            <AppButton icon="account-plus-outline" onPress={inviteFriend}>Create Invite</AppButton>
          </PokerCard>
          <PokerCard title="Active Matches">
            {activeMatches.length ? activeMatches.map((match) => (
              <View key={match.id} style={styles.matchRow}>
                <View style={styles.matchText}>
                  <Text style={styles.copy}>{match.match_type.replace("_", " ").toUpperCase()}</Text>
                  <Text style={styles.meta}>{match.status} · updated {new Date(match.updated_at).toLocaleString()}</Text>
                </View>
              </View>
            )) : <Text style={styles.meta}>No active live matches yet.</Text>}
          </PokerCard>
          <PokerCard title="Match History">
            {matchHistory.length ? matchHistory.slice(0, 6).map((match) => (
              <View key={match.id} style={styles.matchRow}>
                <Text style={styles.copy}>{match.match_type.replace("_", " ")} · {match.status}</Text>
              </View>
            )) : <Text style={styles.meta}>Completed and cancelled matches will appear here.</Text>}
          </PokerCard>
          <Text style={styles.meta}>Exec test note: use this area to validate invites, queue state, and match history. Full turn-by-turn multiplayer should be reviewed as a roadmap item.</Text>
        </>
      ) : null}

      <Text style={styles.disclaimer}>{disclaimer}</Text>
      <Snackbar visible={Boolean(snackbar)} onDismiss={() => setSnackbar("")}>{snackbar}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  strategyGrid: { flexDirection: "row", gap: 10 },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  options: { gap: 8 },
  levels: { gap: 8 },
  actions: { gap: 10 },
  statsGrid: { flexDirection: "row", gap: 10 },
  statBox: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  statValue: { color: colors.text, fontSize: 22, fontWeight: "900" },
  statValueGold: { color: colors.gold, fontSize: 22, fontWeight: "900" },
  feedback: { color: colors.green, fontWeight: "800", fontSize: 17, lineHeight: 24 },
  copy: { color: colors.text, lineHeight: 21 },
  meta: { color: colors.muted, lineHeight: 20, fontSize: 13 },
  matchRow: { padding: 12, borderRadius: 14, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
  matchText: { gap: 3 },
  betaBanner: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: colors.goldSoft, borderColor: colors.gold, borderWidth: 1 },
  betaLabel: { color: colors.gold, fontWeight: "900", textTransform: "uppercase", fontSize: 12 },
  betaText: { color: colors.text, lineHeight: 20 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
