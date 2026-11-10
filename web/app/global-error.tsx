"use client";

import "./globals.css";
import { ErrorPanel, type ErrorProps } from "./error-panel";
import { Shell } from "./login/shell";

// Reemplaza al layout raiz cuando este falla: define su propio html y body.
export default function GlobalError(props: ErrorProps) {
  return (
    <html lang="es">
      <body>
        <title>CerroBus | Error</title>
        <Shell>
          <ErrorPanel {...props} />
        </Shell>
      </body>
    </html>
  );
}
