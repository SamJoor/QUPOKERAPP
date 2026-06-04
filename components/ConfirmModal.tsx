import { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { Modal, Portal, Text } from "react-native-paper";
import { colors } from "@/constants/theme";
import { AppButton } from "./AppButton";

type Props = PropsWithChildren<{
  visible: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onDismiss: () => void;
}>;

export function ConfirmModal({ visible, title, body, confirmLabel = "Confirm", onConfirm, onDismiss, children }: Props) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {children}
        <View style={styles.actions}>
          <AppButton mode="outlined" onPress={onDismiss}>
            Cancel
          </AppButton>
          <AppButton onPress={onConfirm}>{confirmLabel}</AppButton>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { margin: 20, padding: 20, borderRadius: 22, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, gap: 14 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },
  body: { color: colors.muted, lineHeight: 21 },
  actions: { gap: 10 }
});
