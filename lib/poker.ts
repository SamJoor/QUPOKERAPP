import { supabase, hasSupabaseConfig } from "./supabase";

export type Suit = "S" | "H" | "D" | "C";
export type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
export type Card = { rank: Rank; suit: Suit };
export type HandName =
  | "High Card"
  | "Pair"
  | "Two Pair"
  | "Three of a Kind"
  | "Straight"
  | "Flush"
  | "Full House"
  | "Four of a Kind"
  | "Straight Flush"
  | "Royal Flush";

export type HandEvaluation = {
  hand: HandName;
  rankValue: number;
  tiebreakers: number[];
  explanation: string;
};

export const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const suits: Suit[] = ["S", "H", "D", "C"];

export const suitSymbols: Record<Suit, string> = {
  S: "\u2660",
  H: "\u2665",
  D: "\u2666",
  C: "\u2663"
};

export const handOptions: HandName[] = [
  "High Card",
  "Pair",
  "Two Pair",
  "Three of a Kind",
  "Straight",
  "Flush",
  "Full House",
  "Four of a Kind",
  "Straight Flush",
  "Royal Flush"
];

export function createDeck() {
  return suits.flatMap((suit) => ranks.map((rank) => ({ rank, suit })));
}

export function shuffleDeck(deck = createDeck()) {
  return [...deck].sort(() => Math.random() - 0.5);
}

export function dealHand() {
  const shuffled = shuffleDeck();
  return { player: shuffled.slice(0, 2), community: shuffled.slice(2, 7) };
}

function rankValue(rank: Rank) {
  return ranks.indexOf(rank) + 2;
}

function findStraight(values: number[]) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    const run = unique.slice(index, index + 5);
    if (run[0] - run[4] === 4 && new Set(run).size === 5) return run[0];
  }
  return 0;
}

export function evaluatePokerHand(cards: Card[]): HandEvaluation {
  const values = cards.map((card) => rankValue(card.rank));
  const byRank = new Map<number, number>();
  values.forEach((value) => byRank.set(value, (byRank.get(value) ?? 0) + 1));
  const groups = [...byRank.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flushSuit = suits.find((suit) => cards.filter((card) => card.suit === suit).length >= 5);
  const flushCards = flushSuit ? cards.filter((card) => card.suit === flushSuit) : [];
  const flushValues = flushCards.map((card) => rankValue(card.rank));
  const straightHigh = findStraight(values);
  const straightFlushHigh = flushSuit ? findStraight(flushValues) : 0;

  if (straightFlushHigh === 14) return { hand: "Royal Flush", rankValue: 9, tiebreakers: [14], explanation: "The same suit contains 10, J, Q, K, and A." };
  if (straightFlushHigh) return { hand: "Straight Flush", rankValue: 8, tiebreakers: [straightFlushHigh], explanation: "Five consecutive ranks share the same suit." };

  const four = groups.find(([, count]) => count === 4);
  if (four) {
    const kicker = values.filter((value) => value !== four[0]).sort((a, b) => b - a)[0];
    return { hand: "Four of a Kind", rankValue: 7, tiebreakers: [four[0], kicker], explanation: "Four cards share the same rank." };
  }

  const trips = groups.filter(([, count]) => count === 3).map(([value]) => value);
  const pairs = groups.filter(([, count]) => count >= 2).map(([value]) => value);
  if (trips.length && pairs.filter((value) => value !== trips[0]).length) {
    return { hand: "Full House", rankValue: 6, tiebreakers: [trips[0], pairs.filter((value) => value !== trips[0])[0]], explanation: "Three of one rank plus a separate pair." };
  }

  if (flushSuit) {
    return { hand: "Flush", rankValue: 5, tiebreakers: flushValues.sort((a, b) => b - a).slice(0, 5), explanation: "Five or more cards share one suit." };
  }

  if (straightHigh) return { hand: "Straight", rankValue: 4, tiebreakers: [straightHigh], explanation: "Five cards form consecutive ranks." };
  if (trips.length) {
    const kickers = values.filter((value) => value !== trips[0]).sort((a, b) => b - a).slice(0, 2);
    return { hand: "Three of a Kind", rankValue: 3, tiebreakers: [trips[0], ...kickers], explanation: "Three cards share one rank." };
  }
  if (pairs.length >= 2) {
    const topPairs = pairs.slice(0, 2);
    const kicker = values.filter((value) => !topPairs.includes(value)).sort((a, b) => b - a)[0];
    return { hand: "Two Pair", rankValue: 2, tiebreakers: [...topPairs, kicker], explanation: "Two different ranks each appear as a pair." };
  }
  if (pairs.length === 1) {
    const kickers = values.filter((value) => value !== pairs[0]).sort((a, b) => b - a).slice(0, 3);
    return { hand: "Pair", rankValue: 1, tiebreakers: [pairs[0], ...kickers], explanation: "Two cards share one rank." };
  }
  return { hand: "High Card", rankValue: 0, tiebreakers: values.sort((a, b) => b - a).slice(0, 5), explanation: "No made hand yet, so the highest card plays." };
}

export function compareHands(a: HandEvaluation, b: HandEvaluation) {
  if (a.rankValue !== b.rankValue) return a.rankValue - b.rankValue;
  const length = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a.tiebreakers[index] ?? 0) - (b.tiebreakers[index] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

export async function claimDailyPracticePoints() {
  if (!hasSupabaseConfig) return { status: "success", points_awarded: 10 };
  const { data, error } = await supabase.rpc("claim_daily_practice");
  if (error) throw error;
  return data;
}
