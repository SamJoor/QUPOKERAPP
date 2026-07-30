import { StyleSheet, View } from "react-native";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";

export default function EventsScreen() {
  return (
    <ScreenContainer padded={false}>
      <View style={styles.screen} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    minHeight: 780,
    backgroundColor: colors.background
  }
});
