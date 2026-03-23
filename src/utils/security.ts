import crypto from "node:crypto";

export function createFingerprint(service: string, labels: Record<string, unknown> = {}, metric = ""): string {
  const sortedLabels = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${String(v)}`).join("|");
  return crypto.createHash("sha256").update(`${service}|${metric}|${sortedLabels}`).digest("hex");
}

export function verifyHmacSignature(payload: string | Buffer, signature: string, secret: string): boolean {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)); }
  catch { return false; }
}
