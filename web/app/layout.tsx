import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CerroBus | Panel de administración",
  description: "Transporte escolar de la Municipalidad de Cerro Azul",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: extensiones del navegador (Scribe) agregan atributos a <html>.
    <html lang="es" className={manrope.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
