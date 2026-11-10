// Sin cliente de navegador: las cookies de sesion nunca las lee JavaScript.
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const REMEMBER_COOKIE = "bc_email";
