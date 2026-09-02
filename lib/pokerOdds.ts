import { Card, compareHands, createDeck, evaluatePokerHand, HandName, ranks } from "./poker";

export type HoldemInsights = {
  winPercentage: number;
  nextHand: HandName | "No clear draw" | "Showdown";
  nextHandPercentage: number;
};

function cardKey(card: Card) {
  return `${card.rank}${card.suit}`;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromCards(cards: Card[], opponents: number) {
  return cards.reduce((seed, card) => {
    const rank = ranks.indexOf(card.rank) + 2;
    const suit = ["S", "H", "D", "C"].indexOf(card.suit) + 1;
    return Math.imul(seed ^ (rank * 17 + suit * 31), 16777619);
  }, 2166136261 ^ opponents);
}

function shuffled<T>(values: T[], random: () => number) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function nextHandInsight(playerHand: Card[], visibleCommunity: Card[], remaining: Card[]) {
  if (visibleCommunity.length >= 5) return { nextHand: "Showdown" as const, nextHandPercentage: 100 };

  const current = evaluatePokerHand([...playerHand, ...visibleCommunity]);
  const improvements = new Map<HandName, number>();
  remaining.forEach((card) => {
    const next = evaluatePokerHand([...playerHand, ...visibleCommunity, card]);
    if (next.rankValue > current.rankValue) improvements.set(next.hand, (improvements.get(next.hand) ?? 0) + 1);
  });

  const mostLikely = [...improvements.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!mostLikely) return { nextHand: "No clear draw" as const, nextHandPercentage: 0 };
  return {
    nextHand: mostLikely[0],
    nextHandPercentage: Math.round((mostLikely[1] / remaining.length) * 100)
  };
}

export function calculateHoldemInsights(
  playerHand: Card[],
  visibleCommunity: Card[],
  activeOpponents: number,
  iterations = 700
): HoldemInsights {
  const knownKeys = new Set([...playerHand, ...visibleCommunity].map(cardKey));
  const remaining = createDeck().filter((card) => !knownKeys.has(cardKey(card)));
  const opponentCount = Math.max(1, Math.min(5, activeOpponents));
  const random = seededRandom(seedFromCards([...playerHand, ...visibleCommunity], opponentCount));
  const boardCardsNeeded = 5 - visibleCommunity.length;
  let equity = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const sample = shuffled(remaining, random);
    const board = [...visibleCommunity, ...sample.slice(0, boardCardsNeeded)];
    const playerEvaluation = evaluatePokerHand([...playerHand, ...board]);
    let cursor = boardCardsNeeded;
    let tiedOpponents = 0;
    let lost = false;

    for (let opponent = 0; opponent < opponentCount; opponent += 1) {
      const opponentHand = sample.slice(cursor, cursor + 2);
      cursor += 2;
      const comparison = compareHands(playerEvaluation, evaluatePokerHand([...opponentHand, ...board]));
      if (comparison < 0) {
        lost = true;
        break;
      }
      if (comparison === 0) tiedOpponents += 1;
    }

    if (!lost) equity += 1 / (tiedOpponents + 1);
  }

  return {
    winPercentage: Math.round((equity / iterations) * 100),
    ...nextHandInsight(playerHand, visibleCommunity, remaining)
  };
}

export function startingHandStrength(hand: Card[]) {
  const [first, second] = hand;
  const firstValue = ranks.indexOf(first.rank) + 2;
  const secondValue = ranks.indexOf(second.rank) + 2;
  const high = Math.max(firstValue, secondValue);
  const low = Math.min(firstValue, secondValue);
  const pair = firstValue === secondValue;
  const suited = first.suit === second.suit;
  const gap = high - low;

  if (pair) return Math.min(0.98, 0.52 + (high / 14) * 0.44);
  let score = (high / 14) * 0.42 + (low / 14) * 0.24;
  if (suited) score += 0.08;
  if (gap === 1) score += 0.08;
  else if (gap === 2) score += 0.04;
  if (high === 14) score += 0.07;
  if (high >= 11 && low >= 10) score += 0.08;
  return Math.max(0.12, Math.min(0.96, score));
}
