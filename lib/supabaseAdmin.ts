import { createClient } from "@supabase/supabase-js";

type SupabaseAdminConfig = {
  url: string;
  serviceRoleKey: string;
};

function readConfig(): SupabaseAdminConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("Invalid NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    url,
    serviceRoleKey,
  };
}

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = readConfig();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
