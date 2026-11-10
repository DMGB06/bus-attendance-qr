import type { IconName } from "./icons";

export const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/alumnos", label: "Alumnos", icon: "alumnos" },
  { href: "/apoderados", label: "Apoderados", icon: "apoderados" },
  { href: "/qr", label: "Carnets QR", icon: "qr" },
  { href: "/auditoria", label: "Auditoría", icon: "auditoria" },
];

// Barra inferior del celular: los 4 de uso diario. El resto vive en el menú completo.
export const BAR = NAV.slice(0, 4);

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
