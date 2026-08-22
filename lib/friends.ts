import { supabase, demoDataEnabled } from "./supabase";
import { getCurrentUser } from "./auth";

export type FriendshipStatus = "pending" | "accepted" | "blocked";

export type MemberSearchResult = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  avatar_key: string | null;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  friend: MemberSearchResult;
};

export async function searchMembers(query: string): Promise<MemberSearchResult[]> {
  if (demoDataEnabled) return [];
  if (!query.trim()) return [];
  const { data, error } = await supabase.rpc("search_club_members", { p_query: query });
  if (error) throw error;
  return (data ?? []) as MemberSearchResult[];
}

export async function sendFriendRequest(addresseeId: string) {
  if (demoDataEnabled) return { status: "pending" };
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  const { error } = await supabase.from("poker_friendships").insert({ requester_id: user.id, addressee_id: addresseeId, status: "pending" });
  if (error) throw error;
  return { status: "pending" };
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  if (demoDataEnabled) return;
  if (accept) {
    const { error } = await supabase.from("poker_friendships").update({ status: "accepted" }).eq("id", friendshipId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("poker_friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

export async function removeFriend(friendshipId: string) {
  if (demoDataEnabled) return;
  const { error } = await supabase.from("poker_friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

/**
 * Returns friendships involving the current user, with the OTHER member's profile attached as
 * `friend`. Two queries (as requester / as addressee) because poker_friendships stores a single
 * directional row per pair and either side could be "me".
 */
export async function getMyFriends(status?: FriendshipStatus): Promise<Friendship[]> {
  if (demoDataEnabled) return [];
  const user = await getCurrentUser();
  if (!user) return [];

  let asRequester = supabase.from("poker_friendships").select("*, addressee:profiles!poker_friendships_addressee_id_fkey(id, full_name, avatar_url, avatar_key)").eq("requester_id", user.id);
  let asAddressee = supabase.from("poker_friendships").select("*, requester:profiles!poker_friendships_requester_id_fkey(id, full_name, avatar_url, avatar_key)").eq("addressee_id", user.id);
  if (status) {
    asRequester = asRequester.eq("status", status);
    asAddressee = asAddressee.eq("status", status);
  }

  const [requesterRows, addresseeRows] = await Promise.all([asRequester, asAddressee]);
  if (requesterRows.error) throw requesterRows.error;
  if (addresseeRows.error) throw addresseeRows.error;

  const fromRequester = (requesterRows.data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    friend: row.addressee
  })) as Friendship[];
  const fromAddressee = (addresseeRows.data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    friend: row.requester
  })) as Friendship[];

  return [...fromRequester, ...fromAddressee].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
