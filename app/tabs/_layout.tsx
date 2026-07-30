import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import type { ComponentProps } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { colors, radii } from "@/constants/theme";
import { LoadingState } from "@/components/StateViews";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useRequireSession } from "@/hooks/useRequireSession";

type NavIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];
const tabBarWidth = Math.min(Dimensions.get("window").width - 44, 346);

function NavIcon({ focused, name }: { focused: boolean; name: NavIconName }) {
  return (
    <View style={[styles.navItem, focused && styles.navItemActive]}>
      <MaterialCommunityIcons name={name} size={focused ? 25 : 24} color={focused ? colors.ink : "rgba(247,248,250,0.58)"} />
    </View>
  );
}

export default function TabLayout() {
  const checkingSession = useRequireSession();

  if (checkingSession) {
    return (
      <ScreenContainer>
        <LoadingState label="Checking your session..." />
      </ScreenContainer>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIconStyle: styles.tabIcon,
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabItem,
        tabBarBackground: () => <BlurView intensity={36} tint="dark" style={styles.tabBlur} />,
        tabBarStyle: styles.tabBar
      }}
    >
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ focused }) => <NavIcon focused={focused} name="calendar-blank-outline" />
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <NavIcon focused={focused} name="home-variant" />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Social",
          tabBarIcon: ({ focused }) => <NavIcon focused={focused} name="account-group-outline" />
        }}
      />
      <Tabs.Screen name="play" options={{ href: null }} />
      <Tabs.Screen name="tournaments" options={{ href: null }} />
      <Tabs.Screen name="leaderboard" options={{ href: null }} />
      <Tabs.Screen name="rewards" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    height: 72,
    width: tabBarWidth,
    left: "50%",
    bottom: 14,
    transform: [{ translateX: -tabBarWidth / 2 }],
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 0,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(247,248,250,0.08)",
    backgroundColor: "rgba(12,16,22,0.72)",
    elevation: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -10 },
    overflow: "hidden"
  },
  tabBlur: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12,16,22,0.7)"
  },
  tabItem: {
    height: 54,
    paddingVertical: 0
  },
  tabIcon: {
    width: "100%",
    height: 54
  },
  navItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  navItemActive: {
    backgroundColor: colors.text,
    shadowColor: colors.text,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 }
  }
});
