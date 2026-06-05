import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
  useFonts
} from "@expo-google-fonts/barlow";
import { theme } from "@/constants/theme";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Barlow_800ExtraBold
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" options={{ gestureEnabled: true }} />
        <Stack.Screen name="auth/signup" options={{ gestureEnabled: true }} />
        <Stack.Screen name="auth/forgot-password" options={{ gestureEnabled: true }} />
        <Stack.Screen name="onboarding/complete-profile" options={{ gestureEnabled: false }} />
        <Stack.Screen name="tabs" options={{ gestureEnabled: false }} />
        <Stack.Screen name="events/[id]" />
        <Stack.Screen name="invite/[token]" />
        <Stack.Screen name="members/[id]" />
        <Stack.Screen name="check-in/[code]" />
        <Stack.Screen name="tournaments/index" />
        <Stack.Screen name="tournaments/past" />
        <Stack.Screen name="tournaments/[id]" />
        <Stack.Screen name="profile/index" />
        <Stack.Screen name="about" />
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/events" />
        <Stack.Screen name="admin/events/[id]" />
        <Stack.Screen name="admin/members" />
        <Stack.Screen name="admin/rewards" />
        <Stack.Screen name="admin/points" />
        <Stack.Screen name="admin/tournaments" />
      </Stack>
    </PaperProvider>
  );
}
