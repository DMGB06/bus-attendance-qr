"use client";

import { ErrorPanel, type ErrorProps } from "./error-panel";
import { Shell } from "./login/shell";

export default function RootError(props: ErrorProps) {
  return (
    <Shell>
      <ErrorPanel {...props} />
    </Shell>
  );
}
