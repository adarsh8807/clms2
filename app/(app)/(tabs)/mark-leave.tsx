import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SectionCard, Button } from "@/components/ui";
import { LEAVE_TYPES, todayISO, type LeaveType } from "@/lib/leave";

export default function MarkLeaveScreen() {
  const { profile, role } = useAuth();
  const qc = useQueryClient();
  const [teacherId, setTeacherId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("casual");
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [session, setSession] = useState("full_day");
  const [reason, setReason] = useState("");
  const [payDecision, setPayDecision] = useState("paid");
  const [busy, setBusy] = useState(false);

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-for-marking", profile?.department_id, role],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, full_name").order("full_name");
      if (role === "hod") q = q.eq("department_id", profile!.department_id ?? "");
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  async function submit() {
    if (!teacherId) return Alert.alert("Error", "Please select a teacher.");
    if (!reason.trim()) return Alert.alert("Error", "Please give a reason.");
    setBusy(true);
    try {
      const { error } = await supabase.from("leave_requests").insert({
        teacher_id: teacherId,
        department_id: profile!.department_id,
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        session,
        reason: reason.trim(),
        status: "approved",
        total_days: 1,
        paid_days: payDecision === "paid" ? 1 : 0,
        unpaid_days: payDecision === "unpaid" ? 1 : 0,
        payment_decision: payDecision,
        applied_by: profile!.id,
      });
      if (error) Alert.alert("Error", error.message);
      else {
        Alert.alert("Success", "Leave marked successfully.");
        setReason("");
        setTeacherId("");
        qc.invalidateQueries({ queryKey: ["leave-requests"] });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Mark Leave" subtitle="Record absence on behalf of a teacher">
      <SectionCard title="Select Teacher">
        {teachers.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.teacherBtn, teacherId === t.id && styles.teacherBtnActive]}
            onPress={() => setTeacherId(t.id)}
          >
            <Text style={[styles.teacherText, teacherId === t.id && styles.teacherTextActive]}>
              {t.full_name}
            </Text>
          </TouchableOpacity>
        ))}
      </SectionCard>

      <SectionCard title="Leave Details">
        <Text style={styles.label}>Leave Type</Text>
        <View style={styles.typeRow}>
          {LEAVE_TYPES.map((lt) => (
            <TouchableOpacity
              key={lt.value}
              style={[styles.typeBtn, leaveType === lt.value && styles.typeBtnActive]}
              onPress={() => setLeaveType(lt.value)}
            >
              <Text style={[styles.typeBtnText, leaveType === lt.value && styles.typeBtnTextActive]}>
                {lt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>From</Text>
            <TextInput style={styles.input} value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>To</Text>
            <TextInput style={styles.input} value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>Payment</Text>
        <View style={styles.payRow}>
          {["paid", "unpaid"].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.payBtn, payDecision === p && (p === "paid" ? styles.payBtnPaid : styles.payBtnUnpaid)]}
              onPress={() => setPayDecision(p)}
            >
              <Text style={[styles.payBtnText, payDecision === p && { color: "#fff" }]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 10 }]}>Reason</Text>
        <TextInput
          style={styles.textarea}
          value={reason}
          onChangeText={setReason}
          placeholder="Reason for marking leave..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </SectionCard>

      <Button title={busy ? "Marking…" : "Mark Leave"} onPress={submit} loading={busy} />
    </AppShell>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111827" },
  teacherBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 6 },
  teacherBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#eff6ff" },
  teacherText: { fontSize: 13, color: "#374151" },
  teacherTextActive: { color: "#1d4ed8", fontWeight: "700" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6 },
  typeBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#1d4ed8" },
  typeBtnText: { fontSize: 12, color: "#374151" },
  typeBtnTextActive: { color: "#fff" },
  dateRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
  payRow: { flexDirection: "row", gap: 8 },
  payBtn: { flex: 1, paddingVertical: 8, borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, alignItems: "center" },
  payBtnPaid: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  payBtnUnpaid: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  payBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  textarea: { borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, padding: 10, fontSize: 14, color: "#111827", minHeight: 80 },
});
