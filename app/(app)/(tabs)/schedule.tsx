import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ScrollView } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SectionCard, Empty, Button, Badge } from "@/components/ui";
import { DAYS, fmtDate, fmtTime, todayISO } from "@/lib/leave";

type Lecture = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  class_name: string;
  room: string | null;
  lecture_date: string | null;
  is_proxy?: boolean;
  covering_for?: string | null;
};

const WEEKDAYS = [1, 2, 3, 4, 5, 6];

function todayDow() {
  const d = new Date().getDay();
  return d === 0 ? 1 : d;
}

type Mode = "fixed" | "added";

export default function ScheduleScreen() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const today = todayISO();

  const [selectedDay, setSelectedDay] = useState<number>(todayDow());
  const [mode, setMode] = useState<Mode>("fixed");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    day: String(todayDow()),
    date: today,
    start: "09:00",
    end: "10:00",
    subject: "",
    className: "",
    room: "",
  });
  const [busy, setBusy] = useState(false);

  // Own lectures
  const { data: lectures = [] } = useQuery<Lecture[]>({
    queryKey: ["my-lectures", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, day_of_week, start_time, end_time, subject, class_name, room, lecture_date")
        .eq("teacher_id", profile!.id)
        .order("day_of_week").order("start_time");
      if (error) throw error;
      return (data ?? []) as Lecture[];
    },
  });

  // Accepted proxies
  const { data: proxies = [] } = useQuery<Lecture[]>({
    queryKey: ["my-accepted-proxies", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proxy_assignments")
        .select("id, proxy_date, start_time, end_time, subject, class_name, leave_request_id")
        .eq("proxy_teacher_id", profile!.id)
        .eq("status", "accepted")
        .gte("proxy_date", today)
        .order("proxy_date").order("start_time");
      if (error) throw error;

      const reqIds = (data ?? []).map((p) => p.leave_request_id);
      let nameMap: Record<string, string> = {};
      if (reqIds.length) {
        const { data: reqs } = await supabase.from("leave_requests").select("id, teacher_id").in("id", reqIds);
        const teacherIds = [...new Set((reqs ?? []).map((r) => r.teacher_id))];
        if (teacherIds.length) {
          const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", teacherIds);
          const personMap = Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name]));
          nameMap = Object.fromEntries((reqs ?? []).map((r) => [r.id, personMap[r.teacher_id] ?? "a colleague"]));
        }
      }
      return (data ?? []).map((p) => ({
        id: p.id,
        day_of_week: new Date(p.proxy_date + "T00:00:00").getDay(),
        start_time: p.start_time,
        end_time: p.end_time,
        subject: p.subject,
        class_name: p.class_name,
        room: null as string | null,
        lecture_date: p.proxy_date,
        is_proxy: true,
        covering_for: nameMap[p.leave_request_id] ?? null,
      })) as Lecture[];
    },
  });

  // Cleanup stale dated lectures
  useEffect(() => {
    if (!profile) return;
    supabase.from("lectures").delete()
      .eq("teacher_id", profile.id)
      .not("lecture_date", "is", null)
      .lt("lecture_date", today)
      .then(({ error }) => { if (!error) qc.invalidateQueries({ queryKey: ["my-lectures"] }); });
  }, [profile, today]);

  const fixedForDay = useMemo(() => lectures.filter((l) => !l.lecture_date && l.day_of_week === selectedDay), [lectures, selectedDay]);
  const datedForDay = useMemo(() => lectures.filter((l) => l.lecture_date && l.lecture_date >= today && l.day_of_week === selectedDay), [lectures, selectedDay, today]);
  const proxiesForDay = useMemo(() => proxies.filter((p) => p.day_of_week === selectedDay), [proxies, selectedDay]);
  const allForDay = useMemo(() => [...fixedForDay, ...datedForDay, ...proxiesForDay].sort((a, b) => a.start_time.localeCompare(b.start_time)), [fixedForDay, datedForDay, proxiesForDay]);

  // Upcoming one-off
  const upcomingOneOff = useMemo(() => {
    const dated = lectures.filter((l) => l.lecture_date && l.lecture_date >= today);
    return [...dated, ...proxies].sort((a, b) => ((a.lecture_date ?? "") + a.start_time).localeCompare((b.lecture_date ?? "") + b.start_time));
  }, [lectures, proxies, today]);

  async function addLecture() {
    if (!form.subject.trim() || !form.className.trim()) return Alert.alert("Error", "Subject and class are required.");
    if (form.end <= form.start) return Alert.alert("Error", "End time must be after start time.");
    if (mode === "added" && form.date < today) return Alert.alert("Error", "Pick today or a future date.");
    setBusy(true);
    try {
      const dow = mode === "added" ? new Date(form.date + "T00:00:00").getDay() : Number(form.day);
      const { error } = await supabase.from("lectures").insert({
        teacher_id: profile!.id,
        department_id: profile!.department_id,
        day_of_week: dow,
        lecture_date: mode === "added" ? form.date : null,
        start_time: form.start,
        end_time: form.end,
        subject: form.subject.trim(),
        class_name: form.className.trim(),
        room: form.room.trim() || null,
      });
      if (error) Alert.alert("Error", error.message);
      else {
        setForm({ ...form, subject: "", className: "", room: "" });
        setShowForm(false);
        if (mode === "added") setSelectedDay(dow === 0 ? 1 : dow);
        else setSelectedDay(Number(form.day));
        qc.invalidateQueries({ queryKey: ["my-lectures"] });
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeLecture(id: string) {
    Alert.alert("Remove Lecture", "Delete this lecture from your schedule?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await supabase.from("lectures").delete().eq("id", id);
        qc.invalidateQueries({ queryKey: ["my-lectures"] });
      }},
    ]);
  }

  const todayDowVal = new Date().getDay();

  return (
    <AppShell
      title="My Schedule"
      subtitle="Fixed timetable, added lectures & proxy duties"
      headerRight={
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addBtn}>{showForm ? "Cancel" : "+ Add"}</Text>
        </TouchableOpacity>
      }
    >
      {/* Day tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
        {WEEKDAYS.map((dow) => {
          const isToday = dow === todayDowVal;
          const isSelected = dow === selectedDay;
          return (
            <TouchableOpacity
              key={dow}
              style={[styles.dayTab, isSelected && styles.dayTabActive]}
              onPress={() => setSelectedDay(dow)}
            >
              <Text style={[styles.dayTabText, isSelected && styles.dayTabTextActive]}>{DAYS[dow].slice(0, 3)}</Text>
              {isToday && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Add lecture form */}
      {showForm && (
        <SectionCard title="Add Lecture">
          <Text style={styles.label}>Schedule Type</Text>
          <View style={styles.modeRow}>
            {(["fixed", "added"] as Mode[]).map((m) => (
              <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeBtnActive]} onPress={() => setMode(m)}>
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                  {m === "fixed" ? "Fixed (every week)" : "Added (single date)"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === "fixed" ? (
            <>
              <Text style={[styles.label, { marginTop: 10 }]}>Day</Text>
              <View style={styles.dayRow}>
                {WEEKDAYS.map((d) => (
                  <TouchableOpacity key={d} style={[styles.dayBtn, form.day === String(d) && styles.dayBtnActive]} onPress={() => setForm({ ...form, day: String(d) })}>
                    <Text style={[styles.dayBtnText, form.day === String(d) && styles.dayBtnTextActive]}>{DAYS[d].slice(0, 3)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.label, { marginTop: 10 }]}>Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.input} value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} placeholder="2025-06-10" keyboardType="numbers-and-punctuation" />
            </>
          )}

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start (HH:MM)</Text>
              <TextInput style={styles.input} value={form.start} onChangeText={(v) => setForm({ ...form, start: v })} placeholder="09:00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End (HH:MM)</Text>
              <TextInput style={styles.input} value={form.end} onChangeText={(v) => setForm({ ...form, end: v })} placeholder="10:00" />
            </View>
          </View>
          <Text style={[styles.label, { marginTop: 10 }]}>Subject</Text>
          <TextInput style={styles.input} value={form.subject} onChangeText={(v) => setForm({ ...form, subject: v })} placeholder="DSA" />
          <Text style={[styles.label, { marginTop: 10 }]}>Class</Text>
          <TextInput style={styles.input} value={form.className} onChangeText={(v) => setForm({ ...form, className: v })} placeholder="TY CS" />
          <Text style={[styles.label, { marginTop: 10 }]}>Room (optional)</Text>
          <TextInput style={styles.input} value={form.room} onChangeText={(v) => setForm({ ...form, room: v })} placeholder="301" />
          <Button title={busy ? "Adding…" : mode === "added" ? "Add to Schedule" : "Add to Fixed Timetable"} onPress={addLecture} loading={busy} style={{ marginTop: 12 }} />
        </SectionCard>
      )}

      {/* Day schedule */}
      <SectionCard title={DAYS[selectedDay]} style={undefined}>
        {allForDay.length === 0 ? <Empty>No lectures for {DAYS[selectedDay]}.</Empty> : (
          allForDay.map((l) => <LectureRow key={l.id} lecture={l} onRemove={l.is_proxy ? undefined : removeLecture} />)
        )}
      </SectionCard>

      {/* Upcoming one-offs */}
      {upcomingOneOff.length > 0 && (
        <SectionCard title="Upcoming One-Off Lectures" style={undefined}>
          <Text style={styles.oneOffSub}>Added lectures & proxy duties — auto-removed after the date</Text>
          {upcomingOneOff.map((l) => <LectureRow key={l.id + "-upcoming"} lecture={l} onRemove={l.is_proxy ? undefined : removeLecture} showDate />)}
        </SectionCard>
      )}
    </AppShell>
  );
}

function LectureRow({ lecture: l, onRemove, showDate }: { lecture: Lecture; onRemove?: (id: string) => void; showDate?: boolean }) {
  return (
    <View style={styles.lectureRow}>
      <View style={styles.timeChip}>
        <Text style={styles.timeText}>{fmtTime(l.start_time)}</Text>
        <Text style={styles.timeText2}>{fmtTime(l.end_time)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.subject}>{l.subject}</Text>
        <Text style={styles.classText}>{l.class_name}{l.room ? ` · ${l.room}` : ""}</Text>
        {showDate && l.lecture_date && <Text style={styles.classText}>{fmtDate(l.lecture_date)}</Text>}
      </View>
      {l.is_proxy ? (
        <View style={[styles.badge, { backgroundColor: "#fef9c3", borderColor: "#fde047" }]}>
          <Text style={[styles.badgeText, { color: "#854d0e" }]}>Proxy{l.covering_for ? ` · ${l.covering_for}` : ""}</Text>
        </View>
      ) : l.lecture_date ? (
        <View style={[styles.badge, { backgroundColor: "#e0f2fe", borderColor: "#7dd3fc" }]}>
          <Text style={[styles.badgeText, { color: "#0369a1" }]}>Added</Text>
        </View>
      ) : (
        <View style={[styles.badge, { backgroundColor: "#f3f4f6", borderColor: "#e5e7eb" }]}>
          <Text style={[styles.badgeText, { color: "#6b7280" }]}>Every week</Text>
        </View>
      )}
      {onRemove && (
        <TouchableOpacity onPress={() => onRemove(l.id)} style={styles.removeBtn}>
          <Text style={styles.removeBtnText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { color: "#1d4ed8", fontWeight: "700", fontSize: 14 },
  dayScroll: { marginBottom: 12 },
  dayTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: "#f3f4f6", position: "relative" },
  dayTabActive: { backgroundColor: "#1d4ed8" },
  dayTabText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  dayTabTextActive: { color: "#fff" },
  todayDot: { position: "absolute", top: 2, right: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: "#16a34a" },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: "#111827", marginBottom: 2 },
  modeRow: { gap: 8 },
  modeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 8, marginBottom: 4 },
  modeBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#eff6ff" },
  modeBtnText: { fontSize: 13, color: "#6b7280" },
  modeBtnTextActive: { color: "#1d4ed8", fontWeight: "700" },
  dayRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 4 },
  dayBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: "#d1d5db", borderRadius: 6 },
  dayBtnActive: { borderColor: "#1d4ed8", backgroundColor: "#eff6ff" },
  dayBtnText: { fontSize: 12, color: "#6b7280" },
  dayBtnTextActive: { color: "#1d4ed8", fontWeight: "700" },
  timeRow: { flexDirection: "row", gap: 12 },
  lectureRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  timeChip: { backgroundColor: "#eff6ff", borderRadius: 6, padding: 6, alignItems: "center", minWidth: 56 },
  timeText: { fontSize: 11, fontWeight: "700", color: "#1d4ed8" },
  timeText2: { fontSize: 9, color: "#6b7280" },
  subject: { fontSize: 13, fontWeight: "700", color: "#111827" },
  classText: { fontSize: 11, color: "#6b7280", marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  removeBtn: { padding: 4 },
  removeBtnText: { color: "#dc2626", fontSize: 20, fontWeight: "700" },
  oneOffSub: { fontSize: 11, color: "#9ca3af", marginBottom: 8 },
});
