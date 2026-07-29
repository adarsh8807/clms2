import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatusBadge, Empty, Button } from "@/components/ui";
import {
  fmtDate, fmtTime, leaveTypeLabel, SESSION_LABEL,
  emergencyMsRemaining, fmtMs,
  type LeaveStatus, type LeaveType, type LeaveSession
} from "@/lib/leave";

export default function LeavesScreen() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["my-leaves", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("teacher_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: proxies = [] } = useQuery({
    queryKey: ["my-leave-proxies", profile?.id],
    enabled: leaves.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proxy_assignments")
        .select("*")
        .in("leave_request_id", leaves.map((l) => l.id));
      if (error) throw error;
      return data ?? [];
    },
  });

  async function cancel(id: string) {
    Alert.alert("Withdraw Request", "Are you sure you want to withdraw this request?", [
      { text: "No" },
      {
        text: "Yes, Withdraw",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("leave_requests").delete().eq("id", id);
          if (error) Alert.alert("Error", error.message);
          else qc.invalidateQueries({ queryKey: ["my-leaves"] });
        },
      },
    ]);
  }

  return (
    <AppShell title="My Leaves" subtitle="All leave requests you have submitted">
      {isLoading ? (
        <SectionCard><Empty>Loading…</Empty></SectionCard>
      ) : leaves.length === 0 ? (
        <SectionCard><Empty>You have not applied for any leave yet.</Empty></SectionCard>
      ) : (
        leaves.map((l) => {
          const cover = proxies.filter((p) => p.leave_request_id === l.id);
          return (
            <SectionCard key={l.id} style={styles.leaveCard}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leaveType}>{leaveTypeLabel(l.leave_type as LeaveType)}</Text>
                  <Text style={styles.dates}>
                    {fmtDate(l.from_date)} – {fmtDate(l.to_date)} · {SESSION_LABEL[l.session as LeaveSession]}
                  </Text>
                </View>
                <StatusBadge status={l.status as LeaveStatus} />
              </View>

              {/* Emergency countdown */}
              {l.leave_type === "emergency" && (l.status === "pending_principal" || l.status === "pending_hod") && (
                <EmergencyCountdown createdAt={l.created_at} />
              )}

              {/* Details grid */}
              <View style={styles.detailGrid}>
                <DetailItem label="Days counted" value={`${Number(l.total_days)}`} />
                <DetailItem label="Paid days" value={`${Number(l.paid_days ?? 0)}`} />
                <DetailItem
                  label="Pay cut days"
                  value={`${Number(l.unpaid_days ?? 0)}`}
                  danger={Number(l.unpaid_days) > 0}
                />
                {l.reason ? <DetailItem label="Reason" value={l.reason} /> : null}
              </View>

              {/* HOD / Principal notes */}
              {(l.hod_note || l.principal_note) && (
                <View style={styles.notesBox}>
                  {l.hod_note && <Text style={styles.noteText}>HOD: {l.hod_note}</Text>}
                  {l.principal_note && <Text style={styles.noteText}>Principal: {l.principal_note}</Text>}
                </View>
              )}

              {/* Proxy cover */}
              {cover.length > 0 && (
                <View style={styles.proxyCover}>
                  <Text style={styles.proxyCoverTitle}>Proxy Cover</Text>
                  {cover.map((p) => (
                    <View key={p.id} style={styles.proxyRow}>
                      <Text style={styles.proxyText}>
                        {fmtDate(p.proxy_date)} · {fmtTime(p.start_time)}–{fmtTime(p.end_time)} · {p.subject} ({p.class_name})
                      </Text>
                      <Text style={styles.proxyStatus}>{p.status}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Withdraw button */}
              {(l.status === "pending_hod" || l.status === "pending_principal") && (
                <Button
                  title="Withdraw Request"
                  onPress={() => cancel(l.id)}
                  variant="ghost"
                  size="sm"
                  style={{ marginTop: 8 }}
                />
              )}
            </SectionCard>
          );
        })
      )}
    </AppShell>
  );
}

function EmergencyCountdown({ createdAt }: { createdAt: string }) {
  const [msLeft, setMsLeft] = useState(() => emergencyMsRemaining(createdAt));
  useEffect(() => {
    const id = setInterval(() => setMsLeft(emergencyMsRemaining(createdAt)), 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  if (msLeft === 0) {
    return (
      <View style={[styles.countdownBox, { backgroundColor: "#f0fdf4", borderColor: "#86efac" }]}>
        <Text style={[styles.countdownText, { color: "#16a34a" }]}>✓ Auto-approved — awaiting system update</Text>
      </View>
    );
  }
  return (
    <View style={[styles.countdownBox, { backgroundColor: "#fef2f2", borderColor: "#fca5a5" }]}>
      <Text style={[styles.countdownText, { color: "#dc2626" }]}>
        ⚡ Emergency leave — auto-approves (unpaid) in{" "}
        <Text style={{ fontWeight: "800", fontFamily: "monospace" }}>{fmtMs(msLeft)}</Text>
      </Text>
    </View>
  );
}

function DetailItem({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, danger && { color: "#dc2626", fontWeight: "700" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  leaveCard: { marginBottom: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  leaveType: { fontSize: 14, fontWeight: "700", color: "#111827" },
  dates: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  countdownBox: { borderRadius: 8, padding: 10, borderWidth: 1, marginBottom: 8 },
  countdownText: { fontSize: 12 },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, backgroundColor: "#f8fafc", borderRadius: 8, padding: 10 },
  detailItem: { minWidth: "45%" },
  detailLabel: { fontSize: 10, color: "#9ca3af", marginBottom: 2 },
  detailValue: { fontSize: 13, fontWeight: "500", color: "#111827" },
  notesBox: { backgroundColor: "#f3f4f6", borderRadius: 8, padding: 10, marginTop: 8 },
  noteText: { fontSize: 12, color: "#374151", marginBottom: 2 },
  proxyCover: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 8 },
  proxyCoverTitle: { fontSize: 10, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  proxyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f8fafc", borderRadius: 6, padding: 8, marginBottom: 4 },
  proxyText: { fontSize: 11, color: "#374151", flex: 1 },
  proxyStatus: { fontSize: 10, color: "#6b7280", fontWeight: "600", textTransform: "capitalize", marginLeft: 6 },
});
