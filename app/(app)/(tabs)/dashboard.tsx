import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useBalances } from "@/hooks/useBalances";
import { AppShell } from "@/components/AppShell";
import { SectionCard, StatCard, StatusBadge, Empty } from "@/components/ui";
import { MonthCalendar } from "@/components/MonthCalendar";
import { fmtDate, fmtTime, leaveTypeLabel, todayISO, SESSION_LABEL, money, perDaySalary } from "@/lib/leave";
import type { LeaveStatus, LeaveType, LeaveSession } from "@/lib/leave";

export default function DashboardScreen() {
  const { profile, role } = useAuth();
  return (
    <AppShell
      title={`Welcome, ${profile?.full_name?.split(" ")[0] ?? ""}`}
      subtitle={`${profile?.designation ?? ""}${profile?.department_name ? `, ${profile.department_name}` : ""}`}
    >
      {role === "principal" ? <PrincipalDash /> : <TeacherDash />}
    </AppShell>
  );
}

function TeacherDash() {
  const { profile, role } = useAuth();
  const { data: balances = [] } = useBalances(profile?.id);

  const { data: leaves = [] } = useQuery({
    queryKey: ["my-leaves-recent", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, leave_type, from_date, to_date, session, status, total_days, unpaid_days")
        .eq("teacher_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: todayLectures = [] } = useQuery({
    queryKey: ["today-lectures", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lectures")
        .select("id, start_time, end_time, subject, class_name, room")
        .eq("teacher_id", profile!.id)
        .eq("day_of_week", new Date().getDay())
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });

  const { data: proxies = [] } = useQuery({
    queryKey: ["dash-proxies", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proxy_assignments")
        .select("id, proxy_date, start_time, end_time, subject, class_name, status")
        .eq("proxy_teacher_id", profile!.id)
        .eq("status", "pending")
        .order("proxy_date")
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ["upcoming-holidays"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holidays")
        .select("id, holiday_date, occasion, kind")
        .gte("holiday_date", todayISO())
        .order("holiday_date")
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: payroll = { paidDays: 0, unpaidDays: 0, deduction: 0, net: 0 } } = useQuery({
    queryKey: ["dash-payroll", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const now = new Date();
      const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastISO = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
      const { data, error } = await supabase
        .from("leave_requests")
        .select("paid_days, unpaid_days")
        .eq("teacher_id", profile!.id)
        .neq("status", "rejected")
        .gte("from_date", first)
        .lte("from_date", lastISO);
      if (error) throw error;
      const salary = Number(profile!.monthly_salary ?? 0);
      const paidDays = (data ?? []).reduce((s, r) => s + Number(r.paid_days), 0);
      const unpaidDays = (data ?? []).reduce((s, r) => s + Number(r.unpaid_days), 0);
      const deduction = Math.round(unpaidDays * perDaySalary(salary));
      return { paidDays, unpaidDays, deduction, net: Math.max(salary - deduction, 0) };
    },
  });

  const { data: pendingForHod = 0 } = useQuery({
    queryKey: ["hod-pending-count", profile?.department_id],
    enabled: role === "hod",
    queryFn: async () => {
      const { count } = await supabase
        .from("leave_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_hod")
        .eq("department_id", profile!.department_id ?? "");
      return count ?? 0;
    },
  });

  const salary = Number(profile?.monthly_salary ?? 0);
  const casual = balances.find((b) => b.type === "casual");

  return (
    <>
      {/* HOD banner */}
      {role === "hod" && pendingForHod > 0 && (
        <TouchableOpacity style={styles.hodBanner} onPress={() => router.push("/(app)/(tabs)/requests")}>
          <View>
            <Text style={styles.hodBannerTitle}>HOD Panel</Text>
            <Text style={styles.hodBannerSub}>{pendingForHod} request(s) awaiting your review</Text>
          </View>
          <Text style={styles.hodBannerArrow}>Review →</Text>
        </TouchableOpacity>
      )}

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <StatCard
          label="Casual (This Month)"
          value={casual ? `${Math.max((casual.monthly ?? 2) - casual.used, 0)} / ${casual.monthly ?? 2}` : "—"}
          sub="this month"
          color={casual?.remaining === 0 ? "#dc2626" : undefined}
        />
        <StatCard
          label="Unpaid This Month"
          value={payroll.unpaidDays}
          color={payroll.unpaidDays > 0 ? "#dc2626" : "#16a34a"}
          sub={payroll.unpaidDays > 0 ? `−${money(payroll.deduction)}` : "no deduction"}
        />
        <StatCard
          label="Net Pay"
          value={money(payroll.net)}
          color={payroll.deduction > 0 ? "#d97706" : "#16a34a"}
          sub="this month"
        />
      </View>

      {/* Month calendar */}
      <SectionCard title="Attendance Calendar">
        <MonthCalendar teacherId={profile?.id} />
      </SectionCard>

      {/* Payroll snapshot */}
      <SectionCard title="Payroll Snapshot">
        <View style={styles.payrollRow}><Text style={styles.payrollLabel}>Gross Salary</Text><Text style={styles.payrollVal}>{money(salary)}</Text></View>
        <View style={styles.payrollRow}><Text style={styles.payrollLabel}>Paid Leave Days</Text><Text style={[styles.payrollVal, { color: "#16a34a" }]}>{payroll.paidDays}</Text></View>
        <View style={styles.payrollRow}><Text style={styles.payrollLabel}>Unpaid Leave Days</Text><Text style={[styles.payrollVal, { color: "#dc2626" }]}>{payroll.unpaidDays}</Text></View>
        <View style={styles.payrollRow}><Text style={styles.payrollLabel}>Deduction</Text><Text style={[styles.payrollVal, { color: "#dc2626" }]}>− {money(payroll.deduction)}</Text></View>
        <View style={[styles.payrollRow, styles.payrollTotal]}><Text style={styles.payrollTotalLabel}>Net Payable</Text><Text style={styles.payrollTotalVal}>{money(payroll.net)}</Text></View>
        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push("/(app)/(tabs)/payroll")}>
          <Text style={styles.linkBtnText}>Open Payroll →</Text>
        </TouchableOpacity>
      </SectionCard>

      {/* Recent leaves table */}
      <SectionCard title="Recent Leave Requests">
        {leaves.length === 0 ? <Empty>No leave requests yet.</Empty> : (
          <>
            {leaves.map((l) => (
              <View key={l.id} style={styles.leaveRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.leaveType}>{leaveTypeLabel(l.leave_type as LeaveType)}</Text>
                  <Text style={styles.leaveDates}>{fmtDate(l.from_date)} – {fmtDate(l.to_date)}</Text>
                  <Text style={styles.leaveDays}>
                    {Number(l.total_days)} day(s)
                    {Number(l.unpaid_days) > 0 && <Text style={{ color: "#dc2626" }}> · {Number(l.unpaid_days)} unpaid</Text>}
                  </Text>
                </View>
                <StatusBadge status={l.status as LeaveStatus} />
              </View>
            ))}
            <TouchableOpacity onPress={() => router.push("/(app)/(tabs)/leaves")}>
              <Text style={styles.linkText}>View all leaves →</Text>
            </TouchableOpacity>
          </>
        )}
      </SectionCard>

      {/* Quick actions */}
      <SectionCard title="Quick Actions">
        {[
          { label: "Apply for Leave", route: "/(app)/(tabs)/apply" },
          { label: "My Lecture Schedule", route: "/(app)/(tabs)/schedule" },
          { label: "Proxy Assignments", route: "/(app)/(tabs)/proxies" },
          { label: "Holidays", route: "/(app)/(tabs)/holidays" },
        ].map((a) => (
          <TouchableOpacity key={a.label} style={styles.quickAction} onPress={() => router.push(a.route as any)}>
            <Text style={styles.quickActionText}>{a.label}</Text>
            <Text style={{ color: "#9ca3af" }}>›</Text>
          </TouchableOpacity>
        ))}
      </SectionCard>

      {/* Today's Schedule */}
      <SectionCard title="Today's Schedule" style={undefined}>
        {todayLectures.length === 0 ? <Empty>No lectures today.</Empty> : (
          todayLectures.map((l) => (
            <View key={l.id} style={styles.lectureRow}>
              <View style={styles.timeChip}>
                <Text style={styles.timeText}>{fmtTime(l.start_time)}</Text>
                <Text style={styles.timeText2}>{fmtTime(l.end_time)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.leaveType}>{l.subject}</Text>
                <Text style={styles.leaveDates}>{l.class_name}{l.room ? ` · Room ${l.room}` : ""}</Text>
              </View>
            </View>
          ))
        )}
      </SectionCard>

      {/* Pending proxies */}
      {proxies.length > 0 && (
        <SectionCard title={`Proxy Assignments (${proxies.length} pending)`}>
          {proxies.map((p) => (
            <View key={p.id} style={styles.lectureRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.leaveType}>{p.subject} · {p.class_name}</Text>
                <Text style={styles.leaveDates}>{fmtDate(p.proxy_date)} · {fmtTime(p.start_time)}–{fmtTime(p.end_time)}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={() => router.push("/(app)/(tabs)/proxies")}>
            <Text style={styles.linkText}>View all proxies →</Text>
          </TouchableOpacity>
        </SectionCard>
      )}

      {/* Upcoming holidays */}
      {holidays.length > 0 && (
        <SectionCard title="Upcoming Holidays">
          {holidays.map((h) => (
            <View key={h.id} style={styles.leaveRow}>
              <Text style={styles.leaveDates}>{fmtDate(h.holiday_date)}</Text>
              <Text style={styles.leaveType}>{h.occasion}</Text>
            </View>
          ))}
        </SectionCard>
      )}
    </>
  );
}

function PrincipalDash() {
  const { data: stats } = useQuery({
    queryKey: ["principal-stats"],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const [teachers, pending, approved, rejected] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).in("status", ["pending_hod", "hod_recommended", "pending_principal"]),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "approved").gte("from_date", `${year}-01-01`),
        supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "rejected").gte("from_date", `${year}-01-01`),
      ]);
      return { teachers: teachers.count ?? 0, pending: pending.count ?? 0, approved: approved.count ?? 0, rejected: rejected.count ?? 0 };
    },
  });

  const { data: queue = [] } = useQuery({
    queryKey: ["principal-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("id, leave_type, from_date, to_date, session, status, total_days, teacher_id")
        .in("status", ["hod_recommended", "pending_principal"])
        .order("created_at").limit(6);
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.teacher_id);
      const { data: people } = await supabase.from("profiles").select("id, full_name, departments(name)").in("id", ids);
      const pMap = Object.fromEntries((people ?? []).map((p: any) => [p.id, { full_name: p.full_name, dept: p.departments?.name }]));
      return (data ?? []).map((r) => ({ ...r, person: pMap[r.teacher_id] }));
    },
  });

  return (
    <>
      <View style={styles.statsRow}>
        <StatCard label="Total Staff" value={stats?.teachers ?? 0} />
        <StatCard label="Pending" value={stats?.pending ?? 0} color={stats?.pending ? "#d97706" : undefined} />
      </View>
      <View style={[styles.statsRow, { marginTop: 8 }]}>
        <StatCard label="Approved (Year)" value={stats?.approved ?? 0} color="#16a34a" />
        <StatCard label="Rejected (Year)" value={stats?.rejected ?? 0} color="#dc2626" />
      </View>

      <SectionCard title="Awaiting Principal Approval">
        {queue.length === 0 ? <Empty>Nothing awaiting your approval.</Empty> : (
          queue.map((r) => (
            <View key={r.id} style={styles.leaveRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.leaveType}>{(r.person as any)?.full_name ?? "—"}</Text>
                <Text style={styles.leaveDates}>{(r.person as any)?.dept ?? "—"} · {leaveTypeLabel(r.leave_type as LeaveType)}</Text>
                <Text style={styles.leaveDays}>{fmtDate(r.from_date)} – {fmtDate(r.to_date)} · {Number(r.total_days)}d</Text>
              </View>
              <StatusBadge status={r.status as LeaveStatus} />
            </View>
          ))
        )}
        <TouchableOpacity style={styles.linkBtn} onPress={() => router.push("/(app)/(tabs)/requests")}>
          <Text style={styles.linkBtnText}>Open Requests Panel →</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard title="Quick Actions">
        {[
          { label: "Review Leave Requests", route: "/(app)/(tabs)/requests" },
          { label: "Mark Leave for Teacher", route: "/(app)/(tabs)/mark-leave" },
          { label: "Post a Notice", route: "/(app)/(tabs)/notices" },
          { label: "View Reports", route: "/(app)/(tabs)/reports" },
          { label: "Manage Departments", route: "/(app)/(tabs)/departments" },
        ].map((a) => (
          <TouchableOpacity key={a.label} style={styles.quickAction} onPress={() => router.push(a.route as any)}>
            <Text style={styles.quickActionText}>{a.label}</Text>
            <Text style={{ color: "#9ca3af" }}>›</Text>
          </TouchableOpacity>
        ))}
      </SectionCard>
    </>
  );
}

const styles = StyleSheet.create({
  hodBanner: { backgroundColor: "#eff6ff", borderRadius: 10, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, borderWidth: 1, borderColor: "#bfdbfe" },
  hodBannerTitle: { fontSize: 13, fontWeight: "700", color: "#1d4ed8" },
  hodBannerSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  hodBannerArrow: { color: "#1d4ed8", fontWeight: "700", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  payrollRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  payrollLabel: { fontSize: 13, color: "#6b7280" },
  payrollVal: { fontSize: 13, fontWeight: "600", color: "#111827" },
  payrollTotal: { borderTopWidth: 1, borderTopColor: "#e5e7eb", borderBottomWidth: 0, marginTop: 4, paddingTop: 8 },
  payrollTotalLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  payrollTotalVal: { fontSize: 15, fontWeight: "800", color: "#111827" },
  linkBtn: { marginTop: 10, backgroundColor: "#f3f4f6", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  linkBtnText: { color: "#1d4ed8", fontWeight: "600", fontSize: 13 },
  leaveRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  leaveType: { fontSize: 13, fontWeight: "700", color: "#111827" },
  leaveDates: { fontSize: 11, color: "#6b7280", marginTop: 1 },
  leaveDays: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  linkText: { fontSize: 13, color: "#1d4ed8", fontWeight: "600", marginTop: 10 },
  lectureRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  timeChip: { backgroundColor: "#eff6ff", borderRadius: 6, padding: 6, alignItems: "center", minWidth: 56 },
  timeText: { fontSize: 11, fontWeight: "700", color: "#1d4ed8" },
  timeText2: { fontSize: 9, color: "#6b7280" },
  quickAction: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  quickActionText: { fontSize: 14, color: "#111827", fontWeight: "500" },
});
