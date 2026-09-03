import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurOverlayModal } from "@/components/BlurOverlayModal";
import { offlineTablesNotice } from "@/constants/betaPreview";
import { getCurrentProfile } from "@/lib/auth";
import type { BotLevel } from "@/lib/pokerGame";

type BuyInPreset = {
  amount: number;
  label: string;
  color: string;
  edge: string;
  botLevel: BotLevel;
};

const buyInPresets: BuyInPreset[] = [
  { amount: 40, label: "40", color: "#e85a47", edge: "#ffc5b7", botLevel: "Beginner" },
  { amount: 200, label: "200", color: "#d6a12e", edge: "#ffe28d", botLevel: "Club Regular" },
  { amount: 2000, label: "2K", color: "#7656d8", edge: "#cbbcff", botLevel: "Final Table Bot" }
];

const foreground = "#f7f8fa";
const homeFont = Platform.OS === "ios" ? "System" : "InstrumentSans_400Regular";
const homeMediumFont = Platform.OS === "ios" ? "System" : "InstrumentSans_500Medium";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function PokerChip({
  preset,
  size,
  muted = false,
  showLabel = true
}: {
  preset: BuyInPreset;
  size: number;
  muted?: boolean;
  showLabel?: boolean;
}) {
  const borderWidth = size >= 100 ? 8 : 4;
  const innerInset = size >= 100 ? 18 : 8;
  const innerSize = size - innerInset * 2;

  return (
    <View
      style={[
        styles.chip,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: preset.edge,
          backgroundColor: preset.color,
          opacity: muted ? 0.28 : 1
        }
      ]}
    >
      <View
        style={[
          styles.chipInner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            borderColor: preset.edge
          }
        ]}
      >
        {showLabel ? (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.chipText, size >= 100 ? styles.heroChipText : styles.railChipText]}
          >
            {preset.label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function StackedPokerChip({
  preset,
  size,
  muted = false
}: {
  preset: BuyInPreset;
  size: number;
  muted?: boolean;
}) {
  const layerOffset = size >= 100 ? 7 : 4;

  return (
    <View style={{ width: size, height: size + layerOffset * 2 }}>
      <View style={[styles.stackLayer, { top: layerOffset * 2 }]}>
        <PokerChip muted={muted} preset={preset} showLabel={false} size={size} />
      </View>
      <View style={[styles.stackLayer, { top: layerOffset }]}>
        <PokerChip muted={muted} preset={preset} showLabel={false} size={size} />
      </View>
      <View style={styles.stackLayer}>
        <PokerChip muted={muted} preset={preset} size={size} />
      </View>
    </View>
  );
}

export default function OfflineSetupScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState(2000);
  const [selectedIndex, setSelectedIndex] = useState(1);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [betaPreviewVisible, setBetaPreviewVisible] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const selectionScale = useRef(new Animated.Value(1)).current;
  const launchOpacity = useRef(new Animated.Value(0)).current;
  const launchBackdropOpacity = useRef(new Animated.Value(0)).current;
  const launchRotation = useRef(new Animated.Value(0)).current;
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closing = useRef(false);
  const selected = buyInPresets[selectedIndex];
  const canPlay = selected.amount <= balance;

  useEffect(() => {
    const screenAnimation = Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true
    });
    screenAnimation.start();
    return () => screenAnimation.stop();
  }, [entrance]);

  useEffect(() => {
    void getCurrentProfile()
      .then((profile) => {
        const nextBalance = Math.max(0, profile?.spendable_points ?? profile?.total_points ?? 2000);
        setBalance(nextBalance);
        setSelectedIndex((current) => {
          if (buyInPresets[current].amount <= nextBalance) return current;
          const availableIndex = buyInPresets.findLastIndex((preset) => preset.amount <= nextBalance);
          return availableIndex >= 0 ? availableIndex : 0;
        });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    selectionScale.setValue(0.96);
    Animated.timing(selectionScale, {
      toValue: 1,
      duration: 180,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true
    }).start();
  }, [selectedIndex, selectionScale]);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      setIsLaunching(false);
      setBetaPreviewVisible(false);
      launchOpacity.setValue(0);
      launchBackdropOpacity.setValue(0);
      launchRotation.stopAnimation();
      launchRotation.setValue(0);

      return () => {
        setIsScreenFocused(false);
        launchRotation.stopAnimation();
        if (launchTimer.current) {
          clearTimeout(launchTimer.current);
          launchTimer.current = null;
        }
      };
    }, [launchBackdropOpacity, launchOpacity, launchRotation])
  );

  const closeScreen = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(entrance, {
      toValue: 0,
      duration: 340,
      easing: Easing.bezier(0.32, 0, 0.67, 0),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        router.back();
        return;
      }
      closing.current = false;
    });
  }, [entrance]);

  const startGame = useCallback(() => {
    if (!canPlay || isLaunching) return;
    setIsLaunching(true);
    launchRotation.setValue(0);
    Animated.loop(
      Animated.timing(launchRotation, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
    Animated.sequence([
      Animated.timing(launchOpacity, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      }),
      Animated.delay(100),
      Animated.timing(launchBackdropOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true
      })
    ]).start();

    launchTimer.current = setTimeout(() => {
      router.push({
        pathname: "/play",
        params: {
          botLevel: selected.botLevel,
          buyIn: selected.label,
          buyInAmount: String(selected.amount),
          transition: "fade"
        }
      });
      launchTimer.current = null;
    }, 700);
  }, [canPlay, isLaunching, launchBackdropOpacity, launchOpacity, launchRotation, selected.amount, selected.botLevel, selected.label]);

  const screenTranslateY = entrance.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(windowHeight, 720), 0]
  });
  const loaderRotation = launchRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });
  return (
    <>
      <Animated.View
        accessibilityElementsHidden={!isScreenFocused}
        importantForAccessibility={isScreenFocused ? "auto" : "no-hide-descendants"}
        pointerEvents={isScreenFocused ? "auto" : "none"}
        style={[styles.routeSurface, { transform: [{ translateY: screenTranslateY }] }]}
      >
        <View style={styles.screenContent}>
          <SafeAreaView edges={["left", "right"]} style={styles.safeArea}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            accessibilityLabel="Close table setup"
            hitSlop={10}
            onPress={closeScreen}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons color="rgba(247,248,250,0.86)" name="arrow-left" size={24} />
          </Pressable>
          <View accessibilityLabel={`${formatNumber(balance)} available practice chips`} style={styles.balanceGroup}>
            <Text style={styles.balance}>{formatNumber(balance)}</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.stage}>
          <Text style={styles.eyebrow}>BUY-IN</Text>
          <Animated.View style={[styles.heroChipWrap, { transform: [{ scale: selectionScale }] }]}>
            <View style={[styles.heroGlow, { backgroundColor: selected.color }]} />
            <StackedPokerChip preset={selected} size={138} />
          </Animated.View>
          <Text style={styles.conceptNote}>BALANCE UNCHANGED</Text>
        </View>

        <View style={styles.bottomArea}>
          <Pressable
            accessibilityLabel="About Offline Tables"
            hitSlop={10}
            onPress={() => setBetaPreviewVisible(true)}
            style={({ pressed }) => [styles.betaPreview, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons name="information-outline" size={14} color="rgba(247,248,250,0.48)" />
            <Text style={styles.betaPreviewText}>About</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Play demo with a ${formatNumber(selected.amount)} chip buy-in`}
            disabled={!canPlay || isLaunching}
            onPress={startGame}
            style={({ pressed }) => [
              styles.playButton,
              !canPlay && styles.playButtonDisabled,
              pressed && styles.playButtonPressed
            ]}
          >
            <Text style={styles.playText}>PLAY DEMO</Text>
          </Pressable>

          <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View accessibilityLabel="Choose a buy-in" style={styles.chipTray}>
              {buyInPresets.map((preset, index) => {
                const active = index === selectedIndex;
                const disabled = preset.amount > balance;
                return (
                  <View key={preset.amount} style={styles.chipSlot}>
                    <Pressable
                      accessibilityLabel={`${formatNumber(preset.amount)} chip buy-in`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active, disabled }}
                      disabled={disabled}
                      onPress={() => setSelectedIndex(index)}
                      style={({ pressed }) => [
                        styles.chipButton,
                        active && styles.chipButtonActive,
                        pressed && styles.chipButtonPressed
                      ]}
                    >
                      <StackedPokerChip muted={disabled} preset={preset} size={54} />
                    </Pressable>
                    <View style={[styles.selectionMark, active && styles.selectionMarkActive]} />
                  </View>
                );
              })}
            </View>
          </View>
        </View>
          </SafeAreaView>
        </View>
        <View
          accessibilityLabel="Preparing demo table"
          accessibilityLiveRegion="polite"
          pointerEvents={isLaunching ? "auto" : "none"}
          style={styles.launchOverlay}
        >
          <Animated.View style={[styles.launchBackdrop, { opacity: launchBackdropOpacity }]} />
          <Animated.View style={[styles.loadingIndicator, { opacity: launchOpacity }]}>
            <Animated.View
              style={[
                styles.minimalLoaderRing,
                { transform: [{ rotate: loaderRotation }] }
              ]}
            />
          </Animated.View>
        </View>
      </Animated.View>

      <BlurOverlayModal
        accessibilityLabel="Close the Offline Tables notice"
        onClose={() => setBetaPreviewVisible(false)}
        visible={betaPreviewVisible}
      >
        <View style={styles.betaNoticePanel}>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setBetaPreviewVisible(false)}
            style={({ pressed }) => [styles.betaNoticeClose, pressed && styles.betaNoticeClosePressed]}
          >
            <MaterialCommunityIcons color="rgba(247,248,250,0.76)" name="close" size={18} />
          </Pressable>
          <View style={styles.betaNoticeVisual}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={require("../assets/animations/blue-puffles-beta.gif")}
              style={styles.betaNoticeGif}
            />
          </View>
          <View style={styles.betaNoticeCopy}>
            <Text style={styles.betaNoticeEyebrow}>{offlineTablesNotice.eyebrow}</Text>
            <Text style={styles.betaNoticeTitle}>{offlineTablesNotice.title}</Text>
            <Text style={styles.betaNoticeBody}>{offlineTablesNotice.body}</Text>
          </View>
        </View>
      </BlurOverlayModal>
    </>
  );
}

const styles = StyleSheet.create({
  routeSurface: {
    flex: 1,
    backgroundColor: "#000000"
  },
  screenContent: {
    flex: 1
  },
  launchOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  launchBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000"
  },
  loadingIndicator: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -84 }]
  },
  minimalLoaderRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "rgba(247,248,250,0.16)",
    borderTopColor: "rgba(247,248,250,0.82)"
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: 472,
    alignSelf: "center",
    backgroundColor: "#000000"
  },
  topBar: {
    minHeight: 58,
    paddingBottom: 6,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#000000"
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center"
  },
  balanceGroup: {
    width: 92,
    height: 30,
    alignItems: "center",
    justifyContent: "center"
  },
  balance: {
    color: "rgba(247,248,250,0.82)",
    fontFamily: homeFont,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0
  },
  headerSpacer: {
    width: 44,
    height: 44
  },
  stage: {
    flex: 1,
    minHeight: 310,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  eyebrow: {
    color: "rgba(247,248,250,0.48)",
    fontFamily: homeMediumFont,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    letterSpacing: 0
  },
  heroChipWrap: {
    width: 184,
    height: 192,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  heroGlow: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    opacity: 0.18,
    shadowColor: "#ffffff",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 }
  },
  chip: {
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    shadowColor: "#000000",
    shadowOpacity: 0.34,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 }
  },
  stackLayer: {
    position: "absolute",
    top: 0,
    left: 0
  },
  chipInner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,8,11,0.74)",
    borderWidth: 1
  },
  chipText: {
    color: foreground,
    fontFamily: homeMediumFont,
    fontWeight: "600",
    letterSpacing: 0,
    textAlign: "center"
  },
  heroChipText: {
    fontSize: 27,
    lineHeight: 34
  },
  railChipText: {
    fontSize: 10,
    lineHeight: 13
  },
  conceptNote: {
    color: "rgba(247,248,250,0.32)",
    fontFamily: homeMediumFont,
    marginTop: 12,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 0
  },
  bottomArea: {
    backgroundColor: "#000000"
  },
  betaPreview: {
    minHeight: 28,
    marginRight: 20,
    marginBottom: 11,
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  betaPreviewText: {
    color: "rgba(247,248,250,0.5)",
    fontFamily: homeFont,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400",
    letterSpacing: 0
  },
  betaNoticePanel: {
    width: "100%",
    maxWidth: 334,
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
  betaNoticeClose: {
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
  betaNoticeClosePressed: {
    opacity: 0.55
  },
  betaNoticeVisual: {
    width: "100%",
    height: 202,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 2,
    backgroundColor: "rgba(255,255,255,0.018)"
  },
  betaNoticeGif: {
    width: 190,
    height: 190
  },
  betaNoticeCopy: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 27,
    alignItems: "center"
  },
  betaNoticeEyebrow: {
    color: "rgba(74,199,244,0.82)",
    fontFamily: homeMediumFont,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0
  },
  betaNoticeTitle: {
    marginTop: 10,
    color: "#f7f8fa",
    fontFamily: homeMediumFont,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0
  },
  betaNoticeBody: {
    marginTop: 13,
    color: "rgba(216,221,230,0.64)",
    fontFamily: homeFont,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
    textAlign: "center",
    letterSpacing: 0
  },
  controls: {
    minHeight: 112,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: "#202024",
    shadowColor: "#000000",
    shadowOpacity: 0.44,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -12 },
    elevation: 24
  },
  playButton: {
    height: 56,
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f8fa",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8
  },
  playButtonDisabled: {
    opacity: 0.38
  },
  playButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }]
  },
  playText: {
    color: "#101116",
    fontFamily: homeMediumFont,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "500",
    letterSpacing: 0
  },
  chipTray: {
    height: 96,
    marginTop: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "transparent"
  },
  chipSlot: {
    width: 92,
    height: 88,
    alignItems: "center",
    justifyContent: "center"
  },
  chipButton: {
    width: 84,
    height: 82,
    alignItems: "center",
    justifyContent: "center"
  },
  chipButtonActive: {
    transform: [{ translateY: -4 }, { scale: 1.04 }]
  },
  chipButtonPressed: {
    opacity: 0.76
  },
  selectionMark: {
    position: "absolute",
    bottom: 1,
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent"
  },
  selectionMarkActive: {
    backgroundColor: "rgba(247,248,250,0.76)"
  },
  pressed: {
    opacity: 0.62
  }
});
