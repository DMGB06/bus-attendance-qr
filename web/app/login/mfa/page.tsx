import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { safeNext } from "@/lib/auth";
import { Shell } from "../shell";
import { MfaForm } from "./mfa-form";

export default async function MfaPage({ searchParams }: PageProps<"/login/mfa">) {
  const next = safeNext((await searchParams).next);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: isAdmin } = await supabase.rpc("is_web_admin");
  if (isAdmin !== true) redirect("/login");

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === "aal2") redirect(next);

  return (
    <Shell>
      <MfaForm next={next} enrolled={aal?.nextLevel === "aal2"} />
    </Shell>
  );
}
