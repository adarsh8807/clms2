import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { LeaveStatus, STATUS_LABEL, statusColor } from "@/lib/leave";

// ── Card ──────────────────────────────────────────────────────
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── SectionCard ───────────────────────────────────────────────
export function SectionCard({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, style]}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

// ── StatCard ──────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ── StatusBadge ───────────────────────────────────────────────
export function StatusBadge({ status }: { status: LeaveStatus }) {
  const color = statusColor(status);
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: color + "22" }]}>
      <Text style={[styles.badgeText, { color }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────
export function Badge({
  children,
  color = "#1d4ed8",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: color + "22" }]}>
      <Text style={[styles.badgeText, { color }]}>{children}</Text>
    </View>
  );
}

// ── Button ────────────────────────────────────────────────────
export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  style,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
}) {
  const bgMap: Record<string, string> = {
    primary: "#1d4ed8",
    secondary: "#6b7280",
    danger: "#dc2626",
    ghost: "transparent",
    outline: "transparent",
  };
  const textMap: Record<string, string> = {
    primary: "#fff",
    secondary: "#fff",
    danger: "#fff",
    ghost: "#1d4ed8",
    outline: "#1d4ed8",
  };
  const borderMap: Record<string, string> = {
    primary: "#1d4ed8",
    secondary: "#6b7280",
    danger: "#dc2626",
    ghost: "transparent",
    outline: "#1d4ed8",
  };
  const padMap: Record<string, ViewStyle> = {
    sm: { paddingHorizontal: 12, paddingVertical: 6 },
    md: { paddingHorizontal: 16, paddingVertical: 10 },
    lg: { paddingHorizontal: 20, paddingVertical: 14 },
  };
  const textSizeMap: Record<string, number> = { sm: 13, md: 14, lg: 16 };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        padMap[size],
        {
          backgroundColor: bgMap[variant],
          borderColor: borderMap[variant],
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textMap[variant]} />
      ) : (
        <Text style={[styles.buttonText, { color: textMap[variant], fontSize: textSizeMap[size] }]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── Empty ─────────────────────────────────────────────────────
export function Empty({ children }: { children?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{children ?? "Nothing here yet."}</Text>
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────
export function Divider() {
  return <View style={styles.divider} />;
}

// ── Row ───────────────────────────────────────────────────────
export function Row({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>{children}</View>;
}

// ── Label / Value pairs ───────────────────────────────────────
export function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
    textAlign: "center",
  },
  statSub: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  button: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 6,
  },
  buttonText: {
    fontWeight: "600",
  },
  empty: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: {
    fontSize: 13,
    color: "#6b7280",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
});
