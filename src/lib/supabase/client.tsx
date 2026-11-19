"use client"
import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./database.types";

const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_KEY = "public-anon-key";

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

  // Allow `next build` / SSG to finish when Preview env vars are absent.
  // Real requests still require configured Supabase env vars at runtime.
  if (!supabaseUrl || !supabaseKey) {
    if (isProductionBuild) {
      return createBrowserClient<Database>(
        BUILD_PLACEHOLDER_URL,
        BUILD_PLACEHOLDER_KEY,
      );
    }
    throw new Error("Missing Supabase environment variables");
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
};