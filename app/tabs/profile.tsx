import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Snackbar, Text } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { resolveAvatarSource } from "@/constants/avatarAssets";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState, LoadingState } from "@/components/StateViews";
import { colors, fonts } from "@/constants/theme";
import { getCurrentProfile } from "@/lib/auth";
import { Friendship, getMyFriends, respondToFriendRequest } from "@/lib/friends";
import { Profile } from "@/lib/types";

export default function ProfileTabScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRow, accepted, pendingRows] = await Promise.all([getCurrentProfile(), getMyFriends("accepted"), getMyFriends("pending")]);
      setProfile(profileRow);
      setFriends(accepted);
      setPending(pendingRows.filter((row) => row.addressee_id === profileRow?.id));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to load your friends.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function respond(friendshipId: string, accept: boolean) {
    setBusyId(friendshipId);
    try {
      await respondToFriendRequest(friendshipId, accept);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to update that request.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Loading your social profile..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false}>
      <LinearGradient colors={["#22252a", "#11151b", "#05070a"]} locations={[0, 0.45, 1]} style={styles.screen}>
        <View style={styles.header}>
          <ProfileAvatar active size={72} source={resolveAvatarSource(profile)} />
          <Text style={styles.title}>{profile?.full_name ?? "Member"}</Text>
          <Text style={styles.subtitle}>Social profile</Text>
          <AppButton accessibilityLabel="Find and add club members" mode="outlined" icon="account-search-outline" onPress={() => router.push("/tabs/create-match")}>
            Find members
          </AppButton>
        </View>

        {pending.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friend requests</Text>
            {pending.map((request) => (
              <View key={request.id} style={styles.requestRow}>
                <ProfileAvatar size={44} source={resolveAvatarSource(request.friend)} />
                <Text style={styles.friendRowName}>{request.friend.full_name}</Text>
                <View style={styles.requestActions}>
                  <AppButton accessibilityLabel={`Accept ${request.friend.full_name}'s friend request`} disabled={busyId === request.id} onPress={() => respond(request.id, true)}>
                    {busyId === request.id ? "..." : "Accept"}
                  </AppButton>
                  <AppButton accessibilityLabel={`Decline ${request.friend.full_name}'s friend request`} mode="outlined" disabled={busyId === request.id} onPress={() => respond(request.id, false)}>
                    Decline
                  </AppButton>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friends</Text>
          {friends.length ? (
            <View style={styles.friendRow}>
              {friends.map((friendship) => (
                <Pressable
                  accessibilityLabel={`View ${friendship.friend.full_name}'s profile`}
                  key={friendship.id}
                  onPress={() => router.push(`/members/${friendship.friend.id}`)}
                  style={({ pressed }) => [styles.friendItem, pressed && styles.pressed]}
                >
                  <ProfileAvatar size={58} source={resolveAvatarSource(friendship.friend)} />
                  <Text style={styles.friendName}>{friendship.friend.full_name}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState title="No friends yet" body="Search for club members and send friend requests to start building your table." />
          )}
        </View>
      </LinearGradient>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>
        {message}
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    minHeight: 780,
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 150,
    gap: 32
  },
  header: {
    alignItems: "center",
    gap: 12
  },
  title: {
    color: colors.text,
    marginTop: 18,
    fontSize: 30,
    fontFamily: fonts.heading,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700"
  },
  section: { gap: 14 },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 16, fontWeight: "900" },
  requestRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  requestActions: { flexDirection: "row", gap: 8 },
  friendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20
  },
  friendRowName: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontWeight: "900" },
  friendItem: {
    alignItems: "center",
    gap: 9,
    width: 76
  },
  friendName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  pressed: {
    opacity: 0.72
  }
});
