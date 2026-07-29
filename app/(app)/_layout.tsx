import { useEffect } from "react";
import { Stack } from "expo-router";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { View, ActivityIndicator } from "react-native";

export default function AppLayout() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/(auth)/sign-in");
    }
  }, [session, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}
