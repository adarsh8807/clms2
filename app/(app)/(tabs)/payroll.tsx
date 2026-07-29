import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatCard, StatusBadge, Empty } from "@/components/ui";
import { fmtDate, leaveTypeLabel, money, perDaySalary, type LeaveStatus, type LeaveType } from "@/lib/leave";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function PayrollScreen() {
  const { profile } = useAuth();
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const fromISO = iso(month);
  const toISO   = iso(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const monthLabel = month.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const { data: leaves = [] } = useQuery({
    queryKey: ["payroll-leaves", profile?.id, fromISO],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, leave_type, from_date, to_date, status, total_days, paid_days, unpaid_days, payment_decision")
        .eq("teacher_id", profile!.id)
        .neq("status", "rejected")
        .gte("from_date", fromISO)
        .lte("from_date", toISO)
        .order("from_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  const salary = Number(profile?.monthly_salary ?? 0);
  const dayRate = perDaySalary(salary);

  const totals = useMemo(() => {
    const unpaid = leaves.reduce((s, l) => s + Number(l.unpaid_days ?? 0), 0);
    const paid   = leaves.reduce((s, l) => s + Number(l.paid_days ?? 0), 0);
    const deduction = Math.round(unpaid * dayRate);
    return { unpaid, paid, deduction, net: Math.max(salary - deduction, 0) };
  }, [leaves, dayRate, salary]);

  return (
    <AppShell title="Payroll" subtitle="Salary and leave deductions">
      {/* Month navigator */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>‹ Prev</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>Next ›</Text>
        </TouchableOpacity>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <StatCard label="Monthly Salary" value={money(salary)} sub={`${money(dayRate)}/day`} />
        <StatCard label="Paid Leave Days" value={totals.paid} color="#16a34a" sub="no deduction" />
      </View>
      <View style={[styles.statsRow, { marginTop: 8 }]}>
        <StatCard label="Unpaid Leave Days" value={totals.unpaid} color={totals.unpaid > 0 ? "#dc2626" : undefined} sub="salary is cut" />
        <StatCard label="Net Pay" value={money(totals.net)} color={totals.deduction > 0 ? "#d97706" : "#16a34a"} sub={totals.deduction > 0 ? `−${money(totals.deduction)}` : "full salary"} />
      </View>

      {/* Salary breakdown */}
      <SectionCard title={`Salary Breakdown — ${monthLabel}`} style={{ marginTop: 12 }}>
        <View style={styles.breakRow}><Text style={styles.breakLabel}>Gross salary</Text><Text style={styles.breakVal}>{money(salary)}</Text></View>
        <View style={styles.breakRow}>
          <Text style={styles.breakLabel}>Unpaid leave ({totals.unpaid} × {money(dayRate)})</Text>
          <Text style={[styles.breakVal, { color: "#dc2626" }]}>− {money(totals.deduction)}</Text>
        </View>
        <View style={[styles.breakRow, styles.breakTotal]}>
          <Text style={styles.breakTotalLabel}>Net payable</Text>
          <Text style={styles.breakTotalVal}>{money(totals.net)}</Text>
        </View>
      </SectionCard>

      {/* Leaves this month */}
      <SectionCard title="Leaves Counted This Month">
        {leaves.length === 0 ? (
          <Empty>No leaves this month — full salary payable.</Empty>
        ) : (
          <>
            {/* Table header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.col, { flex: 2 }]}>Type</Text>
              <Text style={[styles.col, { flex: 2 }]}>Dates</Text>
              <Text style={styles.col}>Days</Text>
              <Text style={styles.col}>Paid/Unpaid</Text>
              <Text style={styles.col}>Deduction</Text>
            </View>
            {leaves.map((l) => (
              <View key={l.id} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.cellMain}>{leaveTypeLabel(l.leave_type as LeaveType)}</Text>
                  <StatusBadge status={l.status as LeaveStatus} />
                </View>
                <Text style={[styles.cellSub, { flex: 2 }]}>{fmtDate(l.from_date)}{"\n"}{fmtDate(l.to_date)}</Text>
                <Text style={styles.cellSub}>{Number(l.total_days)}</Text>
                <View style={{ flex: 1, alignItems: "center" }}>
                  {l.payment_decision === null && l.leave_type !== "casual" ? (
                    <Text style={{ fontSize: 10, color: "#9ca3af" }}>Awaiting HOD</Text>
                  ) : (
                    <>
                      <Text style={{ fontSize: 11, color: "#16a34a", fontWeight: "600" }}>{Number(l.paid_days ?? 0)}p</Text>
                      <Text style={{ fontSize: 11, color: "#dc2626", fontWeight: "600" }}>{Number(l.unpaid_days ?? 0)}u</Text>
                    </>
                  )}
                </View>
                <Text style={[styles.cellSub, { color: Number(l.unpaid_days) > 0 ? "#dc2626" : "#9ca3af" }]}>
                  {Number(l.unpaid_days) > 0 ? `−${money(Number(l.unpaid_days) * dayRate)}` : "—"}
                </Text>
              </View>
            ))}
          </>
        )}
      </SectionCard>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: { padding: 8 },
  navText: { color: "#1d4ed8", fontWeight: "700", fontSize: 15 },
  monthLabel: { fontSize: 15, fontWeight: "700", color: "#111827" },
  statsRow: { flexDirection: "row", gap: 8 },
  breakRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  breakLabel: { fontSize: 13, color: "#6b7280", flex: 1 },
  breakVal: { fontSize: 13, fontWeight: "600", color: "#111827" },
  breakTotal: { borderTopWidth: 2, borderTopColor: "#e5e7eb", borderBottomWidth: 0, marginTop: 4, paddingTop: 10 },
  breakTotalLabel: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  breakTotalVal: { fontSize: 16, fontWeight: "800", color: "#111827" },
  tableHeader: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  col: { flex: 1, fontSize: 10, fontWeight: "700", color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  cellMain: { fontSize: 12, fontWeight: "700", color: "#111827", marginBottom: 3 },
  cellSub: { flex: 1, fontSize: 11, color: "#374151" },
});
