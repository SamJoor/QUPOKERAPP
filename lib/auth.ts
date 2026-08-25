import * as Linking from "expo-linking";
import { supabase, demoDataEnabled } from "./supabase";
import { demoProfile } from "./mockData";
import { Profile } from "./types";

export async function getCurrentUser() {
  if (demoDataEnabled) return { id: demoProfile.id, email: demoProfile.email };
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getCurrentSession() {
  if (demoDataEnabled) return { user: { id: demoProfile.id, email: demoProfile.email } };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  if (demoDataEnabled) return demoProfile;
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  if (demoDataEnabled) return;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string, fullName: string) {
  if (demoDataEnabled) {
    return {
      user: { ...demoProfile, id: "demo-user", email, full_name: fullName },
      session: { user: { id: "demo-user", email } }
    };
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      // Without this the confirmation link falls back to the project Site URL, which strands
      // mobile users in a browser instead of returning them to the app. Mirrors resetPassword.
      emailRedirectTo: Linking.createURL("/auth/confirm")
    }
  });
  if (error) throw error;
  if (data.session?.user) {
    await upsertProfile({
      id: data.session.user.id,
      email: data.session.user.email ?? email,
      full_name: fullName
    });
  }
  return { user: data.user, session: data.session };
}

export async function resetPassword(email: string) {
  if (demoDataEnabled) return;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: Linking.createURL("/auth/update-password")
  });
  if (error) throw error;
}

/** Returns true only when a session actually exists afterwards. Callers gate their
 * submit button on this: returning void made "no token in the URL" indistinguishable
 * from success, so the screen enabled itself and Supabase later threw AuthSessionMissing. */
export async function establishSessionFromUrl(url: string | null): Promise<boolean> {
  if (demoDataEnabled) return true;
  if (!url) return false;

  const parsed = new URL(url);
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  const queryParams = parsed.searchParams;
  const accessToken = hashParams.get("access_token") ?? queryParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token") ?? queryParams.get("refresh_token");
  const code = queryParams.get("code") ?? hashParams.get("code");

  // Supabase reports a rejected link by redirecting WITH the error in the fragment rather
  // than failing the request. Without this the screen fell through to "no token found" and
  // surfaced Supabase's internal AuthSessionMissingError, which says nothing useful.
  // A single-use link that a mail scanner already fetched lands here as otp_expired.
  const errorCode = hashParams.get("error_code") ?? queryParams.get("error_code");
  const errorDescription = hashParams.get("error_description") ?? queryParams.get("error_description");
  if (errorCode || errorDescription) {
    throw new Error(errorDescription || `This link was rejected (${errorCode}).`);
  }

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) throw error;
    return true;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return true;
  }

  return false;
}

/** A recovery link is not the only way onto the password screen - an already signed-in
 * user can reach it too, and they have a perfectly good session. */
export async function hasSession(): Promise<boolean> {
  if (demoDataEnabled) return true;
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session);
}

export async function updatePassword(password: string) {
  if (demoDataEnabled) return;
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  if (demoDataEnabled) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function upsertProfile(input: Partial<Profile> & { id: string; email: string; full_name: string }) {
  if (demoDataEnabled) return;
  const { id, email, full_name, student_id, graduation_year, major, avatar_url, avatar_key } = input;
  const { error } = await supabase.from("profiles").upsert({
    id,
    email,
    full_name,
    student_id,
    graduation_year,
    major,
    avatar_url,
    avatar_key
  });
  if (error) throw error;
}

export async function updateOwnProfile(input: {
  full_name: string;
  student_id?: string | null;
  graduation_year?: number | null;
  major?: string | null;
  avatar_url?: string | null;
  avatar_key?: string | null;
}) {
  if (demoDataEnabled) return;
  const { error } = await supabase.rpc("update_own_profile", {
    p_full_name: input.full_name,
    p_student_id: input.student_id ?? null,
    p_graduation_year: input.graduation_year ?? null,
    p_major: input.major ?? null,
    p_avatar_url: input.avatar_url ?? null,
    p_avatar_key: input.avatar_key ?? null
  });
  if (error) throw error;
}

export async function uploadProfileAvatar(userId: string, uri: string) {
  if (demoDataEnabled) return uri;
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
