import { supabase, demoDataEnabled } from "./supabase";
import { Card } from "./poker";

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
  if (demoDataEnabled) {
    return { status: "waiting", message: "Demo mode queue is simulated until Supabase is connected." };
  }
  const { data, error } = await supabase.rpc("join_poker_queue", { p_preferred_level: preferredLevel });
  if (error) throw error;
  return data;
}

export async function leavePokerQueue() {
  if (demoDataEnabled) return;
  const { error } = await supabase.rpc("leave_poker_queue");
  if (error) throw error;
}

export async function createFriendPokerMatch(friendId: string) {
  if (demoDataEnabled) {
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
  if (demoDataEnabled) {
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
  if (demoDataEnabled) {
    return { status: "accepted", match_id: "demo-open-match", message: "Demo invite accepted." };
  }
  const { data, error } = await supabase.rpc("accept_poker_invite", { p_invite_token: inviteToken });
  if (error) throw error;
  return data;
}

export type PokerMatchPlayer = { seat: 1 | 2; user_id: string | null; display_name: string };
export type PokerMatchWithPlayers = PokerMatch & { players: PokerMatchPlayer[] };

export async function getPokerMatch(matchId: string): Promise<PokerMatchWithPlayers | null> {
  if (demoDataEnabled) return null;
  const { data, error } = await supabase
    .from("poker_matches")
    .select("*, poker_match_players(seat, user_id, display_name)")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { poker_match_players, ...match } = data as unknown as PokerMatch & { poker_match_players: PokerMatchPlayer[] };
  return { ...match, players: poker_match_players ?? [] };
}

export async function getMyActivePokerMatches(): Promise<PokerMatch[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase
    .from("poker_matches")
    .select("*, poker_match_players!inner(user_id)")
    .in("status", ["waiting", "in_progress"])
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PokerMatch[];
}

export async function getMyPokerMatchHistory(): Promise<PokerMatch[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase
    .from("poker_matches")
    .select("*, poker_match_players!inner(user_id)")
    .order("updated_at", { ascending: false })
    .limit(25);
  if (error) throw error;
  return (data ?? []) as unknown as PokerMatch[];
}

export async function getPokerMatchActions(matchId: string): Promise<PokerMatchAction[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase.rpc("get_poker_match_history", { p_match_id: matchId });
  if (error) throw error;
  return (data ?? []) as PokerMatchAction[];
}

export async function updatePokerMatchState(matchId: string, actionType: string, payload: Record<string, unknown>, gameState: Record<string, unknown>, nextTurnUserId?: string | null) {
  if (demoDataEnabled) return gameState;
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

export async function dealPokerMatch(matchId: string) {
  if (demoDataEnabled) return { dealt: true };
  const { data, error } = await supabase.rpc("deal_poker_match", { p_match_id: matchId });
  if (error && !/already dealt/i.test(error.message)) throw error;
  return data;
}

export async function getMyHoleCards(matchId: string): Promise<Card[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase.rpc("get_my_hole_cards", { p_match_id: matchId });
  if (error) throw error;
  return (data ?? []) as Card[];
}

export async function getShowdownHoleCards(
  matchId: string
): Promise<{ user_id: string; seat: number; cards: Card[] }[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase.rpc("get_showdown_hole_cards", { p_match_id: matchId });
  if (error) throw error;
  return (data ?? []) as { user_id: string; seat: number; cards: Card[] }[];
}

export async function revealCommunityStreet(matchId: string, street: "flop" | "turn" | "river" | "showdown"): Promise<Record<string, unknown>> {
  if (demoDataEnabled) return {};
  const { data, error } = await supabase.rpc("reveal_community_street", { p_match_id: matchId, p_street: street });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export function subscribeToPokerMatch(matchId: string, onChange: () => void) {
  if (demoDataEnabled) return { unsubscribe: () => undefined };
  const channel = supabase
    .channel(`poker-match-${matchId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "poker_matches", filter: `id=eq.${matchId}` }, onChange)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "poker_match_actions", filter: `match_id=eq.${matchId}` }, onChange)
    .subscribe();
  return { unsubscribe: () => { supabase.removeChannel(channel); } };
}
