export type Role = "member" | "admin";
export type EventType = "meeting" | "tournament" | "philanthropy" | "social" | "workshop";
export type PointsSource =
  | "attendance"
  | "philanthropy"
  | "tournament"
  | "admin_adjustment"
  | "reward_redemption"
  | "daily_practice"
  | "bonus";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  student_id?: string | null;
  graduation_year?: number | null;
  major?: string | null;
  avatar_url?: string | null;
  avatar_key?: string | null;
  role: Role;
  total_points: number;
  lifetime_points: number;
  spendable_points: number;
  created_at: string;
  updated_at: string;
};

export type ClubEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string;
  event_type: EventType;
  points_awarded: number;
  /** Admin-only. Members cannot read this column (migration 019), so it is absent
   * from anything fetched through lib/events.ts. */
  qr_code_token?: string;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type Reward = {
  id: string;
  title: string;
  description: string;
  cost_points: number;
  reward_type: "tournament_entry" | "round_boost" | "gift_card" | "custom_chip" | "merch" | "recognition";
  image_url?: string | null;
  stock?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Tournament = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  max_players: number;
  entry_cost_points?: number | null;
  reward_points_first: number;
  reward_points_second: number;
  reward_points_third: number;
  status: "upcoming" | "registration_open" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
};

export type LedgerEntry = {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  source_type: PointsSource;
  source_id?: string | null;
  created_by?: string | null;
  created_at: string;
};

export type LeaderboardEntry = {
  user_id: string;
  full_name: string;
  email?: string | null;
  avatar_url?: string | null;
  avatar_key?: string | null;
  total_points: number;
  daily_wins?: number;
  rank: number;
  movement?: "up" | "down" | "steady";
};

export type MemberContactCard = {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  avatar_key?: string | null;
};

export type PublicMemberProfile = {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  avatar_key?: string | null;
  major?: string | null;
  graduation_year?: number | null;
  total_points: number;
  all_time_rank: number;
  joined_at: string;
};
