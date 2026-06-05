import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import { LoadingState } from "@/components/StateViews";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useRequireSession } from "@/hooks/useRequireSession";

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
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontWeight: "900", fontSize: 11 },
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 10,
          height: 76,
          paddingTop: 8,
          paddingBottom: 10,
          borderRadius: 28,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: colors.backgroundAlt,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.28,
          shadowRadius: 16
        }
      }}
    >
      <Tabs.Screen name="tournaments" options={{ title: "Tourneys", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="trophy-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="events" options={{ title: "Events", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-star" size={24} color={color} /> }} />
      <Tabs.Screen name="dashboard" options={{ title: "Dashboard", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="view-dashboard-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: "Leaders", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="podium-gold" size={24} color={color} /> }} />
      <Tabs.Screen name="play" options={{ title: "Play", tabBarIcon: ({ color }) => <MaterialCommunityIcons name="school-outline" size={24} color={color} /> }} />
      <Tabs.Screen name="rewards" options={{ href: null }} />
    </Tabs>
  );
}
