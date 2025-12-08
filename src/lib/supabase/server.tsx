import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from '@/lib/supabase/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const createClient = async (useServiceRole = false) => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    supabaseUrl,
    useServiceRole ? supabaseServiceKey : supabaseKey,
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
