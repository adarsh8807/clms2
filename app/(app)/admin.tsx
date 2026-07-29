import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView, Platform } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Badge, Empty } from "@/components/ui";
import { fmtDate, money, LEAVE_TYPES, type LeaveType } from "@/lib/leave";
import type { AppRole } from "@/lib/auth";

type AdminTab = "users" | "departments" | "holidays" | "analytics";

export default function AdminScreen() {
  const { profile, signOut } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<AdminTab>("users");

  async function handleSignOut() {
    Alert.alert("Sign Out", "Sign out of admin panel?", [
      { text: "Cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await signOut(); qc.clear(); router.replace("/(auth)/sign-in"); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSub}>{profile?.full_name}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll} contentContainerStyle={styles.tabBarContent}>
        {(["users","departments","holidays","analytics"] as AdminTab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {tab === "users"       && <UsersTab />}
        {tab === "departments" && <DepartmentsTab />}
        {tab === "holidays"    && <HolidaysTab />}
        {tab === "analytics"   && <AnalyticsTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const qc = useQueryClient();
  const [addForm, setAddForm] = useState({ email: "", password: "", fullName: "", designation: "Assistant Professor", departmentId: "", role: "teacher", monthlySalary: "60000" });
  const [addBusy, setAddBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const { data: depts = [] } = useQuery({
    queryKey: ["admin-depts-users"],
    queryFn: async () => { const { data } = await supabase.from("departments").select("id, name").order("name"); return data ?? []; },
  });

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const [{ count: leaves }, { count: pendingLeaves }, { data: unpaid }] = await Promise.all([
        supabase.from("leave_requests").select("id", { count: "exact", head: true }),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).in("status", ["pending_hod", "hod_recommended", "pending_principal"]),
        supabase.from("leave_requests").select("unpaid_days").eq("status", "approved").gte("from_date", `${year}-01-01`),
      ]);
      return { leaves: leaves ?? 0, pendingLeaves: pendingLeaves ?? 0, unpaidDays: (unpaid ?? []).reduce((s, l) => s + Number(l.unpaid_days), 0) };
    },
  });

  const { data: allStaff = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*, departments(name)").order("full_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p: any) => ({
        ...p,
        dept_name: p.departments?.name ?? "—",
        role: (roles ?? []).find((r) => r.user_id === p.id)?.role ?? "teacher",
        monthly_salary: Number(p.monthly_salary ?? 0),
      }));
    },
  });

  const pending = allStaff.filter((s) => !s.approved);
  const payroll = allStaff.filter((s) => s.role !== "admin").reduce((s, r) => s + r.monthly_salary, 0);

  async function approveUser(id: string, userId: string) {
    const { error } = await supabase.from("profiles").update({ approved: true }).eq("id", id);
    if (error) Alert.alert("Error", error.message);
    else qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function rejectUser(id: string) {
    Alert.alert("Reject Registration", "This will permanently delete this account.", [
      { text: "Cancel" },
      { text: "Reject & Delete", style: "destructive", onPress: async () => {
        await supabase.from("profiles").delete().eq("id", id);
        qc.invalidateQueries({ queryKey: ["admin-users"] });
      }},
    ]);
  }

  async function setRole(userId: string, role: AppRole, departmentId: string | null) {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role, department_id: role === "principal" || role === "admin" ? null : departmentId });
    if (error) Alert.alert("Error", error.message);
    else qc.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function updateSalary(id: string, current: number) {
    Alert.prompt("Update Salary", `Current: ${money(current)}\nEnter new monthly salary (₹):`, async (val) => {
      const num = parseFloat(val ?? "");
      if (isNaN(num) || num < 0) { Alert.alert("Error", "Please enter a valid amount."); return; }
      await supabase.from("profiles").update({ monthly_salary: num }).eq("id", id);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    }, "plain-text", String(current));
  }

  async function addStaff() {
    if (!addForm.fullName.trim() || !addForm.email.trim() || !addForm.password) return Alert.alert("Error", "Name, email and password are required.");
    if (addForm.password.length < 8) return Alert.alert("Error", "Password must be at least 8 characters.");
    setAddBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: addForm.email.trim(),
        password: addForm.password,
        options: {
          data: {
            full_name: addForm.fullName.trim(),
            designation: addForm.designation,
            department_id: addForm.role === "principal" ? null : addForm.departmentId || null,
            role: addForm.role,
            monthly_salary: Number(addForm.monthlySalary) || 0,
            admin_created: true,
          },
        },
      });
      if (error) { Alert.alert("Error", error.message); return; }
      Alert.alert("Success", "Staff account created.");
      setAddForm({ email: "", password: "", fullName: "", designation: "Assistant Professor", departmentId: "", role: "teacher", monthlySalary: "60000" });
      setShowAdd(false);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } finally {
      setAddBusy(false);
    }
  }

  return (
    <View>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statVal}>{allStaff.length}</Text><Text style={styles.statLbl}>Staff</Text></View>
        <View style={styles.statCard}><Text style={[styles.statVal, pending.length > 0 && { color: "#d97706" }]}>{pending.length}</Text><Text style={styles.statLbl}>Pending</Text></View>
        <View style={styles.statCard}><Text style={styles.statVal}>{stats?.pendingLeaves ?? 0}</Text><Text style={styles.statLbl}>Pending Leaves</Text></View>
        <View style={styles.statCard}><Text style={styles.statVal}>{money(payroll)}</Text><Text style={styles.statLbl}>Monthly Payroll</Text></View>
      </View>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <View style={adminStyles.section}>
          <Text style={adminStyles.sectionTitle}>⏳ Pending Registrations ({pending.length})</Text>
          {pending.map((u: any) => (
            <View key={u.id} style={adminStyles.card}>
              <Text style={adminStyles.name}>{u.full_name}</Text>
              <Text style={adminStyles.meta}>{u.designation} · {u.dept_name}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                <Button title="Approve" onPress={() => approveUser(u.id, u.user_id)} size="sm" style={{ flex: 1 }} />
                <Button title="Reject" onPress={() => rejectUser(u.id)} size="sm" variant="danger" style={{ flex: 1 }} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Add staff */}
      <TouchableOpacity style={adminStyles.toggleBtn} onPress={() => setShowAdd(!showAdd)}>
        <Text style={adminStyles.toggleBtnText}>{showAdd ? "Cancel" : "+ Add Staff Account"}</Text>
      </TouchableOpacity>

      {showAdd && (
        <View style={adminStyles.card}>
          <Text style={adminStyles.sectionTitle}>Add Staff</Text>
          {[
            { label: "Full Name *", key: "fullName", placeholder: "Dr. Priya Sharma" },
            { label: "Email (User ID) *", key: "email", placeholder: "priya@csc.edu", keyboard: "email-address" },
            { label: "Temporary Password *", key: "password", placeholder: "Min 8 characters", secure: true },
            { label: "Designation", key: "designation", placeholder: "Assistant Professor" },
            { label: "Monthly Salary (₹)", key: "monthlySalary", placeholder: "60000", keyboard: "numeric" },
          ].map((f) => (
            <View key={f.key}>
              <Text style={adminStyles.label}>{f.label}</Text>
              <TextInput
                style={adminStyles.input}
                value={(addForm as any)[f.key]}
                onChangeText={(v) => setAddForm({ ...addForm, [f.key]: v })}
                placeholder={f.placeholder}
                secureTextEntry={f.secure}
                keyboardType={(f.keyboard as any) ?? "default"}
                autoCapitalize="none"
              />
            </View>
          ))}
          <Text style={[adminStyles.label, { marginTop: 8 }]}>Role</Text>
          <View style={adminStyles.roleRow}>
            {["teacher", "hod", "principal"].map((r) => (
              <TouchableOpacity key={r} style={[adminStyles.roleBtn, addForm.role === r && adminStyles.roleBtnActive]} onPress={() => setAddForm({ ...addForm, role: r })}>
                <Text style={[adminStyles.roleBtnText, addForm.role === r && adminStyles.roleBtnTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {addForm.role !== "principal" && (
            <>
              <Text style={[adminStyles.label, { marginTop: 8 }]}>Department</Text>
              <View style={adminStyles.roleRow}>
                {depts.map((d: any) => (
                  <TouchableOpacity key={d.id} style={[adminStyles.roleBtn, addForm.departmentId === d.id && adminStyles.roleBtnActive]} onPress={() => setAddForm({ ...addForm, departmentId: d.id })}>
                    <Text style={[adminStyles.roleBtnText, addForm.departmentId === d.id && adminStyles.roleBtnTextActive]}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <Button title={addBusy ? "Creating…" : "Create Account"} onPress={addStaff} loading={addBusy} style={{ marginTop: 12 }} />
        </View>
      )}

      {/* All staff */}
      <View style={adminStyles.section}>
        <Text style={adminStyles.sectionTitle}>All Staff ({allStaff.length})</Text>
        {isLoading ? <Text style={{ color: "#9ca3af", textAlign: "center" }}>Loading…</Text>
          : allStaff.map((u: any) => (
            <View key={u.id} style={adminStyles.card}>
              <View style={adminStyles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={adminStyles.name}>{u.full_name}</Text>
                  <Text style={adminStyles.meta}>{u.designation} · {u.dept_name}</Text>
                  <Text style={adminStyles.meta}>Salary: {money(u.monthly_salary)}</Text>
                </View>
                <Badge color={u.approved ? "#16a34a" : "#d97706"}>{u.approved ? "Active" : "Pending"}</Badge>
              </View>

              {/* Role selector */}
              <Text style={[adminStyles.label, { marginTop: 8 }]}>Role</Text>
              <View style={adminStyles.roleRow}>
                {(["teacher", "hod", "principal", "admin"] as AppRole[]).map((r) => (
                  <TouchableOpacity key={r} style={[adminStyles.roleBtn, u.role === r && adminStyles.roleBtnActive]} onPress={() => setRole(u.id, r, u.department_id)}>
                    <Text style={[adminStyles.roleBtnText, u.role === r && adminStyles.roleBtnTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => updateSalary(u.id, u.monthly_salary)}>
                <Text style={adminStyles.actionLink}>Edit Salary →</Text>
              </TouchableOpacity>
            </View>
          ))}
      </View>
    </View>
  );
}

// ── Departments Tab ───────────────────────────────────────────────────────────
function DepartmentsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", courses: "", classes: "" });
  const [busy, setBusy] = useState(false);

  const { data: depts = [] } = useQuery({
    queryKey: ["admin-depts"],
    queryFn: async () => { const { data } = await supabase.from("departments").select("*").order("name"); return data ?? []; },
  });

  async function add() {
    if (!form.name.trim()) return Alert.alert("Error", "Department name is required.");
    setBusy(true);
    try {
      const { error } = await supabase.from("departments").insert({ name: form.name.trim(), courses: form.courses.trim() || null, classes: form.classes.trim() || null });
      if (error) Alert.alert("Error", error.message);
      else { setForm({ name: "", courses: "", classes: "" }); qc.invalidateQueries({ queryKey: ["admin-depts"] }); }
    } finally { setBusy(false); }
  }

  async function del(id: string, name: string) {
    Alert.alert("Delete Department", `Delete "${name}"?`, [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await supabase.from("departments").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-depts"] }); } },
    ]);
  }

  return (
    <View>
      <View style={adminStyles.card}>
        <Text style={adminStyles.sectionTitle}>Add Department</Text>
        {[{ label: "Name *", key: "name", ph: "Computer Science" }, { label: "Courses (optional)", key: "courses", ph: "BSc CS, MSc CS" }, { label: "Classes (optional)", key: "classes", ph: "FY, SY, TY" }].map((f) => (
          <View key={f.key}>
            <Text style={adminStyles.label}>{f.label}</Text>
            <TextInput style={adminStyles.input} value={(form as any)[f.key]} onChangeText={(v) => setForm({ ...form, [f.key]: v })} placeholder={f.ph} />
          </View>
        ))}
        <Button title={busy ? "Adding…" : "Add Department"} onPress={add} loading={busy} style={{ marginTop: 12 }} />
      </View>
      {depts.map((d: any) => (
        <View key={d.id} style={adminStyles.card}>
          <View style={adminStyles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={adminStyles.name}>{d.name}</Text>
              {d.courses && <Text style={adminStyles.meta}>Courses: {d.courses}</Text>}
              {d.classes && <Text style={adminStyles.meta}>Classes: {d.classes}</Text>}
            </View>
            <TouchableOpacity onPress={() => del(d.id, d.name)}>
              <Text style={{ color: "#dc2626", fontSize: 22 }}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Holidays Tab ──────────────────────────────────────────────────────────────
function HolidaysTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ date: "", occasion: "", kind: "National" });
  const [busy, setBusy] = useState(false);

  const { data: holidays = [] } = useQuery({
    queryKey: ["admin-holidays"],
    queryFn: async () => { const { data } = await supabase.from("holidays").select("*").order("holiday_date"); return data ?? []; },
  });

  async function add() {
    if (!form.date || !form.occasion.trim()) return Alert.alert("Error", "Date and occasion are required.");
    setBusy(true);
    try {
      const { error } = await supabase.from("holidays").insert({ holiday_date: form.date, occasion: form.occasion.trim(), kind: form.kind });
      if (error) Alert.alert("Error", error.message);
      else { setForm({ date: "", occasion: "", kind: "National" }); qc.invalidateQueries({ queryKey: ["admin-holidays"] }); }
    } finally { setBusy(false); }
  }

  async function del(id: string) {
    await supabase.from("holidays").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-holidays"] });
  }

  return (
    <View>
      <View style={adminStyles.card}>
        <Text style={adminStyles.sectionTitle}>Add Holiday</Text>
        <Text style={adminStyles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput style={adminStyles.input} value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} placeholder="2025-01-26" keyboardType="numbers-and-punctuation" />
        <Text style={[adminStyles.label, { marginTop: 8 }]}>Occasion</Text>
        <TextInput style={adminStyles.input} value={form.occasion} onChangeText={(v) => setForm({ ...form, occasion: v })} placeholder="Republic Day" />
        <Text style={[adminStyles.label, { marginTop: 8 }]}>Kind</Text>
        <View style={adminStyles.roleRow}>
          {["National", "State", "College"].map((k) => (
            <TouchableOpacity key={k} style={[adminStyles.roleBtn, form.kind === k && adminStyles.roleBtnActive]} onPress={() => setForm({ ...form, kind: k })}>
              <Text style={[adminStyles.roleBtnText, form.kind === k && adminStyles.roleBtnTextActive]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Button title={busy ? "Adding…" : "Add Holiday"} onPress={add} loading={busy} style={{ marginTop: 12 }} />
      </View>
      {holidays.map((h: any) => (
        <View key={h.id} style={adminStyles.card}>
          <View style={adminStyles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={adminStyles.name}>{h.occasion}</Text>
              <Text style={adminStyles.meta}>{fmtDate(h.holiday_date)} · {h.kind}</Text>
            </View>
            <TouchableOpacity onPress={() => del(h.id)}>
              <Text style={{ color: "#dc2626", fontSize: 22 }}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const year = new Date().getFullYear();
  const [activeModule, setActiveModule] = useState("teacher");

  const MODULES = [
    { key: "teacher",    label: "Teacher Report",    desc: "Faculty attendance & subject allocation" },
    { key: "department", label: "Department Report",  desc: "Department-level leave metrics" },
    { key: "history",    label: "Leave History",      desc: "Audit trail of all leave requests" },
    { key: "attendance", label: "Attendance Report",  desc: "Monthly attendance percentages" },
    { key: "payroll",    label: "Payroll Report",     desc: "Salary impact from unpaid leaves" },
  ];

  const { data: reportData } = useQuery({
    queryKey: ["admin-report-data", year],
    queryFn: async () => {
      const { data: leaves } = await supabase.from("leave_requests").select("id, teacher_id, leave_type, from_date, to_date, session, total_days, paid_days, unpaid_days, status, reason").gte("from_date", `${year}-01-01`).lte("from_date", `${year}-12-31`).order("from_date");
      const ids = [...new Set((leaves ?? []).map((l) => l.teacher_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, department_id, departments(name)").in("id", ids);
      const people: Record<string, any> = {};
      for (const p of profiles ?? []) people[(p as any).id] = { full_name: (p as any).full_name, department_name: (p as any).departments?.name ?? null };
      return { leaves: leaves ?? [], people };
    },
  });

  const leaves = reportData?.leaves ?? [];
  const people = reportData?.people ?? {};

  const byType = LEAVE_TYPES.map((t) => ({ ...t, count: leaves.filter((l) => l.leave_type === t.value && l.status === "approved").reduce((s, l) => s + Number(l.total_days), 0) }));
  const maxCount = Math.max(1, ...byType.map((t) => t.count));

  function getRows(): Record<string, any>[] {
    if (activeModule === "teacher") {
      return leaves.map((l) => ({ Teacher: (people as any)[l.teacher_id]?.full_name ?? "—", Department: (people as any)[l.teacher_id]?.department_name ?? "—", "Leave Type": l.leave_type, From: l.from_date, To: l.to_date, Days: l.total_days, "Paid Days": l.paid_days, "Pay Cut": l.unpaid_days, Status: l.status }));
    }
    if (activeModule === "department") {
      const map: Record<string, any> = {};
      for (const l of leaves) { const d = (people as any)[l.teacher_id]?.department_name ?? "Unknown"; if (!map[d]) map[d] = { total: 0, unpaid: 0, count: 0 }; map[d].total += Number(l.total_days); map[d].unpaid += Number(l.unpaid_days); map[d].count++; }
      return Object.entries(map).map(([dept, v]) => ({ Department: dept, Requests: v.count, "Total Days": v.total, "Pay Cut Days": v.unpaid }));
    }
    if (activeModule === "history") {
      return leaves.map((l) => ({ Teacher: (people as any)[l.teacher_id]?.full_name ?? "—", Type: l.leave_type, From: l.from_date, To: l.to_date, Session: l.session, Days: l.total_days, "Paid": l.paid_days, "Unpaid": l.unpaid_days, Status: l.status, Reason: l.reason }));
    }
    if (activeModule === "attendance") {
      const map: Record<string, Record<string, number>> = {};
      for (const l of leaves) { const name = (people as any)[l.teacher_id]?.full_name ?? "—"; const m = l.from_date.slice(0, 7); if (!map[name]) map[name] = {}; map[name][m] = (map[name][m] ?? 0) + Number(l.total_days); }
      return Object.entries(map).flatMap(([name, months]) => Object.entries(months).map(([month, days]) => ({ Teacher: name, Month: month, "Leave Days": days, "Working Days": 26, "Attendance %": (((26 - days) / 26) * 100).toFixed(1) + "%" })));
    }
    if (activeModule === "payroll") {
      return leaves.filter((l) => Number(l.unpaid_days) > 0).map((l) => ({ Teacher: (people as any)[l.teacher_id]?.full_name ?? "—", Dept: (people as any)[l.teacher_id]?.department_name ?? "—", Type: l.leave_type, From: l.from_date, To: l.to_date, "Pay Cut Days": l.unpaid_days, Status: l.status }));
    }
    return [];
  }

  function exportCSV() {
    const rows = getRows();
    if (rows.length === 0) { Alert.alert("No Data", "No data to export for this report."); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    Alert.alert("CSV Export", `${rows.length} rows ready.\n\nOn mobile, integrate with react-native-fs or expo-file-system to save.\n\nHeaders: ${headers.slice(0, 3).join(", ")}…`);
  }

  return (
    <View>
      {/* Leave type bar chart */}
      <View style={adminStyles.card}>
        <Text style={adminStyles.sectionTitle}>Approved Leave Days by Type ({year})</Text>
        {byType.map((t) => (
          <View key={t.value} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: "#374151" }}>{t.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1d4ed8" }}>{t.count}</Text>
            </View>
            <View style={{ height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
              <View style={{ height: "100%", width: `${(t.count / maxCount) * 100}%`, backgroundColor: "#1d4ed8", borderRadius: 4 }} />
            </View>
          </View>
        ))}
      </View>

      {/* Module selector */}
      <View style={adminStyles.card}>
        <Text style={adminStyles.sectionTitle}>Report Modules</Text>
        {MODULES.map((m) => (
          <TouchableOpacity key={m.key} style={[adminStyles.moduleBtn, activeModule === m.key && adminStyles.moduleBtnActive]} onPress={() => setActiveModule(m.key)}>
            <View style={[adminStyles.moduleIcon, activeModule === m.key && adminStyles.moduleIconActive]}>
              <Text style={{ fontSize: 16 }}>📊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[adminStyles.moduleName, activeModule === m.key && { color: "#1d4ed8" }]}>{m.label}</Text>
              <Text style={adminStyles.moduleDesc}>{m.desc}</Text>
            </View>
            <Text style={{ color: activeModule === m.key ? "#1d4ed8" : "#9ca3af", fontSize: 16 }}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Button title="Export CSV" onPress={exportCSV} variant="outline" style={{ flex: 1 }} />
          <Button title={`${getRows().length} rows`} variant="ghost" style={{ flex: 1 }} />
        </View>
        <Text style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 6 }}>
          For PDF export, open the web version of CLMS.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { backgroundColor: "#1d4ed8", paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "#bfdbfe", marginTop: 2 },
  signOutBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  signOutText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  tabBarScroll: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", flexGrow: 0 },
  tabBarContent: { paddingHorizontal: 8, paddingVertical: 4 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 2 },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#1d4ed8" },
  tabText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  tabTextActive: { color: "#1d4ed8", fontWeight: "700" },
  body: { flex: 1 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  statCard: { flex: 1, minWidth: "40%", backgroundColor: "#fff", borderRadius: 10, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", elevation: 1 },
  statVal: { fontSize: 18, fontWeight: "800", color: "#111827" },
  statLbl: { fontSize: 10, color: "#9ca3af", marginTop: 2, textAlign: "center" },
});

const adminStyles = StyleSheet.create({
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 10 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  name: { fontSize: 14, fontWeight: "700", color: "#111827" },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  label: { fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111827", marginBottom: 4 },
  roleRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 4 },
  roleBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db" },
  roleBtnActive: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  roleBtnText: { fontSize: 11, color: "#6b7280", fontWeight: "500" },
  roleBtnTextActive: { color: "#fff", fontWeight: "700" },
  actionLink: { color: "#1d4ed8", fontWeight: "600", fontSize: 12, marginTop: 8 },
  toggleBtn: { backgroundColor: "#eff6ff", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: "#bfdbfe" },
  toggleBtnText: { color: "#1d4ed8", fontWeight: "700", fontSize: 14 },
  moduleBtn: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  moduleBtnActive: { backgroundColor: "#eff6ff", marginHorizontal: -14, paddingHorizontal: 14 },
  moduleIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  moduleIconActive: { backgroundColor: "#dbeafe" },
  moduleName: { fontSize: 13, fontWeight: "700", color: "#111827" },
  moduleDesc: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
});
