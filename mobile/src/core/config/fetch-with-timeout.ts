const REQUEST_TIMEOUT_MS = 15_000;

/** Sin esto, una peticion con senal debil puede quedar colgada para siempre. */
export function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  init?.signal?.addEventListener("abort", () => controller.abort());

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
