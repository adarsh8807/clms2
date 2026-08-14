import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, FileText, Eye,
  ChevronDown, ChevronRight, User, Briefcase, Calendar,
  Download, Archive, BarChart3, Wallet, Loader2,
} from "lucide-react";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Guarded } from "@/components/Guard";
import { StatusBadge, Empty } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fmtDate, leaveTypeLabel, type LeaveType } from "@/lib/leave";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hr")({
  component: HrPage,
});

// ── Types ─────────────────────────────────────────────────────────────────────
interface TeacherDoc {
  id: string;
  doc_type: "degree" | "marksheet" | "salary_slip" | "experience_letter";
  file_path: string;
  original_name: string;
  status: "pending" | "approved" | "rejected";
  hr_note: string | null;
}

interface TeacherLeave {
  id: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_days: number;
  paid_days: number;
  unpaid_days: number;
  status: string;
}

interface TeacherRow {
  id: string;
  full_name: string;
  user_id: string;
  designation: string;
  department_name: string | null;
  monthly_salary: number;
  approved: boolean;
  hr_approved: boolean | null;
  hr_rejection_reason: string | null;
  gender: string | null;
  date_of_birth: string | null;
  created_at: string;
  docs: TeacherDoc[];
  leaves: TeacherLeave[];
}

const DOC_LABEL: Record<string, string> = {
  degree:            "Degree Certificate",
  marksheet:         "Marksheet",
  salary_slip:       "Salary Slip",
  experience_letter: "Experience Letter",
};

const REQUIRED_DOCS = ["degree", "marksheet"];
const EXCLUDED_ROLES = ["admin", "principal", "hr"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.round(n));

function payrollCalc(teacher: TeacherRow) {
  const year = new Date().getFullYear();
  const approved = teacher.leaves.filter(
    (l) => ["approved", "hod_approved"].includes(l.status) &&
    l.from_date.startsWith(String(year)),
  );
  const totalUnpaid = approved.reduce((s, l) => s + Number(l.unpaid_days), 0);
  const perDay      = teacher.monthly_salary / 30;
  const deduction   = perDay * totalUnpaid;
  return {
    monthly:     teacher.monthly_salary,
    unpaidDays:  totalUnpaid,
    deduction,
    net:         teacher.monthly_salary - deduction,
  };
}

// ── Status badges ─────────────────────────────────────────────────────────────
function HrStatusBadge({ hr_approved }: { hr_approved: boolean | null }) {
  if (hr_approved === true)
    return <Badge className="bg-success/15 text-success border-success/30 gap-1"><CheckCircle2 className="size-3" />HR Approved</Badge>;
  if (hr_approved === false)
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1"><XCircle className="size-3" />HR Rejected</Badge>;
  return <Badge className="bg-warning/15 text-warning-foreground border-warning/30 gap-1"><Clock className="size-3" />Pending HR</Badge>;
}

function DocStatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return <span className="text-xs font-semibold text-success flex items-center gap-1"><CheckCircle2 className="size-3" />Approved</span>;
  if (status === "rejected") return <span className="text-xs font-semibold text-destructive flex items-center gap-1"><XCircle className="size-3" />Rejected</span>;
  return <span className="text-xs font-semibold text-warning-foreground flex items-center gap-1"><Clock className="size-3" />Pending</span>;
}

// ── Document download helpers ─────────────────────────────────────────────────
async function getSignedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("hr-docs").createSignedUrl(path, 120);
  return data?.signedUrl ?? null;
}

async function downloadDoc(doc: TeacherDoc) {
  const url = await getSignedUrl(doc.file_path);
  if (!url) { toast.error("Could not get download link"); return; }
  const a = document.createElement("a");
  a.href = url;
  a.download = doc.original_name;
  a.target = "_blank";
  a.click();
}

async function downloadAllDocs(teacher: TeacherRow, setBusy: (v: boolean) => void) {
  if (teacher.docs.length === 0) { toast.error("No documents to download"); return; }
  setBusy(true);
  try {
    const zip = new JSZip();
    const folder = zip.folder(teacher.full_name.replace(/\s+/g, "_")) ?? zip;

    await Promise.all(
      teacher.docs.map(async (doc) => {
        const url = await getSignedUrl(doc.file_path);
        if (!url) return;
        const blob = await fetch(url).then((r) => r.blob());
        const ext  = doc.original_name.split(".").pop() ?? "pdf";
        folder.file(`${DOC_LABEL[doc.doc_type] ?? doc.doc_type}.${ext}`, blob);
      }),
    );

    const content = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(content);
    a.download = `${teacher.full_name.replace(/\s+/g, "_")}_documents.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("All documents downloaded");
  } catch {
    toast.error("Download failed — please try again");
  } finally {
    setBusy(false);
  }
}

// ── Document review row ───────────────────────────────────────────────────────
function DocReviewRow({
  doc, onApprove, onReject, busy,
}: {
  doc: TeacherDoc;
  onApprove: () => void;
  onReject: (note: string) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState(doc.hr_note ?? "");
  const [downloading, setDownloading] = useState(false);

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      doc.status === "approved" && "border-success/30 bg-success/5",
      doc.status === "rejected" && "border-destructive/30 bg-destructive/5",
      doc.status === "pending"  && "border-border",
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{DOC_LABEL[doc.doc_type] ?? doc.doc_type}</p>
            <p className="text-xs text-muted-foreground truncate">{doc.original_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <DocStatusPill status={doc.status} />
          {/* View in browser */}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View"
            onClick={async () => {
              const url = await getSignedUrl(doc.file_path);
              if (url) window.open(url, "_blank");
              else toast.error("Could not open file");
            }}>
            <Eye className="size-3.5" />
          </Button>
          {/* Download individual doc */}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Download"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true);
              await downloadDoc(doc);
              setDownloading(false);
            }}>
            {downloading ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          </Button>
        </div>
      </div>
      {doc.status !== "approved" && (
        <div className="flex gap-2 items-start">
          <input
            className="flex-1 text-xs rounded border border-border px-2 py-1.5 bg-background placeholder:text-muted-foreground"
            placeholder="Note for rejection (required to reject)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" variant="outline" className="h-7 shrink-0 text-success border-success/40 hover:bg-success/10" disabled={busy} onClick={onApprove}>
            <CheckCircle2 className="size-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 shrink-0 text-destructive border-destructive/40 hover:bg-destructive/10" disabled={busy} onClick={() => onReject(note)}>
            <XCircle className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Individual teacher card ───────────────────────────────────────────────────
function TeacherCard({ teacher, onRefresh }: { teacher: TeacherRow; onRefresh: () => void }) {
  const [expanded, setExpanded]         = useState(false);
  const [rejectionNote, setRejectionNote] = useState(teacher.hr_rejection_reason ?? "");
  const [busy, setBusy]                 = useState(false);
  const [zipBusy, setZipBusy]           = useState(false);

  const hasRequiredDocs = REQUIRED_DOCS.every((t) =>
    teacher.docs.some((d) => d.doc_type === t),
  );
  const payroll = payrollCalc(teacher);
  const totalLeaves = teacher.leaves.reduce((s, l) => s + Number(l.total_days), 0);

  async function approveDoc(docId: string) {
    setBusy(true);
    const { error } = await supabase.from("teacher_documents").update({ status: "approved", hr_note: null }).eq("id", docId);
    if (error) toast.error(error.message); else { toast.success("Document approved"); onRefresh(); }
    setBusy(false);
  }

  async function rejectDoc(docId: string, note: string) {
    if (!note.trim()) { toast.error("Please add a rejection note"); return; }
    setBusy(true);
    const { error } = await supabase.from("teacher_documents").update({ status: "rejected", hr_note: note }).eq("id", docId);
    if (error) toast.error(error.message); else { toast.success("Document rejected"); onRefresh(); }
    setBusy(false);
  }

  async function approveTeacher() {
    if (!hasRequiredDocs) { toast.error("Required documents not yet uploaded"); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ hr_approved: true, hr_rejection_reason: null }).eq("id", teacher.id);
    if (error) toast.error(error.message); else { toast.success(`${teacher.full_name} approved — features unlocked`); onRefresh(); }
    setBusy(false);
  }

  async function rejectTeacher() {
    if (!rejectionNote.trim()) { toast.error("Please add a rejection reason"); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ hr_approved: false, hr_rejection_reason: rejectionNote }).eq("id", teacher.id);
    if (error) toast.error(error.message); else { toast.success("Teacher notified to re-upload"); onRefresh(); }
    setBusy(false);
  }

  // Download this teacher's leave + payroll as Excel
  function downloadReport() {
    const leaveRows = teacher.leaves.map((l) => ({
      "Leave Type":  leaveTypeLabel(l.leave_type as LeaveType),
      "From":        l.from_date,
      "To":          l.to_date,
      "Total Days":  l.total_days,
      "Paid Days":   l.paid_days,
      "Unpaid Days": l.unpaid_days,
      "Status":      l.status.replace(/_/g, " "),
    }));

    const payrollRow = [{
      "Teacher":          teacher.full_name,
      "Department":       teacher.department_name ?? "—",
      "Designation":      teacher.designation,
      "Monthly Salary":   teacher.monthly_salary,
      "Total Leave Days": totalLeaves,
      "Unpaid Leave Days":payroll.unpaidDays,
      "Deduction (₹)":    Math.round(payroll.deduction),
      "Net Payable (₹)":  Math.round(payroll.net),
    }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payrollRow),  "Payroll");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(leaveRows),   "Leave History");
    XLSX.writeFile(wb, `${teacher.full_name.replace(/\s+/g, "_")}_HR_Report.xlsx`);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
          {teacher.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{teacher.full_name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {teacher.designation} · {teacher.department_name ?? "No dept"} · {fmtINR(teacher.monthly_salary)}/mo
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <HrStatusBadge hr_approved={teacher.hr_approved} />
          {expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 pb-6 pt-4 space-y-6">

          {/* Profile info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><User className="size-3.5" />Gender: <span className="text-foreground font-medium capitalize ml-1">{teacher.gender ?? "—"}</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="size-3.5" />DOB: <span className="text-foreground font-medium ml-1">{teacher.date_of_birth ?? "—"}</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Briefcase className="size-3.5" />Joined: <span className="text-foreground font-medium ml-1">{fmtDate(teacher.created_at.slice(0, 10))}</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><FileText className="size-3.5" />Docs: <span className="text-foreground font-medium ml-1">{teacher.docs.length} uploaded</span></div>
          </div>

          {/* Payroll summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Wallet className="size-3.5" />Payroll (This Year)</p>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={downloadReport}>
                <BarChart3 className="size-3.5" /> Download Report
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Monthly Salary",   value: fmtINR(payroll.monthly) },
                { label: "Unpaid Leave Days",value: `${payroll.unpaidDays} days` },
                { label: "Deduction",        value: fmtINR(payroll.deduction), red: payroll.deduction > 0 },
                { label: "Net Payable",      value: fmtINR(payroll.net), green: true },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                  <p className={cn("text-sm font-bold mt-0.5", s.red && "text-destructive", s.green && "text-success")}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><FileText className="size-3.5" />Documents</p>
              {teacher.docs.length > 0 && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" disabled={zipBusy}
                  onClick={() => downloadAllDocs(teacher, setZipBusy)}>
                  {zipBusy
                    ? <><Loader2 className="size-3.5 animate-spin" /> Zipping…</>
                    : <><Archive className="size-3.5" /> Download All</>}
                </Button>
              )}
            </div>
            {teacher.docs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No documents uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {teacher.docs.map((doc) => (
                  <DocReviewRow
                    key={doc.id}
                    doc={doc}
                    onApprove={() => approveDoc(doc.id)}
                    onReject={(note) => rejectDoc(doc.id, note)}
                    busy={busy}
                  />
                ))}
              </div>
            )}
            {!hasRequiredDocs && (
              <p className="mt-2 text-xs text-warning-foreground">Required docs (Degree, Marksheet) not yet uploaded.</p>
            )}
          </div>

          {/* HR decision */}
          {teacher.hr_approved !== true ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HR Decision</p>
              <Textarea rows={2} placeholder="Rejection reason (required to reject)…"
                value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" disabled={busy || !hasRequiredDocs} onClick={approveTeacher}>
                  <CheckCircle2 className="size-3.5 mr-1.5" /> Approve & Unlock
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" disabled={busy} onClick={rejectTeacher}>
                  <XCircle className="size-3.5 mr-1.5" /> Reject
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-success/10 border border-success/30 px-4 py-3 text-sm text-success flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" /> Teacher fully onboarded — all features unlocked.
            </div>
          )}

          {/* Leave history */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Leave History — {totalLeaves} days total
            </p>
            {teacher.leaves.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No leaves taken yet.</p>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Type</th>
                      <th className="px-3 py-2 text-left font-semibold">From</th>
                      <th className="px-3 py-2 text-left font-semibold">To</th>
                      <th className="px-3 py-2 text-left font-semibold">Days</th>
                      <th className="px-3 py-2 text-left font-semibold">Unpaid</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {teacher.leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/20">
                        <td className="px-3 py-2">{leaveTypeLabel(l.leave_type as LeaveType)}</td>
                        <td className="px-3 py-2">{fmtDate(l.from_date)}</td>
                        <td className="px-3 py-2">{fmtDate(l.to_date)}</td>
                        <td className="px-3 py-2">{l.total_days}</td>
                        <td className="px-3 py-2 text-destructive font-medium">{Number(l.unpaid_days) > 0 ? l.unpaid_days : "—"}</td>
                        <td className="px-3 py-2"><StatusBadge status={l.status as any} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function HrPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ["hr-teachers"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, user_id, designation, department_id, monthly_salary, approved, hr_approved, hr_rejection_reason, gender, date_of_birth, created_at, departments(name)")
        .eq("approved", true)
        .order("full_name");
      if (error) throw error;

      // Get roles — filter out admin, principal, hr, and the current HR user themselves
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap: Record<string, string> = {};
      for (const r of roles ?? []) roleMap[r.user_id] = r.role;

      const teacherProfiles = (profiles ?? []).filter((p) => {
        const r = roleMap[p.id];
        if (EXCLUDED_ROLES.includes(r)) return false; // exclude admin/principal/hr
        if (p.id === profile?.id) return false;        // exclude self
        return true;
      });

      const ids = teacherProfiles.map((p) => p.id);
      if (ids.length === 0) return [];

      const [{ data: docs }, { data: leaves }] = await Promise.all([
        supabase.from("teacher_documents").select("*").in("teacher_id", ids),
        supabase.from("leave_requests")
          .select("id, teacher_id, leave_type, from_date, to_date, total_days, paid_days, unpaid_days, status")
          .in("teacher_id", ids)
          .order("from_date", { ascending: false }),
      ]);

      return teacherProfiles.map((p): TeacherRow => ({
        id:                  p.id,
        full_name:           p.full_name,
        user_id:             p.user_id,
        designation:         p.designation,
        department_name:     (p.departments as any)?.name ?? null,
        monthly_salary:      Number(p.monthly_salary),
        approved:            p.approved,
        hr_approved:         (p as any).hr_approved,
        hr_rejection_reason: (p as any).hr_rejection_reason,
        gender:              (p as any).gender,
        date_of_birth:       (p as any).date_of_birth,
        created_at:          p.created_at,
        docs:   (docs   ?? []).filter((d) => d.teacher_id === p.id) as TeacherDoc[],
        leaves: (leaves ?? []).filter((l) => l.teacher_id === p.id) as TeacherLeave[],
      }));
    },
  });

  function refresh() { qc.invalidateQueries({ queryKey: ["hr-teachers"] }); }

  // Download full payroll report for all visible teachers
  function downloadFullReport() {
    const rows = teachers.map((t) => {
      const p = payrollCalc(t);
      return {
        "Teacher":            t.full_name,
        "Department":         t.department_name ?? "—",
        "Designation":        t.designation,
        "Gender":             t.gender ?? "—",
        "DOB":                t.date_of_birth ?? "—",
        "Monthly Salary":     t.monthly_salary,
        "Total Leave Days":   t.leaves.reduce((s, l) => s + Number(l.total_days), 0),
        "Unpaid Leave Days":  p.unpaidDays,
        "Deduction (₹)":      Math.round(p.deduction),
        "Net Payable (₹)":    Math.round(p.net),
        "HR Status":          t.hr_approved === true ? "Approved" : t.hr_approved === false ? "Rejected" : "Pending",
        "Docs Uploaded":      t.docs.length,
      };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "HR Payroll Report");
    XLSX.writeFile(wb, `HR_Payroll_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Report downloaded");
  }

  const filtered = teachers.filter((t) => {
    if (filter === "pending")  return t.hr_approved === null;
    if (filter === "approved") return t.hr_approved === true;
    if (filter === "rejected") return t.hr_approved === false;
    return true;
  });

  const counts = {
    all:      teachers.length,
    pending:  teachers.filter((t) => t.hr_approved === null).length,
    approved: teachers.filter((t) => t.hr_approved === true).length,
    rejected: teachers.filter((t) => t.hr_approved === false).length,
  };

  return (
    <Guarded roles={["hr", "admin"]}>
      <AppShell title="HR Panel" subtitle="Teacher onboarding, payroll, document review & leave records">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors",
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:bg-muted/70",
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadFullReport} disabled={teachers.length === 0}>
            <Download className="size-4" /> Download Full Report
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Empty message={`No ${filter === "all" ? "" : filter} teachers`} />
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <TeacherCard key={t.id} teacher={t} onRefresh={refresh} />
            ))}
          </div>
        )}
      </AppShell>
    </Guarded>
  );
}
