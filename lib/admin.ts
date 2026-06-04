import { supabase, hasSupabaseConfig } from "./supabase";
import { requireAdmin } from "./auth";
import { demoEvents, demoLeaderboard, demoRewards, demoTournaments } from "./mockData";
import { ClubEvent, Profile, Reward, Tournament } from "./types";

export type AdminSummary = {
  totalMembers: number;
  totalEvents: number;
  totalCheckIns: number;
  pendingRedemptions: number;
  upcomingTournaments: number;
  topFive: Array<{
    user_id: string;
    full_name: string;
    total_points: number;
    rank: number;
  }>;
};

export type AttendanceRow = {
  attendance_id: string;
  user_id: string;
  full_name: string;
  email: string;
  checked_in_at: string;
  method: "qr";
};

export async function getAdminSummary(): Promise<AdminSummary> {
  if (!hasSupabaseConfig) {
    return {
      totalMembers: 10,
      totalEvents: demoEvents.length,
      totalCheckIns: 38,
      pendingRedemptions: 3,
      upcomingTournaments: demoTournaments.length,
      topFive: demoLeaderboard.slice(0, 5)
    };
  }
  await requireAdmin();
  const [members, events, attendance, redemptions, tournaments, topFive] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("attendance").select("id", { count: "exact", head: true }),
    supabase.from("reward_redemptions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("tournaments").select("id", { count: "exact", head: true }).in("status", ["upcoming", "registration_open"]),
    supabase.from("profiles").select("id, full_name, total_points, lifetime_points").order("lifetime_points", { ascending: false }).limit(5)
  ]);
  return {
    totalMembers: members.count ?? 0,
    totalEvents: events.count ?? 0,
    totalCheckIns: attendance.count ?? 0,
    pendingRedemptions: redemptions.count ?? 0,
    upcomingTournaments: tournaments.count ?? 0,
    topFive: (topFive.data ?? []).map((row, index) => ({
      user_id: row.id,
      full_name: row.full_name,
      total_points: row.lifetime_points ?? row.total_points,
      rank: index + 1
    }))
  };
}

export async function saveReward(reward: Record<string, unknown>) {
  if (!hasSupabaseConfig) return;
  await requireAdmin();
  const { error } = await supabase.from("rewards").upsert(reward);
  if (error) throw error;
}

export async function getAdminMembers(): Promise<Profile[]> {
  if (!hasSupabaseConfig) {
    return demoLeaderboard.map((entry) => ({
      id: entry.user_id,
      full_name: entry.full_name,
      email: `${entry.full_name.toLowerCase().replace(/\s+/g, ".")}@example.edu`,
      role: entry.user_id === "1" ? "admin" : "member",
      total_points: entry.total_points,
      lifetime_points: entry.total_points,
      spendable_points: entry.total_points,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
  }
  await requireAdmin();
  const { data, error } = await supabase.from("profiles").select("*").order("lifetime_points", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function setMemberRole(userId: string, role: "member" | "admin") {
  if (!hasSupabaseConfig) return;
  await requireAdmin();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}

export async function adjustMemberPoints(userId: string, points: number, reason: string) {
  if (!hasSupabaseConfig) return;
  await requireAdmin();
  const rpc = points >= 0 ? "award_points" : "redeem_points";
  const { error } = await supabase.rpc(rpc, {
    p_user_id: userId,
    p_points: Math.abs(points),
    p_reason: reason,
    p_source_type: "admin_adjustment",
    p_source_id: null
  });
  if (error) throw error;
}

export async function getAdminEvents(): Promise<ClubEvent[]> {
  if (!hasSupabaseConfig) return demoEvents;
  await requireAdmin();
  const { data, error } = await supabase.from("events").select("*").order("starts_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveAdminEvent(event: Partial<ClubEvent>) {
  if (!hasSupabaseConfig) return;
  const admin = await requireAdmin();
  const payload = { ...event, created_by: event.created_by ?? admin.id };
  const { error } = await supabase.from("events").upsert(payload);
  if (error) throw error;
}

export async function deactivateEvent(eventId: string) {
  if (!hasSupabaseConfig) return;
  await requireAdmin();
  const { error } = await supabase.from("events").update({ is_active: false }).eq("id", eventId);
  if (error) throw error;
}

export async function regenerateEventQr(eventId: string) {
  if (!hasSupabaseConfig) return { qr_code_token: `demo-${Date.now()}` };
  await requireAdmin();
  const { data, error } = await supabase.rpc("regenerate_event_qr", { p_event_id: eventId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { qr_code_token: string };
}

export async function getEventAttendance(eventId: string): Promise<AttendanceRow[]> {
  if (!hasSupabaseConfig) {
    return demoLeaderboard.slice(0, 3).map((entry, index) => ({
      attendance_id: `demo-attendance-${index}`,
      user_id: entry.user_id,
      full_name: entry.full_name,
      email: `${entry.full_name.toLowerCase().replace(/\s+/g, ".")}@example.edu`,
      checked_in_at: new Date(Date.now() - index * 600000).toISOString(),
      method: "qr"
    }));
  }
  await requireAdmin();
  const { data, error } = await supabase.rpc("get_event_attendance", { p_event_id: eventId });
  if (error) throw error;
  return (data ?? []) as AttendanceRow[];
}

export async function getRewardRedemptions() {
  if (!hasSupabaseConfig) return [];
  await requireAdmin();
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select("*, rewards(title), profiles(full_name, email)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateRedemptionStatus(redemptionId: string, status: "pending" | "approved" | "fulfilled" | "cancelled") {
  if (!hasSupabaseConfig) return;
  await requireAdmin();
  const { error } = await supabase.rpc("set_reward_redemption_status", {
    p_redemption_id: redemptionId,
    p_status: status
  });
  if (error) throw error;
}

export async function saveAdminTournament(tournament: Partial<Tournament>) {
  if (!hasSupabaseConfig) return;
  await requireAdmin();
  const { error } = await supabase.from("tournaments").upsert(tournament);
  if (error) throw error;
}

export async function getTournamentRegistrations(tournamentId: string) {
  if (!hasSupabaseConfig) return [];
  await requireAdmin();
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("*, profiles(full_name, email)")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function submitTournamentResult(tournamentId: string, userId: string, placement: number, pointsAwarded: number) {
  if (!hasSupabaseConfig) return;
  await requireAdmin();
  const { error } = await supabase.rpc("submit_tournament_result", {
    p_tournament_id: tournamentId,
    p_user_id: userId,
    p_placement: placement,
    p_points_awarded: pointsAwarded
  });
  if (error) throw error;
}

export async function completeTournament(tournamentId: string) {
  if (!hasSupabaseConfig) return;
  await requireAdmin();
  const { error } = await supabase.from("tournaments").update({ status: "completed" }).eq("id", tournamentId);
  if (error) throw error;
}

export async function setTournamentStatus(tournamentId: string, status: Tournament["status"]) {
  if (!hasSupabaseConfig) return;
  await requireAdmin();
  const { error } = await supabase.from("tournaments").update({ status }).eq("id", tournamentId);
  if (error) throw error;
}

export { demoRewards };
