import { View, Text, Alert, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SectionCard, Empty, Button, Badge } from "@/components/ui";
import { fmtDate, fmtTime } from "@/lib/leave";

export default function ProxiesScreen() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["my-proxies", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proxy_assignments")
        .select("*")
        .eq("proxy_teacher_id", profile!.id)
        .order("proxy_date");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function respond(id: string, status: "accepted" | "rejected") {
    const { error } = await supabase.from("proxy_assignments").update({ status }).eq("id", id);
    if (error) Alert.alert("Error", error.message);
    else qc.invalidateQueries({ queryKey: ["my-proxies"] });
  }

  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");

  return (
    <AppShell title="Proxy Assignments" subtitle="Classes covering absent colleagues">
      {isLoading ? (
        <SectionCard><Empty>Loading…</Empty></SectionCard>
      ) : rows.length === 0 ? (
        <SectionCard><Empty>No proxy assignments.</Empty></SectionCard>
      ) : (
        <>
          {pending.length > 0 && (
            <SectionCard title={`Pending (${pending.length})`}>
              {pending.map((p) => (
                <View key={p.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subject}>{p.subject}</Text>
                    <Text style={styles.sub}>{p.class_name}</Text>
                    <Text style={styles.sub}>
                      {fmtDate(p.proxy_date)} · {fmtTime(p.start_time)}–{fmtTime(p.end_time)}
                    </Text>
                  </View>
                  <View style={styles.btnGroup}>
                    <Button title="Accept" onPress={() => respond(p.id, "accepted")} size="sm" variant="primary" />
                    <Button title="Decline" onPress={() => respond(p.id, "rejected")} size="sm" variant="outline" style={{ marginTop: 4 }} />
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {others.length > 0 && (
            <SectionCard title="Past Assignments">
              {others.map((p) => (
                <View key={p.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subject}>{p.subject}</Text>
                    <Text style={styles.sub}>{p.class_name} · {fmtDate(p.proxy_date)}</Text>
                  </View>
                  <Badge color={p.status === "accepted" ? "#16a34a" : "#dc2626"}>
                    {p.status}
                  </Badge>
                </View>
              ))}
            </SectionCard>
          )}
        </>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  subject: { fontSize: 13, fontWeight: "700", color: "#111827" },
  sub: { fontSize: 11, color: "#6b7280", marginTop: 1 },
  btnGroup: { alignItems: "stretch", minWidth: 80 },
});
