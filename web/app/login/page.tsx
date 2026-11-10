import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { safeNext } from "@/lib/auth";
import { REMEMBER_COOKIE } from "@/lib/cookie-options";
import { Shell } from "./shell";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, sesion } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: isAdmin } = user ? await supabase.rpc("is_web_admin") : { data: false };
  if (isAdmin === true) redirect(`/login/mfa?next=${encodeURIComponent(safeNext(next))}`);

  const email = (await cookies()).get(REMEMBER_COOKIE)?.value ?? "";
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <Shell>
      <LoginForm next={safeNext(next)} email={email} siteKey={process.env.TURNSTILE_SITE_KEY || undefined} nonce={nonce} expired={sesion === "expirada"} />
    </Shell>
  );
}
