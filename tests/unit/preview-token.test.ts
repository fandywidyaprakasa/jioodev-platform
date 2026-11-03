import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decodePreviewToken, encodePreviewToken, isOutputRevoked } from "@/shared/lib/jobs-server";

const previous = process.env.PREVIEW_TOKEN_SECRET;

describe("preview tokens", () => {
  beforeAll(() => {
    process.env.PREVIEW_TOKEN_SECRET = "test-preview-secret";
  });

  afterAll(() => {
    if (previous === undefined) delete process.env.PREVIEW_TOKEN_SECRET;
    else process.env.PREVIEW_TOKEN_SECRET = previous;
  });

  it("signs and verifies a token", () => {
    const token = encodePreviewToken("out_1", "var_1");
    expect(token.split(".")).toHaveLength(2);
    expect(decodePreviewToken(token)).toMatchObject({
      outputId: "out_1",
      variantId: "var_1",
    });
  });

  it("rejects tampered tokens", () => {
    const token = encodePreviewToken("out_1", "var_1");
    const [payload, signature] = token.split(".");
    expect(decodePreviewToken(`${payload}.${signature.slice(0, -1)}x`)).toBeNull();
    expect(decodePreviewToken(`${payload}x.${signature}`)).toBeNull();
  });

  it("rejects unsigned base64 tokens", () => {
    const old = Buffer.from("out_1|var_1").toString("base64url");
    expect(decodePreviewToken(old)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = encodePreviewToken("out_1", "var_1", -1);
    expect(decodePreviewToken(token)).toBeNull();
  });

  it("detects revoked outputs", () => {
    expect(isOutputRevoked({ revoked_at: "2026-01-01" })).toBe(true);
    expect(isOutputRevoked({ quality: { revoked_at: "2026-01-01" } })).toBe(true);
    expect(isOutputRevoked({})).toBe(false);
  });
});
