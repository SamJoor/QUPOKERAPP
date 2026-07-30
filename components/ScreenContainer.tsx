import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/constants/theme";

type Props = PropsWithChildren<{ scroll?: boolean; padded?: boolean }>;

export function ScreenContainer({ children, scroll = true, padded = true }: Props) {
  const content = <View style={[styles.content, !padded && styles.fullBleedContent]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <LinearGradient colors={[colors.backgroundAlt, colors.background, colors.ink]} style={styles.backdrop}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.scroll, padded && styles.scrollPadded]} showsVerticalScrollIndicator={false}>
            {content}
          </ScrollView>
        ) : (
          <View style={[styles.staticWrap, padded && styles.staticPadded]}>{content}</View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  backdrop: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: "center" },
  scrollPadded: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 170 },
  staticWrap: { flex: 1, alignItems: "center", width: "100%" },
  staticPadded: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 170 },
  content: { gap: 16, width: "100%", maxWidth: 398 },
  fullBleedContent: { maxWidth: "100%" }
});
