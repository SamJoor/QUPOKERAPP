import { supabase, hasSupabaseConfig } from "./supabase";
import { demoLedger } from "./mockData";
import { LedgerEntry, PointsSource } from "./types";

export async function getMyPointHistory(userId: string): Promise<LedgerEntry[]> {
  if (!hasSupabaseConfig) return demoLedger;
  const { data, error } = await supabase
    .from("points_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
  sourceType: PointsSource,
  sourceId?: string
) {
  const { error } = await supabase.rpc("award_points", {
    p_user_id: userId,
    p_points: points,
    p_reason: reason,
    p_source_type: sourceType,
    p_source_id: sourceId ?? null
  });
  if (error) throw error;
}

export async function redeemPoints(userId: string, points: number, reason: string, sourceType: PointsSource, sourceId?: string) {
  const { error } = await supabase.rpc("redeem_points", {
    p_user_id: userId,
    p_points: points,
    p_reason: reason,
    p_source_type: sourceType,
    p_source_id: sourceId ?? null
  });
  if (error) throw error;
}
