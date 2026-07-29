import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatCard, Empty } from "@/components/ui";
import { fmtDate, leaveTypeLabel, LEAVE_TYPES, type LeaveType } from "@/lib/leave";

export default function ReportsScreen() {
  const { profile, role } = useAuth();
  const year = new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ["reports", role, profile?.department_id, year],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase
        .from("leave_requests")
        .select("*, profiles!leave_requests_teacher_id_fkey(full_name)")
        .eq("status", "approved")
        .gte("from_date", `${year}-01-01`)
        .lte("from_date", `${year}-12-31`);
      if (role === "hod") q = q.eq("department_id", profile!.department_id ?? "");
      const { data: leaves, error } = await q;
      if (error) throw error;
      return leaves ?? [];
    },
  });

  const leaves = data ?? [];
  const totalDays = leaves.reduce((s: number, l: any) => s + Number(l.total_days), 0);
  const totalUnpaid = leaves.reduce((s: number, l: any) => s + Number(l.unpaid_days), 0);
  const uniqueStaff = new Set(leaves.map((l: any) => l.teacher_id)).size;

  // Breakdown by leave type
  const byType = LEAVE_TYPES.map((lt) => ({
    label: lt.label,
    count: leaves.filter((l: any) => l.leave_type === lt.value).length,
    days: leaves
      .filter((l: any) => l.leave_type === lt.value)
      .reduce((s: number, l: any) => s + Number(l.total_days), 0),
  }));

  // Top takers
  const byPerson: Record<string, { name: string; days: number; unpaid: number }> = {};
  leaves.forEach((l: any) => {
    if (!byPerson[l.teacher_id]) {
      byPerson[l.teacher_id] = {
        name: l.profiles?.full_name ?? "Unknown",
        days: 0,
        unpaid: 0,
      };
    }
    byPerson[l.teacher_id].days += Number(l.total_days);
    byPerson[l.teacher_id].unpaid += Number(l.unpaid_days);
  });
  const topTakers = Object.values(byPerson)
    .sort((a, b) => b.days - a.days)
    .slice(0, 10);

  return (
    <AppShell title="Reports" subtitle={`Leave analytics — ${year}`}>
      {isLoading ? (
        <SectionCard><Empty>Loading…</Empty></SectionCard>
      ) : (
        <>
          {/* Summary stats */}
          <View style={styles.statsRow}>
            <StatCard label="Total Days" value={totalDays} />
            <StatCard label="Unpaid Days" value={totalUnpaid} color={totalUnpaid > 0 ? "#dc2626" : undefined} />
            <StatCard label="Staff" value={uniqueStaff} />
          </View>

          {/* By leave type */}
          <SectionCard title="By Leave Type" style={{ marginTop: 12 }}>
            {byType.map((lt) => (
              <View key={lt.label} style={styles.typeRow}>
                <Text style={styles.typeLabel}>{lt.label}</Text>
                <View style={styles.typeRight}>
                  <Text style={styles.typeCount}>{lt.count} requests</Text>
                  <Text style={styles.typeDays}>{lt.days}d</Text>
                </View>
              </View>
            ))}
          </SectionCard>

          {/* Top leave takers */}
          {topTakers.length > 0 && (
            <SectionCard title="Staff Leave Usage">
              {topTakers.map((p, i) => (
                <View key={p.name + i} style={styles.personRow}>
                  <View style={styles.rank}>
                    <Text style={styles.rankText}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.personName}>{p.name}</Text>
                    {p.unpaid > 0 && (
                      <Text style={styles.personUnpaid}>{p.unpaid}d unpaid (pay cut)</Text>
                    )}
                  </View>
                  <Text style={styles.personDays}>{p.days}d</Text>
                </View>
              ))}
            </SectionCard>
          )}

          {leaves.length === 0 && (
            <SectionCard><Empty>No approved leaves this year.</Empty></SectionCard>
          )}
        </>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: "row", gap: 8 },
  typeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  typeLabel: { fontSize: 13, color: "#374151", fontWeight: "500" },
  typeRight: { alignItems: "flex-end" },
  typeCount: { fontSize: 12, color: "#6b7280" },
  typeDays: { fontSize: 14, fontWeight: "700", color: "#111827" },
  personRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  rank: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 11, fontWeight: "700", color: "#1d4ed8" },
  personName: { fontSize: 13, fontWeight: "600", color: "#111827" },
  personUnpaid: { fontSize: 11, color: "#dc2626", marginTop: 1 },
  personDays: { fontSize: 16, fontWeight: "800", color: "#111827" },
});
