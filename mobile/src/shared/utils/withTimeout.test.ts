import { withDeadline } from "@/src/shared/utils/withTimeout";

describe("withDeadline", () => {
  afterEach(() => jest.useRealTimers());

  it("rechaza si la promesa no termina a tiempo", async () => {
    jest.useFakeTimers();
    const assertion = expect(withDeadline(new Promise(() => undefined), 100)).rejects.toThrow("timeout");
    await jest.advanceTimersByTimeAsync(100);

    await assertion;
  });

  it("devuelve el resultado si llega a tiempo", async () => {
    await expect(withDeadline(Promise.resolve(1), 100)).resolves.toBe(1);
  });

  it("propaga el error original", async () => {
    await expect(withDeadline(Promise.reject(new Error("fallo")), 100)).rejects.toThrow("fallo");
  });
});
