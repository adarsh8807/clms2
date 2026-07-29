import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";

export function AppShell({
  title,
  subtitle,
  children,
  scrollable = true,
  headerRight,
  style,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  headerRight?: React.ReactNode;
  style?: ViewStyle;
}) {
  const { profile, role } = useAuth();

  const header = (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.headerSub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.headerRight}>
        {headerRight}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.slice(0, 2).toUpperCase() ?? "??"}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!scrollable) {
    return (
      <SafeAreaView style={[styles.container, style]} edges={["top"]}>
        {header}
        <View style={styles.body}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, style]} edges={["top"]}>
      {header}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  headerSub: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1d4ed8",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  body: {
    flex: 1,
    padding: 16,
  },
});
