import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "react-native-paper";
import { colors, fonts } from "@/constants/theme";

export function QuestCard({
  step,
  icon,
  title,
  body,
  reward,
  tone = "blue",
  onPress
}: {
  step: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  body: string;
  reward?: string;
  tone?: "blue" | "gold";
  onPress: () => void;
}) {
  const accent = tone === "gold" ? colors.gold : colors.green;

  return (
    <Pressable accessibilityLabel={`Step ${step}: ${title}. ${body}`} style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.stepWrap}>
        <View style={[styles.step, { backgroundColor: accent }]}>
          <Text style={styles.stepText}>{step}</Text>
        </View>
        <View style={styles.rail} />
      </View>
      <View style={[styles.iconBubble, { borderColor: accent }]}>
        <MaterialCommunityIcons name={icon} size={26} color={accent} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {reward ? <Text style={[styles.reward, { color: accent }]}>{reward}</Text> : null}
      </View>
      <MaterialCommunityIcons name="arrow-right-circle" size={28} color={accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 92,
    padding: 12,
    borderRadius: 26,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderWidth: 1
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  stepWrap: { alignSelf: "stretch", alignItems: "center", width: 30 },
  step: { width: 30, height: 30, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  stepText: { color: colors.navyInk, fontFamily: fonts.extraBold, fontWeight: "900", fontSize: 14 },
  rail: { flex: 1, width: 3, marginTop: 7, borderRadius: 99, backgroundColor: colors.border },
  iconBubble: { width: 52, height: 52, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: colors.backgroundAlt, borderWidth: 1.5 },
  copy: { flex: 1, gap: 3 },
  title: { color: colors.text, fontFamily: fonts.bold, fontWeight: "900", fontSize: 16 },
  body: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 18, fontSize: 12 },
  reward: { fontFamily: fonts.bold, fontWeight: "900", fontSize: 12, textTransform: "uppercase" }
});
