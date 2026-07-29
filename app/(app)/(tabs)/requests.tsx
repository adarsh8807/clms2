import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Alert, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatusBadge, Empty, Button } from "@/components/ui";
import {
  eachDate, emergencyMsRemaining, fmtDate, fmtMs, fmtTime,
  leaveTypeLabel, needsPaymentDecision, SESSION_LABEL,
  type LeaveSession, type LeaveStatus, type LeaveType
} from "@/lib/leave";

export default function RequestsScreen() {
  const { profile, role } = useAuth();
  const isHod = role === "hod";
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["review-requests", role, profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase.from("leave_requests").select("*").order("created_at", { ascending: false });
      if (isHod) q = q.eq("department_id", profile!.department_id ?? "");
      else q = q.in("status", ["hod_recommended", "pending_principal", "approved", "rejected"]);
      const { data, error } = await q;
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.teacher_id);
      const { data: people } = await supabase.from("profiles").select("id, full_name, departments(name)").in("id", ids);
      const pMap = Object.fromEntries((people ?? []).map((p: any) => [p.id, { full_name: p.full_name, department_name: p.departments?.name }]));
      return (data ?? []).map((r) => ({ ...r, teacher: pMap[r.teacher_id] }));
    },
  });

  const actionable = requests.filter((r) => {
    if (isHod) return r.status === "pending_hod" || (r.leave_type === "emergency" && r.status === "pending_principal");
    return r.status === "hod_recommended" || r.status === "pending_principal";
  });
  const rest = requests.filter((r) => !actionable.includes(r));
  const displayed = filter === "pending" ? actionable : requests;

  return (
    <AppShell
      title="Leave Requests"
      subtitle={isHod ? "Assign proxies, then recommend to principal" : "Final approval for HOD-recommended requests"}
    >
      {/* Filter */}
      <View style={styles.filterRow}>
        {(["pending", "all"] as const).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === "pending" ? `Pending (${actionable.length})` : `All (${requests.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? <SectionCard><Empty>Loading…</Empty></SectionCard>
        : displayed.length === 0 ? <SectionCard><Empty>Nothing here.</Empty></SectionCard>
        : displayed.map((r) => <RequestCard key={r.id} request={r} isHod={isHod} qc={qc} />)}
    </AppShell>
  );
}

function RequestCard({ request: r, isHod, qc }: { request: any; isHod: boolean; qc: any }) {
  const { profile } = useAuth();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [payment, setPayment] = useState<"paid" | "unpaid">(r.payment_decision ?? "paid");
  const isEmergency = r.leave_type === "emergency";
  const needsDecision = needsPaymentDecision(r.leave_type as LeaveType);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [manual, setManual] = useState<{ key: string; date: string; start_time: string; end_time: string; subject: string; class_name: string }[]>([]);

  const [msLeft, setMsLeft] = useState(() => isEmergency ? emergencyMsRemaining(r.created_at) : 0);
  useEffect(() => {
    if (!isEmergency) return;
    const id = setInterval(() => {
      const rem = emergencyMsRemaining(r.created_at);
      setMsLeft(rem);
      if (rem === 0) {
        supabase.from("leave_requests").update({ status: "approved", auto_approved_at: new Date().toISOString(), paid_days: 0, unpaid_days: Number(r.total_days) })
          .eq("id", r.id).eq("status", "pending_principal")
          .then(() => qc.invalidateQueries({ queryKey: ["review-requests"] }));
        clearInterval(id);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isEmergency, r.created_at, r.id]);

  const dates = useMemo(() => eachDate(r.from_date, r.to_date), [r.from_date, r.to_date]);

  const { data: slots = [] } = useQuery({
    queryKey: ["leave-lectures", r.id],
    enabled: isHod && !isEmergency,
    queryFn: async () => {
      const { data, error } = await supabase.from("lectures").select("*").eq("teacher_id", r.teacher_id);
      if (error) throw error;
      const out: { key: string; date: string; lecture: any }[] = [];
      for (const date of dates) {
        const dow = new Date(date + "T00:00:00").getDay();
        if (dow === 0) continue;
        for (const lec of data ?? []) {
          if (lec.day_of_week !== dow) continue;
          if (r.session === "forenoon" && lec.start_time >= "13:00:00") continue;
          if (r.session === "afternoon" && lec.start_time < "13:00:00") continue;
          out.push({ key: `${date}-${lec.id}`, date, lecture: lec });
        }
      }
      return out;
    },
  });

  const { data: dept } = useQuery({
    queryKey: ["dept-availability", r.department_id],
    enabled: isHod && !isEmergency,
    queryFn: async () => {
      const { data: people } = await supabase.from("profiles").select("id, full_name").eq("department_id", r.department_id ?? "").neq("id", r.teacher_id).order("full_name");
      const { data: lectures } = await supabase.from("lectures").select("teacher_id, day_of_week, start_time, end_time");
      return { people: people ?? [], lectures: lectures ?? [] };
    },
  });

  const allSlots = useMemo(() => [
    ...slots.map((s) => ({ key: s.key, date: s.date, start_time: s.lecture.start_time, end_time: s.lecture.end_time, subject: s.lecture.subject, class_name: s.lecture.class_name, lecture_id: s.lecture.id as string | null })),
    ...manual.map((m) => ({ ...m, lecture_id: null as string | null })),
  ], [slots, manual]);

  function candidates(date: string, start: string, end: string) {
    const dow = new Date(date + "T00:00:00").getDay();
    return (dept?.people ?? []).map((p) => {
      const busy = (dept?.lectures ?? []).some((l) => l.teacher_id === p.id && l.day_of_week === dow && l.start_time < end && l.end_time > start);
      return { ...p, free: !busy };
    });
  }

  async function saveProxies(): Promise<boolean> {
    if (allSlots.length === 0) return true;
    const missing = allSlots.filter((s) => !choices[s.key]);
    if (missing.length > 0) { Alert.alert("Error", "Assign a proxy teacher for every lecture."); return false; }
    const { error } = await supabase.from("proxy_assignments").insert(
      allSlots.map((s) => ({ leave_request_id: r.id, lecture_id: s.lecture_id, proxy_teacher_id: choices[s.key], proxy_date: s.date, start_time: s.start_time, end_time: s.end_time, subject: s.subject, class_name: s.class_name }))
    );
    if (error) { Alert.alert("Error", error.message); return false; }
    return true;
  }

  async function hodRecommend() {
    setBusy(true);
    const ok = await saveProxies();
    if (!ok) { setBusy(false); return; }
    const { error } = await supabase.from("leave_requests").update({ status: "pending_principal", payment_decision: needsDecision ? payment : null, hod_note: note.trim() || null, hod_acted_at: new Date().toISOString() }).eq("id", r.id);
    setBusy(false);
    if (error) Alert.alert("Error", error.message);
    else qc.invalidateQueries({ queryKey: ["review-requests"] });
  }

  async function reject() {
    setBusy(true);
    const patch = isHod
      ? { status: "rejected", hod_note: note.trim() || null, hod_acted_at: new Date().toISOString() }
      : { status: "rejected", principal_note: note.trim() || null, principal_acted_at: new Date().toISOString() };
    const { error } = await supabase.from("leave_requests").update(patch).eq("id", r.id);
    setBusy(false);
    if (error) Alert.alert("Error", error.message);
    else qc.invalidateQueries({ queryKey: ["review-requests"] });
  }

  async function principalApprove() {
    setBusy(true);
    const { error } = await supabase.from("leave_requests").update({ status: "approved", principal_note: note.trim() || null, principal_acted_at: new Date().toISOString() }).eq("id", r.id);
    setBusy(false);
    if (error) Alert.alert("Error", error.message);
    else qc.invalidateQueries({ queryKey: ["review-requests"] });
  }

  const canAct = (isHod && (r.status === "pending_hod" || (isEmergency && r.status === "pending_principal"))) || (!isHod && (r.status === "hod_recommended" || r.status === "pending_principal"));

  return (
    <SectionCard style={styles.card}>
      {/* Emergency countdown */}
      {isEmergency && msLeft > 0 && (
        <View style={[styles.emergencyBox, { backgroundColor: "#fef2f2", borderColor: "#fca5a5" }]}>
          <Text style={[styles.emergencyText, { color: "#dc2626" }]}>⚡ Emergency Leave</Text>
          <Text style={[styles.emergencyText, { color: "#6b7280" }]}>Auto-approves in <Text style={{ fontWeight: "800", fontFamily: "monospace" }}>{fmtMs(msLeft)}</Text></Text>
        </View>
      )}
      {isEmergency && msLeft === 0 && (
        <View style={[styles.emergencyBox, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
          <Text style={{ color: "#16a34a", fontWeight: "700", fontSize: 12 }}>✓ Auto-approved (5-hour window elapsed)</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.teacherName}>{r.teacher?.full_name ?? "—"}</Text>
          <Text style={styles.leaveInfo}>{leaveTypeLabel(r.leave_type as LeaveType)} · {SESSION_LABEL[r.session as LeaveSession]}</Text>
          <Text style={styles.leaveInfo}>{fmtDate(r.from_date)} – {fmtDate(r.to_date)} · {Number(r.total_days)} day(s)</Text>
        </View>
        <StatusBadge status={r.status as LeaveStatus} />
      </View>

      <View style={styles.payInfo}>
        <Text style={{ fontSize: 12, color: "#6b7280" }}>Paid {Number(r.paid_days ?? 0)} · </Text>
        <Text style={{ fontSize: 12, color: "#dc2626", fontWeight: "700" }}>Pay cut {Number(r.unpaid_days ?? 0)}</Text>
      </View>

      {r.reason ? <View style={styles.reasonBox}><Text style={styles.reasonText}>{r.reason}</Text></View> : null}
      {r.hod_note && !isHod && <Text style={styles.noteText}>HOD note: {r.hod_note}</Text>}

      {/* Proxy assignment — HOD only */}
      {isHod && !isEmergency && canAct && (
        <View style={styles.proxySection}>
          <Text style={styles.sectionLabel}>PROXY ASSIGNMENT</Text>
          {allSlots.length === 0 && <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>No lectures on timetable for these dates. Add manually if needed.</Text>}
          {allSlots.map((s) => {
            const options = candidates(s.date, s.start_time, s.end_time);
            return (
              <View key={s.key} style={styles.proxySlot}>
                <Text style={styles.slotInfo}>{s.subject} · {s.class_name}</Text>
                <Text style={styles.slotMeta}>{fmtDate(s.date)} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {options.map((o) => (
                    <TouchableOpacity key={o.id} style={[styles.optionBtn, choices[s.key] === o.id && styles.optionBtnActive]} onPress={() => setChoices((c) => ({ ...c, [s.key]: o.id }))}>
                      <Text style={[styles.optionText, choices[s.key] === o.id && styles.optionTextActive]}>{o.full_name} {o.free ? "· Free" : "· Busy"}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            );
          })}
          <TouchableOpacity style={styles.addSlotBtn} onPress={() => setManual((m) => [...m, { key: `manual-${Date.now()}`, date: r.from_date, start_time: "09:00", end_time: "10:00", subject: "", class_name: "" }])}>
            <Text style={styles.addSlotText}>+ Add proxy lecture</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment decision */}
      {isHod && needsDecision && !isEmergency && canAct && (
        <View style={styles.paymentSection}>
          <Text style={styles.sectionLabel}>SALARY DECISION</Text>
          <View style={styles.payBtnRow}>
            <TouchableOpacity style={[styles.payBtn, payment === "paid" && styles.payBtnPaid]} onPress={() => setPayment("paid")}>
              <Text style={[styles.payBtnText, payment === "paid" && { color: "#fff" }]}>Paid — no deduction</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.payBtn, payment === "unpaid" && styles.payBtnUnpaid]} onPress={() => setPayment("unpaid")}>
              <Text style={[styles.payBtnText, payment === "unpaid" && { color: "#fff" }]}>Unpaid — deduct salary</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isHod && needsDecision && !isEmergency && (
        <Text style={styles.noteText}>HOD marked this leave as <Text style={{ fontWeight: "700" }}>{r.payment_decision ?? "not decided"}</Text>.</Text>
      )}

      {isEmergency && <View style={[styles.reasonBox, { borderColor: "#fca5a5", backgroundColor: "#fef2f2" }]}><Text style={{ fontSize: 12, color: "#dc2626" }}>Emergency leave — salary deduction automatic for all {Number(r.total_days)} day(s).</Text></View>}

      {/* Note */}
      {canAct && (
        <TextInput style={styles.noteInput} value={note} onChangeText={setNote} placeholder="Add a note (optional)" multiline maxLength={300} />
      )}

      {/* Action buttons */}
      {canAct && (
        <View style={styles.actionBtns}>
          {isHod && !isEmergency && <Button title={busy ? "…" : "Approve & Send to Principal"} onPress={hodRecommend} loading={busy} size="sm" style={{ flex: 1 }} />}
          {!isHod && <Button title={busy ? "…" : isEmergency ? "Approve Early" : "Approve Leave"} onPress={principalApprove} loading={busy} size="sm" style={{ flex: 1 }} />}
          <Button title="Reject" onPress={reject} disabled={busy} variant="outline" size="sm" style={{ flex: 1 }} />
        </View>
      )}

      {/* Approval flow */}
      <View style={styles.flowRow}>
        {isEmergency ? (
          <>
            <View style={styles.flowChip}><Text style={styles.flowChipText}>Submitted</Text></View>
            <Text style={styles.flowArrow}>→</Text>
            <View style={styles.flowChip}><Text style={styles.flowChipText}>HOD & Principal notified</Text></View>
            <Text style={styles.flowArrow}>→</Text>
            <View style={styles.flowChip}><Text style={styles.flowChipText}>Auto-approves 5h (unpaid)</Text></View>
          </>
        ) : (
          <>
            <View style={styles.flowChip}><Text style={styles.flowChipText}>Submitted</Text></View>
            <Text style={styles.flowArrow}>→</Text>
            <View style={[styles.flowChip, r.status === "pending_hod" && styles.flowChipActive]}><Text style={[styles.flowChipText, r.status === "pending_hod" && { color: "#92400e" }]}>HOD</Text></View>
            <Text style={styles.flowArrow}>→</Text>
            <View style={[styles.flowChip, r.status === "pending_principal" && styles.flowChipActive]}><Text style={[styles.flowChipText, r.status === "pending_principal" && { color: "#92400e" }]}>Principal</Text></View>
          </>
        )}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#d1d5db" },
  filterBtnActive: { backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" },
  filterText: { fontSize: 13, color: "#6b7280" },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  card: { marginBottom: 12 },
  emergencyBox: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  emergencyText: { fontSize: 12, fontWeight: "600" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  teacherName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  leaveInfo: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  payInfo: { flexDirection: "row", marginBottom: 6 },
  reasonBox: { backgroundColor: "#f3f4f6", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 8 },
  reasonText: { fontSize: 13, color: "#374151" },
  noteText: { fontSize: 12, color: "#6b7280", marginBottom: 6 },
  proxySection: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10, marginTop: 8 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: "#9ca3af", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  proxySlot: { backgroundColor: "#f8fafc", borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  slotInfo: { fontSize: 13, fontWeight: "700", color: "#111827" },
  slotMeta: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  optionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 6, marginRight: 6 },
  optionBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#eff6ff" },
  optionText: { fontSize: 11, color: "#6b7280" },
  optionTextActive: { color: "#1d4ed8", fontWeight: "700" },
  addSlotBtn: { paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, borderStyle: "dashed" },
  addSlotText: { color: "#6b7280", fontSize: 13 },
  paymentSection: { borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 10, marginTop: 8 },
  payBtnRow: { flexDirection: "row", gap: 8 },
  payBtn: { flex: 1, paddingVertical: 8, borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, alignItems: "center" },
  payBtnPaid: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  payBtnUnpaid: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  payBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  noteInput: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, padding: 8, fontSize: 13, minHeight: 60, marginTop: 8, textAlignVertical: "top" },
  actionBtns: { flexDirection: "row", gap: 8, marginTop: 10 },
  flowRow: { flexDirection: "row", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 4 },
  flowChip: { backgroundColor: "#f3f4f6", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 },
  flowChipActive: { backgroundColor: "#fef9c3" },
  flowChipText: { fontSize: 10, color: "#6b7280" },
  flowArrow: { fontSize: 10, color: "#9ca3af" },
});
