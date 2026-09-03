import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { StatusBar } from "expo-status-bar";
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
  Fraunces_800ExtraBold,
  Fraunces_900Black,
  useFonts as useFrauncesFonts
} from "@expo-google-fonts/fraunces";
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  useFonts as useInstrumentSansFonts
} from "@expo-google-fonts/instrument-sans";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts as useManropeFonts
} from "@expo-google-fonts/manrope";
import { theme } from "@/constants/theme";

export default function RootLayout() {
  const [frauncesLoaded] = useFrauncesFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_800ExtraBold,
    Fraunces_900Black
  });
  const [manropeLoaded] = useManropeFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold
  });
  const [instrumentSansLoaded] = useInstrumentSansFonts({
    InstrumentSans_400Regular,
    InstrumentSans_500Medium
  });
  const fontsLoaded = frauncesLoaded && manropeLoaded && instrumentSansLoaded;

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
        <Stack.Screen name="auth/update-password" options={{ gestureEnabled: false }} />
        <Stack.Screen name="auth/confirm" options={{ gestureEnabled: false }} />
        <Stack.Screen name="auth/verify-code" options={{ gestureEnabled: false }} />
        <Stack.Screen name="onboarding/complete-profile" options={{ gestureEnabled: false }} />
        <Stack.Screen name="tabs" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="room-lobby"
          options={{
            animation: "slide_from_right",
            contentStyle: { backgroundColor: "#000000" },
            gestureEnabled: true
          }}
        />
        <Stack.Screen
          name="offline-setup"
          options={{
            animation: "none",
            contentStyle: { backgroundColor: "transparent" },
            gestureEnabled: false,
            presentation: "transparentModal"
          }}
        />
        <Stack.Screen
          name="play"
          options={{
            animation: "none",
            contentStyle: { backgroundColor: "transparent" },
            gestureEnabled: false,
            presentation: "transparentModal"
          }}
        />
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
