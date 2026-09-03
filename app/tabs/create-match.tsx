import { useEffect, useState } from "react";
import { Share, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { LabHeader } from "@/components/DesignSystem";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { resolveAvatarSource } from "@/constants/avatarAssets";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState, ErrorState, LoadingState } from "@/components/StateViews";
import { colors, fonts } from "@/constants/theme";
import { Friendship, MemberSearchResult, getMyFriends, searchMembers, sendFriendRequest } from "@/lib/friends";
import { createFriendPokerMatch, createPokerInvite } from "@/lib/pokerArena";

export default function CreateMatchScreen() {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setFriends(await getMyFriends("accepted"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load friends.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchMembers(query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function addFriend(memberId: string) {
    setBusyId(memberId);
    try {
      await sendFriendRequest(memberId);
      setMessage("Friend request sent.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to send friend request.");
    } finally {
      setBusyId(null);
    }
  }

  async function startMatchWithFriend(friendId: string) {
    setBusyId(friendId);
    try {
      const response = (await createFriendPokerMatch(friendId)) as { match_id?: string; message?: string };
      if (!response?.match_id) throw new Error(response?.message ?? "Unable to create match.");
      router.push({ pathname: "/tabs/live-match/[matchId]", params: { matchId: response.match_id } });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to start match.");
    } finally {
      setBusyId(null);
    }
  }

  async function shareInvite() {
    setBusyId("invite");
    try {
      const response = (await createPokerInvite()) as { url?: string; match_id?: string };
      if (response?.url) await Share.share({ message: `Join my QU Poker practice match: ${response.url}` });
      if (response?.match_id) router.push({ pathname: "/tabs/live-match/[matchId]", params: { matchId: response.match_id } });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to create invite link.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/tabs/dashboard" />
      <LabHeader eyebrow="Friendly practice" title="Create a Match" subtitle="Start a heads-up practice hand against a club friend, or share an invite link." icon="cards-playing-outline" />

      <AppButton accessibilityLabel="Share an invite link to a practice match" icon="link-variant" mode="outlined" disabled={busyId === "invite"} onPress={shareInvite}>
        {busyId === "invite" ? "Creating link..." : "Share invite link"}
      </AppButton>

      <TextInput mode="outlined" label="Find a club member" value={query} onChangeText={setQuery} placeholder="Search by name" />
      {searching ? <LoadingState label="Searching..." /> : null}
      {results.map((member) => (
        <View key={member.id} style={styles.row}>
          <ProfileAvatar name={member.full_name} size={40} source={resolveAvatarSource(member)} />
          <Text style={styles.name}>{member.full_name}</Text>
          <AppButton accessibilityLabel={`Add ${member.full_name} as a friend`} mode="outlined" disabled={busyId === member.id} onPress={() => addFriend(member.id)}>
            {busyId === member.id ? "Sending..." : "Add friend"}
          </AppButton>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Your friends</Text>
      {loading ? (
        <LoadingState label="Loading friends..." />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : friends.length ? (
        friends.map((friendship) => (
          <View key={friendship.id} style={styles.row}>
            <ProfileAvatar name={friendship.friend?.full_name} size={40} source={resolveAvatarSource(friendship.friend)} />
            <Text style={styles.name}>{friendship.friend.full_name}</Text>
            <AppButton accessibilityLabel={`Start a practice match with ${friendship.friend.full_name}`} disabled={busyId === friendship.friend.id} onPress={() => startMatchWithFriend(friendship.friend.id)}>
              {busyId === friendship.friend.id ? "Starting..." : "Play"}
            </AppButton>
          </View>
        ))
      ) : (
        <EmptyState title="No friends yet" body="Search for a club member above and send a friend request to start playing." />
      )}

      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>
        {message}
      </Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontWeight: "900" },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, fontWeight: "900", marginTop: 8 }
});
