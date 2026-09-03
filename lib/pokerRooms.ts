import { supabase } from "./supabase";

/**
 * Custom games. A host opens a room, friends join with the six-character code, and the host
 * deals once at least two people are seated. Codes live in poker_matches.invite_token, so the
 * existing realtime subscription and hole-card RPCs are reused untouched.
 */

export type RoomSeat = {
  seat: number;
  user_id: string | null;
  display_name: string;
  avatar_url?: string | null;
  avatar_key?: string | null;
  is_host: boolean;
};

export type OpenRoom = { match_id: string; room_code: string } | null;

export async function createPokerRoom(): Promise<{ match_id: string; room_code: string }> {
  const { data, error } = await supabase.rpc("create_poker_room");
  if (error) throw error;
  return data as { match_id: string; room_code: string };
}

export async function getMyOpenRoom(): Promise<OpenRoom> {
  const { data, error } = await supabase.rpc("get_my_open_room");
  if (error) throw error;
  const room = data as OpenRoom;
  return room?.match_id ? room : null;
}

export async function joinPokerRoom(code: string): Promise<{ status: string; match_id: string; seat?: number }> {
  const { data, error } = await supabase.rpc("join_poker_room", { p_room_code: code });
  if (error) throw error;
  return data as { status: string; match_id: string; seat?: number };
}

export async function getRoomSeats(matchId: string): Promise<RoomSeat[]> {
  const { data, error } = await supabase.rpc("get_room_seats", { p_match_id: matchId });
  if (error) throw error;
  return (data ?? []) as RoomSeat[];
}

/** Host only. Debits every player's buy-in and returns the seats, the button, and what each
 * seat bought in for, so the caller can seat everyone with their own stack. */
export async function dealPokerTable(
  matchId: string
): Promise<{ button_seat: number; seats: number[]; buy_ins: Record<string, number> }> {
  const { data, error } = await supabase.rpc("deal_poker_table", { p_match_id: matchId });
  if (error) throw error;
  return data as { button_seat: number; seats: number[]; buy_ins: Record<string, number> };
}

/**
 * Returns each player's remaining stack to their chip balance. Safe for anyone at the table to
 * call - the server settles once and tells the rest it is already done - so a client that dies
 * before settling cannot strand everyone's chips.
 */
export async function settlePokerTable(matchId: string): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc("settle_poker_table", { p_match_id: matchId });
  if (error) throw error;
  return data as { status: string };
}

/** Seat-keyed stacks for createTableState, from the buy_ins the deal returned. */
export function stacksFromBuyIns(buyIns: Record<string, number>): Record<number, number> {
  return Object.fromEntries(Object.entries(buyIns ?? {}).map(([seat, amount]) => [Number(seat), amount]));
}
