import { Dialog, Portal, Text } from "react-native-paper";
import { StyleSheet } from "react-native";
import { AppButton } from "@/components/AppButton";
import { colors, fonts } from "@/constants/theme";

type Variant = "verification" | "reset";

/** Shown right after an auth email is dispatched. Mail from a new sending address very
 * often lands in spam on first contact, and a user who never finds the message reads it
 * as the app being broken rather than as a filing problem. */
export function CheckEmailDialog({
  visible,
  onDismiss,
  email,
  variant
}: {
  visible: boolean;
  onDismiss: () => void;
  email?: string;
  variant: Variant;
}) {
  const target = email ? email : "your email";
  const what = variant === "verification" ? "a verification code" : "a password reset link";

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Check your email</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.body}>
            We sent {what} to {target}.
          </Text>
          <Text style={styles.spam}>
            It can take a minute to arrive. If it is not in your inbox, check your spam or junk
            folder — and mark it as not spam so the next one reaches you.
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <AppButton mode="text" onPress={onDismiss}>
            Got it
          </AppButton>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { backgroundColor: colors.surface, borderRadius: 22, borderColor: colors.border, borderWidth: 1 },
  title: { color: colors.text, fontFamily: fonts.heading, fontWeight: "900" },
  body: { color: colors.text, fontFamily: fonts.medium, lineHeight: 22, marginBottom: 10 },
  spam: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 }
});
