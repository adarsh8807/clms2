import { Tabs } from "expo-router";
import { useAuth } from "@/lib/auth";
import { StyleSheet, Text, Platform } from "react-native";

const TAB_ICONS: Record<string, string> = {
  dashboard:    "🏠",
  apply:        "📝",
  leaves:       "📋",
  schedule:     "📅",
  proxies:      "🔄",
  payroll:      "💰",
  requests:     "✅",
  "mark-leave": "✏️",
  notices:      "📢",
  teachers:     "👥",
  departments:  "🏛️",
  holidays:     "🎉",
  reports:      "📊",
  profile:      "👤",
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.5 }}>
      {TAB_ICONS[name] ?? "•"}
    </Text>
  );
}

const TEACHER_TABS    = ["dashboard", "apply", "leaves", "schedule", "proxies", "payroll", "holidays", "profile"];
const HOD_TABS        = ["dashboard", "apply", "leaves", "requests", "mark-leave", "proxies", "notices", "teachers", "reports", "holidays", "profile"];
const PRINCIPAL_TABS  = ["dashboard", "requests", "mark-leave", "notices", "teachers", "departments", "reports", "holidays", "profile"];

const ALL_TABS = [
  { name: "dashboard",   title: "Home" },
  { name: "apply",       title: "Apply" },
  { name: "leaves",      title: "Leaves" },
  { name: "schedule",    title: "Schedule" },
  { name: "proxies",     title: "Proxies" },
  { name: "payroll",     title: "Payroll" },
  { name: "requests",    title: "Requests" },
  { name: "mark-leave",  title: "Mark" },
  { name: "notices",     title: "Notices" },
  { name: "teachers",    title: "Staff" },
  { name: "departments", title: "Depts" },
  { name: "holidays",    title: "Holidays" },
  { name: "reports",     title: "Reports" },
  { name: "profile",     title: "Profile" },
];

export default function TabLayout() {
  const { role } = useAuth();

  let activeTabs = TEACHER_TABS;
  if (role === "hod")       activeTabs = HOD_TABS;
  if (role === "principal") activeTabs = PRINCIPAL_TABS;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#1d4ed8",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      {ALL_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            href: activeTabs.includes(tab.name) ? undefined : null,
            tabBarIcon: ({ focused }) => <TabIcon name={tab.name} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    height: Platform.OS === "ios" ? 80 : 60,
    paddingBottom: Platform.OS === "ios" ? 20 : 6,
    paddingTop: 4,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
});
