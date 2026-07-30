import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "react-native-paper";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { avatarSources, sebAvatar } from "@/constants/avatarAssets";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";

const friends = [
  { name: "Aniah", source: avatarSources[1] },
  { name: "Sean", source: avatarSources[2] },
  { name: "Sam", source: avatarSources[3] }
];

export default function ProfileTabScreen() {
  return (
    <ScreenContainer padded={false}>
      <LinearGradient colors={["#22252a", "#11151b", "#05070a"]} locations={[0, 0.45, 1]} style={styles.screen}>
        <View style={styles.header}>
          <ProfileAvatar active size={72} source={sebAvatar} />
          <Text style={styles.title}>Sebastian Quinn</Text>
          <Text style={styles.subtitle}>Social profile</Text>
        </View>
        <View style={styles.friendRow}>
          {friends.map((friend) => (
            <View key={friend.name} style={styles.friendItem}>
              <ProfileAvatar size={58} source={friend.source} />
              <Text style={styles.friendName}>{friend.name}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    minHeight: 780,
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 150
  },
  header: {
    alignItems: "center"
  },
  title: {
    color: colors.text,
    marginTop: 18,
    fontSize: 30,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700"
  },
  friendRow: {
    marginTop: 44,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  friendItem: {
    alignItems: "center",
    gap: 9
  },
  friendName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  }
});
