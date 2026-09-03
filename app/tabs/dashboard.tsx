import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Image, ImageSourcePropType, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Snackbar, Text } from "react-native-paper";
import Svg, { Circle } from "react-native-svg";
import { BlurOverlayModal, ComingSoonModal } from "@/components/BlurOverlayModal";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { resolveAvatarSource } from "@/constants/avatarAssets";
import { offlineTablesNotice } from "@/constants/betaPreview";
import { ScreenContainer } from "@/components/ScreenContainer";
import { LoadingState } from "@/components/StateViews";
import { colors } from "@/constants/theme";
import { useEventPoints } from "@/contexts/EventPointsContext";
import { getCurrentProfile } from "@/lib/auth";
import { claimDailyChips, dailyChipsAvailable } from "@/lib/chips";
import { getMemberContactCard, getMonthlyLeaderboard } from "@/lib/leaderboard";
import { LeaderboardEntry, Profile } from "@/lib/types";

type GameCard = {
  id: string;
  title: string;
  subtitle: string;
  accessibilityLabel: string;
  route?: string;
  asset?: ImageSourcePropType;
  gradient: [string, string, ...string[]];
  disabled?: boolean;
};

const gameCards: GameCard[] = [
  {
    id: "offline",
    title: "Offline Tables",
    subtitle: "Play against AI opponents",
    accessibilityLabel: "Open offline tables against AI opponents",
    route: "/offline-setup",
    asset: require("../../assets/branding/qu-poker-wordmark.png"),
    gradient: ["#edf6fc", "#e7f4ef", "#e6f6de"]
  },
  {
    id: "tournaments",
    title: "Tournaments",
    subtitle: "Registration & upcoming",
    accessibilityLabel: "Tournaments coming soon",
    gradient: ["#d9ddff", "#ead9f1"],
    disabled: true
  },
  {
    id: "training",
    title: "Practice Hands",
    subtitle: "Learn more",
    accessibilityLabel: "Practice hands coming soon",
    gradient: ["#d9ddff", "#ead9f1"],
    disabled: true
  },
  {
    id: "create",
    title: "Custom Match",
    subtitle: "Build a private club table",
    accessibilityLabel: "Custom match coming soon",
    gradient: ["#f1ddc4", "#d9e5f2"],
    disabled: true
  }
];

const medalLabels = ["🥇", "🥈", "🥉"];
const betaPreviewSlides = [
  {
    id: "welcome",
    eyebrow: "WELCOME TO THE CLUB",
    title: "Glad you're here.",
    body: "QU Poker is the home for Quinnipiac's poker club - club events, attendance, and a place to practice between them.",
    artwork: require("../../assets/animations/gary-beta.gif")
  },
  {
    id: "events",
    eyebrow: "THE CLUB EXPERIENCE",
    title: "Built around events.",
    body: "Check in at club meetings to collect Event points and keep your attendance record. Points go toward club experiences and rewards. Get in touch through Support if you would like more information.",
    artwork: require("../../assets/animations/gary-beta.gif")
  },
  {
    id: "development",
    eyebrow: "PRACTICE ANYTIME",
    title: "Play between meetings.",
    body: "Offline Tables deals you a seat against AI opponents so you can work on your game whenever you like. Play money only - no wagering, no purchases, no cash value.",
    artwork: require("../../assets/animations/gary-beta.gif")
  },
  {
    id: "offline",
    ...offlineTablesNotice,
    artwork: require("../../assets/animations/gary-beta.gif")
  }
];
const homeFont = Platform.OS === "ios" ? "System" : "InstrumentSans_400Regular";
const homeMediumFont = Platform.OS === "ios" ? "System" : "InstrumentSans_500Medium";
const displayFont = Platform.select({
  ios: "System",
  android: "sans-serif-thin",
  default: "'Segoe UI Light', -apple-system, BlinkMacSystemFont, sans-serif"
});

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function getFirstName(fullName: string) {
  return (fullName.trim().split(/\s+/)[0] || "Member").toLowerCase();
}

function getProfileNameParts(fullName: string) {
  const [firstName = "Member", ...lastNames] = fullName.trim().split(/\s+/);
  return {
    firstName: firstName.toLowerCase(),
    lastName: lastNames.join(" ").toUpperCase()
  };
}

function getLeaderboardAvatar(player: LeaderboardEntry) {
  return resolveAvatarSource(player);
}

function OfflineTableArtwork({ source, translateX }: { source: ImageSourcePropType; translateX: Animated.AnimatedInterpolation<number> }) {
  return (
    <>
      <Animated.View pointerEvents="none" style={[styles.offlineLightSweep, { transform: [{ translateX }, { rotate: "18deg" }] }]}>
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.32)", "rgba(255,255,255,0)"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.offlineLightSweepFill}
        />
      </Animated.View>
      <Image accessibilityIgnoresInvertColors resizeMode="contain" source={source} style={styles.offlineTableArtwork} />
    </>
  );
}

function LeaderboardMovementMarker({ movement }: { movement: NonNullable<LeaderboardEntry["movement"]> }) {
  if (movement === "steady") {
    return (
      <View accessibilityLabel="Leaderboard position unchanged" style={styles.movementMarker}>
        <View style={styles.movementSteadyTrack}>
          <View style={styles.movementSteadyLine} />
        </View>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Leaderboard position moved ${movement}`}
      style={[styles.movementMarker, movement === "down" && styles.movementMarkerDown]}
    >
      <View style={styles.movementTriangleOutline}>
        <View style={[styles.movementTriangleFill, movement === "up" ? styles.movementUp : styles.movementDown]} />
      </View>
    </View>
  );
}

function RankRing({ rank }: { rank: number }) {
  return (
    <View style={styles.rankRing}>
      <Svg height={30} style={styles.rankProgress} viewBox="0 0 30 30" width={30}>
        <Circle cx={15} cy={15} fill="none" r={13.25} stroke="#1e2028" strokeWidth={1.75} />
      </Svg>
      <Text style={styles.rankCount}>{rank}</Text>
    </View>
  );
}

function ClubPointMark({ size = 20 }: { size?: number }) {
  return (
    <View style={[styles.clubPointMark, { width: size, height: size }]}>
      <MaterialCommunityIcons name="hexagon-outline" size={size} color="#4ac7f4" />
      <MaterialCommunityIcons name="cards-club" size={Math.round(size * 0.44)} color="#4ac7f4" style={styles.clubPointGlyph} />
    </View>
  );
}

export default function DashboardScreen() {
  const { eventPoints } = useEventPoints();
  const [chipNotice, setChipNotice] = useState("");
  const [claimedChips, setClaimedChips] = useState<number | null>(null);
  const [chipClaimAvailable, setChipClaimAvailable] = useState(false);
  const [claimingChips, setClaimingChips] = useState(false);

  useEffect(() => {
    void dailyChipsAvailable().then(setChipClaimAvailable).catch(() => undefined);
  }, []);

  const onClaimChips = useCallback(async () => {
    setClaimingChips(true);
    try {
      const result = await claimDailyChips();
      setClaimedChips(result.chip_balance);
      setChipClaimAvailable(false);
      setChipNotice(result.status === "success" ? `+${result.chips_awarded} chips collected.` : "Today's chips are already collected.");
    } catch (err) {
      setChipNotice(err instanceof Error ? err.message : "Unable to collect chips right now.");
    } finally {
      setClaimingChips(false);
    }
  }, []);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<LeaderboardEntry | null>(null);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [clubPointsVisible, setClubPointsVisible] = useState(false);
  const [betaPreviewVisible, setBetaPreviewVisible] = useState(false);
  const [betaSlideIndex, setBetaSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const offlineCardMotion = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;
  const profileSheetTranslateY = useRef(new Animated.Value(0)).current;
  const betaSlidesRef = useRef<ScrollView>(null);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(offlineCardMotion, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(offlineCardMotion, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [offlineCardMotion]);

  const load = useCallback(async () => {
    const [activeProfile, leaderRows] = await Promise.all([
      getCurrentProfile(),
      getMonthlyLeaderboard()
    ]);
    setProfile(activeProfile);
    setLeaders(leaderRows);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setLoading(false));
      return () => {
        setSelectedPlayer(null);
        setComingSoonVisible(false);
        setClubPointsVisible(false);
        setBetaPreviewVisible(false);
        profileSheetTranslateY.setValue(0);
      };
    }, [load, profileSheetTranslateY])
  );

  const closePlayerSheet = useCallback(() => {
    Animated.timing(profileSheetTranslateY, {
      toValue: 460,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setSelectedPlayer(null);
        profileSheetTranslateY.setValue(0);
      }
    });
  }, [profileSheetTranslateY]);

  const openPlayerSheet = useCallback((player: LeaderboardEntry) => {
    setSelectedPlayer(player);
    void getMemberContactCard(player.user_id)
      .then((contact) => {
        if (!contact) return;
        setSelectedPlayer((current) =>
          current?.user_id === player.user_id
            ? { ...current, avatar_url: contact.avatar_url, avatar_key: contact.avatar_key }
            : current
        );
      })
      .catch(() => undefined);
  }, []);

  const selectedPlayerId = selectedPlayer?.user_id;
  useEffect(() => {
    if (!selectedPlayerId) return;
    profileSheetTranslateY.setValue(460);
    Animated.spring(profileSheetTranslateY, {
      toValue: 0,
      damping: 24,
      stiffness: 250,
      mass: 0.9,
      useNativeDriver: true
    }).start();
  }, [profileSheetTranslateY, selectedPlayerId]);

  const profileSheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          profileSheetTranslateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 110 || gesture.vy > 0.85) {
            closePlayerSheet();
            return;
          }
          Animated.spring(profileSheetTranslateY, {
            toValue: 0,
            damping: 22,
            stiffness: 280,
            useNativeDriver: true
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(profileSheetTranslateY, {
            toValue: 0,
            damping: 22,
            stiffness: 280,
            useNativeDriver: true
          }).start();
        }
      }),
    [closePlayerSheet, profileSheetTranslateY]
  );

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState label="Building your club dashboard..." />
      </ScreenContainer>
    );
  }

  const chipBalance = claimedChips ?? profile?.chips ?? 0;
  const leaderboardRows = leaders.slice(0, 5);
  const dailyRank = leaders.find((player) => player.user_id === profile?.id)?.rank ?? 0;
  const dashboardWidth = Math.min(windowWidth, 472);
  const dashboardMinHeight = Math.max(900, windowHeight + 180);
  const gameCardWidth = Math.min(390, Math.max(280, dashboardWidth - 70));
  const contentColumnWidth = Math.max(280, dashboardWidth - 40);
  const betaPanelWidth = Math.min(334, Math.max(280, windowWidth - 44));
  const offlineSweepTranslateX = offlineCardMotion.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 260]
  });
  const primaryBalanceOpacity = scrollY.interpolate({
    inputRange: [0, 38, 68],
    outputRange: [1, 0.72, 0],
    extrapolate: "clamp"
  });
  const primaryBalanceTranslateY = scrollY.interpolate({
    inputRange: [0, 82],
    outputRange: [0, -18],
    extrapolate: "clamp"
  });
  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [56, 88],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });
  const compactSurfaceOpacity = scrollY.interpolate({
    inputRange: [44, 52],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });
  const compactFadeOpacity = scrollY.interpolate({
    inputRange: [42, 96],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });
  const compactBalanceTranslateY = scrollY.interpolate({
    inputRange: [56, 88],
    outputRange: [-10, 0],
    extrapolate: "clamp"
  });
  const profileSheetBackdropOpacity = profileSheetTranslateY.interpolate({
    inputRange: [0, 360],
    outputRange: [1, 0],
    extrapolate: "clamp"
  });
  const selectedPlayerName = selectedPlayer ? getProfileNameParts(selectedPlayer.full_name) : null;

  return (
    <ScreenContainer fill padded={false} reserveTabBarSpace={false} scroll={false}>
      <View style={styles.dashboardShell}>
        <Animated.ScrollView
          contentContainerStyle={styles.dashboardScrollContent}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={styles.dashboardScroll}
        >
          <LinearGradient colors={["#000000", "#000000"]} style={[styles.screen, { minHeight: dashboardMinHeight }]}>
        <View style={styles.topBarSpacer} />

        <Animated.View
          style={[
            styles.balanceBlock,
            { width: contentColumnWidth, opacity: primaryBalanceOpacity, transform: [{ translateY: primaryBalanceTranslateY }] }
          ]}
        >
          <View style={styles.balanceComposition}>
            <View style={styles.balanceRow}>
              <Text style={styles.balance}>{formatNumber(chipBalance)}</Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel={chipClaimAvailable ? "Collect today's 500 chips" : "About chips and club points"}
            disabled={claimingChips}
            hitSlop={10}
            onPress={() => (chipClaimAvailable ? void onClaimChips() : setClubPointsVisible(true))}
            style={({ pressed }) => [styles.balanceHelp, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons
              name={chipClaimAvailable ? "gift-outline" : "help-circle-outline"}
              size={14}
              color="rgba(247,248,250,0.48)"
            />
            <Text style={styles.balanceHelpText}>
              {claimingChips ? "Collecting..." : chipClaimAvailable ? "Collect +500 chips" : "Chips"}
            </Text>
          </Pressable>
        </Animated.View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={gameCardWidth + 18}
          style={styles.gameScroll}
          contentContainerStyle={styles.gameRail}
        >
          {gameCards.map((card) => (
            <Pressable
              accessibilityLabel={card.accessibilityLabel}
              accessibilityHint={card.id === "offline" ? "Starts an offline poker table" : undefined}
              disabled={card.disabled}
              key={card.id}
              onPress={() => card.route && router.push(card.route as never)}
              style={({ pressed }) => [styles.gameCard, { width: gameCardWidth }, card.disabled && styles.gameCardDisabled, pressed && styles.gameCardPressed]}
            >
              <LinearGradient
                colors={card.disabled ? ["rgba(255,255,255,0.09)", "rgba(255,255,255,0.045)"] : card.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={card.id === "offline" ? [0, 0.36, 1] : undefined}
                style={styles.gameCardGradient}
              >
                {card.id === "offline" ? (
                  <>
                    {card.asset ? <OfflineTableArtwork source={card.asset} translateX={offlineSweepTranslateX} /> : null}
                    <View pointerEvents="none" style={styles.playNowCue}>
                      <MaterialCommunityIcons name="arrow-top-right" size={14} color="rgba(11,13,16,0.62)" />
                      <Text style={styles.playNowText}>PLAY NOW</Text>
                    </View>
                  </>
                ) : !card.disabled && card.asset ? (
                  <Image
                    resizeMode="contain"
                    source={card.asset}
                    style={styles.gameAsset}
                  />
                ) : null}
                {card.disabled ? (
                  <View style={styles.lockState}>
                    <MaterialCommunityIcons name="lock-outline" size={15} color="rgba(247,248,250,0.58)" />
                    <Text style={styles.comingSoon}>COMING SOON</Text>
                  </View>
                ) : null}
                <View style={styles.gameCopy}>
                  <Text numberOfLines={1} style={[styles.gameTitle, card.disabled && styles.gameTitleLocked]}>
                    {card.title}
                  </Text>
                  <Text numberOfLines={2} style={[styles.gameSubtitle, card.disabled && styles.gameSubtitleLocked]}>
                    {card.subtitle}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>

        <View style={[styles.leaderboardHeader, { width: contentColumnWidth }]}>
          <Text style={styles.leaderboardTitle}>Club points leaderboard</Text>
          <Pressable
            accessibilityLabel="About QU Poker"
            hitSlop={10}
            onPress={() => {
              setBetaSlideIndex(0);
              setBetaPreviewVisible(true);
              requestAnimationFrame(() => betaSlidesRef.current?.scrollTo({ animated: false, x: 0 }));
            }}
            style={({ pressed }) => [styles.leaderboardShortcut, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="information-outline" size={14} color="rgba(247,248,250,0.48)" />
            <Text style={styles.leaderboardShortcutText}>About</Text>
          </Pressable>
        </View>

        <View style={[styles.leaderboardList, { width: gameCardWidth }]}>
          {leaderboardRows.length > 0 ? (
            leaderboardRows.map((player, index) => {
              const rank = player.rank || index + 1;
              const movement = player.movement;
              const points = player.total_points ?? 0;
              return (
                <Pressable
                  accessibilityLabel={`${player.full_name}, rank ${rank}, ${formatNumber(points)} club points`}
                  key={player.user_id}
                  onPress={() => openPlayerSheet(player)}
                  style={({ pressed }) => [styles.leaderRow, pressed && styles.leaderRowPressed]}
                >
                  <View style={styles.rankSlot}>
                    {rank <= 3 ? (
                      <Text style={styles.medal}>{medalLabels[rank - 1]}</Text>
                    ) : (
                      <Text style={styles.leaderRank}>{rank}</Text>
                    )}
                  </View>
                  <View style={styles.avatarStatus}>
                  <ProfileAvatar
                    size={36}
                    name={player.full_name}
                    source={getLeaderboardAvatar(player)}
                  />
                  </View>
                  <View style={styles.leaderCopy}>
                    <Text numberOfLines={1} style={styles.leaderName}>
                      {getFirstName(player.full_name)}
                    </Text>
                    <Text style={styles.leaderScore}>{formatNumber(points)} pts</Text>
                  </View>
                  <View style={styles.movementEndSlot}>
                    {movement ? <LeaderboardMovementMarker movement={movement} /> : null}
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyLeaderboard}>
              <Text style={styles.emptyLeaderboardText}>No leaderboard activity yet</Text>
            </View>
          )}
        </View>

        <Pressable
          accessibilityLabel="See the full leaderboard"
          accessibilityHint="Opens chips, club points and this week"
          onPress={() => router.push("/tabs/leaderboard")}
          style={({ pressed }) => [styles.fullLeaderboardButton, { width: contentColumnWidth }, pressed && styles.fullLeaderboardButtonPressed]}
        >
          <Text style={styles.fullLeaderboardText}>See the full leaderboard</Text>
        </Pressable>
          </LinearGradient>
        </Animated.ScrollView>

        <View
          pointerEvents="box-none"
          style={styles.dashboardTopChrome}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.dashboardTopChromeSurface, { opacity: compactSurfaceOpacity }]}
          />
          <Animated.View pointerEvents="none" style={[styles.dashboardTopChromeFade, { opacity: compactFadeOpacity }]}>
            <LinearGradient
              colors={["rgba(0,0,0,0.94)", "rgba(0,0,0,0.48)", "rgba(0,0,0,0)"]}
              locations={[0, 0.46, 1]}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <View pointerEvents="box-none" style={styles.dashboardTopChromeContent}>
            <Pressable
              accessibilityLabel={`${eventPoints} club points. Learn more`}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setClubPointsVisible(true)}
              style={({ pressed }) => [styles.eventPointsCounter, pressed && styles.pressed]}
            >
              <ClubPointMark />
              <Text style={styles.eventPointsCount}>{formatNumber(eventPoints)}</Text>
            </Pressable>
            <Animated.View
              style={[
                styles.compactBalance,
                { opacity: compactHeaderOpacity, transform: [{ translateY: compactBalanceTranslateY }] }
              ]}
            >
              <Text style={styles.compactBalanceText}>{formatNumber(chipBalance)}</Text>
            </Animated.View>
            <Pressable
              accessibilityLabel="Rank preview coming soon"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setComingSoonVisible(true)}
              style={({ pressed }) => [styles.rankCounter, pressed && styles.rankCounterPressed]}
            >
              <RankRing rank={dailyRank} />
            </Pressable>
          </View>
        </View>
      </View>

      <ComingSoonModal onClose={() => setComingSoonVisible(false)} visible={comingSoonVisible} />
      <Snackbar duration={3000} onDismiss={() => setChipNotice("")} visible={Boolean(chipNotice)}>
        {chipNotice}
      </Snackbar>

      <BlurOverlayModal
        accessibilityLabel="Close club points information"
        onClose={() => setClubPointsVisible(false)}
        visible={clubPointsVisible}
      >
        <View style={styles.clubPointsPanel}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setClubPointsVisible(false)}
            style={({ pressed }) => [styles.infoModalClose, pressed && styles.infoModalClosePressed]}
          >
            <MaterialCommunityIcons color="rgba(247,248,250,0.76)" name="close" size={18} />
          </Pressable>
          <View style={styles.clubPointsMarkWrap}>
            <ClubPointMark size={54} />
          </View>
          <Text style={styles.clubPointsTitle}>Chips and club points</Text>
          <Text style={styles.clubPointsBody}>
            Two different things, and you cannot swap one for the other.
          </Text>
          <View style={styles.clubPointsDivider} />
          <Text style={styles.clubPointsEyebrow}>CHIPS</Text>
          <Text style={styles.clubPointsPreviewValue}>{formatNumber(chipBalance)}</Text>
          <Text style={styles.clubPointsPreviewBody}>
            What you play with at every table in the app. You start with 2,000 and can collect 500 more each day from the Dashboard. Chips are free, have no cash value, and cannot be purchased.
          </Text>
          <View style={styles.clubPointsDivider} />
          <Text style={styles.clubPointsEyebrow}>CLUB POINTS</Text>
          <Text style={styles.clubPointsPreviewValue}>{formatNumber(eventPoints)}</Text>
          <Text style={styles.clubPointsPreviewBody}>
            Earned by checking in at club events. They rank you on the leaderboard and go toward club rewards and tournament entries. Playing poker never changes them.
          </Text>
        </View>
      </BlurOverlayModal>

      <BlurOverlayModal
        accessibilityLabel="Close about panel"
        onClose={() => setBetaPreviewVisible(false)}
        visible={betaPreviewVisible}
      >
          <View style={[styles.betaPreviewPanel, { width: betaPanelWidth }]}>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setBetaPreviewVisible(false)}
              style={({ pressed }) => [styles.betaPreviewClose, pressed && styles.betaPreviewClosePressed]}
            >
              <MaterialCommunityIcons color="rgba(247,248,250,0.76)" name="close" size={18} />
            </Pressable>
            <ScrollView
              decelerationRate="fast"
              horizontal
              onScroll={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / betaPanelWidth);
                const boundedIndex = Math.max(0, Math.min(betaPreviewSlides.length - 1, nextIndex));
                setBetaSlideIndex((currentIndex) => currentIndex === boundedIndex ? currentIndex : boundedIndex);
              }}
              pagingEnabled
              ref={betaSlidesRef}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              style={styles.betaPreviewSlides}
            >
              {betaPreviewSlides.map((slide) => (
                <View key={slide.id} style={[styles.betaPreviewPage, { width: betaPanelWidth }]}>
                  <View style={styles.betaPreviewVisual}>
                    <Image
                      accessibilityIgnoresInvertColors
                      resizeMode="contain"
                      source={slide.artwork}
                      style={styles.betaPreviewGif}
                    />
                  </View>
                  <View style={styles.betaPreviewSlide}>
                    <Text style={styles.betaPreviewEyebrow}>{slide.eyebrow}</Text>
                    <Text style={styles.betaPreviewTitle}>{slide.title}</Text>
                    <Text style={styles.betaPreviewBody}>{slide.body}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View accessibilityLabel={`Page ${betaSlideIndex + 1} of ${betaPreviewSlides.length}`} style={styles.betaPreviewDots}>
              {betaPreviewSlides.map((slide, index) => (
                <Pressable
                  accessibilityLabel={`Show page ${index + 1}`}
                  accessibilityRole="button"
                  key={slide.eyebrow}
                  onPress={() => {
                    betaSlidesRef.current?.scrollTo({ animated: true, x: index * betaPanelWidth });
                    setBetaSlideIndex(index);
                  }}
                  style={styles.betaPreviewDotTarget}
                >
                  <View style={[styles.betaPreviewDot, index === betaSlideIndex && styles.betaPreviewDotActive]} />
                </Pressable>
              ))}
            </View>
          </View>
      </BlurOverlayModal>

      <Modal
        animationType="none"
        onRequestClose={closePlayerSheet}
        statusBarTranslucent
        transparent
        visible={Boolean(selectedPlayer)}
      >
        <View style={styles.profileSheetRoot}>
          <Animated.View style={[styles.profileSheetBackdrop, { opacity: profileSheetBackdropOpacity }]}>
            <Pressable
              accessibilityLabel="Close member profile"
              onPress={closePlayerSheet}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <Animated.View
            accessibilityViewIsModal
            style={[styles.profileSheet, { transform: [{ translateY: profileSheetTranslateY }] }]}
            {...profileSheetPanResponder.panHandlers}
          >
            <View style={styles.profileSheetHandle} />
            {selectedPlayer ? (
              <>
                <View style={styles.profileSheetAvatarRing}>
                  <ProfileAvatar
                    size={92}
                    name={selectedPlayer.full_name}
                    source={getLeaderboardAvatar(selectedPlayer)}
                  />
                </View>
                <Text numberOfLines={1} style={styles.profileSheetName}>
                  {selectedPlayerName?.firstName}
                </Text>
                {selectedPlayerName?.lastName ? (
                  <Text numberOfLines={1} style={styles.profileSheetSurname}>
                    {selectedPlayerName.lastName}
                  </Text>
                ) : null}
                <View style={styles.profileSheetDivider} />
                <View style={styles.profileSheetMetrics}>
                  <View style={styles.profileSheetMetric}>
                    <Text style={styles.profileSheetMetricLabel}>RANK</Text>
                    <Text style={styles.profileSheetMetricValue}>#{selectedPlayer.rank}</Text>
                  </View>
                  <View style={styles.profileSheetMetricDivider} />
                  <View style={styles.profileSheetMetric}>
                    <Text style={styles.profileSheetMetricLabel}>CLUB POINTS</Text>
                    <Text style={styles.profileSheetMetricValue}>{formatNumber(selectedPlayer.total_points ?? 0)}</Text>
                  </View>
                </View>
                <Text style={styles.profileSheetDismissHint}>Swipe down to close</Text>
              </>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  dashboardShell: {
    flex: 1,
    width: "100%",
    position: "relative",
    backgroundColor: "#000000"
  },
  dashboardScroll: {
    flex: 1,
    width: "100%",
    position: "relative",
    zIndex: 0
  },
  dashboardScrollContent: {
    flexGrow: 1,
    alignItems: "center"
  },
  screen: {
    width: "100%",
    maxWidth: 472,
    minHeight: 840,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 20,
    overflow: "hidden"
  },
  topBarSpacer: {
    minHeight: 81
  },
  clubPointMark: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center"
  },
  clubPointGlyph: {
    position: "absolute"
  },
  eventPointsCounter: {
    minWidth: 44,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  eventPointsCount: {
    color: "#4ac7f4",
    fontFamily: homeFont,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
    letterSpacing: 0
  },
  rankCounter: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  rankCounterPressed: {
    opacity: 0.58
  },
  rankRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center"
  },
  rankProgress: {
    position: "absolute",
    top: 0,
    left: 0
  },
  rankCount: {
    color: colors.text,
    fontFamily: homeFont,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
    letterSpacing: 0
  },
  balanceBlock: {
    alignItems: "flex-start",
    marginTop: 4,
    position: "relative"
  },
  balanceComposition: {
    position: "relative"
  },
  balanceRow: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 1
  },
  balance: {
    color: colors.text,
    fontFamily: displayFont,
    fontSize: 74,
    lineHeight: 84,
    fontWeight: "200",
    letterSpacing: 0
  },
  balanceHelp: {
    position: "absolute",
    right: 0,
    top: 28,
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  balanceHelpText: {
    color: "rgba(247,248,250,0.5)",
    fontFamily: homeFont,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "400",
    letterSpacing: 0
  },
  gameScroll: {
    height: 184,
    maxHeight: 184,
    flexGrow: 0,
    flexShrink: 0,
    marginTop: 48,
    marginHorizontal: -20,
    overflow: "visible"
  },
  gameRail: {
    paddingHorizontal: 20,
    paddingRight: 56,
    gap: 18
  },
  gameCard: {
    height: 184,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#dceae8"
  },
  gameCardDisabled: {
    backgroundColor: "transparent"
  },
  gameCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }]
  },
  gameCardGradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 22
  },
  gameAsset: {
    width: 82,
    height: 82,
    marginLeft: -7,
    marginTop: -8
  },
  offlineTableArtwork: {
    position: "absolute",
    top: 22,
    left: 24,
    width: 78,
    height: 37
  },
  offlineLightSweep: {
    position: "absolute",
    top: -54,
    left: -72,
    width: 92,
    height: 280,
    opacity: 0.42
  },
  offlineLightSweepFill: {
    flex: 1
  },
  playNowCue: {
    position: "absolute",
    top: 22,
    right: 23,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  playNowText: {
    color: "rgba(11,13,16,0.62)",
    fontFamily: homeMediumFont,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 0
  },
  lockState: {
    position: "absolute",
    top: 22,
    right: 23,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  comingSoon: {
    color: "rgba(247,248,250,0.52)",
    fontFamily: homeMediumFont,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 0
  },
  gameCopy: {
    marginTop: "auto",
    paddingRight: 0
  },
  gameTitle: {
    color: "#0b0d10",
    fontFamily: homeFont,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "400",
    letterSpacing: 0
  },
  gameTitleLocked: {
    color: "rgba(247,248,250,0.68)"
  },
  gameSubtitle: {
    color: "rgba(11,13,16,0.68)",
    fontFamily: homeFont,
    marginTop: 5,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "400",
    letterSpacing: 0
  },
  gameSubtitleLocked: {
    color: "rgba(247,248,250,0.4)"
  },
  leaderboardHeader: {
    marginTop: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  leaderboardTitle: {
    flexShrink: 1,
    color: colors.text,
    fontFamily: homeFont,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: 0
  },
  leaderboardShortcut: {
    minHeight: 30,
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingLeft: 10
  },
  leaderboardShortcutText: {
    color: "rgba(247,248,250,0.54)",
    fontFamily: homeFont,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "400",
    letterSpacing: 0
  },
  leaderboardList: {
    marginTop: 8,
    gap: 0
  },
  leaderRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8
  },
  leaderRowPressed: {
    opacity: 0.7
  },
  rankSlot: {
    width: 56,
    alignItems: "center",
    justifyContent: "center"
  },
  leaderRank: {
    color: "rgba(247,248,250,0.75)",
    fontFamily: homeFont,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: 0
  },
  leaderCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 24
  },
  avatarStatus: {
    width: 36,
    height: 36
  },
  movementMarker: {
    width: 16,
    height: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  movementEndSlot: {
    width: 22,
    alignItems: "flex-end",
    justifyContent: "center"
  },
  movementMarkerDown: {
    transform: [{ rotate: "180deg" }]
  },
  movementTriangleOutline: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#050608"
  },
  movementTriangleFill: {
    position: "absolute",
    left: -4,
    top: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 7,
    borderLeftColor: "transparent",
    borderRightColor: "transparent"
  },
  movementUp: {
    borderBottomColor: "#31d79a"
  },
  movementDown: {
    borderBottomColor: "#f0606a"
  },
  movementSteadyTrack: {
    width: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#050608",
    alignItems: "center",
    justifyContent: "center"
  },
  movementSteadyLine: {
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#dca03d"
  },
  leaderName: {
    color: colors.text,
    fontFamily: homeFont,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "400",
    letterSpacing: 0
  },
  leaderScore: {
    color: "rgba(143,152,165,0.72)",
    fontFamily: homeFont,
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
    letterSpacing: 0
  },
  emptyLeaderboard: {
    minHeight: 66,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyLeaderboardText: {
    color: colors.muted,
    fontFamily: homeFont,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0
  },
  medal: {
    fontFamily: homeFont,
    fontSize: 25,
    lineHeight: 31,
    letterSpacing: 0
  },
  fullLeaderboardButton: {
    minHeight: 46,
    marginTop: 24,
    alignSelf: "center",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(36,36,41,0.96)"
  },
  fullLeaderboardButtonPressed: {
    opacity: 0.72
  },
  fullLeaderboardText: {
    color: colors.text,
    fontFamily: homeFont,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "400",
    letterSpacing: 0
  },
  pressed: {
    opacity: 0.66
  },
  dashboardTopChrome: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 88,
    zIndex: 100,
    elevation: 100,
    alignItems: "center",
    overflow: "hidden"
  },
  dashboardTopChromeContent: {
    width: "100%",
    maxWidth: 472,
    paddingHorizontal: 20,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  dashboardTopChromeSurface: {
    position: "absolute",
    top: 0,
    width: "100%",
    maxWidth: 472,
    height: 58,
    backgroundColor: "#000000"
  },
  dashboardTopChromeFade: {
    position: "absolute",
    top: 48,
    width: "100%",
    maxWidth: 472,
    height: 40
  },
  compactBalance: {
    width: 92,
    height: 30,
    alignItems: "center",
    justifyContent: "center"
  },
  compactBalanceText: {
    color: "rgba(247,248,250,0.82)",
    fontFamily: homeFont,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0
  },
  clubPointsPanel: {
    width: "100%",
    maxWidth: 334,
    minHeight: 458,
    borderRadius: 26,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 34,
    paddingBottom: 28,
    backgroundColor: "rgba(30,30,34,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    shadowColor: "#000000",
    shadowOpacity: 0.36,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20
  },
  infoModalClose: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.055)"
  },
  infoModalClosePressed: {
    opacity: 0.55
  },
  clubPointsMarkWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,199,244,0.08)"
  },
  clubPointsTitle: {
    marginTop: 18,
    color: "#f7f8fa",
    fontFamily: homeMediumFont,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0
  },
  clubPointsBody: {
    marginTop: 12,
    color: "rgba(216,221,230,0.64)",
    fontFamily: homeFont,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "400",
    textAlign: "center",
    letterSpacing: 0
  },
  clubPointsDivider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    marginTop: 22,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  clubPointsEyebrow: {
    marginTop: 19,
    color: "rgba(143,152,165,0.7)",
    fontFamily: homeMediumFont,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0
  },
  clubPointsPreviewValue: {
    marginTop: 3,
    color: "#f7f8fa",
    fontFamily: homeFont,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "400",
    textAlign: "center",
    letterSpacing: 0
  },
  clubPointsPreviewBody: {
    marginTop: 5,
    color: "rgba(216,221,230,0.5)",
    fontFamily: homeFont,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "400",
    textAlign: "center",
    letterSpacing: 0
  },
  betaPreviewPanel: {
    height: 486,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    backgroundColor: "rgba(30,30,34,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    shadowColor: "#000000",
    shadowOpacity: 0.36,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20
  },
  betaPreviewClose: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 3,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.055)"
  },
  betaPreviewClosePressed: {
    opacity: 0.55
  },
  betaPreviewVisual: {
    width: "100%",
    height: 184,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
    backgroundColor: "rgba(255,255,255,0.018)"
  },
  betaPreviewGif: {
    width: 154,
    height: 154
  },
  betaPreviewSlides: {
    width: "100%",
    height: 430,
    flexGrow: 0
  },
  betaPreviewPage: {
    height: 430
  },
  betaPreviewSlide: {
    height: 246,
    paddingHorizontal: 26,
    paddingTop: 26,
    alignItems: "center"
  },
  betaPreviewEyebrow: {
    color: "rgba(74,199,244,0.82)",
    fontFamily: homeMediumFont,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0
  },
  betaPreviewTitle: {
    marginTop: 10,
    color: "#f7f8fa",
    fontFamily: homeMediumFont,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0
  },
  betaPreviewBody: {
    marginTop: 13,
    color: "rgba(216,221,230,0.64)",
    fontFamily: homeFont,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
    textAlign: "center",
    letterSpacing: 0
  },
  betaPreviewDots: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2
  },
  betaPreviewDotTarget: {
    width: 22,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  betaPreviewDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(247,248,250,0.22)"
  },
  betaPreviewDotActive: {
    width: 16,
    backgroundColor: "rgba(247,248,250,0.9)"
  },
  profileSheetRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  profileSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.64)"
  },
  profileSheet: {
    width: "100%",
    maxWidth: 430,
    minHeight: 390,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#202024",
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -12 },
    elevation: 24
  },
  profileSheetHandle: {
    width: 50,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(218,222,230,0.55)"
  },
  profileSheetAvatarRing: {
    width: 104,
    height: 104,
    marginTop: 26,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.055)"
  },
  profileSheetAvatarRingFlush: {
    backgroundColor: "transparent"
  },
  profileSheetName: {
    maxWidth: "100%",
    marginTop: 18,
    color: "#f7f8fa",
    fontFamily: homeMediumFont,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0
  },
  profileSheetSurname: {
    maxWidth: "100%",
    marginTop: 1,
    color: "rgba(216,221,230,0.5)",
    fontFamily: homeMediumFont,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0
  },
  profileSheetDivider: {
    width: "100%",
    height: 1,
    marginTop: 26,
    backgroundColor: "rgba(255,255,255,0.075)"
  },
  profileSheetMetrics: {
    width: "100%",
    minHeight: 78,
    marginTop: 18,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.045)"
  },
  profileSheetMetric: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  profileSheetMetricDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  profileSheetMetricLabel: {
    color: "rgba(216,221,230,0.46)",
    fontFamily: homeMediumFont,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "500",
    letterSpacing: 0
  },
  profileSheetMetricValue: {
    marginTop: 4,
    color: "#f7f8fa",
    fontFamily: homeFont,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "400",
    letterSpacing: 0
  },
  profileSheetDismissHint: {
    marginTop: 18,
    color: "rgba(216,221,230,0.36)",
    fontFamily: homeFont,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "400",
    letterSpacing: 0
  }
});
