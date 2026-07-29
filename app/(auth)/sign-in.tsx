import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui";
import { useQuery } from "@tanstack/react-query";

type Mode = "signin" | "register";

export default function SignInScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const { role } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo / Header */}
          <View style={styles.logoSection}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>CSC</Text>
            </View>
            <Text style={styles.appTitle}>Leave Management System</Text>
            <Text style={styles.appSub}>Chandrabhan Sharma College</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tabs */}
            <View style={styles.tabs}>
              {(["signin", "register"] as Mode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.tab, mode === m && styles.tabActive]}
                  onPress={() => setMode(m)}
                >
                  <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                    {m === "signin" ? "Sign In" : "Register"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {mode === "signin" ? <SignInForm /> : <RegisterForm />}
          </View>

          {/* Footer bullets */}
          <View style={styles.footer}>
            <Text style={styles.footerItem}>· 2 casual leaves a month, 12 a year — paid.</Text>
            <Text style={styles.footerItem}>· Anything beyond balance is a pay cut.</Text>
            <Text style={styles.footerItem}>· HOD assigns proxy; principal gives final nod.</Text>
            <Text style={styles.footerItem}>· Sundays and holidays never cut pay.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SignInForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const { refresh, role } = useAuth();

  async function submit() {
    if (!identifier.trim() || !password) {
      Alert.alert("Error", "Please enter your user ID and password.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier.trim().includes("@") ? identifier.trim() : identifier.trim() + "@csc.internal",
        password,
      });
      if (error) {
        // Try with raw identifier as email
        const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
          email: identifier.trim(),
          password,
        });
        if (e2) {
          Alert.alert("Sign in failed", "Invalid user ID or password.");
          return;
        }
      }
      await refresh();
      router.replace("/");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>User ID (email or college ID)</Text>
      <TextInput
        style={styles.input}
        value={identifier}
        onChangeText={setIdentifier}
        placeholder="priya.sharma@csc.edu"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          secureTextEntry={!showPass}
          autoComplete="password"
        />
        <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPass(!showPass)}>
          <Text style={styles.eyeText}>{showPass ? "Hide" : "Show"}</Text>
        </TouchableOpacity>
      </View>

      <Button
        title={busy ? "Signing in…" : "Sign In"}
        onPress={submit}
        disabled={busy}
        loading={busy}
        style={{ marginTop: 20 }}
      />
    </View>
  );
}

function RegisterForm() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    designation: "Assistant Professor",
    departmentId: "",
    role: "teacher",
  });
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const { refresh } = useAuth();

  const { data: departments = [] } = useQuery({
    queryKey: ["departments-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const isAdmin = form.role === "admin";

  async function submit() {
    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      Alert.alert("Error", "Please fill all required fields.");
      return;
    }
    if (!isAdmin && !form.departmentId) {
      Alert.alert("Error", "Please select a department.");
      return;
    }
    if (form.password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.fullName.trim(),
            designation: form.designation,
            department_id: isAdmin ? null : form.departmentId,
            role: form.role,
          },
        },
      });
      if (error) {
        Alert.alert("Registration failed", error.message);
        return;
      }
      if (form.role === "admin") {
        await refresh();
        router.replace("/");
      } else {
        setPending(true);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  if (pending) {
    return (
      <View style={styles.pendingBox}>
        <Text style={styles.pendingTitle}>Registration Submitted</Text>
        <Text style={styles.pendingText}>
          Your department's HOD will review your account. You can sign in once it has been approved.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        value={form.fullName}
        onChangeText={(v) => setForm({ ...form, fullName: v })}
        placeholder="Dr. Priya Sharma"
      />

      <Text style={[styles.label, { marginTop: 14 }]}>Email (User ID)</Text>
      <TextInput
        style={styles.input}
        value={form.email}
        onChangeText={(v) => setForm({ ...form, email: v })}
        placeholder="priya.sharma@csc.edu"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
      <TextInput
        style={styles.input}
        value={form.password}
        onChangeText={(v) => setForm({ ...form, password: v })}
        placeholder="Minimum 8 characters"
        secureTextEntry
      />

      <Text style={[styles.label, { marginTop: 14 }]}>Designation</Text>
      <TextInput
        style={styles.input}
        value={form.designation}
        onChangeText={(v) => setForm({ ...form, designation: v })}
        placeholder="Assistant Professor"
      />

      <Text style={[styles.label, { marginTop: 14 }]}>Role</Text>
      <View style={styles.roleRow}>
        {["teacher", "admin"].map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleBtn, form.role === r && styles.roleBtnActive]}
            onPress={() => setForm({ ...form, role: r })}
          >
            <Text style={[styles.roleBtnText, form.role === r && styles.roleBtnTextActive]}>
              {r === "admin" ? "Administrator" : "Teacher"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isAdmin && (
        <>
          <Text style={[styles.label, { marginTop: 14 }]}>Department</Text>
          <View style={styles.deptList}>
            {departments.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.deptBtn, form.departmentId === d.id && styles.deptBtnActive]}
                onPress={() => setForm({ ...form, departmentId: d.id })}
              >
                <Text
                  style={[
                    styles.deptBtnText,
                    form.departmentId === d.id && styles.deptBtnTextActive,
                  ]}
                >
                  {d.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Button
        title={busy ? "Creating account…" : "Create Account"}
        onPress={submit}
        disabled={busy}
        loading={busy}
        style={{ marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#eff6ff" },
  scroll: { padding: 20, paddingBottom: 40 },
  logoSection: { alignItems: "center", paddingVertical: 32 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { color: "#fff", fontSize: 22, fontWeight: "900" },
  appTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  appSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabs: { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 8, padding: 3, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 6 },
  tabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: "500", color: "#6b7280" },
  tabTextActive: { color: "#111827", fontWeight: "700" },
  form: {},
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#fff",
    marginBottom: 2,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: { paddingHorizontal: 10, paddingVertical: 10 },
  eyeText: { fontSize: 13, color: "#1d4ed8", fontWeight: "600" },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    borderRadius: 8,
    alignItems: "center",
  },
  roleBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#eff6ff" },
  roleBtnText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  roleBtnTextActive: { color: "#1d4ed8", fontWeight: "700" },
  deptList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  deptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
  },
  deptBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#eff6ff" },
  deptBtnText: { fontSize: 12, color: "#6b7280" },
  deptBtnTextActive: { color: "#1d4ed8", fontWeight: "600" },
  pendingBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  pendingTitle: { fontWeight: "700", color: "#15803d", marginBottom: 4 },
  pendingText: { fontSize: 13, color: "#166534" },
  footer: { marginTop: 24, paddingHorizontal: 4 },
  footerItem: { fontSize: 12, color: "#6b7280", marginBottom: 4, lineHeight: 18 },
});
