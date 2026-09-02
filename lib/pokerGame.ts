import { Card, compareHands, dealHand, evaluatePokerHand, HandEvaluation, shuffleDeck } from "./poker";

export type BotLevel = "Beginner" | "Club Regular" | "Final Table Bot";
export type PokerStreet = "preflop" | "flop" | "turn" | "river" | "showdown";
export type MatchResult = "player" | "bot" | "split" | null;

export type PokerGameState = {
  playerHand: Card[];
  botHand: Card[];
  community: Card[];
  visibleCommunity: Card[];
  deck: Card[];
  street: PokerStreet;
  pot: number;
  playerStack: number;
  botStack: number;
  currentBet: number;
  playerCommitted: number;
  botCommitted: number;
  betUnit: number;
  botLevel: BotLevel;
  message: string;
  handOver: boolean;
  result: MatchResult;
  playerEvaluation?: HandEvaluation;
  botEvaluation?: HandEvaluation;
};

export type PokerGameConfig = {
  startingStack?: number;
  botStartingStack?: number;
  openingBet?: number;
};

const defaultStartingStack = 1000;
const defaultOpeningBet = 20;

export function createPokerGame(botLevel: BotLevel = "Beginner", config: PokerGameConfig = {}): PokerGameState {
  const startingStack = Math.max(40, Math.round(config.startingStack ?? defaultStartingStack));
  const botStartingStack = Math.max(40, Math.round(config.botStartingStack ?? startingStack));
  const openingBet = Math.max(1, Math.min(startingStack, botStartingStack, Math.round(config.openingBet ?? defaultOpeningBet)));
  const deck = shuffleDeck();
  const playerHand = [deck[0], deck[2]];
  const botHand = [deck[1], deck[3]];
  const community = deck.slice(4, 9);
  return {
    playerHand,
    botHand,
    community,
    visibleCommunity: [],
    deck: deck.slice(9),
    street: "preflop",
    pot: openingBet * 2,
    playerStack: startingStack - openingBet,
    botStack: botStartingStack - openingBet,
    currentBet: openingBet,
    playerCommitted: openingBet,
    botCommitted: openingBet,
    betUnit: openingBet,
    botLevel,
    message: "Practice hand started. Blinds are practice chips only and have no cash value.",
    handOver: false,
    result: null
  };
}

export function startStrategyDeal() {
  return dealHand();
}

function streetCards(state: PokerGameState, street: PokerStreet) {
  if (street === "flop") return state.community.slice(0, 3);
  if (street === "turn") return state.community.slice(0, 4);
  if (street === "river" || street === "showdown") return state.community.slice(0, 5);
  return [];
}

function nextStreet(street: PokerStreet): PokerStreet {
  if (street === "preflop") return "flop";
  if (street === "flop") return "turn";
  if (street === "turn") return "river";
  return "showdown";
}

function resetStreetBetting(state: PokerGameState, street: PokerStreet): PokerGameState {
  return {
    ...state,
    street,
    visibleCommunity: streetCards(state, street),
    currentBet: 0,
    playerCommitted: 0,
    botCommitted: 0
  };
}

function botConfidence(state: PokerGameState) {
  const evaluation = evaluatePokerHand([...state.botHand, ...state.visibleCommunity]);
  const madeHand = evaluation.rankValue / 8;
  const random = Math.random() * (state.botLevel === "Beginner" ? 0.45 : state.botLevel === "Club Regular" ? 0.28 : 0.14);
  const levelBoost = state.botLevel === "Final Table Bot" ? 0.18 : state.botLevel === "Club Regular" ? 0.08 : 0;
  return madeHand + random + levelBoost;
}

function resolveShowdown(state: PokerGameState, intro = "Showdown.") {
  const playerEvaluation = evaluatePokerHand([...state.playerHand, ...state.community]);
  const botEvaluation = evaluatePokerHand([...state.botHand, ...state.community]);
  const comparison = compareHands(playerEvaluation, botEvaluation);
  if (comparison > 0) {
    return {
      ...state,
      street: "showdown" as const,
      visibleCommunity: state.community,
      playerStack: state.playerStack + state.pot,
      playerEvaluation,
      botEvaluation,
      handOver: true,
      result: "player" as const,
      message: `${intro} You win the practice pot with ${playerEvaluation.hand}.`
    };
  }
  if (comparison < 0) {
    return {
      ...state,
      street: "showdown" as const,
      visibleCommunity: state.community,
      botStack: state.botStack + state.pot,
      playerEvaluation,
      botEvaluation,
      handOver: true,
      result: "bot" as const,
      message: `${intro} Bot wins the practice pot with ${botEvaluation.hand}.`
    };
  }
  return {
    ...state,
    street: "showdown" as const,
    visibleCommunity: state.community,
    playerStack: state.playerStack + Math.floor(state.pot / 2),
    botStack: state.botStack + Math.ceil(state.pot / 2),
    playerEvaluation,
    botEvaluation,
    handOver: true,
    result: "split" as const,
    message: `${intro} Split pot. Both hands play ${playerEvaluation.hand}.`
  };
}

function advanceAfterCalledBet(state: PokerGameState, intro: string) {
  const street = nextStreet(state.street);
  if (street === "showdown") return resolveShowdown(state, intro);
  return {
    ...resetStreetBetting(state, street),
    message: `${intro} ${street === "flop" ? "Flop" : street === "turn" ? "Turn" : "River"} dealt.`
  };
}

function botResponds(state: PokerGameState, playerRaised: boolean): PokerGameState {
  const confidence = botConfidence(state);
  const toCall = Math.max(0, state.currentBet - state.botCommitted);
  if (playerRaised && toCall > 0 && confidence < 0.28) {
    return {
      ...state,
      playerStack: state.playerStack + state.pot,
      handOver: true,
      result: "player",
      message: `${state.botLevel} folds. You win the practice pot.`
    };
  }

  let nextState = state;
  if (toCall > 0) {
    const call = Math.min(toCall, nextState.botStack);
    nextState = {
      ...nextState,
      botStack: nextState.botStack - call,
      botCommitted: nextState.botCommitted + call,
      pot: nextState.pot + call
    };
  }

  const leadAmount = Math.max(1, Math.round(nextState.betUnit * 2.5));
  if (!playerRaised && nextState.currentBet === 0 && confidence > 0.78 && nextState.botStack >= leadAmount) {
    return {
      ...nextState,
      currentBet: leadAmount,
      botCommitted: leadAmount,
      botStack: nextState.botStack - leadAmount,
      pot: nextState.pot + leadAmount,
      message: `${state.botLevel} leads for ${leadAmount} practice chips. Choose call/check, raise, or fold.`
    };
  }

  return advanceAfterCalledBet(nextState, playerRaised ? `${state.botLevel} calls.` : `${state.botLevel} checks back.`);
}

export function playerCheckOrCall(state: PokerGameState): PokerGameState {
  if (state.handOver) return state;
  const toCall = Math.max(0, state.currentBet - state.playerCommitted);
  const call = Math.min(toCall, state.playerStack);
  const called = {
    ...state,
    playerStack: state.playerStack - call,
    playerCommitted: state.playerCommitted + call,
    pot: state.pot + call
  };
  if (called.playerCommitted >= called.currentBet && called.botCommitted >= called.currentBet) {
    return botResponds(called, false);
  }
  return called;
}

export function playerBetOrRaise(state: PokerGameState, amount = Math.max(1, Math.round(state.betUnit * 2.5))): PokerGameState {
  if (state.handOver) return state;
  const targetBet = Math.min(state.currentBet + amount, state.playerCommitted + state.playerStack);
  const extra = Math.max(0, targetBet - state.playerCommitted);
  const raised = {
    ...state,
    currentBet: targetBet,
    playerCommitted: targetBet,
    playerStack: state.playerStack - extra,
    pot: state.pot + extra
  };
  return botResponds(raised, true);
}

export function playerFold(state: PokerGameState): PokerGameState {
  if (state.handOver) return state;
  return {
    ...state,
    botStack: state.botStack + state.pot,
    handOver: true,
    result: "bot",
    message: "You folded. Bot wins the practice pot."
  };
}
