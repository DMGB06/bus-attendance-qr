import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "../login/actions";
import { AdminShell } from "./shell";
import "./admin.css";

// Cada pagina vuelve a llamar requireAdmin() (un layout no se re-ejecuta al navegar) y cada Server Action que escribe llama
// requireAdminAction(). El layout y la pagina comparten el resultado: requireAdmin esta envuelto en cache().
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const collapsed = (await cookies()).get("cb-menu")?.value === "1";
  return (
    <AdminShell signOut={signOut} collapsedDefault={collapsed}>
      {children}
    </AdminShell>
  );
}
