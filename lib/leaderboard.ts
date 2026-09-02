import { supabase, demoDataEnabled } from "./supabase";
import { demoLeaderboard, demoProfile } from "./mockData";
import { LeaderboardEntry, MemberContactCard, PublicMemberProfile } from "./types";

type LeaderboardRpcRow = {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  avatar_key?: string | null;
  total_points: number;
  rank: number | string;
};

// Temporary launch roster requested for the current app preview. Keeping this switch
// beside the data access makes it easy to return to the live RPC leaderboard later.
const useFeaturedLeaderboardPreview = true;

export function getBadge(points: number) {
  if (points >= 1000) return "Club Legend";
  if (points >= 700) return "Final Table";
  if (points >= 450) return "Chip Leader";
  if (points >= 200) return "Table Regular";
  return "Rookie Strategist";
}

export async function getMonthlyLeaderboard(): Promise<LeaderboardEntry[]> {
  if (useFeaturedLeaderboardPreview || demoDataEnabled) return demoLeaderboard;
  const { data, error } = await supabase.rpc("get_monthly_leaderboard");
  if (error) throw error;
  return data ?? [];
}

export async function getAllTimeLeaderboard(): Promise<LeaderboardEntry[]> {
  if (useFeaturedLeaderboardPreview || demoDataEnabled) return demoLeaderboard;
  const { data, error } = await supabase.rpc("get_all_time_leaderboard");
  if (error) throw error;
  return ((data ?? []) as LeaderboardRpcRow[]).map((row) => ({
    user_id: row.user_id,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    avatar_key: row.avatar_key,
    total_points: row.total_points,
    rank: Number(row.rank)
  }));
}

export async function getMemberContactCard(userId: string): Promise<MemberContactCard | null> {
  const featuredMember = demoLeaderboard.find((entry) => entry.user_id === userId);
  if (featuredMember || demoDataEnabled) {
    const row = featuredMember ?? demoLeaderboard[0];
    return {
      user_id: row.user_id,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      avatar_key: row.avatar_key
    };
  }

  const { data, error } = await supabase.rpc("get_member_contact_card", { p_user_id: userId }).maybeSingle();
  if (error) throw error;
  return data as MemberContactCard | null;
}

export async function getPublicMemberProfile(userId: string): Promise<PublicMemberProfile | null> {
  const featuredMember = demoLeaderboard.find((entry) => entry.user_id === userId);
  if (featuredMember || demoDataEnabled) {
    const row = featuredMember ?? (userId === demoProfile.id
      ? { user_id: demoProfile.id, full_name: demoProfile.full_name, total_points: demoProfile.total_points, rank: 0 }
      : demoLeaderboard[0]);
    return {
      user_id: row.user_id,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      avatar_key: row.avatar_key,
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
