import { Card } from "@/lib/poker";
import {
  MatchGameState,
  advanceStreet,
  applyBetOrRaise,
  applyCheckOrCall,
  applyFold,
  createInitialMatchState,
  isBettingRoundClosed,
  nextStreet,
  otherSeat,
  resolveShowdown
} from "@/lib/pokerMatch";

/** Terse card literal: "AS" -> ace of spades, "10D" -> ten of diamonds. */
function card(literal: string): Card {
  const rank = literal.slice(0, -1) as Card["rank"];
  const suit = literal.slice(-1) as Card["suit"];
  return { rank, suit };
}

const hand = (...literals: string[]) => literals.map(card);

/** Chips are conserved: nothing is minted or burned by a sequence of actions. */
function totalChips(state: MatchGameState) {
  return state.pot + state.seat1.stack + state.seat2.stack;
}

const STARTING_TOTAL = 2000;

describe("createInitialMatchState", () => {
  it("posts blinds from both stacks into the pot", () => {
    const state = createInitialMatchState();
    expect(state.pot).toBe(40);
    expect(state.seat1).toEqual({ committed: 20, stack: 980, status: "active" });
    expect(state.seat2).toEqual({ committed: 20, stack: 980, status: "active" });
    expect(state.street).toBe("preflop");
    expect(state.handOver).toBe(false);
  });

  it("conserves the full buy-in across both stacks and the pot", () => {
    expect(totalChips(createInitialMatchState())).toBe(STARTING_TOTAL);
  });

  it("honours custom blinds and stacks", () => {
    const state = createInitialMatchState(50, 500);
    expect(state.pot).toBe(100);
    expect(state.currentBet).toBe(50);
    expect(state.seat1.stack).toBe(450);
  });
});

describe("seat and street helpers", () => {
  it("alternates seats", () => {
    expect(otherSeat(1)).toBe(2);
    expect(otherSeat(2)).toBe(1);
  });

  it("walks streets in order and terminates at showdown", () => {
    expect(nextStreet("preflop")).toBe("flop");
    expect(nextStreet("flop")).toBe("turn");
    expect(nextStreet("turn")).toBe("river");
    expect(nextStreet("river")).toBe("showdown");
  });
});

describe("isBettingRoundClosed", () => {
  it("stays open at the start of a street even though blinds are equal", () => {
    // Both seats are committed 20 preflop before anyone acts. Commitment equality alone
    // would wrongly read as "round closed" here.
    expect(isBettingRoundClosed(createInitialMatchState())).toBe(false);
  });

  it("stays open after a single check", () => {
    const state = applyCheckOrCall(createInitialMatchState(), 1);
    expect(isBettingRoundClosed(state)).toBe(false);
  });

  it("closes once both seats have acted and matched", () => {
    let state = createInitialMatchState();
    state = applyCheckOrCall(state, 1);
    state = applyCheckOrCall(state, 2);
    expect(isBettingRoundClosed(state)).toBe(true);
  });

  it("reopens when a raise puts the seats out of balance", () => {
    let state = createInitialMatchState();
    state = applyCheckOrCall(state, 1);
    state = applyBetOrRaise(state, 2, 60);
    expect(isBettingRoundClosed(state)).toBe(false);
  });
});

describe("applyFold", () => {
  it("awards the whole pot to the other seat and ends the hand", () => {
    const state = applyFold(createInitialMatchState(), 2);
    expect(state.handOver).toBe(true);
    expect(state.result).toBe(1);
    expect(state.seat2.status).toBe("folded");
    expect(state.seat1.stack).toBe(1020);
    expect(totalChips(state)).toBe(STARTING_TOTAL + state.pot);
  });

  it("is a no-op once the hand is over", () => {
    const finished = applyFold(createInitialMatchState(), 2);
    expect(applyFold(finished, 1)).toBe(finished);
  });
});

describe("applyCheckOrCall", () => {
  it("moves no chips when there is nothing to call", () => {
    const state = applyCheckOrCall(createInitialMatchState(), 1);
    expect(state.pot).toBe(40);
    expect(state.seat1.stack).toBe(980);
    expect(state.message).toContain("checks");
  });

  it("pays the difference up to the current bet", () => {
    let state = createInitialMatchState();
    state = applyBetOrRaise(state, 1, 60); // seat 1 to 80
    state = applyCheckOrCall(state, 2); // seat 2 owes 60
    expect(state.seat2.committed).toBe(80);
    expect(state.seat2.stack).toBe(920);
    expect(state.pot).toBe(160);
    expect(totalChips(state)).toBe(STARTING_TOTAL);
  });

  it("caps a call at the short stack rather than going negative", () => {
    let state = createInitialMatchState();
    state = { ...state, seat2: { ...state.seat2, stack: 30 } };
    state = applyBetOrRaise(state, 1, 500);
    state = applyCheckOrCall(state, 2);
    expect(state.seat2.stack).toBe(0);
    expect(state.seat2.committed).toBe(50);
  });

  it("passes the turn to the other seat", () => {
    const state = applyCheckOrCall(createInitialMatchState(), 1);
    expect(state.currentTurnSeat).toBe(2);
  });
});

describe("applyBetOrRaise", () => {
  it("raises to currentBet + amount and takes the difference from the stack", () => {
    const state = applyBetOrRaise(createInitialMatchState(), 1, 60);
    expect(state.currentBet).toBe(80);
    expect(state.seat1.committed).toBe(80);
    expect(state.seat1.stack).toBe(920);
    expect(state.pot).toBe(100);
    expect(totalChips(state)).toBe(STARTING_TOTAL);
  });

  it("clamps an over-sized raise to the seat's remaining chips", () => {
    const state = applyBetOrRaise(createInitialMatchState(), 1, 100000);
    expect(state.seat1.stack).toBe(0);
    expect(state.seat1.committed).toBe(1000);
    expect(totalChips(state)).toBe(STARTING_TOTAL);
  });

  it("resets the action count so the round cannot close on the raise itself", () => {
    let state = createInitialMatchState();
    state = applyCheckOrCall(state, 1);
    state = applyBetOrRaise(state, 2, 60);
    expect(state.actionsThisRound).toBe(1);
  });
});

describe("advanceStreet", () => {
  it("clears per-street commitments but preserves the pot", () => {
    let state = createInitialMatchState();
    state = applyCheckOrCall(state, 1);
    state = applyCheckOrCall(state, 2);
    const flop = advanceStreet(state, hand("AS", "KD", "7C"));

    expect(flop.street).toBe("flop");
    expect(flop.pot).toBe(40);
    expect(flop.currentBet).toBe(0);
    expect(flop.seat1.committed).toBe(0);
    expect(flop.seat2.committed).toBe(0);
    expect(flop.actionsThisRound).toBe(0);
    expect(flop.community).toHaveLength(3);
    expect(totalChips(flop)).toBe(STARTING_TOTAL);
  });

  it("does not reset betting state when moving into showdown", () => {
    const river: MatchGameState = { ...createInitialMatchState(), street: "river", pot: 300 };
    const showdown = advanceStreet(river, hand("AS", "KD", "7C", "2H", "9S"));
    expect(showdown.street).toBe("showdown");
    expect(showdown.pot).toBe(300);
  });
});

describe("resolveShowdown", () => {
  const board = hand("AS", "KD", "7C", "2H", "9S");
  const atShowdown: MatchGameState = {
    ...createInitialMatchState(),
    street: "showdown",
    pot: 200,
    seat1: { committed: 100, stack: 900, status: "active" },
    seat2: { committed: 100, stack: 900, status: "active" },
    community: board
  };

  it("pays the better hand", () => {
    // Seat 1 makes aces; seat 2 makes kings.
    const result = resolveShowdown(atShowdown, hand("AH", "3D"), hand("KH", "4D"));
    expect(result.result).toBe(1);
    expect(result.seat1.stack).toBe(1100);
    expect(result.seat2.stack).toBe(900);
    expect(result.handOver).toBe(true);
    expect(result.seat1Evaluation.hand).toBe("Pair");
  });

  it("pays seat 2 when it holds the better hand", () => {
    const result = resolveShowdown(atShowdown, hand("3H", "4D"), hand("AH", "AD"));
    expect(result.result).toBe(2);
    expect(result.seat2.stack).toBe(1100);
    expect(result.seat2Evaluation.hand).toBe("Three of a Kind");
  });

  it("splits an even pot in half", () => {
    // Both play the identical board; hole cards are irrelevant to the made hand.
    const result = resolveShowdown(atShowdown, hand("3H", "4D"), hand("3C", "4S"));
    expect(result.result).toBe("split");
    expect(result.seat1.stack).toBe(1000);
    expect(result.seat2.stack).toBe(1000);
  });

  it("gives the odd chip of a split pot to seat 2 rather than dropping it", () => {
    const oddPot = { ...atShowdown, pot: 201 };
    const result = resolveShowdown(oddPot, hand("3H", "4D"), hand("3C", "4S"));
    expect(result.seat1.stack).toBe(1000);
    expect(result.seat2.stack).toBe(1001);
    expect(result.seat1.stack + result.seat2.stack).toBe(1800 + 201);
  });
});

describe("full hand walkthrough", () => {
  it("conserves chips from deal to showdown", () => {
    let state = createInitialMatchState();

    state = applyBetOrRaise(state, 1, 40); // to 60
    state = applyCheckOrCall(state, 2);
    expect(isBettingRoundClosed(state)).toBe(true);
    state = advanceStreet(state, hand("AS", "KD", "7C"));

    state = applyCheckOrCall(state, 1);
    state = applyBetOrRaise(state, 2, 50);
    state = applyCheckOrCall(state, 1);
    expect(isBettingRoundClosed(state)).toBe(true);
    state = advanceStreet(state, hand("AS", "KD", "7C", "2H"));

    state = applyCheckOrCall(state, 1);
    state = applyCheckOrCall(state, 2);
    state = advanceStreet(state, hand("AS", "KD", "7C", "2H", "9S"));

    state = applyCheckOrCall(state, 1);
    state = applyCheckOrCall(state, 2);
    state = advanceStreet(state, hand("AS", "KD", "7C", "2H", "9S"));
    expect(state.street).toBe("showdown");

    const settled = resolveShowdown(state, hand("AH", "3D"), hand("KH", "4D"));
    expect(settled.seat1.stack + settled.seat2.stack).toBe(STARTING_TOTAL);
  });
});
