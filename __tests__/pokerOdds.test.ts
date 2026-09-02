import { calculateHoldemInsights, startingHandStrength } from "@/lib/pokerOdds";
import { Card } from "@/lib/poker";

const cards = (...values: Array<[Card["rank"], Card["suit"]]>): Card[] => values.map(([rank, suit]) => ({ rank, suit }));

describe("poker odds insights", () => {
  it("keeps equity deterministic for the same table state", () => {
    const hand = cards(["A", "S"], ["K", "S"]);
    const board = cards(["Q", "S"], ["J", "D"], ["4", "C"]);
    expect(calculateHoldemInsights(hand, board, 4, 200)).toEqual(calculateHoldemInsights(hand, board, 4, 200));
  });

  it("recognizes that premium pairs are stronger starting hands", () => {
    const aces = cards(["A", "S"], ["A", "H"]);
    const sevenDeuce = cards(["7", "C"], ["2", "D"]);
    expect(startingHandStrength(aces)).toBeGreaterThan(startingHandStrength(sevenDeuce));
  });

  it("reports the chance to pair an unpaired starting hand on the next card", () => {
    const insight = calculateHoldemInsights(cards(["A", "S"], ["K", "D"]), [], 1, 150);
    expect(insight.nextHand).toBe("Pair");
    expect(insight.nextHandPercentage).toBe(12);
  });
});
