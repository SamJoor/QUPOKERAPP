import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AdminHeader } from "@/components/AdminHeader";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { LeaderboardRow } from "@/components/LeaderboardRow";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { ErrorState, LoadingState } from "@/components/StateViews";
import { AdminSummary, getAdminSummary } from "@/lib/admin";

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getAdminSummary().then(setSummary).catch((err) => setError(err instanceof Error ? err.message : "Admin access required."));
  }, []);

  if (error) return <ScreenContainer><BackButton fallback="/profile" /><ErrorState message={error} /></ScreenContainer>;
  if (!summary) return <ScreenContainer><LoadingState label="Loading officer console..." /></ScreenContainer>;

  return (
    <ScreenContainer>
      <BackButton fallback="/profile" />
      <AdminHeader title="Club operations" subtitle="Manage attendance, points, rewards, events, and friendly tournaments." />
      <View style={styles.grid}>
        <StatCard label="Members" value={summary.totalMembers} />
        <StatCard label="Events" value={summary.totalEvents} tone="blue" />
      </View>
      <View style={styles.grid}>
        <StatCard label="Check-ins" value={summary.totalCheckIns} tone="gold" />
        <StatCard label="Pending rewards" value={summary.pendingRedemptions} />
      </View>
      <SectionHeader title="Quick Actions" />
      {[
        ["Events", "/admin/events", "calendar-edit"],
        ["Members", "/admin/members", "account-group-outline"],
        ["Rewards", "/admin/rewards", "gift-outline"],
        ["Points", "/admin/points", "plus-circle-outline"],
        ["Tournaments", "/admin/tournaments", "trophy-outline"]
      ].map(([label, path, icon]) => (
        <AppButton key={label} mode="outlined" icon={icon} onPress={() => router.push(path as never)}>{label}</AppButton>
      ))}
      <SectionHeader title="Top 5" />
      {summary.topFive.map((entry: any) => <LeaderboardRow key={entry.user_id} entry={entry} />)}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ grid: { flexDirection: "row", gap: 12 } });
