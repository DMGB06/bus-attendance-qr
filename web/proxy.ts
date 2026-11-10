import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookieOptions } from "./lib/cookie-options";
import { ACTIVITY_COOKIE, MAX_SECONDS, sessionExpired } from "./lib/session-limits";

const TURNSTILE = "https://challenges.cloudflare.com";

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    `frame-src ${TURNSTILE}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const next = () => {
    const h = new Headers(request.headers);
    h.set("x-nonce", nonce);
    h.set("Content-Security-Policy", csp);
    return NextResponse.next({ request: { headers: h } });
  };
  let response = next();

  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list, extra) {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(extra).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Chequeo optimista (refresca la sesion). Cada pagina verifica de nuevo con getClaims() y rol; las acciones que escriben, con getUser().
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const path = request.nextUrl.pathname;
  const now = Math.floor(Date.now() / 1000);
  // amr viene firmado en el JWT y conserva la hora del ultimo ingreso aunque el token se renueve.
  const authenticatedAt = Math.max(0, ...(claims?.amr ?? []).map((a) => (typeof a === "object" ? a.timestamp : 0)));
  const lastActivity = Number(request.cookies.get(ACTIVITY_COOKIE)?.value ?? 0);
  const expired = !!claims && sessionExpired(now, lastActivity, authenticatedAt);
  if (expired) await supabase.auth.signOut({ scope: "local" });

  const atLogin = path.startsWith("/login");
  if (expired || (!claims && !atLogin)) {
    const url = new URL("/login", request.url);
    if (expired) url.searchParams.set("sesion", "expirada");
    if (path !== "/" && !atLogin) url.searchParams.set("next", path + request.nextUrl.search);
    const redirect = NextResponse.redirect(url, 303);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    response = redirect;
  }

  // La marca de actividad se renueva como mucho una vez por minuto: asi las respuestas no llevan un Set-Cookie nuevo en cada peticion.
  if (claims && !expired) {
    if (now - lastActivity >= 60) response.cookies.set(ACTIVITY_COOKIE, String(now), { ...cookieOptions, maxAge: MAX_SECONDS });
  } else if (lastActivity) response.cookies.delete(ACTIVITY_COOKIE);

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|escudo.png|fondo.jpg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
