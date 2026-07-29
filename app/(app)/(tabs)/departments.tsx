import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/AppShell";
import { SectionCard, Empty, Badge } from "@/components/ui";

export default function DepartmentsScreen() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["departments-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      const { data: staff } = await supabase.from("profiles").select("id, department_id").eq("approved", true);
      return (data ?? []).map((d: any) => ({
        ...d,
        staff: (staff ?? []).filter((s: any) => s.department_id === d.id).length,
      }));
    },
  });

  return (
    <AppShell title="Departments" subtitle="Courses and classes across the college">
      {isLoading ? (
        <SectionCard><Empty>Loading…</Empty></SectionCard>
      ) : rows.length === 0 ? (
        <SectionCard><Empty>No departments configured.</Empty></SectionCard>
      ) : (
        rows.map((d: any) => (
          <SectionCard key={d.id}>
            <View style={styles.header}>
              <Text style={styles.name}>{d.name}</Text>
              <Badge color="#1d4ed8">{d.staff} staff</Badge>
            </View>
            {d.courses ? (
              <Text style={styles.meta}>Courses: {d.courses}</Text>
            ) : null}
            {d.classes ? (
              <Text style={styles.meta}>Classes: {d.classes}</Text>
            ) : null}
          </SectionCard>
        ))
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  name: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  meta: { fontSize: 12, color: "#6b7280", marginTop: 3 },
});
