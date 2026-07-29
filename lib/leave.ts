export type LeaveType = "casual" | "maternity" | "bereavement" | "other" | "emergency";
export type LeaveSession = "full_day" | "forenoon" | "afternoon";
export type LeaveStatus =
  | "pending_hod"
  | "hod_recommended"
  | "pending_principal"
  | "approved"
  | "rejected";

export const LEAVE_TYPES: { value: LeaveType; label: string; yearly: number; monthly?: number }[] =
  [
    { value: "casual", label: "Casual Leave", yearly: 12, monthly: 2 },
    { value: "maternity", label: "Maternity Leave", yearly: 90 },
    { value: "bereavement", label: "Bereavement Leave", yearly: 5 },
    { value: "other", label: "Other Leave", yearly: 7 },
    { value: "emergency", label: "Emergency Leave", yearly: 6 },
  ];

export const leaveTypeLabel = (t: LeaveType) =>
  LEAVE_TYPES.find((x) => x.value === t)?.label ?? t;

export const SESSION_LABEL: Record<LeaveSession, string> = {
  full_day: "Full Day",
  forenoon: "Half Day (Forenoon)",
  afternoon: "Half Day (Afternoon)",
};

export const STATUS_LABEL: Record<LeaveStatus, string> = {
  pending_hod: "Pending with HOD",
  hod_recommended: "HOD Approved",
  pending_principal: "Pending with Principal",
  approved: "Approved",
  rejected: "Rejected",
};

export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fmtDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function money(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function perDaySalary(monthly: number): number {
  return monthly / 26;
}

export function isAlwaysUnpaid(t: LeaveType): boolean {
  return t === "emergency";
}

export function needsPaymentDecision(t: LeaveType): boolean {
  return t !== "emergency" && t !== "casual";
}

export const EMERGENCY_AUTO_APPROVE_MS = 5 * 60 * 60 * 1000;

export function emergencyMsRemaining(createdAt: string): number {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return Math.max(0, EMERGENCY_AUTO_APPROVE_MS - elapsed);
}

export function fmtMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  const cur = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function statusColor(status: LeaveStatus): string {
  switch (status) {
    case "approved":
      return "#16a34a";
    case "hod_recommended":
    case "pending_principal":
      return "#0284c7";
    case "rejected":
      return "#dc2626";
    default:
      return "#d97706";
  }
}
