import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cookieOptions } from "./cookie-options";

export async function createClient() {
  const store = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookieOptions,
    db: { schema: "buscontrol" },
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        // En un Server Component no se pueden escribir cookies; el proxy ya refresco la sesion.
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}
