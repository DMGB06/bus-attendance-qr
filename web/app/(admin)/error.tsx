"use client";

import { ErrorPanel, type ErrorProps } from "../error-panel";

// Falla solo el contenido: el menu sigue disponible.
export default function AdminError(props: ErrorProps) {
  return (
    <div className="ad-state">
      <ErrorPanel {...props} />
    </div>
  );
}
