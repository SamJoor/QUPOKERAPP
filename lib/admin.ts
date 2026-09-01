import { supabase, demoDataEnabled } from "./supabase";
import { requireAdmin } from "./auth";
import { demoEvents, demoLeaderboard, demoRewards, demoTournaments } from "./mockData";
import { ClubEvent, Profile, Reward, Tournament } from "./types";

/** events minus qr_code_token - see getAdminEvents. */
const EVENT_ADMIN_COLUMNS =
  "id, title, description, event_type, location, starts_at, ends_at, points_awarded, is_active, created_by, created_at, updated_at";

/** Every export here gates on requireAdmin() BEFORE branching to demo data. The reverse
 * order let any caller read admin dashboards whenever the backend was unconfigured.
 * Demo mode seats a member-role profile, so admin screens are unavailable offline by design. */
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
  await requireAdmin();
  if (demoDataEnabled) {
    return {
      totalMembers: 10,
      totalEvents: demoEvents.length,
      totalCheckIns: 38,
      pendingRedemptions: 3,
      upcomingTournaments: demoTournaments.length,
      topFive: demoLeaderboard.slice(0, 5)
    };
  }
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
  await requireAdmin();
  if (demoDataEnabled) return;
  const { error } = await supabase.from("rewards").upsert(reward);
  if (error) throw error;
}

export async function getAdminMembers(): Promise<Profile[]> {
  await requireAdmin();
  if (demoDataEnabled) {
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
  const { data, error } = await supabase.from("profiles").select("*").order("lifetime_points", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function setMemberRole(userId: string, role: "member" | "admin") {
  await requireAdmin();
  if (demoDataEnabled) return;
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) throw error;
}

export async function adjustMemberPoints(userId: string, points: number, reason: string) {
  await requireAdmin();
  if (demoDataEnabled) return;
  // Goes through admin_adjust_points rather than award_points/redeem_points directly:
  // those two are no longer executable by end users at all (migration 018), because
  // award_points let any member grant points to themselves.
  const { error } = await supabase.rpc("admin_adjust_points", {
    p_user_id: userId,
    p_points: points,
    p_reason: reason
  });
  if (error) throw error;
}

export async function getAdminEvents(): Promise<ClubEvent[]> {
  await requireAdmin();
  if (demoDataEnabled) return demoEvents;
  // qr_code_token is revoked from the authenticated role (migration 019) so that members
  // cannot read the check-in token straight out of the events table. Admins still need it
  // to render the QR, so it comes back through an admin-gated function instead. "*" would
  // fail here too - the revoke applies to admins as well, they just have the RPC.
  const [events, tokens] = await Promise.all([
    supabase.from("events").select(EVENT_ADMIN_COLUMNS).order("starts_at", { ascending: false }),
    supabase.rpc("admin_event_qr_tokens")
  ]);
  if (events.error) throw events.error;
  if (tokens.error) throw tokens.error;
  const tokenById = new Map<string, string>(
    ((tokens.data ?? []) as Array<{ event_id: string; qr_code_token: string }>).map((row) => [
      row.event_id,
      row.qr_code_token
    ])
  );
  return ((events.data ?? []) as ClubEvent[]).map((event) => ({
    ...event,
    qr_code_token: tokenById.get(event.id) ?? ""
  }));
}

export async function saveAdminEvent(event: Partial<ClubEvent>) {
  const admin = await requireAdmin();
  if (demoDataEnabled) return;
  const payload = { ...event, created_by: event.created_by ?? admin.id };
  const { error } = await supabase.from("events").upsert(payload);
  if (error) throw error;
}

export async function deactivateEvent(eventId: string) {
  await requireAdmin();
  if (demoDataEnabled) return;
  const { error } = await supabase.from("events").update({ is_active: false }).eq("id", eventId);
  if (error) throw error;
}

export async function regenerateEventQr(eventId: string) {
  await requireAdmin();
  if (demoDataEnabled) return { qr_code_token: `demo-${Date.now()}` };
  const { data, error } = await supabase.rpc("regenerate_event_qr", { p_event_id: eventId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { qr_code_token: string };
}

export async function getEventAttendance(eventId: string): Promise<AttendanceRow[]> {
  await requireAdmin();
  if (demoDataEnabled) {
    return demoLeaderboard.slice(0, 3).map((entry, index) => ({
      attendance_id: `demo-attendance-${index}`,
      user_id: entry.user_id,
      full_name: entry.full_name,
      email: `${entry.full_name.toLowerCase().replace(/\s+/g, ".")}@example.edu`,
      checked_in_at: new Date(Date.now() - index * 600000).toISOString(),
      method: "qr"
    }));
  }
  const { data, error } = await supabase.rpc("get_event_attendance", { p_event_id: eventId });
  if (error) throw error;
  return (data ?? []) as AttendanceRow[];
}

export async function getRewardRedemptions() {
  await requireAdmin();
  if (demoDataEnabled) return [];
  const { data, error } = await supabase
    .from("reward_redemptions")
    .select("*, rewards(title), profiles(full_name, email)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateRedemptionStatus(redemptionId: string, status: "pending" | "approved" | "fulfilled" | "cancelled") {
  await requireAdmin();
  if (demoDataEnabled) return;
  const { error } = await supabase.rpc("set_reward_redemption_status", {
    p_redemption_id: redemptionId,
    p_status: status
  });
  if (error) throw error;
}

export async function saveAdminTournament(tournament: Partial<Tournament>) {
  await requireAdmin();
  if (demoDataEnabled) return;
  const { error } = await supabase.from("tournaments").upsert(tournament);
  if (error) throw error;
}

export async function getTournamentRegistrations(tournamentId: string) {
  await requireAdmin();
  if (demoDataEnabled) return [];
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("*, profiles(full_name, email)")
    .eq("tournament_id", tournamentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function submitTournamentResult(tournamentId: string, userId: string, placement: number, pointsAwarded: number) {
  await requireAdmin();
  if (demoDataEnabled) return;
  const { error } = await supabase.rpc("submit_tournament_result", {
    p_tournament_id: tournamentId,
    p_user_id: userId,
    p_placement: placement,
    p_points_awarded: pointsAwarded
  });
  if (error) throw error;
}

export async function completeTournament(tournamentId: string) {
  await requireAdmin();
  if (demoDataEnabled) return;
  const { error } = await supabase.from("tournaments").update({ status: "completed" }).eq("id", tournamentId);
  if (error) throw error;
}

export async function setTournamentStatus(tournamentId: string, status: Tournament["status"]) {
  await requireAdmin();
  if (demoDataEnabled) return;
  const { error } = await supabase.from("tournaments").update({ status }).eq("id", tournamentId);
  if (error) throw error;
}

export { demoRewards };
