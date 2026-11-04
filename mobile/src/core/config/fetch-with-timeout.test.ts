import { fetchWithTimeout } from "@/src/core/config/fetch-with-timeout";

const realFetch = global.fetch;

function hangingFetch() {
  return jest.fn(
    (_input: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("AbortError: Aborted")));
      }),
  );
}

describe("fetchWithTimeout", () => {
  beforeEach(() => jest.useFakeTimers());

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = realFetch;
  });

  it("corta una peticion colgada", async () => {
    global.fetch = hangingFetch() as unknown as typeof fetch;

    const request = fetchWithTimeout("https://x.test");
    const assertion = expect(request).rejects.toThrow("Abort");
    await jest.advanceTimersByTimeAsync(15_000);

    await assertion;
  });

  it("respeta la cancelacion de quien llama", async () => {
    global.fetch = hangingFetch() as unknown as typeof fetch;
    const caller = new AbortController();

    const request = fetchWithTimeout("https://x.test", { signal: caller.signal });
    const assertion = expect(request).rejects.toThrow("Abort");
    caller.abort();

    await assertion;
  });

  it("devuelve la respuesta normal", async () => {
    const response = { ok: true } as Response;
    global.fetch = jest.fn(async () => response) as unknown as typeof fetch;

    await expect(fetchWithTimeout("https://x.test")).resolves.toBe(response);
  });
});
