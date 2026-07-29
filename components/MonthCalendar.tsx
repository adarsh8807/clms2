import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { eachDate, leaveTypeLabel, type LeaveType } from "@/lib/leave";

type DayKind =
  | "sunday"
  | "holiday"
  | "leave_paid"
  | "leave_unpaid"
  | "leave_pending"
  | "present"
  | "future";

interface DayCell {
  date: string;
  day: number;
  kind: DayKind;
  note?: string;
}

const KIND_STYLE: Record<DayKind, { bg: string; text: string; border: string }> = {
  sunday:       { bg: "#f3f4f6", text: "#9ca3af", border: "transparent" },
  holiday:      { bg: "#e0f2fe", text: "#0369a1", border: "#7dd3fc" },
  leave_paid:   { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  leave_unpaid: { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
  leave_pending:{ bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  present:      { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  future:       { bg: "#fff", text: "#9ca3af", border: "#e5e7eb" },
};

const LEGEND: { kind: DayKind; label: string }[] = [
  { kind: "present", label: "Present" },
  { kind: "leave_pending", label: "Pending" },
  { kind: "leave_paid", label: "Paid leave" },
  { kind: "leave_unpaid", label: "Unpaid" },
  { kind: "holiday", label: "Holiday" },
  { kind: "sunday", label: "Sunday" },
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function MonthCalendar({ teacherId }: { teacherId: string | undefined }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const fromISO = iso(first);
  const toISO = iso(last);

  const { data } = useQuery({
    queryKey: ["month-calendar", teacherId, fromISO],
    enabled: !!teacherId,
    queryFn: async () => {
      const [holidays, leaves] = await Promise.all([
        supabase
          .from("holidays")
          .select("holiday_date, occasion")
          .gte("holiday_date", fromISO)
          .lte("holiday_date", toISO),
        supabase
          .from("leave_requests")
          .select("from_date, to_date, leave_type, status, unpaid_days, total_days")
          .eq("teacher_id", teacherId!)
          .neq("status", "rejected")
          .lte("from_date", toISO)
          .gte("to_date", fromISO),
      ]);
      if (holidays.error) throw holidays.error;
      if (leaves.error) throw leaves.error;
      return { holidays: holidays.data ?? [], leaves: leaves.data ?? [] };
    },
  });

  const cells = useMemo<DayCell[]>(() => {
    const holidayMap = new Map((data?.holidays ?? []).map((h) => [h.holiday_date, h.occasion]));
    const leaveMap = new Map<string, { pending: boolean; unpaid: boolean; label: string }>();
    for (const l of data?.leaves ?? []) {
      const unpaid = Number(l.unpaid_days) > 0;
      const pending = l.status === "pending_hod";
      for (const d of eachDate(l.from_date, l.to_date)) {
        leaveMap.set(d, {
          pending,
          unpaid,
          label: `${leaveTypeLabel(l.leave_type as LeaveType)} · ${pending ? "pending" : unpaid ? "unpaid" : "paid"}`,
        });
      }
    }
    const today = iso(new Date());
    const out: DayCell[] = [];
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(month.getFullYear(), month.getMonth(), d);
      const key = iso(date);
      const leave = leaveMap.get(key);
      const holiday = holidayMap.get(key);
      let kind: DayKind;
      let note: string | undefined;
      if (leave) {
        kind = leave.pending ? "leave_pending" : leave.unpaid ? "leave_unpaid" : "leave_paid";
        note = leave.label;
      } else if (holiday) {
        kind = "holiday"; note = holiday;
      } else if (date.getDay() === 0) {
        kind = "sunday"; note = "Weekly off";
      } else if (key <= today) {
        kind = "present"; note = "Present";
      } else {
        kind = "future";
      }
      out.push({ date: key, day: d, kind, note });
    }
    return out;
  }, [data, month, last]);

  const summary = useMemo(() => ({
    present: cells.filter((c) => c.kind === "present").length,
    paid:    cells.filter((c) => c.kind === "leave_paid").length,
    unpaid:  cells.filter((c) => c.kind === "leave_unpaid").length,
    pending: cells.filter((c) => c.kind === "leave_pending").length,
    holidays:cells.filter((c) => c.kind === "holiday").length,
  }), [cells]);

  const leadingBlanks = first.getDay();
  const monthLabel = month.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <View style={styles.container}>
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={styles.grid}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
          <Text key={d} style={styles.dayHeader}>{d}</Text>
        ))}
      </View>

      {/* Calendar cells */}
      <View style={styles.grid}>
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <View key={`blank-${i}`} style={styles.cell} />
        ))}
        {cells.map((c) => {
          const s = KIND_STYLE[c.kind];
          return (
            <View
              key={c.date}
              style={[styles.cell, styles.dayCell, { backgroundColor: s.bg, borderColor: s.border }]}
            >
              <Text style={[styles.dayNum, { color: s.text }]}>{c.day}</Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {LEGEND.map((l) => {
          const s = KIND_STYLE[l.kind];
          return (
            <View key={l.kind} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.bg, borderColor: s.border, borderWidth: 1 }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Summary */}
      <Text style={styles.summary}>
        {summary.present} present · {summary.paid} paid · {summary.unpaid} unpaid · {summary.pending} pending · {summary.holidays} holiday
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#fff", borderRadius: 12, padding: 14 },
  nav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  navBtn: { padding: 6 },
  navArrow: { fontSize: 22, color: "#1d4ed8", fontWeight: "700" },
  monthLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayHeader: { width: "14.28%", textAlign: "center", fontSize: 10, fontWeight: "700", color: "#9ca3af", paddingVertical: 4, textTransform: "uppercase" },
  cell: { width: "14.28%", aspectRatio: 1 },
  dayCell: { borderRadius: 6, margin: 1, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  dayNum: { fontSize: 11, fontWeight: "700" },
  legend: { flexDirection: "row", flexWrap: "wrap", marginTop: 10, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 10, color: "#6b7280" },
  summary: { fontSize: 10, color: "#6b7280", marginTop: 8, textAlign: "center" },
});
