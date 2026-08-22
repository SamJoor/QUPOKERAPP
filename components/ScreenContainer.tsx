import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@/constants/theme";

type Props = PropsWithChildren<{ scroll?: boolean; padded?: boolean | "safe" }>;

export function ScreenContainer({ children, scroll = true, padded = true }: Props) {
  const isFullPadded = padded === true;
  const isSafePadded = padded === "safe";
  const content = <View style={[styles.content, !isFullPadded && styles.fullBleedContent]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <LinearGradient colors={[colors.backgroundAlt, colors.background, colors.ink]} style={styles.backdrop}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={[styles.scroll, isFullPadded && styles.scrollPadded, isSafePadded && styles.scrollSafePadded]}
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        ) : (
          <View style={[styles.staticWrap, isFullPadded && styles.staticPadded, isSafePadded && styles.staticSafePadded]}>{content}</View>
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
  scrollSafePadded: { paddingBottom: 96 },
  staticWrap: { flex: 1, alignItems: "center", width: "100%" },
  staticPadded: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 170 },
  staticSafePadded: { paddingBottom: 96 },
  content: { gap: 16, width: "100%", maxWidth: 398 },
  fullBleedContent: { maxWidth: "100%" }
});
