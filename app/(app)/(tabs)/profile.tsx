import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useBalances } from "@/hooks/useBalances";
import { AppShell } from "@/components/AppShell";
import { SectionCard, Button, InfoRow, StatCard } from "@/components/ui";
import { money } from "@/lib/leave";

export default function ProfileScreen() {
  const { profile, role, signOut, refresh } = useAuth();
  const qc = useQueryClient();
  const { data: balances = [] } = useBalances(profile?.id);

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [designation, setDesignation] = useState(profile?.designation ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!fullName.trim()) return Alert.alert("Error", "Name cannot be empty.");
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), designation: designation.trim() })
        .eq("id", profile!.id);
      if (error) Alert.alert("Error", error.message);
      else {
        await refresh();
        setEditing(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          qc.clear();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  }

  async function changePassword() {
    Alert.prompt(
      "New Password",
      "Enter your new password (min 8 characters):",
      async (pwd) => {
        if (!pwd || pwd.length < 8) {
          Alert.alert("Error", "Password must be at least 8 characters.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: pwd });
        if (error) Alert.alert("Error", error.message);
        else Alert.alert("Success", "Password updated successfully.");
      },
      "secure-text"
    );
  }

  return (
    <AppShell title="My Profile" subtitle="Account settings">
      {/* Avatar + name */}
      <SectionCard>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.slice(0, 2).toUpperCase() ?? "??"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile?.full_name}</Text>
            <Text style={styles.desig}>{profile?.designation}</Text>
            <Text style={styles.dept}>{profile?.department_name ?? "No department"}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role?.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      </SectionCard>

      {/* Leave balances */}
      <SectionCard title="Leave Balances (This Year)">
        <View style={styles.balancesGrid}>
          {balances.map((b) => (
            <View key={b.type} style={styles.balanceItem}>
              <Text style={[styles.balanceVal, b.remaining === 0 && { color: "#dc2626" }]}>
                {b.remaining}
              </Text>
              <Text style={styles.balanceLbl}>{b.label.replace(" Leave", "")}</Text>
              <Text style={styles.balanceSub}>of {b.yearly}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Personal info */}
      <SectionCard title="Personal Information">
        {editing ? (
          <View>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full Name"
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Designation</Text>
            <TextInput
              style={styles.input}
              value={designation}
              onChangeText={setDesignation}
              placeholder="Designation"
            />
            <View style={styles.editBtnRow}>
              <Button title="Save" onPress={save} loading={busy} size="sm" style={{ flex: 1 }} />
              <Button
                title="Cancel"
                onPress={() => setEditing(false)}
                variant="ghost"
                size="sm"
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <View>
            <InfoRow label="Full Name" value={profile?.full_name} />
            <InfoRow label="Designation" value={profile?.designation} />
            <InfoRow label="Department" value={profile?.department_name ?? "—"} />
            <InfoRow label="Monthly Salary" value={money(profile?.monthly_salary ?? 0)} />
            <InfoRow label="Status" value={profile?.approved ? "Active" : "Pending Approval"} />
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editLink}>
              <Text style={styles.editLinkText}>Edit Profile →</Text>
            </TouchableOpacity>
          </View>
        )}
      </SectionCard>

      {/* Security */}
      <SectionCard title="Security">
        <Button
          title="Change Password"
          onPress={changePassword}
          variant="outline"
          style={{ marginBottom: 8 }}
        />
      </SectionCard>

      {/* Sign out */}
      <Button title="Sign Out" onPress={handleSignOut} variant="danger" />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#1d4ed8" },
  name: { fontSize: 16, fontWeight: "700", color: "#111827" },
  desig: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  dept: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  roleBadge: {
    marginTop: 6,
    backgroundColor: "#eff6ff",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  roleText: { fontSize: 10, fontWeight: "700", color: "#1d4ed8", letterSpacing: 1 },
  balancesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  balanceItem: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  balanceVal: { fontSize: 22, fontWeight: "800", color: "#111827" },
  balanceLbl: { fontSize: 10, color: "#6b7280", marginTop: 2, textAlign: "center" },
  balanceSub: { fontSize: 9, color: "#9ca3af", marginTop: 1 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  editBtnRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  editLink: { marginTop: 10 },
  editLinkText: { color: "#1d4ed8", fontWeight: "600", fontSize: 13 },
});
