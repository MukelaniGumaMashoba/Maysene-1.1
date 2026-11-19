import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from '@/lib/supabase/database.types';

const BUILD_PLACEHOLDER_URL = "https://placeholder.supabase.co";
const BUILD_PLACEHOLDER_KEY = "public-anon-key";

export const createClient = async (useServiceRole = false) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

  // Defer hard failures until runtime so `next build` can collect page data
  // and prerender when Vercel Preview is missing Supabase env vars.
  if (!supabaseUrl || !supabaseKey) {
    if (!isProductionBuild) {
      throw new Error("Missing Supabase environment variables");
    }
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl || BUILD_PLACEHOLDER_URL,
    useServiceRole
      ? (supabaseServiceKey || BUILD_PLACEHOLDER_KEY)
      : (supabaseKey || BUILD_PLACEHOLDER_KEY),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
};

export const getUsersByRole = async (roles: string[]) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('role', roles);
  
  if (error) throw error;
  return data;
};
