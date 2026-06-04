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
        tabBarStyle: { backgroundColor: "#081512", borderTopColor: colors.border, height: 84, paddingTop: 8 }
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
