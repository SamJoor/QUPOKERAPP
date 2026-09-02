import { Image, type ImageSourcePropType, StyleSheet, View } from "react-native";
import { sebAvatar } from "@/constants/avatarAssets";
import { colors } from "@/constants/theme";

export function ProfileAvatar({
  active = false,
  edgeToEdge = false,
  imageScale = 1,
  imageTranslateY = 0,
  size = 52,
  source
}: {
  active?: boolean;
  edgeToEdge?: boolean;
  imageScale?: number;
  imageTranslateY?: number;
  size?: number;
  source?: ImageSourcePropType;
}) {
  const innerSize = edgeToEdge ? size : size - 4;

  return (
    <View
      style={[
        styles.shell,
        { width: size, height: size, borderRadius: size / 2 },
        edgeToEdge && styles.edgeToEdgeShell,
        active && styles.activeShell
      ]}
    >
      <View style={[styles.clip, { width: innerSize, height: innerSize, borderRadius: innerSize / 2 }]}>
        <Image
          source={source ?? sebAvatar}
          style={[styles.photoImage, { transform: [{ scale: imageScale }, { translateY: imageTranslateY }] }]}
        />
      </View>
      {active ? <View style={styles.activeDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    padding: 2,
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }
  },
  activeShell: {
    borderColor: colors.lime,
    backgroundColor: "transparent"
  },
  edgeToEdgeShell: {
    padding: 0,
    borderWidth: 0,
    shadowOpacity: 0
  },
  clip: {
    overflow: "hidden",
    backgroundColor: "transparent"
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover"
  },
  activeDot: {
    position: "absolute",
    right: 1,
    bottom: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.lime,
    borderColor: colors.ink,
    borderWidth: 2
  }
});
