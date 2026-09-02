import { useCallback, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Snackbar, Text } from "react-native-paper";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/StateViews";
import { resolveAvatarSource } from "@/constants/avatarAssets";
import { colors } from "@/constants/theme";
import { useEventPoints } from "@/contexts/EventPointsContext";
import { getCurrentProfile } from "@/lib/auth";
import { Friendship, getMyFriends, respondToFriendRequest } from "@/lib/friends";
import { Profile } from "@/lib/types";

const homeFont = Platform.OS === "ios" ? "System" : "InstrumentSans_400Regular";
const homeMediumFont = Platform.OS === "ios" ? "System" : "InstrumentSans_500Medium";

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function getProfileNameParts(fullName?: string | null) {
  const [firstName = "Member", ...lastNames] = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: firstName.toLowerCase(),
    lastName: lastNames.join(" ").toUpperCase()
  };
}

function ClubPointMark({ size = 20 }: { size?: number }) {
  return (
    <View style={[styles.clubPointMark, { width: size, height: size }]}>
      <MaterialCommunityIcons color="#4ac7f4" name="hexagon-outline" size={size} />
      <MaterialCommunityIcons color="#4ac7f4" name="cards-club" size={Math.round(size * 0.44)} style={styles.clubPointGlyph} />
    </View>
  );
}

function SectionHeading({ count, title }: { count?: number; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {typeof count === "number" ? <Text style={styles.sectionCount}>{String(count).padStart(2, "0")}</Text> : null}
    </View>
  );
}

export default function ProfileTabScreen() {
  const { eventPoints } = useEventPoints();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const friendsSectionY = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRow, accepted, pendingRows] = await Promise.all([
        getCurrentProfile(),
        getMyFriends("accepted"),
        getMyFriends("pending")
      ]);
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

  const name = getProfileNameParts(profile?.full_name);

  return (
    <ScreenContainer fill padded={false} scroll={false}>
      <View style={styles.profileShell}>
        <ScrollView
          contentContainerStyle={styles.profileScrollContent}
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.profileScroll}
        >
          <View style={styles.profileScreen}>
            <View style={styles.topBarSpacer} />

            {loading ? (
              <View style={styles.loadingWrap}>
                <LoadingState label="Loading your social profile..." />
              </View>
            ) : (
              <>
                <View style={styles.identity}>
                  <Pressable
                    accessibilityLabel="Edit profile photo and account details"
                    accessibilityRole="button"
                    onPress={() => router.push("/profile")}
                    style={({ pressed }) => [styles.avatarAction, pressed && styles.pressed]}
                  >
                    <ProfileAvatar edgeToEdge size={122} source={resolveAvatarSource(profile)} />
                    <View style={styles.editBadge}>
                      <MaterialCommunityIcons color="#050608" name="pencil" size={17} />
                    </View>
                  </Pressable>
                  <Text numberOfLines={1} style={styles.firstName}>{name.firstName}</Text>
                  {name.lastName ? <Text numberOfLines={1} style={styles.lastName}>{name.lastName}</Text> : null}
                  <Text numberOfLines={1} style={styles.email}>{profile?.email ?? ""}</Text>
                </View>

                <View style={styles.socialActions}>
                  <Pressable
                    accessibilityLabel={`View ${friends.length} friends`}
                    accessibilityRole="button"
                    onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, friendsSectionY.current - 70), animated: true })}
                    style={({ pressed }) => [styles.socialAction, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons color="rgba(247,248,250,0.76)" name="account-multiple-outline" size={24} />
                    <View style={styles.socialActionCopy}>
                      <Text style={styles.socialActionValue}>{friends.length}</Text>
                      <Text style={styles.socialActionLabel}>Friends</Text>
                    </View>
                    <MaterialCommunityIcons color="rgba(143,152,165,0.62)" name="chevron-right" size={24} />
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Find and add club members"
                    accessibilityRole="button"
                    onPress={() => router.push("/tabs/create-match")}
                    style={({ pressed }) => [styles.socialAction, styles.addFriendsAction, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons color="#050608" name="account-plus-outline" size={22} />
                    <Text style={styles.addFriendsText}>Add friends</Text>
                  </Pressable>
                </View>

                {pending.length ? (
                  <View style={styles.section}>
                    <SectionHeading count={pending.length} title="Friend requests" />
                    <View style={styles.listSurface}>
                      {pending.map((request) => {
                        const isBusy = busyId === request.id;
                        return (
                          <View key={request.id} style={styles.requestRow}>
                            <ProfileAvatar edgeToEdge size={46} source={resolveAvatarSource(request.friend)} />
                            <Text numberOfLines={1} style={styles.requestName}>{request.friend.full_name}</Text>
                            <View style={styles.requestActions}>
                              <Pressable
                                accessibilityLabel={`Decline ${request.friend.full_name}'s friend request`}
                                disabled={isBusy}
                                onPress={() => respond(request.id, false)}
                                style={({ pressed }) => [styles.requestButton, pressed && styles.pressed, isBusy && styles.disabled]}
                              >
                                <MaterialCommunityIcons color="rgba(247,248,250,0.68)" name="close" size={18} />
                              </Pressable>
                              <Pressable
                                accessibilityLabel={`Accept ${request.friend.full_name}'s friend request`}
                                disabled={isBusy}
                                onPress={() => respond(request.id, true)}
                                style={({ pressed }) => [styles.requestButton, styles.acceptButton, pressed && styles.pressed, isBusy && styles.disabled]}
                              >
                                <MaterialCommunityIcons color="#050608" name={isBusy ? "clock-outline" : "check"} size={18} />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                <View
                  onLayout={(event) => {
                    friendsSectionY.current = event.nativeEvent.layout.y;
                  }}
                  style={styles.section}
                >
                  <SectionHeading count={friends.length} title="Friends" />
                  {friends.length ? (
                    <View style={styles.listSurface}>
                      {friends.map((friendship) => (
                        <Pressable
                          accessibilityLabel={`View ${friendship.friend.full_name}'s profile`}
                          accessibilityRole="button"
                          key={friendship.id}
                          onPress={() => router.push(`/members/${friendship.friend.id}`)}
                          style={({ pressed }) => [styles.friendRow, pressed && styles.pressed]}
                        >
                          <ProfileAvatar edgeToEdge size={48} source={resolveAvatarSource(friendship.friend)} />
                          <Text numberOfLines={1} style={styles.friendName}>{friendship.friend.full_name}</Text>
                          <MaterialCommunityIcons color="rgba(143,152,165,0.58)" name="chevron-right" size={24} />
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.emptyFriends}>
                      <MaterialCommunityIcons color="rgba(247,248,250,0.34)" name="account-multiple-plus-outline" size={25} />
                      <View style={styles.emptyFriendsCopy}>
                        <Text style={styles.emptyFriendsTitle}>No friends yet</Text>
                        <Text style={styles.emptyFriendsBody}>Club members you add will appear here.</Text>
                      </View>
                    </View>
                  )}
                </View>

                <View accessibilityLabel="Version 0.2. Packaged by Salostack" style={styles.versionFooter}>
                  <Text style={styles.versionText}>Version 0.2</Text>
                  <Text style={styles.packageText}>Packaged by Salostack</Text>
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <View style={styles.profileTopBar}>
          <View style={styles.profileTopBarContent}>
            <View accessibilityLabel={`${eventPoints} event points`} style={styles.pointCounter}>
              <ClubPointMark />
              <Text style={styles.pointCount}>{formatNumber(eventPoints)}</Text>
            </View>
            <Pressable
              accessibilityLabel="Account settings, log out, and delete account"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => router.push("/profile")}
              style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons color="rgba(247,248,250,0.82)" name="cog-outline" size={27} />
            </Pressable>
          </View>
        </View>

        <Snackbar duration={4000} onDismiss={() => setMessage("")} style={styles.snackbar} visible={Boolean(message)}>{message}</Snackbar>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileShell: { flex: 1, width: "100%", position: "relative", backgroundColor: "#000000" },
  profileScroll: { flex: 1, width: "100%" },
  profileScrollContent: { flexGrow: 1, alignItems: "center" },
  profileScreen: { width: "100%", maxWidth: 472, minHeight: 760, paddingHorizontal: 20, paddingBottom: 150 },
  topBarSpacer: { height: 74 },
  profileTopBar: { position: "absolute", top: 0, left: 0, right: 0, height: 58, zIndex: 100, elevation: 100, alignItems: "center", backgroundColor: "#000000" },
  profileTopBarContent: { width: "100%", maxWidth: 472, minHeight: 58, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clubPointMark: { position: "relative", alignItems: "center", justifyContent: "center" },
  clubPointGlyph: { position: "absolute" },
  pointCounter: { minWidth: 44, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6 },
  pointCount: { color: "#4ac7f4", fontFamily: homeFont, fontSize: 14, lineHeight: 18, fontWeight: "400", letterSpacing: 0 },
  settingsButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  loadingWrap: { minHeight: 460, justifyContent: "center" },
  identity: { minHeight: 260, alignItems: "center", justifyContent: "center" },
  avatarAction: { width: 132, height: 132, alignItems: "center", justifyContent: "center" },
  editBadge: { position: "absolute", right: 3, bottom: 7, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f8fa", borderWidth: 3, borderColor: "#000000" },
  firstName: { maxWidth: "100%", marginTop: 16, color: colors.text, fontFamily: homeMediumFont, fontSize: 30, lineHeight: 36, fontWeight: "500", textAlign: "center", letterSpacing: 0 },
  lastName: { maxWidth: "100%", marginTop: 1, color: "rgba(216,221,230,0.48)", fontFamily: homeMediumFont, fontSize: 10, lineHeight: 14, fontWeight: "500", textAlign: "center", letterSpacing: 0 },
  email: { maxWidth: "100%", marginTop: 8, color: "rgba(216,221,230,0.56)", fontFamily: homeFont, fontSize: 12, lineHeight: 17, fontWeight: "400", textAlign: "center", letterSpacing: 0 },
  socialActions: { marginTop: 20, flexDirection: "row", gap: 12 },
  socialAction: { flex: 1, minWidth: 0, height: 78, borderRadius: 20, borderWidth: 1, borderColor: "rgba(247,248,250,0.13)", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(10,11,14,0.84)" },
  socialActionCopy: { flex: 1, minWidth: 0 },
  socialActionValue: { color: colors.text, fontFamily: homeFont, fontSize: 16, lineHeight: 20, fontWeight: "400", letterSpacing: 0 },
  socialActionLabel: { marginTop: 2, color: "rgba(143,152,165,0.72)", fontFamily: homeFont, fontSize: 11, lineHeight: 15, fontWeight: "400", letterSpacing: 0 },
  addFriendsAction: { justifyContent: "center", borderColor: "transparent", backgroundColor: "#f7f8fa" },
  addFriendsText: { color: "#050608", fontFamily: homeMediumFont, fontSize: 13, lineHeight: 17, fontWeight: "500", letterSpacing: 0 },
  section: { marginTop: 42 },
  sectionHeading: { minHeight: 28, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.text, fontFamily: homeFont, fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: 0 },
  sectionCount: { color: "rgba(143,152,165,0.58)", fontFamily: homeFont, fontSize: 11, lineHeight: 15, fontWeight: "400", letterSpacing: 0 },
  listSurface: { borderRadius: 22, overflow: "hidden", backgroundColor: "rgba(20,21,25,0.86)" },
  requestRow: { minHeight: 76, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" },
  requestName: { flex: 1, minWidth: 0, marginLeft: 12, color: colors.text, fontFamily: homeFont, fontSize: 14, lineHeight: 18, fontWeight: "400", letterSpacing: 0 },
  requestActions: { marginLeft: 10, flexDirection: "row", gap: 8 },
  requestButton: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.055)" },
  acceptButton: { backgroundColor: "#f7f8fa" },
  disabled: { opacity: 0.4 },
  friendRow: { minHeight: 76, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.07)" },
  friendName: { flex: 1, minWidth: 0, marginLeft: 14, color: colors.text, fontFamily: homeFont, fontSize: 14, lineHeight: 18, fontWeight: "400", letterSpacing: 0 },
  emptyFriends: { minHeight: 88, borderRadius: 20, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "rgba(20,21,25,0.58)" },
  emptyFriendsCopy: { flex: 1 },
  emptyFriendsTitle: { color: "rgba(247,248,250,0.68)", fontFamily: homeFont, fontSize: 13, lineHeight: 17, fontWeight: "400", letterSpacing: 0 },
  emptyFriendsBody: { marginTop: 3, color: "rgba(143,152,165,0.56)", fontFamily: homeFont, fontSize: 10, lineHeight: 14, fontWeight: "400", letterSpacing: 0 },
  versionFooter: { minHeight: 84, marginTop: 48, alignItems: "center", justifyContent: "flex-start" },
  versionText: { color: "rgba(216,221,230,0.5)", fontFamily: homeFont, fontSize: 11, lineHeight: 15, fontWeight: "400", textAlign: "center", letterSpacing: 0 },
  packageText: { marginTop: 4, color: "rgba(216,221,230,0.25)", fontFamily: homeFont, fontSize: 8.5, lineHeight: 12, fontWeight: "400", textAlign: "center", letterSpacing: 0 },
  pressed: { opacity: 0.68 },
  snackbar: { marginBottom: 96, backgroundColor: "#202024" }
});
