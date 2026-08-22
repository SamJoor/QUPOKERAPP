import { supabase, demoDataEnabled } from "./supabase";
import { demoRewards } from "./mockData";
import { Reward } from "./types";

export type RewardRedemption = {
  id: string;
  reward_id: string;
  user_id: string;
  points_spent: number;
  status: "pending" | "approved" | "fulfilled" | "cancelled";
  created_at: string;
  updated_at: string;
  rewards?: { title?: string | null; reward_type?: string | null } | null;
};

export async function getRewards(): Promise<Reward[]> {
  if (demoDataEnabled) return demoRewards;
  const { data, error } = await supabase.from("rewards").select("*").eq("is_active", true).order("cost_points");
  if (error) throw error;
  return data ?? [];
}

export async function redeemReward(rewardId: string) {
  if (demoDataEnabled) return { status: "pending", reward_id: rewardId };
  const { data, error } = await supabase.rpc("redeem_reward", { p_reward_id: rewardId });
  if (error) throw error;
  return data;
}

export async function getMyRewardRedemptions(): Promise<RewardRedemption[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select("*, rewards(title, reward_type)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RewardRedemption[];
}
