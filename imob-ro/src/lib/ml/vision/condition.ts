// Lightweight helpers for vision condition estimator
export type ConditionVerdict = "necesită renovare" | "decent" | "modern";

export function mapScoreToVerdict(score: number): {
  verdict: ConditionVerdict;
  conditionScore: number;
} {
  // score expected in [0,1], where higher means better condition
  const s = Math.max(0, Math.min(1, score));
  let verdict: ConditionVerdict = "decent";
  if (s < 0.35) verdict = "necesită renovare";
  else if (s >= 0.35 && s < 0.75) verdict = "decent";
  else verdict = "modern";
  return { verdict, conditionScore: s };
}

// Compute a stable hash for an array of photo URLs (used as cache key)
export async function hashPhotoUrls(urls: string[]): Promise<string> {
  const data = urls.join("|");
  if (typeof crypto !== "undefined" && crypto.subtle && crypto.subtle.digest) {
    const enc = new TextEncoder();
    const buf = enc.encode(data);
    const hashBuf = await crypto.subtle.digest("SHA-1", buf);
    const hashArray = Array.from(new Uint8Array(hashBuf));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // fallback: simple hash
  let h = 0;
  for (let i = 0; i < data.length; i++) h = (h << 5) - h + data.charCodeAt(i);
  return "h" + Math.abs(h).toString(16);
}
