import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AdminHeader } from "@/components/AdminHeader";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";
import { adjustMemberPoints, getAdminMembers } from "@/lib/admin";
import { Profile } from "@/lib/types";

export default function AdminPointsScreen() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getAdminMembers()
      .then((rows) => {
        setMembers(rows);
        setSelectedUserId(rows[0]?.id ?? "");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load members."));
  }, []);

  async function submit() {
    try {
      await adjustMemberPoints(selectedUserId, Number(points), reason);
      setMessage("Point adjustment saved.");
      setPoints("");
      setReason("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to adjust points.");
    }
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/admin" />
      <AdminHeader title="Points ledger" subtitle="Manual adjustments are logged and require officer permissions." />
      <View style={styles.members}>
        {members.map((member) => (
          <AppButton key={member.id} mode={selectedUserId === member.id ? "contained" : "outlined"} onPress={() => setSelectedUserId(member.id)}>
            {member.full_name}
          </AppButton>
        ))}
      </View>
      <TextInput mode="outlined" label="Points adjustment, negative allowed" value={points} onChangeText={setPoints} keyboardType="numbers-and-punctuation" />
      <TextInput mode="outlined" label="Reason" value={reason} onChangeText={setReason} multiline />
      <Text style={styles.copy}>Positive adjustments increase lifetime and spendable points. Negative adjustments remove spendable points only and cannot drop a member below zero.</Text>
      <AppButton icon="plus-circle-outline" onPress={submit} disabled={!selectedUserId || !points || !reason}>
        Submit Adjustment
      </AppButton>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  members: { gap: 8 },
  copy: { color: colors.muted, lineHeight: 20 }
});
