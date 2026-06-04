import { supabase, hasSupabaseConfig } from "./supabase";
import { demoProfile } from "./mockData";
import { Profile } from "./types";

export async function getCurrentUser() {
  if (!hasSupabaseConfig) return { id: demoProfile.id, email: demoProfile.email };
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getCurrentSession() {
  if (!hasSupabaseConfig) return { user: { id: demoProfile.id, email: demoProfile.email } };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (!hasSupabaseConfig) return demoProfile;
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  if (!hasSupabaseConfig) return;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string, fullName: string) {
  if (!hasSupabaseConfig) {
    return {
      user: { ...demoProfile, id: "demo-user", email, full_name: fullName },
      session: { user: { id: "demo-user", email } }
    };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function resetPassword(email: string) {
  if (!hasSupabaseConfig) return;
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function signOut() {
  if (!hasSupabaseConfig) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function upsertProfile(input: Partial<Profile> & { id: string; email: string; full_name: string }) {
  if (!hasSupabaseConfig) return;
  const { id, email, full_name, student_id, graduation_year, major, avatar_url } = input;
  const { error } = await supabase.from("profiles").upsert({
    id,
    email,
    full_name,
    student_id,
    graduation_year,
    major,
    avatar_url
  });
  if (error) throw error;
}

export async function updateOwnProfile(input: {
  full_name: string;
  student_id?: string | null;
  graduation_year?: number | null;
  major?: string | null;
  avatar_url?: string | null;
}) {
  if (!hasSupabaseConfig) return;
  const { error } = await supabase.rpc("update_own_profile", {
    p_full_name: input.full_name,
    p_student_id: input.student_id ?? null,
    p_graduation_year: input.graduation_year ?? null,
    p_major: input.major ?? null,
    p_avatar_url: input.avatar_url ?? null
  });
  if (error) throw error;
}

export async function uploadProfileAvatar(userId: string, uri: string) {
  if (!hasSupabaseConfig) return uri;
  const extension = uri.split(".").pop()?.split("?")[0] || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  const { error } = await supabase.storage.from("profile-avatars").upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: true
  });
  if (error) throw error;
  const { data } = supabase.storage.from("profile-avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin") throw new Error("Admin access required.");
  return profile;
}
