import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { colors } from "@/constants/theme";
import { LoadingState } from "@/components/StateViews";
import { ScreenContainer } from "@/components/ScreenContainer";
import {
  VectorEventsTabMark,
  VectorHomeTabMark,
  VectorProfileTabMark
} from "@/components/VectorMotifs";
import { useRequireSession } from "@/hooks/useRequireSession";
import { EventPointsProvider } from "@/contexts/EventPointsContext";

type NavGlyph = "events" | "dashboard" | "social";

const webBackdropBlur = Platform.OS === "web"
  ? ({
      WebkitBackdropFilter: "blur(16px) saturate(70%)",
      backdropFilter: "blur(16px) saturate(70%)"
    } as object)
  : null;

function NavIcon({ focused, glyph }: { focused: boolean; glyph: NavGlyph }) {
  const color = focused ? colors.text : "rgba(126,129,142,0.62)";
  const size = 27;

  return (
    <View style={styles.navItem}>
      {glyph === "events" && (
        <>
          <VectorEventsTabMark size={size} color={color} filled={focused} />
          <View style={styles.eventDot} />
        </>
      )}
      {glyph === "dashboard" && <VectorHomeTabMark size={size} color={color} filled={focused} />}
      {glyph === "social" && <VectorProfileTabMark size={size} color={color} filled={focused} />}
    </View>
  );
}

export default function TabLayout() {
  const checkingSession = useRequireSession();
  const { width: windowWidth } = useWindowDimensions();
  const barWidth = Math.min(windowWidth, 472);
  const horizontalInset = Math.max(0, (windowWidth - barWidth) / 2);

  if (checkingSession) {
    return (
      <ScreenContainer>
        <LoadingState label="Checking your session..." />
      </ScreenContainer>
    );
  }

  return (
    <EventPointsProvider>
      <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: styles.tabIcon,
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabItem,
        tabBarButton: ({ ref: _ref, href: _href, ...props }) => (
          <Pressable
            {...props}
            style={({ pressed }) => [
              props.style,
              Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null,
              pressed && styles.tabPressed
            ]}
          />
        ),
        tabBarBackground: () =>
          Platform.OS === "web" ? (
            <View style={[styles.tabBackground, styles.webTabTint, webBackdropBlur]} />
          ) : (
            <BlurView intensity={18} tint="dark" style={styles.tabBackground}>
              <View style={styles.nativeTabTint} />
            </BlurView>
          ),
        tabBarStyle: [styles.tabBar, { left: horizontalInset, right: horizontalInset }]
      }}
    >
      <Tabs.Screen
        name="events"
        options={{
          lazy: false,
          title: "Events",
          tabBarIcon: ({ focused }) => <NavIcon focused={focused} glyph="events" />
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          lazy: false,
          title: "Home",
          tabBarIcon: ({ focused }) => <NavIcon focused={focused} glyph="dashboard" />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          lazy: false,
          title: "Profile",
          tabBarIcon: ({ focused }) => <NavIcon focused={focused} glyph="social" />
        }}
      />
      <Tabs.Screen name="play" options={{ href: null }} />
      <Tabs.Screen name="tournaments" options={{ href: null }} />
      <Tabs.Screen name="leaderboard" options={{ href: null }} />
      <Tabs.Screen name="rewards" options={{ href: null }} />
      <Tabs.Screen name="queue" options={{ href: null }} />
      <Tabs.Screen name="create-match" options={{ href: null }} />
      <Tabs.Screen name="live-match/[matchId]" options={{ href: null }} />
      </Tabs>
    </EventPointsProvider>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.background
  },
  tabBar: {
    position: "absolute",
    bottom: 0,
    height: 84,
    paddingHorizontal: 5,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 0,
    borderWidth: 0,
    borderTopWidth: 0,
    borderColor: "transparent",
    backgroundColor: "transparent",
    elevation: 0,
    shadowOpacity: 0,
    overflow: "hidden"
  },
  tabBackground: {
    ...StyleSheet.absoluteFillObject
  },
  webTabTint: {
    backgroundColor: "rgba(0,0,0,0.22)"
  },
  nativeTabTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)"
  },
  tabItem: {
    height: 68,
    paddingVertical: 0
  },
  tabIcon: {
    width: "100%",
    height: 68
  },
  navItem: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -24 }]
  },
  eventDot: {
    position: "absolute",
    top: 14,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ff4d68"
  },
  tabPressed: {
    opacity: 0.72
  }
});
