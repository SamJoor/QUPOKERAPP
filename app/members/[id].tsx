import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Avatar, Text } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { StatCard } from "@/components/StatCard";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { colors, disclaimer } from "@/constants/theme";
import { getPublicMemberProfile } from "@/lib/leaderboard";
import { PublicMemberProfile } from "@/lib/types";

export default function PublicMemberProfileScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const memberId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [profile, setProfile] = useState<PublicMemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!memberId) {
      setError("Member profile link is missing an ID.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const row = await getPublicMemberProfile(memberId);
      if (!row) {
        setError("Member profile not found.");
        return;
      }
      setProfile(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load member profile.");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <ScreenContainer>
        <BackButton fallback="/tabs/leaderboard" />
        <LoadingState label="Loading member profile..." />
      </ScreenContainer>
    );
  }

  if (error || !profile) {
    return (
      <ScreenContainer>
        <BackButton fallback="/tabs/leaderboard" />
        <ErrorState message={error || "Member profile not found."} onRetry={load} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/tabs/leaderboard" />
      <View style={styles.header}>
        <Avatar.Text size={78} label={profile.full_name.slice(0, 2).toUpperCase()} style={styles.avatar} labelStyle={styles.avatarText} />
        <Text style={styles.name}>{profile.full_name}</Text>
        <Text style={styles.meta}>
          {profile.major ?? "Club member"}{profile.graduation_year ? ` | Class of ${profile.graduation_year}` : ""}
        </Text>
      </View>
      <View style={styles.stats}>
        <StatCard label="Lifetime points" value={profile.total_points} tone="gold" />
        <StatCard label="All-time rank" value={`#${profile.all_time_rank}`} />
      </View>
      <View style={styles.joinedCard}>
        <Text style={styles.joinedLabel}>Joined</Text>
        <Text style={styles.joinedValue}>{new Date(profile.joined_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</Text>
      </View>
      <Text style={styles.copy}>Public profiles show club engagement only. Email and student ID stay private.</Text>
      <AppButton mode="outlined" icon="arrow-left" onPress={() => router.back()}>Back to Leaderboard</AppButton>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: 8, paddingVertical: 10 },
  avatar: { backgroundColor: colors.greenSoft },
  avatarText: { color: colors.green, fontWeight: "900" },
  name: { color: colors.text, fontSize: 30, fontWeight: "900", textAlign: "center" },
  meta: { color: colors.muted, textAlign: "center", lineHeight: 20 },
  stats: { flexDirection: "row", gap: 12 },
  joinedCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16 },
  joinedLabel: { color: colors.muted, fontWeight: "700" },
  joinedValue: { color: colors.blue, fontSize: 18, fontWeight: "900" },
  copy: { color: colors.muted, lineHeight: 21 },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
