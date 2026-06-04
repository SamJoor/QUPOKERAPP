import { router } from "expo-router";
import { IconButton, Text } from "react-native-paper";
import { StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";

export function BackButton({ fallback = "/" }: { fallback?: string }) {
  return (
    <View style={styles.row}>
      <IconButton
        icon="chevron-left"
        size={28}
        iconColor={colors.text}
        containerColor={colors.surface}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(fallback as never);
          }
        }}
        accessibilityLabel="Go back"
      />
      <Text style={styles.label}>Back</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginLeft: -8 },
  label: { color: colors.muted, fontWeight: "800" }
});
