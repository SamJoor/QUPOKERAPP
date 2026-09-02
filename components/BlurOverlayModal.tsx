import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Text } from "react-native-paper";

type BlurOverlayModalProps = PropsWithChildren<{
  accessibilityLabel: string;
  onClose: () => void;
  visible: boolean;
}>;

export function BlurOverlayModal({ accessibilityLabel, children, onClose, visible }: BlurOverlayModalProps) {
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted || !visible) return;

    progress.stopAnimation();
    progress.setValue(0);
    const frame = requestAnimationFrame(() => {
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    });

    return () => cancelAnimationFrame(frame);
  }, [mounted, progress, visible]);

  useEffect(() => {
    if (!mounted || visible) return;

    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 0,
      duration: 170,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [mounted, progress, visible]);

  if (!mounted) return null;

  const panelOpacity = progress.interpolate({
    inputRange: [0, 0.24, 1],
    outputRange: [0, 0, 1],
    extrapolate: "clamp"
  });
  const panelScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.975, 1],
    extrapolate: "clamp"
  });
  const panelTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 0],
    extrapolate: "clamp"
  });

  return (
    <Modal animationType="none" onRequestClose={onClose} statusBarTranslucent transparent visible>
      <View accessibilityViewIsModal style={styles.root}>
        <BlurView intensity={34} pointerEvents="none" tint="dark" style={StyleSheet.absoluteFillObject} />
        <Animated.View pointerEvents="none" style={[styles.shade, { opacity: progress }]} />
        <Pressable accessibilityLabel={accessibilityLabel} onPress={onClose} style={StyleSheet.absoluteFillObject} />
        <Animated.View
          style={[
            styles.content,
            { opacity: panelOpacity, transform: [{ translateY: panelTranslateY }, { scale: panelScale }] }
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function ComingSoonModal({ onClose, visible }: Pick<BlurOverlayModalProps, "onClose" | "visible">) {
  return (
    <BlurOverlayModal accessibilityLabel="Close coming soon message" onClose={onClose} visible={visible}>
      <View style={styles.comingSoonPanel}>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onClose}
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
        >
          <MaterialCommunityIcons color="rgba(247,248,250,0.7)" name="close" size={18} />
        </Pressable>
        <View style={styles.lock}>
          <MaterialCommunityIcons color="#f7f8fa" name="lock-outline" size={24} />
        </View>
        <Text style={styles.title}>Coming soon</Text>
      </View>
    </BlurOverlayModal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22
  },
  shade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.46)"
  },
  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  comingSoonPanel: {
    width: "100%",
    maxWidth: 286,
    minHeight: 210,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,30,34,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    shadowColor: "#000000",
    shadowOpacity: 0.34,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 18
  },
  close: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.055)"
  },
  closePressed: {
    opacity: 0.55
  },
  lock: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.07)"
  },
  title: {
    marginTop: 18,
    color: "#f7f8fa",
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "500",
    letterSpacing: 0
  }
});
