import { useState } from "react";
import { StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { colors } from "@/constants/theme";
import { getCurrentSession, upsertProfile } from "@/lib/auth";

export default function CompleteProfileScreen() {
  const params = useLocalSearchParams<{ id?: string; email?: string; fullName?: string; next?: string }>();
  const [fullName, setFullName] = useState(params.fullName ?? "");
  const [studentId, setStudentId] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [major, setMajor] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    try {
      if (!studentId.trim()) {
        setMessage("QU Student ID is required to verify club membership.");
        return;
      }
      const session = await getCurrentSession();
      const user = session?.user;
      if (!user) {
        setMessage("Please log in before completing your profile.");
        router.replace("/auth/login");
        return;
      }
      await upsertProfile({
        id: params.id ?? user?.id ?? "",
        email: params.email ?? user?.email ?? "",
        full_name: fullName,
        student_id: studentId.trim(),
        graduation_year: graduationYear ? Number(graduationYear) : null,
        major: major || null
      });
      router.replace(params.next ? (params.next as never) : "/tabs/dashboard");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save profile.");
    }
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/auth/login" />
      <Text style={styles.title}>Complete your profile.</Text>
      <Text style={styles.subtitle}>Your QU Student ID is used by officers only to verify club membership.</Text>
      <TextInput label="Full name" value={fullName} onChangeText={setFullName} mode="outlined" />
      <TextInput label="QU Student ID" value={studentId} onChangeText={setStudentId} mode="outlined" />
      <TextInput label="Graduation year (optional)" value={graduationYear} onChangeText={setGraduationYear} keyboardType="number-pad" mode="outlined" />
      <TextInput label="Major (optional)" value={major} onChangeText={setMajor} mode="outlined" />
      <AppButton icon="check" onPress={submit} disabled={!fullName || !studentId}>
        Finish
      </AppButton>
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 34, fontWeight: "900" },
  subtitle: { color: colors.muted, lineHeight: 22 }
});
