import { supabase, demoDataEnabled } from "./supabase";
import { demoTournaments } from "./mockData";
import { Tournament } from "./types";

export type TournamentRegistration = {
  user_id: string;
  full_name: string;
  status: string;
  table_number?: number | null;
  seat_number?: number | null;
  created_at: string;
};

export type MyTournamentRegistration = {
  id: string;
  tournament_id: string;
  user_id: string;
  status: string;
  table_number?: number | null;
  seat_number?: number | null;
  created_at: string;
  tournaments?: Tournament | null;
};

export type TournamentRegistrationResponse = {
  status: string;
  registration_id?: string | null;
  table_number?: number | null;
  seat_number?: number | null;
};

export type TournamentResult = {
  user_id: string;
  full_name: string;
  placement: number;
  points_awarded: number;
  created_at: string;
};

export type TournamentOverview = Tournament & {
  registered_count: number;
  result_count: number;
};

export type TournamentTableSeat = {
  table_id: string;
  table_number: number;
  max_seats: number;
  seat_number: number;
  user_id: string;
  full_name: string;
  status: string;
};

export async function getTournaments(): Promise<Tournament[]> {
  if (demoDataEnabled) return demoTournaments;
  const { data, error } = await supabase.from("tournaments").select("*").order("starts_at");
  if (error) throw error;
  return data ?? [];
}

export async function getTournamentOverview(): Promise<TournamentOverview[]> {
  if (demoDataEnabled) {
    return demoTournaments.map((tournament) => ({
      ...tournament,
      registered_count: tournament.status === "registration_open" ? 12 : 0,
      result_count: tournament.status === "completed" ? 3 : 0
    }));
  }
  const { data, error } = await supabase.rpc("get_tournament_overview");
  if (error) throw error;
  return (data ?? []) as TournamentOverview[];
}

export async function getTournament(id: string): Promise<Tournament | null> {
  if (demoDataEnabled) return demoTournaments.find((item) => item.id === id) ?? null;
  const { data, error } = await supabase.from("tournaments").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function registerForTournament(tournamentId: string): Promise<TournamentRegistrationResponse> {
  if (demoDataEnabled) return { status: "registered", registration_id: tournamentId, table_number: 1, seat_number: 1 };
  const { data, error } = await supabase.rpc("register_for_tournament", { p_tournament_id: tournamentId });
  if (error) {
    const details = [error.message, error.details, error.hint].filter(Boolean).join(" ");
    throw new Error(details || "Unable to register for tournament.");
  }
  return (Array.isArray(data) ? data[0] : data) as TournamentRegistrationResponse;
}

export async function getTournamentRegistrationsPublic(tournamentId: string): Promise<TournamentRegistration[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase.rpc("get_tournament_registrations_public", { p_tournament_id: tournamentId });
  if (error) {
    if (error.message?.toLowerCase().includes("function")) return [];
    throw error;
  }
  return (data ?? []) as TournamentRegistration[];
}

export async function getTournamentResultsPublic(tournamentId: string): Promise<TournamentResult[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase.rpc("get_tournament_results_public", { p_tournament_id: tournamentId });
  if (error) {
    if (error.message?.toLowerCase().includes("function")) return [];
    throw error;
  }
  return (data ?? []) as TournamentResult[];
}

export async function getTournamentTableSeats(tournamentId: string): Promise<TournamentTableSeat[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase.rpc("get_tournament_table_seats", { p_tournament_id: tournamentId });
  if (error) {
    if (error.message?.toLowerCase().includes("function")) return [];
    throw error;
  }
  return (data ?? []) as TournamentTableSeat[];
}

export async function getMyTournamentRegistrations(): Promise<MyTournamentRegistration[]> {
  if (demoDataEnabled) return [];
  const { data, error } = await supabase
    .from("tournament_registrations")
    .select("*, tournaments(*)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as MyTournamentRegistration[];
  const withSeats = await Promise.all(rows.map(async (row) => {
    const seats = await getTournamentTableSeats(row.tournament_id);
    const mySeat = seats.find((seat) => seat.user_id === row.user_id);
    return { ...row, table_number: mySeat?.table_number ?? null, seat_number: mySeat?.seat_number ?? null };
  }));
  return withSeats;
}
