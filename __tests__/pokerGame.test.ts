import { createPokerGame } from "@/lib/pokerGame";

describe("createPokerGame buy-in configuration", () => {
  it("uses the selected buy-in for both starting stacks", () => {
    const game = createPokerGame("Club Regular", { startingStack: 500, openingBet: 10 });

    expect(game.playerStack).toBe(490);
    expect(game.botStack).toBe(490);
    expect(game.pot).toBe(20);
    expect(game.betUnit).toBe(10);
    expect(game.playerStack + game.botStack + game.pot).toBe(1000);
  });

  it("keeps the opening bet inside the selected stack", () => {
    const game = createPokerGame("Beginner", { startingStack: 100, openingBet: 500 });

    expect(game.betUnit).toBe(100);
    expect(game.playerStack).toBe(0);
    expect(game.botStack).toBe(0);
    expect(game.pot).toBe(200);
  });

  it("supports the smallest 40-chip demo buy-in", () => {
    const game = createPokerGame("Beginner", { startingStack: 40, openingBet: 2 });

    expect(game.betUnit).toBe(2);
    expect(game.playerStack).toBe(38);
    expect(game.botStack).toBe(38);
    expect(game.pot).toBe(4);
  });

  it("carries different player and bot session stacks into a new hand", () => {
    const game = createPokerGame("Club Regular", { startingStack: 620, botStartingStack: 355, openingBet: 10 });

    expect(game.playerStack).toBe(610);
    expect(game.botStack).toBe(345);
    expect(game.pot).toBe(20);
  });
});
