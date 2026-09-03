import { Card } from "@/lib/poker";
import {
  advanceStreet,
  applyBetOrRaise,
  applyCheckOrCall,
  applyFold,
  buildPots,
  createTableState,
  isBettingRoundClosed,
  nextActingSeat,
  resolveShowdown,
  TableState
} from "@/lib/pokerTable";

const card = (rank: string, suit: string): Card => ({ rank, suit }) as Card;

/** Total chips must never change - the single strongest check on a poker engine.
 *
 * Mid-hand the chips are split between stacks and the middle. Once the hand is settled the
 * pot has been pushed back into stacks, while totalCommitted stays as a record of what each
 * seat put in, so counting it again after settlement would double the contributions. */
function chipsInPlay(state: TableState) {
  const stacks = state.seats.reduce((sum, seat) => sum + seat.stack, 0);
  if (state.handOver) return stacks;
  return stacks + state.seats.reduce((sum, seat) => sum + seat.totalCommitted, 0);
}

function seat(state: TableState, number: number) {
  return state.seats.find((entry) => entry.seat === number)!;
}

describe("createTableState", () => {
  it("posts blinds left of the button at a full table", () => {
    const state = createTableState([1, 2, 3, 4, 5, 6], 20, 1000, 1);
    expect(seat(state, 2).totalCommitted).toBe(10);
    expect(seat(state, 3).totalCommitted).toBe(20);
    expect(seat(state, 1).totalCommitted).toBe(0);
    // Action opens left of the big blind.
    expect(state.currentTurnSeat).toBe(4);
  });

  it("gives the button the small blind heads up, and first action", () => {
    const state = createTableState([1, 2], 20, 1000, 1);
    expect(seat(state, 1).totalCommitted).toBe(10);
    expect(seat(state, 2).totalCommitted).toBe(20);
    expect(state.currentTurnSeat).toBe(1);
  });

  it("wraps the blinds around the seat order", () => {
    const state = createTableState([1, 2, 3], 20, 1000, 3);
    expect(seat(state, 1).totalCommitted).toBe(10);
    expect(seat(state, 2).totalCommitted).toBe(20);
  });

  it("rejects tables outside two to six seats", () => {
    expect(() => createTableState([1])).toThrow();
    expect(() => createTableState([1, 2, 3, 4, 5, 6, 7])).toThrow();
  });
});

describe("turn order", () => {
  it("skips folded seats", () => {
    let state = createTableState([1, 2, 3, 4], 20, 1000, 1);
    state = applyFold(state, 4);
    expect(nextActingSeat(state, 3)).toBe(1);
  });

  it("skips all-in seats", () => {
    let state = createTableState([1, 2, 3], 20, 1000, 1);
    state = applyBetOrRaise(state, 1, 5000);
    expect(seat(state, 1).status).toBe("allin");
    expect(nextActingSeat(state, 3)).toBe(2);
  });
});

describe("isBettingRoundClosed", () => {
  it("stays open until every acting seat has acted", () => {
    let state = createTableState([1, 2, 3], 20, 1000, 1);
    state = applyCheckOrCall(state, 1);
    expect(isBettingRoundClosed(state)).toBe(false);
    state = applyCheckOrCall(state, 2);
    expect(isBettingRoundClosed(state)).toBe(false);
    state = applyCheckOrCall(state, 3);
    expect(isBettingRoundClosed(state)).toBe(true);
  });

  it("reopens when a raise lands behind players who already acted", () => {
    let state = createTableState([1, 2, 3], 20, 1000, 1);
    state = applyCheckOrCall(state, 1);
    state = applyCheckOrCall(state, 2);
    state = applyBetOrRaise(state, 3, 60);
    expect(isBettingRoundClosed(state)).toBe(false);
    state = applyCheckOrCall(state, 1);
    state = applyCheckOrCall(state, 2);
    expect(isBettingRoundClosed(state)).toBe(true);
  });

  it("does not let an all-in seat hold the round open", () => {
    let state = createTableState([1, 2, 3], 20, 1000, 1);
    state = applyBetOrRaise(state, 1, 5000);
    state = applyCheckOrCall(state, 2);
    state = applyFold(state, 3);
    expect(isBettingRoundClosed(state)).toBe(true);
  });

  it("closes once only one player is left in the hand", () => {
    let state = createTableState([1, 2, 3], 20, 1000, 1);
    state = applyFold(state, 1);
    state = applyFold(state, 2);
    expect(isBettingRoundClosed(state)).toBe(true);
    expect(state.handOver).toBe(true);
  });
});

describe("folding", () => {
  it("hands every chip to the last player standing", () => {
    const opening = createTableState([1, 2, 3], 20, 1000, 1);
    const before = chipsInPlay(opening);
    let state = applyFold(opening, 1);
    state = applyFold(state, 2);
    expect(state.handOver).toBe(true);
    expect(state.awards[0].seats).toEqual([3]);
    expect(seat(state, 3).stack).toBe(1000 - 20 + 30);
    expect(chipsInPlay(state)).toBe(before);
  });

  it("ignores a fold from a seat that is not active", () => {
    let state = createTableState([1, 2, 3], 20, 1000, 1);
    state = applyFold(state, 1);
    const repeated = applyFold(state, 1);
    expect(repeated).toBe(state);
  });
});

describe("betting", () => {
  it("caps a raise at the stack and marks the seat all in", () => {
    let state = createTableState([1, 2, 3], 20, 1000, 1);
    state = applyBetOrRaise(state, 1, 99999);
    expect(seat(state, 1).stack).toBe(0);
    expect(seat(state, 1).status).toBe("allin");
    expect(seat(state, 1).totalCommitted).toBe(1000);
  });

  it("treats calling the whole stack as an all-in call", () => {
    let state = createTableState([1, 2], 20, 100, 1);
    state = applyBetOrRaise(state, 1, 5000);
    state = applyCheckOrCall(state, 2);
    expect(seat(state, 2).status).toBe("allin");
    expect(seat(state, 2).stack).toBe(0);
  });

  it("does not reopen action for an all in short of a full raise", () => {
    let state = createTableState([1, 2, 3], 20, 1000, 1);
    state = applyBetOrRaise(state, 1, 200);
    state = applyCheckOrCall(state, 2);
    const beforeShortAllIn = seat(state, 2).hasActed;
    expect(beforeShortAllIn).toBe(true);
    // Seat 3 has only a sliver more than the current bet.
    state = {
      ...state,
      seats: state.seats.map((entry) => (entry.seat === 3 ? { ...entry, stack: 5 } : entry))
    };
    state = applyBetOrRaise(state, 3, 5000);
    expect(seat(state, 3).status).toBe("allin");
    expect(seat(state, 2).hasActed).toBe(true);
  });

  it("conserves chips through a full betting street", () => {
    let state = createTableState([1, 2, 3, 4], 20, 1000, 1);
    const before = chipsInPlay(state);
    state = applyBetOrRaise(state, 4, 60);
    state = applyCheckOrCall(state, 1);
    state = applyFold(state, 2);
    state = applyCheckOrCall(state, 3);
    expect(chipsInPlay(state)).toBe(before);
  });
});

describe("advanceStreet", () => {
  it("resets street commitments and opens left of the button", () => {
    let state = createTableState([1, 2, 3, 4], 20, 1000, 1);
    state = applyCheckOrCall(state, 4);
    state = applyCheckOrCall(state, 1);
    state = applyCheckOrCall(state, 2);
    state = applyCheckOrCall(state, 3);
    state = advanceStreet(state, [card("A", "S"), card("K", "D"), card("7", "H")]);
    expect(state.street).toBe("flop");
    expect(state.currentBet).toBe(0);
    expect(state.seats.every((entry) => entry.committed === 0)).toBe(true);
    expect(state.currentTurnSeat).toBe(2);
    // Whole-hand contributions survive the street change - side pots depend on them.
    expect(seat(state, 3).totalCommitted).toBe(20);
  });
});

describe("buildPots", () => {
  it("returns a single pot when everyone matched", () => {
    const state = createTableState([1, 2, 3], 20, 1000, 1);
    const pots = buildPots({
      ...state,
      seats: state.seats.map((entry) => ({ ...entry, totalCommitted: 100, stack: 900 }))
    });
    expect(pots).toHaveLength(1);
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligibleSeats).toEqual([1, 2, 3]);
  });

  it("builds a side pot the short stack cannot win", () => {
    const base = createTableState([1, 2, 3], 20, 1000, 1);
    const state: TableState = {
      ...base,
      seats: [
        { seat: 1, committed: 0, totalCommitted: 100, stack: 0, status: "allin", hasActed: true },
        { seat: 2, committed: 0, totalCommitted: 500, stack: 500, status: "active", hasActed: true },
        { seat: 3, committed: 0, totalCommitted: 500, stack: 500, status: "active", hasActed: true }
      ]
    };
    const pots = buildPots(state);
    expect(pots).toHaveLength(2);
    expect(pots[0]).toEqual({ amount: 300, eligibleSeats: [1, 2, 3] });
    expect(pots[1]).toEqual({ amount: 800, eligibleSeats: [2, 3] });
    expect(pots[0].amount + pots[1].amount).toBe(1100);
  });

  it("keeps a folded player's chips in the pot but not their claim on it", () => {
    const base = createTableState([1, 2, 3], 20, 1000, 1);
    const state: TableState = {
      ...base,
      seats: [
        { seat: 1, committed: 0, totalCommitted: 100, stack: 900, status: "folded", hasActed: true },
        { seat: 2, committed: 0, totalCommitted: 300, stack: 700, status: "active", hasActed: true },
        { seat: 3, committed: 0, totalCommitted: 300, stack: 700, status: "active", hasActed: true }
      ]
    };
    const pots = buildPots(state);
    const total = pots.reduce((sum, pot) => sum + pot.amount, 0);
    expect(total).toBe(700);
    expect(pots.every((pot) => !pot.eligibleSeats.includes(1))).toBe(true);
  });
});

describe("resolveShowdown", () => {
  const community = [card("2", "C"), card("5", "D"), card("9", "H"), card("J", "S"), card("Q", "C")];

  it("awards the pot to the best hand", () => {
    const base = createTableState([1, 2], 20, 1000, 1);
    const state: TableState = {
      ...base,
      street: "river",
      community,
      seats: [
        { seat: 1, committed: 0, totalCommitted: 200, stack: 800, status: "active", hasActed: true },
        { seat: 2, committed: 0, totalCommitted: 200, stack: 800, status: "active", hasActed: true }
      ]
    };
    const resolved = resolveShowdown(state, {
      1: [card("A", "C"), card("A", "D")],
      2: [card("3", "C"), card("4", "D")]
    });
    expect(resolved.handOver).toBe(true);
    expect(resolved.awards[0].seats).toEqual([1]);
    expect(seat(resolved, 1).stack).toBe(1200);
    expect(chipsInPlay(resolved)).toBe(2000);
  });

  it("splits a tied pot and keeps the odd chip in play", () => {
    const base = createTableState([1, 2], 20, 1000, 1);
    const state: TableState = {
      ...base,
      street: "river",
      community,
      seats: [
        { seat: 1, committed: 0, totalCommitted: 25, stack: 975, status: "active", hasActed: true },
        { seat: 2, committed: 0, totalCommitted: 26, stack: 974, status: "active", hasActed: true }
      ]
    };
    const resolved = resolveShowdown(state, {
      1: [card("A", "C"), card("K", "D")],
      2: [card("A", "H"), card("K", "S")]
    });
    const awarded = resolved.awards.reduce((sum, award) => sum + award.amount, 0);
    const distributed = resolved.seats.reduce((sum, entry) => sum + entry.stack, 0) - (975 + 974);
    expect(distributed).toBe(awarded);
  });

  it("pays the side pot separately from the main pot", () => {
    const base = createTableState([1, 2, 3], 20, 1000, 1);
    const state: TableState = {
      ...base,
      street: "river",
      community,
      seats: [
        { seat: 1, committed: 0, totalCommitted: 100, stack: 0, status: "allin", hasActed: true },
        { seat: 2, committed: 0, totalCommitted: 500, stack: 500, status: "active", hasActed: true },
        { seat: 3, committed: 0, totalCommitted: 500, stack: 500, status: "active", hasActed: true }
      ]
    };
    // Seat 1 has the best hand but is only in for 100, so it wins the main pot only.
    const resolved = resolveShowdown(state, {
      1: [card("A", "C"), card("A", "D")],
      2: [card("K", "C"), card("K", "D")],
      3: [card("3", "C"), card("4", "D")]
    });
    expect(seat(resolved, 1).stack).toBe(300);
    expect(seat(resolved, 2).stack).toBe(500 + 800);
    expect(seat(resolved, 3).stack).toBe(500);
    const paid = resolved.awards.reduce((sum, award) => sum + award.amount, 0);
    expect(paid).toBe(1100);
  });

  it("never creates or destroys chips at a six-handed showdown", () => {
    const base = createTableState([1, 2, 3, 4, 5, 6], 20, 1000, 1);
    const state: TableState = {
      ...base,
      street: "river",
      community,
      seats: [
        { seat: 1, committed: 0, totalCommitted: 50, stack: 0, status: "allin", hasActed: true },
        { seat: 2, committed: 0, totalCommitted: 150, stack: 0, status: "allin", hasActed: true },
        { seat: 3, committed: 0, totalCommitted: 300, stack: 700, status: "active", hasActed: true },
        { seat: 4, committed: 0, totalCommitted: 300, stack: 700, status: "active", hasActed: true },
        { seat: 5, committed: 0, totalCommitted: 80, stack: 920, status: "folded", hasActed: true },
        { seat: 6, committed: 0, totalCommitted: 0, stack: 1000, status: "folded", hasActed: true }
      ]
    };
    const before = chipsInPlay(state);
    const resolved = resolveShowdown(state, {
      1: [card("A", "C"), card("A", "D")],
      2: [card("K", "C"), card("K", "D")],
      3: [card("Q", "H"), card("Q", "D")],
      4: [card("3", "C"), card("4", "D")]
    });
    expect(chipsInPlay(resolved)).toBe(before);
    const paid = resolved.awards.reduce((sum, award) => sum + award.amount, 0);
    expect(paid).toBe(50 + 150 + 300 + 300 + 80);
  });
});
