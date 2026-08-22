import { Card, HandEvaluation, compareHands, evaluatePokerHand } from "./poker";

export type MatchStreet = "preflop" | "flop" | "turn" | "river" | "showdown";
export type SeatNumber = 1 | 2;
export type SeatState = { committed: number; stack: number; status: "active" | "folded" | "out" };
export type MatchResult = SeatNumber | "split" | null;

export type MatchGameState = {
  street: MatchStreet;
  pot: number;
  currentBet: number;
  community: Card[];
  seat1: SeatState;
  seat2: SeatState;
  currentTurnSeat: SeatNumber;
  actionsThisRound: number;
  handOver: boolean;
  result: MatchResult;
  message: string;
};

const OPENING_BET = 20;
const STARTING_STACK = 1000;

function seatKey(seat: SeatNumber): "seat1" | "seat2" {
  return seat === 1 ? "seat1" : "seat2";
}

export function otherSeat(seat: SeatNumber): SeatNumber {
  return seat === 1 ? 2 : 1;
}

export function nextStreet(street: MatchStreet): Exclude<MatchStreet, "preflop"> {
  if (street === "preflop") return "flop";
  if (street === "flop") return "turn";
  if (street === "turn") return "river";
  return "showdown";
}

export function createInitialMatchState(openingBet = OPENING_BET, startingStack = STARTING_STACK): MatchGameState {
  return {
    street: "preflop",
    pot: openingBet * 2,
    currentBet: openingBet,
    community: [],
    seat1: { committed: openingBet, stack: startingStack - openingBet, status: "active" },
    seat2: { committed: openingBet, stack: startingStack - openingBet, status: "active" },
    currentTurnSeat: 1,
    actionsThisRound: 0,
    handOver: false,
    result: null,
    message: "Hand dealt. Blinds posted."
  };
}

/** Committed amounts alone can't tell "no one has acted yet" apart from "both matched" —
 * both seats start every street with equal commitments (blinds preflop, 0 postflop). Require
 * at least two actions this street too, so the first seat's check can't close the round solo. */
export function isBettingRoundClosed(state: MatchGameState) {
  return (
    state.actionsThisRound >= 2 &&
    state.seat1.committed === state.seat2.committed &&
    state.seat1.committed === state.currentBet
  );
}

export function applyFold(state: MatchGameState, actingSeat: SeatNumber): MatchGameState {
  if (state.handOver) return state;
  const winner = otherSeat(actingSeat);
  const winnerKey = seatKey(winner);
  const loserKey = seatKey(actingSeat);
  return {
    ...state,
    [loserKey]: { ...state[loserKey], status: "folded" },
    [winnerKey]: { ...state[winnerKey], stack: state[winnerKey].stack + state.pot },
    handOver: true,
    result: winner,
    message: `Seat ${actingSeat} folded. Seat ${winner} wins the practice pot.`
  } as MatchGameState;
}

/** Matches the acting seat's committed amount up to currentBet. Does NOT advance the street —
 * call isBettingRoundClosed() on the result; if true and street isn't "showdown", fetch the
 * next street's cards from the reveal_community_street RPC and pass them to advanceStreet(). */
export function applyCheckOrCall(state: MatchGameState, actingSeat: SeatNumber): MatchGameState {
  if (state.handOver) return state;
  const key = seatKey(actingSeat);
  const seat = state[key];
  const toCall = Math.max(0, state.currentBet - seat.committed);
  const call = Math.min(toCall, seat.stack);
  const updatedSeat: SeatState = { ...seat, committed: seat.committed + call, stack: seat.stack - call };
  return {
    ...state,
    [key]: updatedSeat,
    pot: state.pot + call,
    currentTurnSeat: otherSeat(actingSeat),
    actionsThisRound: state.actionsThisRound + 1,
    message: `Seat ${actingSeat} ${toCall > 0 ? "calls" : "checks"}.`
  } as MatchGameState;
}

export function applyBetOrRaise(state: MatchGameState, actingSeat: SeatNumber, amount: number): MatchGameState {
  if (state.handOver) return state;
  const key = seatKey(actingSeat);
  const seat = state[key];
  const targetBet = Math.min(state.currentBet + amount, seat.committed + seat.stack);
  const extra = Math.max(0, targetBet - seat.committed);
  const updatedSeat: SeatState = { ...seat, committed: targetBet, stack: seat.stack - extra };
  return {
    ...state,
    [key]: updatedSeat,
    currentBet: targetBet,
    pot: state.pot + extra,
    currentTurnSeat: otherSeat(actingSeat),
    actionsThisRound: 1,
    message: `Seat ${actingSeat} raises to ${targetBet}.`
  } as MatchGameState;
}

/** Call once isBettingRoundClosed(state) is true and the street isn't already "showdown".
 * `revealedCommunity` is the full community array as published by the reveal_community_street RPC. */
export function advanceStreet(state: MatchGameState, revealedCommunity: Card[]): MatchGameState {
  const street = nextStreet(state.street);
  if (street === "showdown") {
    return { ...state, street, community: revealedCommunity, message: "Showdown." };
  }
  return {
    ...state,
    street,
    community: revealedCommunity,
    currentBet: 0,
    seat1: { ...state.seat1, committed: 0 },
    seat2: { ...state.seat2, committed: 0 },
    currentTurnSeat: 1,
    actionsThisRound: 0,
    message: `${street === "flop" ? "Flop" : street === "turn" ? "Turn" : "River"} dealt.`
  };
}

export type ShowdownResult = MatchGameState & { seat1Evaluation: HandEvaluation; seat2Evaluation: HandEvaluation };

export function resolveShowdown(state: MatchGameState, seat1Hand: Card[], seat2Hand: Card[]): ShowdownResult {
  const seat1Evaluation = evaluatePokerHand([...seat1Hand, ...state.community]);
  const seat2Evaluation = evaluatePokerHand([...seat2Hand, ...state.community]);
  const comparison = compareHands(seat1Evaluation, seat2Evaluation);

  if (comparison > 0) {
    return {
      ...state,
      seat1: { ...state.seat1, stack: state.seat1.stack + state.pot },
      handOver: true,
      result: 1,
      message: `Seat 1 wins the practice pot with ${seat1Evaluation.hand}.`,
      seat1Evaluation,
      seat2Evaluation
    };
  }
  if (comparison < 0) {
    return {
      ...state,
      seat2: { ...state.seat2, stack: state.seat2.stack + state.pot },
      handOver: true,
      result: 2,
      message: `Seat 2 wins the practice pot with ${seat2Evaluation.hand}.`,
      seat1Evaluation,
      seat2Evaluation
    };
  }
  const half = Math.floor(state.pot / 2);
  return {
    ...state,
    seat1: { ...state.seat1, stack: state.seat1.stack + half },
    seat2: { ...state.seat2, stack: state.seat2.stack + (state.pot - half) },
    handOver: true,
    result: "split",
    message: `Split pot. Both hands play ${seat1Evaluation.hand}.`,
    seat1Evaluation,
    seat2Evaluation
  };
}
