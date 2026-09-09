export const SLUG_REGEX = /^[a-z0-9-]{4,20}$/;

export function validateSlug(slug: string): { ok: boolean; reason?: string } {
  const s = String(slug ?? "").toLowerCase().trim();
  if (s.length < 4) return { ok: false, reason: "too_short" };
  if (s.length > 20) return { ok: false, reason: "too_long" };
  if (!SLUG_REGEX.test(s)) return { ok: false, reason: "invalid_chars" };
  return { ok: true };
}

export function maskName(name: string | null | undefined): string {
  const s = String(name ?? "").trim();
  if (!s) return "Anonymous";
  if (s.length <= 2) return s[0] + "*";
  return s[0] + "***" + s[s.length - 1];
}

export function pointsToBdt(points: number): number {
  return Math.max(0, Math.floor(Number(points) || 0));
}

export function buildReferralUrl(slug: string, origin = "https://shahariamath.com"): string {
  return `${origin}/ref/${encodeURIComponent(slug)}`;
}
