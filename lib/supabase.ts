import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://uyxzkvmdogwcdaqkuluu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5eHprdm1kb2d3Y2RhcWt1bHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgwNzQ2MjMsImV4cCI6MjA1MzY1MDYyM30.LQTXWqGkVCUOqhUJCkOHW5H6T7a-OvfEWfvZ9Nt7-GM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
