import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { LEAVE_TYPES, type LeaveType } from "@/lib/leave";

export type Balance = {
  type: LeaveType;
  label: string;
  yearly: number;
  monthly?: number;
  used: number;
  usedYear: number;
  usedMonth: number;
  remaining: number;
};

export function useBalances(userId?: string) {
  return useQuery<Balance[]>({
    queryKey: ["balances", userId],
    enabled: !!userId,
    queryFn: async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const monthEnd = new Date(year, month, 0);
      const monthEndISO = `${year}-${String(month).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;

      const [{ data: yearData }, { data: monthData }] = await Promise.all([
        supabase
          .from("leave_requests")
          .select("leave_type, total_days, status")
          .eq("teacher_id", userId!)
          .neq("status", "rejected")
          .gte("from_date", `${year}-01-01`)
          .lte("from_date", `${year}-12-31`),
        supabase
          .from("leave_requests")
          .select("leave_type, total_days, status")
          .eq("teacher_id", userId!)
          .neq("status", "rejected")
          .gte("from_date", monthStart)
          .lte("from_date", monthEndISO),
      ]);

      const yearRows = yearData ?? [];
      const monthRows = monthData ?? [];

      return LEAVE_TYPES.map((lt) => {
        const usedYear = yearRows.filter((r) => r.leave_type === lt.value).reduce((s, r) => s + Number(r.total_days), 0);
        const usedMonth = monthRows.filter((r) => r.leave_type === lt.value).reduce((s, r) => s + Number(r.total_days), 0);
        const remaining = Math.max(0, lt.yearly - usedYear);
        return {
          type: lt.value,
          label: lt.label,
          yearly: lt.yearly,
          monthly: lt.monthly,
          used: usedYear,
          usedYear,
          usedMonth,
          remaining,
        };
      });
    },
  });
}
