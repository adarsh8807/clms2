import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SectionCard, Empty, Badge, InfoRow } from "@/components/ui";

export default function TeachersScreen() {
  const { profile, role } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["staff", role, profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, full_name, designation, department_id, approved, departments(name)")
        .order("full_name");
      if (role === "hod") q = q.eq("department_id", profile!.department_id ?? "");
      const { data, error } = await q;
      if (error) throw error;

      const year = new Date().getFullYear();
      const { data: leaves } = await supabase
        .from("leave_requests")
        .select("teacher_id, total_days, unpaid_days, status, from_date")
        .eq("status", "approved")
        .gte("from_date", `${year}-01-01`);

      return (data ?? []).map((p: any) => {
        const pl = (leaves ?? []).filter((l) => l.teacher_id === p.id);
        return {
          ...p,
          dept_name: (p.departments as { name: string } | null)?.name ?? "—",
          total_days: pl.reduce((s: number, l: any) => s + Number(l.total_days), 0),
          unpaid_days: pl.reduce((s: number, l: any) => s + Number(l.unpaid_days), 0),
        };
      });
    },
  });

  return (
    <AppShell title="Teachers" subtitle="Staff directory">
      {isLoading ? (
        <SectionCard><Empty>Loading…</Empty></SectionCard>
      ) : rows.length === 0 ? (
        <SectionCard><Empty>No staff found.</Empty></SectionCard>
      ) : (
        rows.map((t: any) => (
          <SectionCard key={t.id}>
            <View style={styles.header}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{t.full_name?.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{t.full_name}</Text>
                <Text style={styles.desig}>{t.designation}</Text>
                <Text style={styles.dept}>{t.dept_name}</Text>
              </View>
              <Badge color={t.approved ? "#16a34a" : "#d97706"}>
                {t.approved ? "Active" : "Pending"}
              </Badge>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{t.total_days}</Text>
                <Text style={styles.statLbl}>Days taken</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statVal, t.unpaid_days > 0 && { color: "#dc2626" }]}>{t.unpaid_days}</Text>
                <Text style={styles.statLbl}>Unpaid days</Text>
              </View>
            </View>
          </SectionCard>
        ))
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#dbeafe", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontWeight: "700", color: "#1d4ed8" },
  name: { fontSize: 14, fontWeight: "700", color: "#111827" },
  desig: { fontSize: 12, color: "#6b7280", marginTop: 1 },
  dept: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  statsRow: { flexDirection: "row", gap: 16, marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  stat: { alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "800", color: "#111827" },
  statLbl: { fontSize: 10, color: "#9ca3af", marginTop: 1 },
});
