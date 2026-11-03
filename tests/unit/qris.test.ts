import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

async function loadQris() {
  vi.resetModules();
  return await import("@/shared/lib/qris");
}

beforeEach(() => {
  vi.stubEnv("QRIS_BASE_URL", "https://qris.test/api/svc/v1");
  vi.stubEnv("QRIS_API_KEY", "sk-test");
  vi.stubEnv("QRIS_ENABLED", "true");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("qris provider adapter", () => {
  it("creates a charge using provider paths and stores raw response", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "ch_1",
          reference: "REF-1",
          qr_string: "QRIS-PAYLOAD",
          expires_at: "2026-11-03T10:00:00.000Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const qris = await loadQris();

    const charge = await qris.createQrisCharge({
      amount: 1200000,
      reference: "REF-1",
      description: "Test",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://qris.test/api/svc/v1/qris-api/charges");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer sk-test");
    expect(JSON.parse(init.body)).toEqual({
      amount: 1200000,
      reference: "REF-1",
    });
    expect(charge.provider).toBe("qris");
    expect(charge.chargeId).toBe("ch_1");
    expect(charge.qrString).toBe("QRIS-PAYLOAD");
    expect(charge.rawResponse).toBeTruthy();
  });

  it("maps provider status and checks the charge endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "paid" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const qris = await loadQris();

    await expect(qris.checkQrisCharge("ch 1")).resolves.toBe("CONFIRMED");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://qris.test/api/svc/v1/qris-api/charges/ch%201",
    );
    expect(qris.mapQrisStatus("expired")).toBe("EXPIRED");
    expect(qris.mapQrisStatus("unknown")).toBe("PENDING");
  });

  it("refunds via the provider refund endpoint", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const qris = await loadQris();

    await expect(qris.refundQrisCharge("ch_1", 1200000)).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://qris.test/api/svc/v1/qris-api/refunds");
    expect(JSON.parse(init.body)).toEqual({
      charge_id: "ch_1",
      amount: 1200000,
    });
  });

  it("falls back to manual when QRIS is disabled", async () => {
    vi.stubEnv("QRIS_ENABLED", "false");
    const qris = await loadQris();

    const charge = await qris.createQrisCharge({
      amount: 500000,
      reference: "REF-2",
      description: "Test",
    });

    expect(charge.provider).toBe("manual");
    expect(charge.qrString).toContain("JIOODEV-MANUAL");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
