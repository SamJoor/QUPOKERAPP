import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Snackbar, Text, TextInput } from "react-native-paper";
import { AdminHeader } from "@/components/AdminHeader";
import { AppButton } from "@/components/AppButton";
import { BackButton } from "@/components/BackButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { PointsPill } from "@/components/PointsPill";
import { colors } from "@/constants/theme";
import { getAdminMembers, setMemberRole } from "@/lib/admin";
import { Profile } from "@/lib/types";

export default function AdminMembersScreen() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    setMembers(await getAdminMembers());
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load members."));
  }, []);

  const filtered = useMemo(
    () => members.filter((member) => `${member.full_name} ${member.email}`.toLowerCase().includes(query.toLowerCase())),
    [members, query]
  );

  async function updateRole(member: Profile) {
    try {
      const nextRole = member.role === "admin" ? "member" : "admin";
      await setMemberRole(member.id, nextRole);
      setMessage(`${member.full_name} is now ${nextRole}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update role.");
    }
  }

  return (
    <ScreenContainer>
      <BackButton fallback="/admin" />
      <AdminHeader title="Members" subtitle="Search members, review attendance, adjust roles, and inspect point history." />
      <TextInput mode="outlined" label="Search members" value={query} onChangeText={setQuery} />
      {filtered.map((member) => (
        <View key={member.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{member.full_name}</Text>
              <Text style={styles.email}>{member.email}</Text>
              <Text style={styles.role}>{member.role.toUpperCase()}</Text>
            </View>
            <View style={styles.pointStack}>
              <PointsPill points={member.lifetime_points ?? member.total_points} />
              <Text style={styles.spendable}>{member.spendable_points ?? member.total_points} spendable</Text>
            </View>
          </View>
          <AppButton mode="outlined" icon="account-edit-outline" onPress={() => updateRole(member)}>
            Make {member.role === "admin" ? "Member" : "Admin"}
          </AppButton>
        </View>
      ))}
      <Snackbar visible={Boolean(message)} onDismiss={() => setMessage("")}>{message}</Snackbar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 14, borderRadius: 20, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  info: { flex: 1, gap: 4 },
  name: { color: colors.text, fontWeight: "900", fontSize: 18 },
  email: { color: colors.muted },
  role: { color: colors.green, fontWeight: "900", fontSize: 12 },
  pointStack: { alignItems: "flex-end", gap: 4 },
  spendable: { color: colors.muted, fontSize: 12, fontWeight: "800" }
});
