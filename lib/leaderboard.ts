import { supabase, hasSupabaseConfig } from "./supabase";
import { demoLeaderboard } from "./mockData";
import { LeaderboardEntry, PublicMemberProfile } from "./types";

type LeaderboardRpcRow = {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  total_points: number;
  rank: number | string;
};

export function getBadge(points: number) {
  if (points >= 1000) return "Club Legend";
  if (points >= 700) return "Final Table";
  if (points >= 450) return "Chip Leader";
  if (points >= 200) return "Table Regular";
  return "Rookie Strategist";
}

export async function getMonthlyLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!hasSupabaseConfig) return demoLeaderboard;
  const { data, error } = await supabase.rpc("get_monthly_leaderboard");
  if (error) throw error;
  return data ?? [];
}

export async function getAllTimeLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!hasSupabaseConfig) return demoLeaderboard;
  const { data, error } = await supabase.rpc("get_all_time_leaderboard");
  if (error) throw error;
  return ((data ?? []) as LeaderboardRpcRow[]).map((row) => ({
    user_id: row.user_id,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    total_points: row.total_points,
    rank: Number(row.rank)
  }));
}

export async function getPublicMemberProfile(userId: string): Promise<PublicMemberProfile | null> {
  if (!hasSupabaseConfig) {
    const row = demoLeaderboard.find((entry) => entry.user_id === userId) ?? demoLeaderboard[0];
    return {
      user_id: row.user_id,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      major: "Club Member",
      graduation_year: null,
      total_points: row.total_points,
      all_time_rank: row.rank,
      joined_at: new Date().toISOString()
    };
  }
  const { data, error } = await supabase.rpc("get_public_member_profile", { p_user_id: userId }).maybeSingle();
  if (error) throw error;
  return data as PublicMemberProfile | null;
}
