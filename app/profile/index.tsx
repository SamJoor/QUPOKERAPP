import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Dialog, Portal, Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { LabHeader, LabPanel, MissionTile } from "@/components/DesignSystem";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ScreenContainer } from "@/components/ScreenContainer";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { LoadingState } from "@/components/StateViews";
import { avatarKeys, avatarLibrary, AvatarKey, resolveAvatarSource } from "@/constants/avatarAssets";
import { colors, disclaimer } from "@/constants/theme";
import { deleteOwnAccount, getCurrentProfile, signOut, updateOwnProfile, uploadProfileAvatar } from "@/lib/auth";
import { getMyPointHistory } from "@/lib/points";
import { getMyRewardRedemptions, RewardRedemption } from "@/lib/rewards";
import { LedgerEntry, Profile } from "@/lib/types";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [redemptions, setRedemptions] = useState<RewardRedemption[]>([]);
  const [editing, setEditing] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [major, setMajor] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
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
    setAvatarKey(activeProfile?.avatar_key ?? null);
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
        avatar_url: avatarUrl,
        avatar_key: avatarKey
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
      setAvatarKey(null);
      await updateOwnProfile({
        full_name: fullName,
        student_id: studentId,
        graduation_year: graduationYear ? Number(graduationYear) : null,
        major: major || null,
        avatar_url: publicUrl,
        avatar_key: null
      });
      setMessage("Profile photo updated.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update profile photo.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function chooseStockAvatar(key: AvatarKey) {
    if (!profile || key === avatarKey) return;
    setAvatarUrl(null);
    setAvatarKey(key);
    try {
      await updateOwnProfile({
        full_name: fullName,
        student_id: studentId,
        graduation_year: graduationYear ? Number(graduationYear) : null,
        major: major || null,
        avatar_url: null,
        avatar_key: key
      });
      setMessage("Club avatar updated.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update club avatar.");
    }
  }

  if (!profile) return <ScreenContainer><LoadingState label="Loading profile..." /></ScreenContainer>;

  return (
    <ScreenContainer>
      <BackButton fallback="/tabs/dashboard" />
      <LabHeader eyebrow="Member profile" title={profile.full_name.split(" ")[0] || "Profile"} subtitle={profile.email} icon="account-star" right={
        <ProfileAvatar name={profile.full_name} size={58} source={resolveAvatarSource({ full_name: profile.full_name, avatar_url: avatarUrl, avatar_key: avatarKey })} />
      } />
      <MissionTile icon="camera-outline" title={uploadingAvatar ? "Updating photo..." : "Profile photo"} body="Add a face to your leaderboard and member profile." badge="Edit" onPress={chooseAvatar} />
      <Text style={styles.pickerLabel}>Or pick a club avatar</Text>
      <View style={styles.avatarPicker}>
        {avatarKeys.map((key) => {
          const selected = avatarKey === key && !avatarUrl;
          return (
            <Pressable key={key} accessibilityLabel={`Use the ${key} club avatar`} onPress={() => chooseStockAvatar(key)} style={[styles.avatarOption, selected && styles.avatarOptionSelected]}>
              <ProfileAvatar size={56} source={avatarLibrary[key]} />
            </Pressable>
          );
        })}
      </View>
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
        <LabPanel>
          <Text style={styles.copy}>Major: {profile.major ?? "Not set"}</Text>
          <Text style={styles.copy}>Graduation year: {profile.graduation_year ?? "Not set"}</Text>
          <AppButton mode="outlined" icon="account-edit-outline" onPress={() => setEditing(true)}>Edit Profile</AppButton>
        </LabPanel>
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
      <AppButton mode="text" icon="account-remove-outline" color={colors.red} onPress={() => setDeleteVisible(true)}>
        Delete Account
      </AppButton>
      <Text style={styles.disclaimer}>{disclaimer}</Text>
      <Portal>
        <Dialog visible={deleteVisible} onDismiss={() => setDeleteVisible(false)} style={styles.deleteDialog}>
          <Dialog.Title style={styles.deleteTitle}>Delete your account?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.deleteBody}>
              This permanently removes your profile, points, check-ins and redemptions. It cannot be
              undone, and your points cannot be restored if you sign up again.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <AppButton mode="text" onPress={() => setDeleteVisible(false)}>Cancel</AppButton>
            <AppButton
              mode="text"
              color={colors.red}
              disabled={deleting}
              onPress={async () => {
                setDeleting(true);
                try {
                  await deleteOwnAccount();
                  setDeleteVisible(false);
                  router.replace("/");
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : "Unable to delete your account.");
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AppButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  deleteDialog: { backgroundColor: colors.surface, borderRadius: 22, borderColor: colors.border, borderWidth: 1 },
  deleteTitle: { color: colors.text, fontWeight: "900" },
  deleteBody: { color: colors.muted, lineHeight: 21 },
  pickerLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  avatarPicker: { flexDirection: "row", gap: 12 },
  avatarOption: { padding: 4, borderRadius: 999, borderWidth: 2, borderColor: "transparent" },
  avatarOptionSelected: { borderColor: colors.lime },
  name: { color: colors.text, fontSize: 30, fontWeight: "900" },
  email: { color: colors.muted },
  copy: { color: colors.text, fontWeight: "700" },
  stats: { flexDirection: "row", gap: 12 },
  form: { gap: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { color: colors.text, fontWeight: "800" },
  rowMeta: { color: colors.muted, fontSize: 12 },
  points: { color: colors.gold, fontWeight: "900", fontSize: 18 },
  negative: { color: colors.red },
  disclaimer: { color: colors.muted, fontSize: 12, lineHeight: 17 }
});
