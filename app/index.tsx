import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const { session, loading, role } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (role === "admin") {
    return <Redirect href="/(app)/admin" />;
  }

  return <Redirect href="/(app)/(tabs)/dashboard" />;
}
