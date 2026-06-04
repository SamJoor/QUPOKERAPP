import { supabase, hasSupabaseConfig } from "./supabase";
import { demoEvents } from "./mockData";
import { ClubEvent } from "./types";

export async function getEvents(): Promise<ClubEvent[]> {
  const now = new Date().toISOString();
  if (!hasSupabaseConfig) {
    return demoEvents
      .filter((event) => event.is_active && event.ends_at >= now)
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }
  const { data, error } = await supabase.from("events").select("*").eq("is_active", true).gte("ends_at", now).order("starts_at");
  if (error) throw error;
  return data ?? [];
}

export async function getPastEvents(): Promise<ClubEvent[]> {
  const now = new Date().toISOString();
  if (!hasSupabaseConfig) {
    return demoEvents
      .filter((event) => event.is_active && event.ends_at < now)
      .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
  }
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .lt("ends_at", now)
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getNextEvent(): Promise<ClubEvent | null> {
  const events = await getEvents();
  return events[0] ?? null;
}

export async function getEvent(id: string): Promise<ClubEvent | null> {
  if (!hasSupabaseConfig) return demoEvents.find((event) => event.id === id) ?? null;
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function checkInToEvent(qrToken: string) {
  if (!hasSupabaseConfig) {
    const event = demoEvents.find((item) => item.qr_code_token === qrToken);
    if (!event) return { status: "invalid" as const, event_title: null, points_awarded: 0 };
    return { status: "success" as const, event_title: event.title, points_awarded: event.points_awarded };
  }
  const { data, error } = await supabase.rpc("check_in_event", { p_qr_code_token: qrToken });
  if (error) throw error;
  return data as { status: "success" | "duplicate" | "invalid"; event_title: string | null; points_awarded: number };
}

export async function upsertEvent(event: Partial<ClubEvent>) {
  const { error } = await supabase.from("events").upsert(event);
  if (error) throw error;
}
