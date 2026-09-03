import { Card, HandEvaluation, compareHands, evaluatePokerHand } from "./poker";

/**
 * Multi-seat Texas holdem state, 2 to 6 players.
 *
 * Replaces the heads-up engine in pokerMatch.ts, which modelled the table as two named fields
 * and closed a betting round by checking that they had matched each other. Three things break
 * as soon as a third seat exists: turn order has to skip players who folded or are all in, a
 * round closes only when every player still acting has matched, and an all-in short stack
 * splits the money into side pots that the players who covered it can win but they cannot.
 *
 * Every function returns a new state. Nothing mutates.
 */

export type TableStreet = "preflop" | "flop" | "turn" | "river" | "showdown";
export type SeatStatus = "active" | "folded" | "allin" | "out";

export type TableSeat = {
  seat: number;
  /** Chips put in on the current street. Resets each street; drives the call amount. */
  committed: number;
  /** Chips put in across the whole hand. Never resets - side pots are built from this. */
  totalCommitted: number;
  stack: number;
  status: SeatStatus;
  /** Whether this seat has acted on the current street. A check cannot close a round alone. */
  hasActed: boolean;
};

/** A pot and the seats allowed to win it. Folded contributors' chips are in the amount but
 * they are never eligible. */
export type Pot = { amount: number; eligibleSeats: number[] };

export type PotAward = { amount: number; seats: number[]; hand?: string };

export type TableState = {
  street: TableStreet;
  community: Card[];
  seats: TableSeat[];
  /** Highest committed amount on this street. Call is currentBet - seat.committed. */
  currentBet: number;
  /** Smallest legal raise increment - the size of the last bet or raise. */
  minRaise: number;
  bigBlind: number;
  buttonSeat: number;
  currentTurnSeat: number;
  handOver: boolean;
  awards: PotAward[];
  message: string;
};

const BIG_BLIND = 20;
const STARTING_STACK = 1000;

export function seatsInHand(state: TableState) {
  return state.seats.filter((seat) => seat.status !== "folded" && seat.status !== "out");
}

/** Seats that can still make a decision. An all-in player is in the hand but cannot act. */
export function seatsStillActing(state: TableState) {
  return state.seats.filter((seat) => seat.status === "active");
}

function findSeat(state: TableState, seat: number) {
  return state.seats.find((entry) => entry.seat === seat);
}

/** Next seat clockwise that can still act, or null when nobody can. */
export function nextActingSeat(state: TableState, fromSeat: number): number | null {
  const ordered = [...state.seats].sort((a, b) => a.seat - b.seat);
  if (!ordered.length) return null;
  const startIndex = ordered.findIndex((entry) => entry.seat === fromSeat);
  for (let step = 1; step <= ordered.length; step += 1) {
    const candidate = ordered[(Math.max(0, startIndex) + step) % ordered.length];
    if (candidate.status === "active") return candidate.seat;
  }
  return null;
}

export function nextStreet(street: TableStreet): Exclude<TableStreet, "preflop"> {
  if (street === "preflop") return "flop";
  if (street === "flop") return "turn";
  if (street === "turn") return "river";
  return "showdown";
}

/**
 * Deals a hand. Blinds are posted by the two seats after the button, except heads-up where the
 * button posts the small blind and acts first preflop - the standard exception, and the reason
 * seat order cannot simply start at seat 1.
 */
export function createTableState(
  seatNumbers: number[],
  bigBlind = BIG_BLIND,
  startingStack = STARTING_STACK,
  buttonSeat?: number
): TableState {
  const ordered = [...seatNumbers].sort((a, b) => a - b);
  if (ordered.length < 2) throw new Error("A hand needs at least two seats");
  if (ordered.length > 6) throw new Error("A table holds at most six seats");

  const button = buttonSeat && ordered.includes(buttonSeat) ? buttonSeat : ordered[0];
  const buttonIndex = ordered.indexOf(button);
  const headsUp = ordered.length === 2;

  const smallBlindSeat = headsUp ? button : ordered[(buttonIndex + 1) % ordered.length];
  const bigBlindSeat = headsUp
    ? ordered[(buttonIndex + 1) % ordered.length]
    : ordered[(buttonIndex + 2) % ordered.length];

  const smallBlind = Math.floor(bigBlind / 2);

  const seats: TableSeat[] = ordered.map((seat) => {
    const post = seat === bigBlindSeat ? bigBlind : seat === smallBlindSeat ? smallBlind : 0;
    const paid = Math.min(post, startingStack);
    return {
      seat,
      committed: paid,
      totalCommitted: paid,
      stack: startingStack - paid,
      status: paid >= startingStack ? "allin" : "active",
      hasActed: false
    };
  });

  const base: TableState = {
    street: "preflop",
    community: [],
    seats,
    currentBet: bigBlind,
    minRaise: bigBlind,
    bigBlind,
    buttonSeat: button,
    currentTurnSeat: bigBlindSeat,
    handOver: false,
    awards: [],
    message: "Hand dealt. Blinds posted."
  };

  // Preflop action opens to the left of the big blind - or on the button heads-up.
  const opener = headsUp ? button : nextActingSeat(base, bigBlindSeat);
  return { ...base, currentTurnSeat: opener ?? bigBlindSeat };
}

/**
 * A street ends once everyone still able to act has acted and matched the current bet. All-in
 * players are skipped: they cannot match and must not hold the round open. With nobody left to
 * act - everyone all in - the round is closed too.
 */
export function isBettingRoundClosed(state: TableState): boolean {
  if (state.handOver) return true;
  if (seatsInHand(state).length < 2) return true;
  const acting = seatsStillActing(state);
  if (!acting.length) return true;
  return acting.every((seat) => seat.hasActed && seat.committed === state.currentBet);
}

function withSeat(state: TableState, seat: number, patch: Partial<TableSeat>): TableState {
  return {
    ...state,
    seats: state.seats.map((entry) => (entry.seat === seat ? { ...entry, ...patch } : entry))
  };
}

/** Everyone folded but one - that player takes every chip without showing. */
function settleUncontested(state: TableState): TableState {
  const remaining = seatsInHand(state);
  if (remaining.length !== 1) return state;
  const winner = remaining[0];
  const total = state.seats.reduce((sum, seat) => sum + seat.totalCommitted, 0);
  return {
    ...withSeat(state, winner.seat, { stack: winner.stack + total }),
    handOver: true,
    awards: [{ amount: total, seats: [winner.seat] }],
    message: `Seat ${winner.seat} wins ${total} chips. Everyone else folded.`
  };
}

export function applyFold(state: TableState, actingSeat: number): TableState {
  if (state.handOver) return state;
  const seat = findSeat(state, actingSeat);
  if (!seat || seat.status !== "active") return state;

  const folded = withSeat(state, actingSeat, { status: "folded", hasActed: true });
  const settled = settleUncontested(folded);
  if (settled.handOver) return settled;

  return {
    ...folded,
    currentTurnSeat: nextActingSeat(folded, actingSeat) ?? actingSeat,
    message: `Seat ${actingSeat} folded.`
  };
}

export function applyCheckOrCall(state: TableState, actingSeat: number): TableState {
  if (state.handOver) return state;
  const seat = findSeat(state, actingSeat);
  if (!seat || seat.status !== "active") return state;

  const toCall = Math.max(0, state.currentBet - seat.committed);
  // Calling for everything left is an all-in call - not a fold, and not a full call.
  const paid = Math.min(toCall, seat.stack);
  const stack = seat.stack - paid;

  const next = withSeat(state, actingSeat, {
    committed: seat.committed + paid,
    totalCommitted: seat.totalCommitted + paid,
    stack,
    status: stack === 0 ? "allin" : "active",
    hasActed: true
  });

  return {
    ...next,
    currentTurnSeat: nextActingSeat(next, actingSeat) ?? actingSeat,
    message: `Seat ${actingSeat} ${toCall > 0 ? (stack === 0 ? "calls all in" : "calls") : "checks"}.`
  };
}

/**
 * `amount` is the raise on top of the current bet. A raise reopens the action, so every other
 * seat that already acted must act again. Going all in for less than a full raise does not
 * reopen it, which is why hasActed is only cleared when the raise is at least minRaise.
 */
export function applyBetOrRaise(state: TableState, actingSeat: number, amount: number): TableState {
  if (state.handOver) return state;
  const seat = findSeat(state, actingSeat);
  if (!seat || seat.status !== "active") return state;

  const ceiling = seat.committed + seat.stack;
  const targetBet = Math.min(state.currentBet + Math.max(amount, 0), ceiling);
  const extra = Math.max(0, targetBet - seat.committed);
  if (extra <= 0) return applyCheckOrCall(state, actingSeat);

  const stack = seat.stack - extra;
  const raiseSize = targetBet - state.currentBet;
  const fullRaise = raiseSize >= state.minRaise;

  const raised = withSeat(state, actingSeat, {
    committed: targetBet,
    totalCommitted: seat.totalCommitted + extra,
    stack,
    status: stack === 0 ? "allin" : "active",
    hasActed: true
  });

  const reopened: TableState = {
    ...raised,
    seats: raised.seats.map((entry) =>
      entry.seat !== actingSeat && entry.status === "active" && fullRaise
        ? { ...entry, hasActed: false }
        : entry
    ),
    currentBet: Math.max(state.currentBet, targetBet),
    minRaise: fullRaise ? raiseSize : state.minRaise
  };

  const verb = state.currentBet === 0 ? "bets" : "raises to";
  return {
    ...reopened,
    currentTurnSeat: nextActingSeat(reopened, actingSeat) ?? actingSeat,
    message: `Seat ${actingSeat} ${verb} ${targetBet}${stack === 0 ? " and is all in" : ""}.`
  };
}

/** Call once isBettingRoundClosed() is true. `revealedCommunity` is the full community array
 * from the reveal_community_street RPC. */
export function advanceStreet(state: TableState, revealedCommunity: Card[]): TableState {
  const street = nextStreet(state.street);
  if (street === "showdown") {
    return { ...state, street, community: revealedCommunity, message: "Showdown." };
  }

  const reset: TableState = {
    ...state,
    street,
    community: revealedCommunity,
    currentBet: 0,
    minRaise: state.bigBlind,
    seats: state.seats.map((seat) => ({ ...seat, committed: 0, hasActed: false }))
  };

  // Postflop the first seat left of the button opens, not the button.
  const opener = nextActingSeat(reset, state.buttonSeat);
  const label = street === "flop" ? "Flop" : street === "turn" ? "Turn" : "River";
  return {
    ...reset,
    currentTurnSeat: opener ?? state.buttonSeat,
    message: `${label} dealt.`
  };
}

/**
 * Splits the money into a main pot and any side pots.
 *
 * Each distinct total contribution is a layer. Everyone who put in at least that much pays into
 * that layer, but only players still in the hand can win it - a short stack all in for 100
 * cannot win the extra 400 two others bet on top, and a folded player's chips stay in a pot
 * they can no longer win.
 */
export function buildPots(state: TableState): Pot[] {
  const contributions = state.seats.filter((seat) => seat.totalCommitted > 0);
  if (!contributions.length) return [];

  const levels = Array.from(new Set(contributions.map((seat) => seat.totalCommitted))).sort(
    (a, b) => a - b
  );

  const pots: Pot[] = [];
  let previous = 0;
  for (const level of levels) {
    const payers = contributions.filter((seat) => seat.totalCommitted >= level);
    const amount = (level - previous) * payers.length;
    const eligibleSeats = payers
      .filter((seat) => seat.status !== "folded" && seat.status !== "out")
      .map((seat) => seat.seat);

    if (amount > 0 && eligibleSeats.length) {
      const key = eligibleSeats.join(",");
      const existing = pots.find((pot) => pot.eligibleSeats.join(",") === key);
      if (existing) existing.amount += amount;
      else pots.push({ amount, eligibleSeats });
    } else if (amount > 0 && pots.length) {
      // Dead money from folded players with nobody eligible at that level joins the last pot.
      pots[pots.length - 1].amount += amount;
    }
    previous = level;
  }
  return pots;
}

export type ShowdownHands = Record<number, Card[]>;

/**
 * Awards every pot. Each goes to the best hand among the seats eligible for it; ties split it,
 * with any odd chip to the earliest seat so nothing is lost to rounding.
 */
export function resolveShowdown(state: TableState, holeCards: ShowdownHands): TableState {
  const pots = buildPots(state);
  const evaluations = new Map<number, HandEvaluation>();

  for (const seat of seatsInHand(state)) {
    const hand = holeCards[seat.seat];
    if (hand?.length) evaluations.set(seat.seat, evaluatePokerHand([...hand, ...state.community]));
  }

  let seats = state.seats;
  const awards: PotAward[] = [];

  for (const pot of pots) {
    const contenders = pot.eligibleSeats.filter((seat) => evaluations.has(seat));
    if (!contenders.length) continue;

    let best: number[] = [contenders[0]];
    for (const seat of contenders.slice(1)) {
      const comparison = compareHands(evaluations.get(seat)!, evaluations.get(best[0])!);
      if (comparison > 0) best = [seat];
      else if (comparison === 0) best.push(seat);
    }

    const ordered = [...best].sort((a, b) => a - b);
    const share = Math.floor(pot.amount / ordered.length);
    const remainder = pot.amount - share * ordered.length;

    seats = seats.map((seat) => {
      const index = ordered.indexOf(seat.seat);
      if (index === -1) return seat;
      return { ...seat, stack: seat.stack + share + (index < remainder ? 1 : 0) };
    });

    awards.push({ amount: pot.amount, seats: ordered, hand: evaluations.get(ordered[0])!.hand });
  }

  const headline = awards[0];
  const summary = headline
    ? headline.seats.length > 1
      ? `Split pot. Seats ${headline.seats.join(" and ")} both play ${headline.hand}.`
      : `Seat ${headline.seats[0]} wins ${headline.amount} chips with ${headline.hand}.`
    : "Hand complete.";

  return { ...state, seats, street: "showdown", handOver: true, awards, message: summary };
}
