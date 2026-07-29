import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SectionCard, Empty, Button } from "@/components/ui";
import { fmtDate } from "@/lib/leave";

export default function NoticesScreen() {
  const { profile, role } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: notices = [] } = useQuery({
    queryKey: ["notices", profile?.department_id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .or(`department_id.eq.${profile!.department_id},department_id.is.null`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function post() {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Error", "Please fill in title and body.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("notices").insert({
        title: title.trim(),
        body: body.trim(),
        posted_by: profile!.id,
        department_id: scope === "all" ? null : profile!.department_id,
      });
      if (error) Alert.alert("Error", error.message);
      else {
        setTitle("");
        setBody("");
        setShowForm(false);
        qc.invalidateQueries({ queryKey: ["notices"] });
      }
    } finally {
      setBusy(false);
    }
  }

  async function deleteNotice(id: string) {
    Alert.alert("Delete Notice", "Remove this notice?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("notices").delete().eq("id", id);
          qc.invalidateQueries({ queryKey: ["notices"] });
        },
      },
    ]);
  }

  const canPost = role === "hod" || role === "principal" || role === "admin";

  return (
    <AppShell
      title="Notices"
      subtitle="Announcements from management"
      headerRight={
        canPost ? (
          <TouchableOpacity onPress={() => setShowForm(!showForm)}>
            <Text style={styles.addBtn}>{showForm ? "Cancel" : "+ Post"}</Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      {showForm && canPost && (
        <SectionCard title="Post Notice">
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Notice title" />

          <Text style={[styles.label, { marginTop: 10 }]}>Message</Text>
          <TextInput
            style={styles.textarea}
            value={body}
            onChangeText={setBody}
            placeholder="Write your notice here..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {role === "principal" && (
            <>
              <Text style={[styles.label, { marginTop: 10 }]}>Scope</Text>
              <View style={styles.scopeRow}>
                {["all", "dept"].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.scopeBtn, scope === s && styles.scopeBtnActive]}
                    onPress={() => setScope(s)}
                  >
                    <Text style={[styles.scopeText, scope === s && styles.scopeTextActive]}>
                      {s === "all" ? "All Departments" : "My Department"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Button title={busy ? "Posting…" : "Post Notice"} onPress={post} loading={busy} style={{ marginTop: 12 }} />
        </SectionCard>
      )}

      {notices.length === 0 ? (
        <SectionCard><Empty>No notices yet.</Empty></SectionCard>
      ) : (
        notices.map((n: any) => (
          <SectionCard key={n.id}>
            <View style={styles.noticeHeader}>
              <Text style={styles.noticeTitle}>{n.title}</Text>
              {canPost && (
                <TouchableOpacity onPress={() => deleteNotice(n.id)}>
                  <Text style={{ color: "#dc2626", fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.noticeBody}>{n.body}</Text>
            <Text style={styles.noticeDate}>{fmtDate(n.created_at)}</Text>
          </SectionCard>
        ))
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  addBtn: { color: "#1d4ed8", fontWeight: "700", fontSize: 14 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111827" },
  textarea: { borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, padding: 10, fontSize: 14, color: "#111827", minHeight: 80 },
  scopeRow: { flexDirection: "row", gap: 8 },
  scopeBtn: { flex: 1, paddingVertical: 8, borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, alignItems: "center" },
  scopeBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#eff6ff" },
  scopeText: { fontSize: 13, color: "#6b7280" },
  scopeTextActive: { color: "#1d4ed8", fontWeight: "700" },
  noticeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  noticeTitle: { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 },
  noticeBody: { fontSize: 13, color: "#374151", lineHeight: 20 },
  noticeDate: { fontSize: 11, color: "#9ca3af", marginTop: 6 },
});
