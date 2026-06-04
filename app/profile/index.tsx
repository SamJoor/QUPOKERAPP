import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Avatar, Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { LoadingState } from "@/components/StateViews";
import { colors, disclaimer } from "@/constants/theme";
import { getCurrentProfile, signOut, updateOwnProfile, uploadProfileAvatar } from "@/lib/auth";
import { getMyPointHistory } from "@/lib/points";
import { getMyRewardRedemptions, RewardRedemption } from "@/lib/rewards";
import { LedgerEntry, Profile } from "@/lib/types";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [major, setMajor] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const activeProfile = await getCurrentProfile();
    setProfile(activeProfile);
    setFullName(activeProfile?.full_name ?? "");
    setStudentId(activeProfile?.student_id ?? "");
    setGraduationYear(activeProfile?.graduation_year ? String(activeProfile.graduation_year) : "");
    setMajor(activeProfile?.major ?? "");
    setAvatarUrl(activeProfile?.avatar_url ?? null);
    if (activeProfile) {
      const [pointRows, redemptionRows] = await Promise.all([getMyPointHistory(activeProfile.id), getMyRewardRedemptions()]);
      setHistory(pointRows);
      setRedemptions(redemptionRows);
    }
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load profile."));
  }, []);

  async function saveProfile() {
    try {
      if (!studentId.trim()) {
        setMessage("QU Student ID is required to verify club membership.");
        return;
      }
      await updateOwnProfile({
        full_name: fullName,
        student_id: studentId.trim(),
        graduation_year: graduationYear ? Number(graduationYear) : null,
        major: major || null,
        avatar_url: avatarUrl
      });
      setEditing(false);
      setMessage("Profile updated.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update profile.");
    }
  }

  async function chooseAvatar() {
    if (!profile) return;
    setUploadingAvatar(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82
      });
      if (result.canceled) return;
      const publicUrl = await uploadProfileAvatar(profile.id, result.assets[0].uri);
      setAvatarUrl(publicUrl);
      await updateOwnProfile({
        full_name: fullName,
        student_id: studentId,
        graduation_year: graduationYear ? Number(graduationYear) : null,
        major: major || null,
        avatar_url: publicUrl
      });
      setMessage("Profile photo updated.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update profile photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (!profile) return <ScreenContainer><LoadingState label="Loading profile..." /></ScreenContainer>;

  return (
    <ScreenContainer>
      <BackButton fallback="/tabs/dashboard" />
      {avatarUrl ? (
        <Avatar.Image size={72} source={{ uri: avatarUrl }} style={styles.avatar} />
      ) : (
        <Avatar.Text size={72} label={profile.full_name.slice(0, 2).toUpperCase()} style={styles.avatar} labelStyle={styles.avatarText} />
      )}
      <Text style={styles.name}>{profile.full_name}</Text>
      <Text style={styles.email}>{profile.email}</Text>
      <AppButton mode="outlined" icon="camera-outline" onPress={chooseAvatar} disabled={uploadingAvatar}>
        {uploadingAvatar ? "Updating Photo..." : "Update Profile Photo"}
      </AppButton>
      <View style={styles.stats}>
        <StatCard label="Lifetime points" value={profile.lifetime_points ?? profile.total_points} tone="gold" />
        <StatCard label="Spendable points" value={profile.spendable_points ?? profile.total_points} />
      </View>
      {editing ? (
        <View style={styles.form}>
          <TextInput mode="outlined" label="Full name" value={fullName} onChangeText={setFullName} />
          <TextInput mode="outlined" label="QU Student ID" value={studentId} onChangeText={setStudentId} />
          <TextInput mode="outlined" label="Graduation year optional" value={graduationYear} onChangeText={setGraduationYear} keyboardType="number-pad" />
          <TextInput mode="outlined" label="Major optional" value={major} onChangeText={setMajor} />
          <AppButton icon="content-save-outline" onPress={saveProfile} disabled={!fullName || !studentId}>Save Profile</AppButton>
          <AppButton mode="outlined" onPress={() => setEditing(false)}>Cancel</AppButton>
        </View>
      ) : (
        <>
          <Text style={styles.copy}>Major: {profile.major ?? "Not set"}</Text>
          <Text style={styles.copy}>Graduation year: {profile.graduation_year ?? "Not set"}</Text>
          <AppButton mode="outlined" icon="account-edit-outline" onPress={() => setEditing(true)}>Edit Profile</AppButton>
        </>
      )}
      <SectionHeader title="Point History" />
      {history.slice(0, 8).map((entry) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{entry.reason}</Text>
            <Text style={styles.rowMeta}>{new Date(entry.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={[styles.points, entry.points < 0 && styles.negative]}>{entry.points > 0 ? "+" : ""}{entry.points}</Text>
        </View>
      ))}
      <SectionHeader title="Reward Redemptions" />
      {redemptions.length ? redemptions.slice(0, 6).map((redemption) => (
        <View key={redemption.id} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{redemption.rewards?.title ?? "Reward"}</Text>
            <Text style={styles.rowMeta}>{redemption.status} - {redemption.points_spent} pts</Text>
          </View>
        </View>
      )) : <Text style={styles.copy}>No redemptions yet.</Text>}
      {profile.role === "admin" ? <AppButton icon="shield-account-outline" onPress={() => router.push("/admin")}>Officer Console</AppButton> : null}
      <AppButton mode="outlined" icon="information-outline" onPress={() => router.push("/about")}>About & Rules</AppButton>
      <AppButton mode="outlined" icon="logout" onPress={async () => { await signOut(); router.replace("/"); }}>Log Out</AppButton>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.greenSoft },
  avatarText: { color: colors.green, fontWeight: "900" },
  name: { color: colors.text, fontSize: 30, fontWeight: "900" },
  email: { color: colors.muted },
  copy: { color: colors.text, fontWeight: "700" },
  stats: { flexDirection: "row", gap: 12 },
  form: { gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { color: colors.text, fontWeight: "800" },
  rowMeta: { color: colors.muted, fontSize: 12 },
  points: { color: colors.green, fontWeight: "900", fontSize: 18 },
  negative: { color: colors.red },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
