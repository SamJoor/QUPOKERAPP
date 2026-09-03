import { supabase, demoDataEnabled } from "./supabase";
import { LeaderboardEntry } from "./types";

/**
 * Chips are the in-game currency. They are granted - 2,000 to start and 500 a day on claim -
 * and never earned at club events. Club points are the opposite: earned by checking in, spent
 * on rewards and tournament entries. Keeping them apart is why migration 025 exists; before
 * it, the offline buy-in and the reward balance were the same number.
 */

export type DailyChipClaim = {
  status: "success" | "already_claimed";
  chips_awarded: number;
  chip_balance: number;
};

export async function dailyChipsAvailable(): Promise<boolean> {
  if (demoDataEnabled) return true;
  const { data, error } = await supabase.rpc("daily_chips_available");
  if (error) throw error;
  return Boolean(data);
}

export async function claimDailyChips(): Promise<DailyChipClaim> {
  if (demoDataEnabled) return { status: "success", chips_awarded: 500, chip_balance: 2500 };
  const { data, error } = await supabase.rpc("claim_daily_chips").maybeSingle();
  if (error) throw error;
  return data as DailyChipClaim;
}

export async function getChipLeaderboard(): Promise<LeaderboardEntry[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase.rpc("get_chip_leaderboard");
  if (error) throw error;
  return ((data ?? []) as LeaderboardEntry[]).map((row) => ({ ...row, rank: Number(row.rank) }));
}

export async function getWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase.rpc("get_weekly_leaderboard");
  if (error) throw error;
  return ((data ?? []) as LeaderboardEntry[]).map((row) => ({ ...row, rank: Number(row.rank) }));
}
