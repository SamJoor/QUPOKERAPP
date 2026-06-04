import { ClubEvent, LeaderboardEntry, LedgerEntry, Profile, Reward, Tournament } from "./types";

export const demoProfile: Profile = {
  id: "demo-user",
  full_name: "Alex Quinn",
  email: "alex@qu.edu",
  student_id: null,
  graduation_year: 2027,
  major: "Finance",
  avatar_url: null,
  role: "admin",
  total_points: 420,
  lifetime_points: 520,
  spendable_points: 420,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const demoEvents: ClubEvent[] = [
  {
    id: "event-1",
    title: "Opening Strategy Night",
    description: "Meet the club, learn hand ranges, and run through non-gambling practice spots.",
    location: "Student Center 214",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: new Date(Date.now() + 93600000).toISOString(),
    event_type: "meeting",
    points_awarded: 25,
    qr_code_token: "opening-strategy-night",
    is_active: true,
    created_by: "demo-user",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "event-2",
    title: "Philanthropy Chip Count",
    description: "Help run a campus service fundraiser and earn club engagement points.",
    location: "Carl Hansen Lobby",
    starts_at: new Date(Date.now() + 4 * 86400000).toISOString(),
    ends_at: new Date(Date.now() + 4 * 86400000 + 7200000).toISOString(),
    event_type: "philanthropy",
    points_awarded: 40,
    qr_code_token: "philanthropy-chip-count",
    is_active: true,
    created_by: "demo-user",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const demoRewards: Reward[] = [
  {
    id: "reward-1",
    title: "Friendly Tournament Entry",
    description: "Use points for a seat in a club-approved non-gambling tournament.",
    cost_points: 100,
    reward_type: "tournament_entry",
    stock: 24,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: "reward-2",
    title: "Custom Club Chip",
    description: "A keepsake chip with no cash value, made for active members.",
    cost_points: 250,
    reward_type: "custom_chip",
    stock: 15,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const demoLeaderboard: LeaderboardEntry[] = [
  { user_id: "1", full_name: "Maya Chen", total_points: 820, rank: 1 },
  { user_id: "2", full_name: "Jordan Lee", total_points: 690, rank: 2 },
  { user_id: "demo-user", full_name: "Alex Quinn", total_points: 420, rank: 3 },
  { user_id: "4", full_name: "Sam Patel", total_points: 380, rank: 4 },
  { user_id: "5", full_name: "Nia Brooks", total_points: 330, rank: 5 }
];

export const demoLedger: LedgerEntry[] = [
  {
    id: "ledger-1",
    user_id: "demo-user",
    points: 25,
    reason: "Checked into Opening Strategy Night",
    source_type: "attendance",
    source_id: "event-1",
    created_at: new Date().toISOString()
  },
  {
    id: "ledger-2",
    user_id: "demo-user",
    points: 10,
    reason: "Daily strategy trainer practice",
    source_type: "daily_practice",
    source_id: null,
    created_at: new Date().toISOString()
  }
];

export const demoTournaments: Tournament[] = [
  {
    id: "tournament-1",
    title: "Thursday Friendly Final Table",
    description: "A no-cash-value club tournament focused on table talk, position, and hand reading.",
    starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    max_players: 32,
    entry_cost_points: 100,
    reward_points_first: 150,
    reward_points_second: 100,
    reward_points_third: 50,
    status: "registration_open",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];
