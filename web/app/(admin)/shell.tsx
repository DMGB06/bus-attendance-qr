"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IDLE_SECONDS } from "@/lib/session-limits";
import { Icon } from "./icons";
import { BAR, NAV, isActive } from "./nav";
import { hideTip, saveCollapsed, showTip, type Tip } from "./ui";

type Drag = { y: number; x: number; t: number; on: boolean; dy: number; id: number };

type Props = { children: React.ReactNode; signOut: () => Promise<void>; collapsedDefault: boolean };

export function AdminShell({ children, signOut, collapsedDefault }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(collapsedDefault);
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const prevOpen = useRef(false);
  const drag = useRef<Drag | null>(null);
  const suppress = useRef(false);
  const current = NAV.find((n) => isActive(pathname, n.href)) ?? NAV[0];
  // La pestana cambia al hacer clic, sin esperar la respuesta del servidor.
  const [pending, setPending] = useState<{ href: string; from: string } | null>(null);
  if (pending && pending.from !== pathname) setPending(null);
  const active = pending?.href ?? pathname;

  // Ayudas del menu contraido (en escritorio, solo con el menu contraido).
  function tipProps(text: string) {
    const show = (el: HTMLElement, instant: boolean) => {
      if (collapsed) showTip(el, text, instant, setTip);
    };
    const hide = () => hideTip(tip !== null, setTip);
    return {
      onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType === "mouse") show(e.currentTarget, false);
      },
      onPointerLeave: hide,
      onFocus: (e: React.FocusEvent<HTMLElement>) => {
        if (e.currentTarget.matches(":focus-visible")) show(e.currentTarget, true);
      },
      onBlur: hide,
    };
  }

  // instant: desde el teclado no se anima.
  function toggle(instant: boolean) {
    hideTip(tip !== null, setTip);
    if (instant) {
      root.current?.setAttribute("data-nt", "");
      requestAnimationFrame(() => requestAnimationFrame(() => root.current?.removeAttribute("data-nt")));
    }
    saveCollapsed(!collapsed);
    setCollapsed(!collapsed);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
      const typing = e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]");
      if (e.key === "[" && !typing) toggle(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Pantalla desatendida: al vencer la inactividad se recarga y el servidor la lleva al login.
  // ponytail: actividad = pedidos al servidor; si un formulario largo tarda mas, contar teclado y mouse.
  useEffect(() => {
    const t = setTimeout(() => window.location.reload(), (IDLE_SECONDS + 5) * 1000);
    return () => clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (prevOpen.current === open) return;
    prevOpen.current = open;
    if (open) sheet.current?.querySelector<HTMLElement>("[aria-current]")?.focus({ preventScroll: true });
    else menuBtn.current?.focus({ preventScroll: true });
  }, [open]);

  // Arrastrar el panel hacia abajo cierra: por distancia o por velocidad.
  const dragProps = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      drag.current = { x: e.clientX, y: e.clientY, t: Date.now(), on: false, dy: 0, id: e.pointerId };
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const g = drag.current;
      if (!g) return;
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (!g.on) {
        if (dy > 8 && dy > Math.abs(dx)) {
          g.on = true;
          e.currentTarget.setPointerCapture(g.id);
          e.currentTarget.style.transition = "none";
        } else return;
      }
      g.dy = Math.max(0, dy);
      e.currentTarget.style.transform = `translateY(${g.dy}px)`;
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onClickCapture: (e: React.MouseEvent) => {
      if (suppress.current) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
  };
  function endDrag(e: React.PointerEvent<HTMLElement>) {
    const g = drag.current;
    drag.current = null;
    if (!g?.on) return;
    suppress.current = true;
    setTimeout(() => (suppress.current = false), 0);
    e.currentTarget.style.transition = "";
    e.currentTarget.style.transform = "";
    if (g.dy > 80 || g.dy / Math.max(1, Date.now() - g.t) > 0.11) setOpen(false);
  }

  const brand = (
    <div className="ad-brand">
      <span className="ad-badge">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/escudo.png" alt="" width={36} height={32} />
      </span>
      <div className="ad-brand-text">
        <strong>CerroBus</strong>
        <span>Panel de administración</span>
      </div>
    </div>
  );

  const items = (onGo?: () => void, tips = false) =>
    NAV.map((n) => (
      <Link key={n.href} href={n.href} className="ad-item" aria-current={isActive(active, n.href) ? "page" : undefined} onClick={onGo} onNavigate={() => setPending({ href: n.href, from: pathname })} {...(tips ? tipProps(n.label) : {})}>
        <Icon name={n.icon} />
        <span className="ad-label">{n.label}</span>
      </Link>
    ));

  const logout = (tips: boolean) => (
    <form action={signOut}>
      <button className="ad-item" type="submit" {...(tips ? tipProps("Cerrar sesión") : {})}>
        <Icon name="out" />
        <span className="ad-label">Cerrar sesión</span>
      </button>
    </form>
  );

  return (
    <div ref={root} className="ad-app" data-collapsed={collapsed || undefined} data-open={open || undefined}>
      <a href="#contenido" className="ad-skip">Saltar al contenido</a>
      <aside className="ad-nv ad-sb">
        {brand}
        <nav className="ad-nav" aria-label="Principal">{items(undefined, true)}</nav>
        <div className="ad-foot">
          {logout(true)}
          <button
            className="ad-rbtn ad-tgl"
            type="button"
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!collapsed}
            onClick={() => toggle(false)}
            {...tipProps(collapsed ? "Expandir menú" : "Contraer menú")}
          >
            <Icon name="x" className="ad-i-x" />
            <Icon name="menu" className="ad-i-menu" />
          </button>
        </div>
      </aside>
      {tip && (
        <div className="ad-tip" role="presentation" data-quick={tip.quick || undefined} style={{ top: tip.top }}>
          {tip.text}
        </div>
      )}

      <div className="ad-main" inert={open}>
        <header className="ad-top">
          <span className="ad-badge ad-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/escudo.png" alt="" width={30} height={26} />
          </span>
          <h1>{current.label}</h1>
        </header>
        <main id="contenido" className="ad-content" tabIndex={-1}>{children}</main>
      </div>

      <nav className="ad-bar" aria-label="Principal" inert={open}>
        {BAR.map((n) => (
          <Link key={n.href} href={n.href} className="ad-bi" aria-current={isActive(active, n.href) ? "page" : undefined} onNavigate={() => setPending({ href: n.href, from: pathname })}>
            <Icon name={n.icon} />
            <span className="ad-bl">{n.label}</span>
          </Link>
        ))}
        <button ref={menuBtn} className="ad-rbtn ad-more" type="button" aria-label="Abrir menú completo" aria-controls="ad-sheet" aria-expanded={open} onClick={() => setOpen(true)}>
          <Icon name="menu" />
        </button>
      </nav>
      <div className="ad-scrim" aria-hidden="true" onClick={() => setOpen(false)} />
      <div id="ad-sheet" ref={sheet} className="ad-nv ad-sheet" role="dialog" aria-modal="true" aria-label="Menú" inert={!open} {...dragProps}>
        {brand}
        <nav className="ad-nav" aria-label="Menú completo">{items(() => setOpen(false))}</nav>
        <div className="ad-foot">
          {logout(false)}
          <button className="ad-rbtn" type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)}>
            <Icon name="x" />
          </button>
        </div>
      </div>
    </div>
  );
}
