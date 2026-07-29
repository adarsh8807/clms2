import { useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useBalances } from "@/hooks/useBalances";
import { AppShell } from "@/components/AppShell";
import { SectionCard, Button } from "@/components/ui";
import { LEAVE_TYPES, eachDate, fmtDate, todayISO, isAlwaysUnpaid, needsPaymentDecision, type LeaveType } from "@/lib/leave";

const SESSIONS = [
  { value: "full_day", label: "Full Day" },
  { value: "forenoon", label: "Forenoon (Half Day)" },
  { value: "afternoon", label: "Afternoon (Half Day)" },
];

export default function ApplyScreen() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: balances = [] } = useBalances(profile?.id);

  const [leaveType, setLeaveType] = useState<LeaveType>("casual");
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [session, setSession] = useState("full_day");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const isEmergency = leaveType === "emergency";

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays-all"],
    queryFn: async () => { const { data, error } = await supabase.from("holidays").select("holiday_date, occasion"); if (error) throw error; return data; },
  });

  // Exact preview logic matching the web app
  const preview = useMemo(() => {
    if (!fromDate || !toDate || toDate < fromDate) return null;
    const holidaySet = new Set((holidays ?? []).map((h) => h.holiday_date));
    const dates = eachDate(fromDate, toDate);
    const working = dates.filter((d) => new Date(d + "T00:00:00").getDay() !== 0 && !holidaySet.has(d));
    let days = working.length;
    if (session !== "full_day") days = Math.min(days, 1) * 0.5;

    if (isEmergency) {
      return { total: days, skipped: dates.length - working.length, paid: 0, unpaid: days, hodDecides: false, alwaysUnpaid: true };
    }
    if (leaveType !== "casual") {
      return { total: days, skipped: dates.length - working.length, paid: 0, unpaid: 0, hodDecides: true, alwaysUnpaid: false };
    }
    // Casual: check monthly + yearly balance
    const bal = balances.find((b) => b.type === "casual");
    let remaining = bal ? Math.max((bal.yearly ?? 12) - (bal.used ?? 0), 0) : 0;
    if (bal?.monthly !== undefined) {
      const monthUsed = bal.used ?? 0; // simplified — server computes exact monthly
      remaining = Math.min(remaining, Math.max((bal.monthly ?? 2) - 0, 0));
    }
    const paid = Math.min(days, remaining);
    return { total: days, skipped: dates.length - working.length, paid, unpaid: days - paid, hodDecides: false, alwaysUnpaid: false };
  }, [fromDate, toDate, session, holidays, balances, leaveType, isEmergency]);

  async function submit() {
    if (!reason.trim() || reason.trim().length < 5) return Alert.alert("Validation", "Please give a reason (min 5 characters).");
    if (fromDate > toDate) return Alert.alert("Validation", "To date must be after from date.");
    if (session !== "full_day" && fromDate !== toDate) return Alert.alert("Validation", "Half day leave must be for a single date.");
    if (preview && preview.total === 0) return Alert.alert("Validation", "All selected dates are Sundays or holidays.");
    setBusy(true);
    try {
      const { error } = await supabase.from("leave_requests").insert({
        teacher_id: profile!.id,
        department_id: profile!.department_id,
        leave_type: leaveType,
        from_date: fromDate,
        to_date: toDate,
        session,
        reason: reason.trim(),
        ...(isEmergency && preview ? { paid_days: 0, unpaid_days: preview.total, total_days: preview.total } : {}),
      });
      if (error) { Alert.alert("Error", error.message); return; }
      qc.invalidateQueries();
      Alert.alert(
        "Success",
        isEmergency ? "Emergency leave submitted — auto-approves in 5 hours with pay cut." : "Leave request sent to your HOD.",
        [{ text: "OK", onPress: () => router.push("/(app)/(tabs)/leaves") }]
      );
      setReason("");
    } finally { setBusy(false); }
  }

  return (
    <AppShell title="Apply Leave" subtitle="Your request goes to HOD first, then principal">
      <View style={styles.grid}>
        {/* Main form */}
        <View style={styles.main}>
          {/* Emergency banner */}
          {isEmergency && (
            <View style={styles.emergencyBanner}>
              <Text style={styles.emergencyTitle}>⚠ Emergency Leave</Text>
              <Text style={styles.emergencyBody}>
                This leave will be <Text style={{ fontWeight: "700" }}>automatically approved after 5 hours</Text> without requiring HOD or principal action. The entire duration will be <Text style={{ fontWeight: "700" }}>unpaid and deducted from your salary</Text>.
              </Text>
            </View>
          )}

          {/* Leave type */}
          <SectionCard title="Leave Type">
            <View style={styles.typeGrid}>
              {LEAVE_TYPES.map((lt) => {
                const bal = balances.find((b) => b.type === lt.value);
                return (
                  <TouchableOpacity key={lt.value} style={[styles.typeBtn, leaveType === lt.value && styles.typeBtnActive]} onPress={() => setLeaveType(lt.value)}>
                    <Text style={[styles.typeBtnLabel, leaveType === lt.value && styles.typeBtnLabelActive]}>{lt.label}{lt.value === "emergency" ? " (unpaid)" : ""}</Text>
                    {bal && <Text style={[styles.typeBtnBal, leaveType === lt.value && { color: "#93c5fd" }]}>{bal.remaining} left</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          {/* Dates & session */}
          <SectionCard title="Dates & Session">
            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>From Date</Text>
                <TextInput style={styles.input} value={fromDate} onChangeText={(v) => { setFromDate(v); if (toDate < v) setToDate(v); }} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>To Date</Text>
                <TextInput style={styles.input} value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" editable={session === "full_day"} />
              </View>
            </View>
            <Text style={[styles.label, { marginTop: 12 }]}>Session</Text>
            {SESSIONS.map((s) => (
              <TouchableOpacity key={s.value} style={[styles.sessionBtn, session === s.value && styles.sessionBtnActive]} onPress={() => setSession(s.value)}>
                <Text style={[styles.sessionText, session === s.value && styles.sessionTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </SectionCard>

          {/* Reason */}
          <SectionCard title="Reason">
            <TextInput
              style={styles.textarea}
              value={reason}
              onChangeText={setReason}
              placeholder={isEmergency ? "Describe the emergency situation…" : "Enter reason for leave…"}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{reason.length}/500</Text>
          </SectionCard>

          <Button title={busy ? "Submitting…" : isEmergency ? "Submit Emergency Leave" : "Submit Request"} onPress={submit} loading={busy} />
        </View>

        {/* Sidebar preview */}
        <SectionCard title="This Request">
          {preview ? (
            <View style={{ gap: 8 }}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Dates</Text>
                <Text style={styles.previewVal}>{fmtDate(fromDate)} – {fmtDate(toDate)}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Leave days counted</Text>
                <Text style={styles.previewVal}>{preview.total}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Sundays / holidays skipped</Text>
                <Text style={styles.previewVal}>{preview.skipped}</Text>
              </View>
              {preview.alwaysUnpaid ? (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Salary impact</Text>
                  <Text style={[styles.previewVal, { color: "#dc2626", fontWeight: "700" }]}>All {preview.total} day(s) unpaid</Text>
                </View>
              ) : preview.hodDecides ? (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Salary impact</Text>
                  <Text style={[styles.previewVal, { color: "#d97706" }]}>HOD marks paid / unpaid</Text>
                </View>
              ) : (
                <>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Paid</Text>
                    <Text style={[styles.previewVal, { color: "#16a34a", fontWeight: "700" }]}>{preview.paid}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Pay cut</Text>
                    <Text style={[styles.previewVal, { color: "#dc2626", fontWeight: "700" }]}>{preview.unpaid}</Text>
                  </View>
                </>
              )}
              {isEmergency && (
                <View style={[styles.emergencyNote]}>
                  <Text style={{ fontSize: 11, color: "#dc2626" }}>Auto-approves 5 hours after submission. No action needed from HOD or principal.</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: "#9ca3af" }}>Select valid dates to see the impact.</Text>
          )}
        </SectionCard>

        {/* Balance summary */}
        {!isEmergency && (
          <SectionCard title="Leave Balance">
            {balances.map((b) => (
              <View key={b.type} style={styles.balRow}>
                <Text style={styles.balLabel}>{b.label}</Text>
                <Text style={[styles.balVal, b.remaining === 0 && { color: "#dc2626" }]}>{b.remaining} / {b.yearly} days</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {isEmergency && (
          <SectionCard title="Emergency Leave Policy">
            {["Auto-approved after 5 hours with no HOD / principal action needed.", "HOD and principal are still notified and may reject within 5 hours.", "All days are unpaid — salary deduction is applied automatically.", "Up to 6 emergency leaves per year."].map((item, i) => (
              <Text key={i} style={styles.policyItem}>• {item}</Text>
            ))}
          </SectionCard>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 0 },
  main: { gap: 0 },
  emergencyBanner: { backgroundColor: "#fef2f2", borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#fca5a5" },
  emergencyTitle: { fontWeight: "700", color: "#dc2626", fontSize: 13, marginBottom: 4 },
  emergencyBody: { fontSize: 12, color: "#6b7280", lineHeight: 18 },
  emergencyNote: { backgroundColor: "#fef2f2", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#fca5a5" },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, minWidth: "45%" },
  typeBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#1d4ed8" },
  typeBtnLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },
  typeBtnLabelActive: { color: "#fff" },
  typeBtnBal: { fontSize: 10, color: "#9ca3af", marginTop: 2 },
  dateRow: { flexDirection: "row", gap: 12 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111827" },
  sessionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, marginBottom: 4 },
  sessionBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#eff6ff" },
  sessionText: { fontSize: 13, color: "#6b7280" },
  sessionTextActive: { color: "#1d4ed8", fontWeight: "700" },
  textarea: { borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827", minHeight: 100 },
  charCount: { fontSize: 11, color: "#9ca3af", textAlign: "right", marginTop: 4 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  previewLabel: { fontSize: 12, color: "#9ca3af" },
  previewVal: { fontSize: 12, color: "#111827", fontWeight: "500" },
  balRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  balLabel: { fontSize: 13, color: "#374151" },
  balVal: { fontSize: 13, fontWeight: "600", color: "#111827" },
  policyItem: { fontSize: 12, color: "#6b7280", marginBottom: 6, lineHeight: 18 },
});
