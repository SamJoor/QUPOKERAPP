import { supabase, hasSupabaseConfig } from "./supabase";

export type QueueStatus = "waiting" | "matched" | "cancelled";
export type PokerMatchType = "bot" | "friend" | "queue";
export type PokerMatchStatus = "waiting" | "in_progress" | "completed" | "cancelled";

export type PokerMatch = {
  id: string;
  match_type: PokerMatchType;
  status: PokerMatchStatus;
  created_by?: string | null;
  current_turn_user_id?: string | null;
  game_state: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type PokerMatchAction = {
  id: string;
  user_id: string;
  full_name: string;
  action_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export async function joinPokerQueue(preferredLevel = "Club Regular") {
  if (!hasSupabaseConfig) {
    return { status: "waiting", message: "Demo mode queue is simulated until Supabase is connected." };
  }
  const { data, error } = await supabase.rpc("join_poker_queue", { p_preferred_level: preferredLevel });
  if (error) throw error;
  return data;
}

export async function leavePokerQueue() {
  if (!hasSupabaseConfig) return;
  const { error } = await supabase.rpc("leave_poker_queue");
  if (error) throw error;
}

export async function createFriendPokerMatch(friendId: string) {
  if (!hasSupabaseConfig) {
    return { match_id: "demo-friend-match", status: "waiting" };
  }
  const { data, error } = await supabase.rpc("create_friend_poker_match", { p_friend_id: friendId });
  if (error) throw error;
  return data;
}

export function buildPokerInviteLink(inviteToken: string) {
  const baseUrl = process.env.EXPO_PUBLIC_INVITE_BASE_URL?.replace(/\/$/, "");
  if (baseUrl) return `${baseUrl}/invite/${inviteToken}`;
  return `qupoker://invite/${inviteToken}`;
}

export async function createPokerInvite() {
  if (!hasSupabaseConfig) {
    const invite_token = "demo-invite";
    return {
      invite_token,
      match_id: "demo-open-match",
      url: buildPokerInviteLink(invite_token)
    };
  }
  const { data, error } = await supabase.rpc("create_poker_invite");
  if (error) throw error;
  const invite_token = data?.invite_token as string;
  return { ...data, url: buildPokerInviteLink(invite_token) };
}

export async function acceptPokerInvite(inviteToken: string) {
  if (!hasSupabaseConfig) {
    return { status: "accepted", match_id: "demo-open-match", message: "Demo invite accepted." };
  }
  const { data, error } = await supabase.rpc("accept_poker_invite", { p_invite_token: inviteToken });
  if (error) throw error;
  return data;
}

export async function getMyActivePokerMatches(): Promise<PokerMatch[]> {
  if (!hasSupabaseConfig) return [];
  const { data, error } = await supabase
    .from("poker_matches")
    .select("*, poker_match_players!inner(user_id)")
    .in("status", ["waiting", "in_progress"])
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PokerMatch[];
}

export async function getMyPokerMatchHistory(): Promise<PokerMatch[]> {
  if (!hasSupabaseConfig) return [];
  const { data, error } = await supabase
    .from("poker_matches")
    .select("*, poker_match_players!inner(user_id)")
    .order("updated_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  return (data ?? []) as unknown as PokerMatch[];
}

export async function getPokerMatchActions(matchId: string): Promise<PokerMatchAction[]> {
  if (!hasSupabaseConfig) return [];
  const { data, error } = await supabase.rpc("get_poker_match_history", { p_match_id: matchId });
  if (error) throw error;
  return (data ?? []) as PokerMatchAction[];
}

export async function updatePokerMatchState(matchId: string, actionType: string, payload: Record<string, unknown>, gameState: Record<string, unknown>, nextTurnUserId?: string | null) {
  if (!hasSupabaseConfig) return gameState;
  const { data, error } = await supabase.rpc("update_poker_match_state", {
    p_match_id: matchId,
    p_action_type: actionType,
    p_payload: payload,
    p_game_state: gameState,
    p_next_turn_user_id: nextTurnUserId ?? null
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export function subscribeToPokerMatch(matchId: string, onChange: () => void) {
  if (!hasSupabaseConfig) return { unsubscribe: () => undefined };
  const channel = supabase
    .channel(`poker-match-${matchId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "poker_matches", filter: `id=eq.${matchId}` }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "poker_match_actions", filter: `match_id=eq.${matchId}` }, onChange)
    .subscribe();
  return { unsubscribe: () => { supabase.removeChannel(channel); } };
}
