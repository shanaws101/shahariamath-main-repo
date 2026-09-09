import { describe, it, expect } from "vitest";
import { validateSlug, maskName, pointsToBdt, buildReferralUrl } from "../referral-slug";

describe("validateSlug", () => {
  it("accepts lowercase alphanumeric and hyphens 4-20", () => {
    expect(validateSlug("smc-abc1").ok).toBe(true);
    expect(validateSlug("rakib-bba-2024").ok).toBe(true);
    expect(validateSlug("abcd").ok).toBe(true);
  });
  it("rejects too short / too long", () => {
    expect(validateSlug("abc").ok).toBe(false);
    expect(validateSlug("a".repeat(21)).ok).toBe(false);
  });
  it("rejects bad chars and uppercase is normalised", () => {
    expect(validateSlug("oli_abc").ok).toBe(false);
    expect(validateSlug("oli abc").ok).toBe(false);
    expect(validateSlug("OLI-ABC1").ok).toBe(true);
  });
});

describe("maskName", () => {
  it("masks names", () => {
    expect(maskName("Rahim")).toBe("R***m");
    expect(maskName("A")).toBe("A*");
    expect(maskName("")).toBe("Anonymous");
    expect(maskName(null)).toBe("Anonymous");
  });
});

describe("pointsToBdt", () => {
  it("1 point = 1 BDT, floors and clamps", () => {
    expect(pointsToBdt(50)).toBe(50);
    expect(pointsToBdt(50.9)).toBe(50);
    expect(pointsToBdt(-10)).toBe(0);
    expect(pointsToBdt(NaN as any)).toBe(0);
  });
});

describe("buildReferralUrl", () => {
  it("builds canonical URL", () => {
    expect(buildReferralUrl("smc-abc1")).toBe("https://shahariamath.com/ref/smc-abc1");
  });
});
