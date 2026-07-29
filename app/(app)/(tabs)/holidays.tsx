import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SectionCard, Empty, Button, Badge } from "@/components/ui";
import { fmtDate, todayISO } from "@/lib/leave";

export default function HolidaysScreen() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState({ date: "", occasion: "" });
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("holiday_date");
      if (error) throw error;
      return data;
    },
  });

  const canEdit = role === "admin" || role === "principal";

  async function addHoliday() {
    if (!form.date || !form.occasion.trim()) {
      Alert.alert("Error", "Please fill in date and occasion.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("holidays").insert({
        holiday_date: form.date,
        occasion: form.occasion.trim(),
        kind: "National",
      });
      if (error) Alert.alert("Error", error.message);
      else {
        setForm({ date: "", occasion: "" });
        setShowForm(false);
        qc.invalidateQueries({ queryKey: ["holidays"] });
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteHoliday(id: string) {
    Alert.alert("Delete Holiday", "Remove this holiday?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("holidays").delete().eq("id", id);
          qc.invalidateQueries({ queryKey: ["holidays"] });
        },
      },
    ]);
  }

  const today = todayISO();
  const upcoming = (holidays as any[]).filter((h) => h.holiday_date >= today);
  const past = (holidays as any[]).filter((h) => h.holiday_date < today);

  return (
    <AppShell
      title="Holidays"
      subtitle="College holiday calendar"
      headerRight={
        canEdit ? (
          <TouchableOpacity onPress={() => setShowForm(!showForm)}>
            <Text style={styles.addBtn}>{showForm ? "Cancel" : "+ Add"}</Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {showForm && canEdit && (
        <SectionCard title="Add Holiday">
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={form.date}
            onChangeText={(v) => setForm({ ...form, date: v })}
            placeholder="2025-01-26"
            keyboardType="numbers-and-punctuation"
          />
          <Text style={[styles.label, { marginTop: 10 }]}>Occasion</Text>
          <TextInput
            style={styles.input}
            value={form.occasion}
            onChangeText={(v) => setForm({ ...form, occasion: v })}
            placeholder="Republic Day"
          />
          <Button title={busy ? "Adding…" : "Add Holiday"} onPress={addHoliday} loading={busy} style={{ marginTop: 12 }} />
        </SectionCard>
      )}

      {isLoading ? (
        <SectionCard><Empty>Loading…</Empty></SectionCard>
      ) : holidays.length === 0 ? (
        <SectionCard><Empty>No holidays configured.</Empty></SectionCard>
      ) : (
        <>
          {upcoming.length > 0 && (
            <SectionCard title="Upcoming Holidays">
              {upcoming.map((h: any) => (
                <View key={h.id} style={styles.row}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>
                      {new Date(h.holiday_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit" })}
                    </Text>
                    <Text style={styles.dateMonth}>
                      {new Date(h.holiday_date + "T00:00:00").toLocaleDateString("en-IN", { month: "short" })}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.occasion}>{h.occasion}</Text>
                    <Text style={styles.kind}>{h.kind}</Text>
                  </View>
                  {canEdit && (
                    <TouchableOpacity onPress={() => deleteHoliday(h.id)}>
                      <Text style={{ color: "#dc2626", fontSize: 20 }}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </SectionCard>
          )}

          {past.length > 0 && (
            <SectionCard title="Past Holidays">
              {past.map((h: any) => (
                <View key={h.id} style={[styles.row, { opacity: 0.6 }]}>
                  <View style={[styles.dateBox, { backgroundColor: "#f3f4f6" }]}>
                    <Text style={[styles.dateDay, { color: "#6b7280" }]}>
                      {new Date(h.holiday_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit" })}
                    </Text>
                    <Text style={[styles.dateMonth, { color: "#9ca3af" }]}>
                      {new Date(h.holiday_date + "T00:00:00").toLocaleDateString("en-IN", { month: "short" })}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.occasion}>{h.occasion}</Text>
                  </View>
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
  addBtn: { color: "#1d4ed8", fontWeight: "700", fontSize: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111827" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  dateBox: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
  dateDay: { fontSize: 16, fontWeight: "800", color: "#1d4ed8" },
  dateMonth: { fontSize: 9, color: "#3b82f6", textTransform: "uppercase" },
  occasion: { fontSize: 13, fontWeight: "600", color: "#111827" },
  kind: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
});
