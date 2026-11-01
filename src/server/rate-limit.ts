import { createHmac } from "node:crypto";
import { db } from "./db";

// A shared database bucket is atomic across instances. No forwarded-IP trust assumption.
export async function consumeBucket(key: string, max: number, seconds: number) {
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO request_buckets (key, count, "expiresAt")
    VALUES (${key}, 1, clock_timestamp() + ${seconds} * interval '1 second')
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN request_buckets."expiresAt" <= clock_timestamp() THEN 1 ELSE request_buckets.count + 1 END,
      "expiresAt" = CASE WHEN request_buckets."expiresAt" <= clock_timestamp() THEN clock_timestamp() + ${seconds} * interval '1 second' ELSE request_buckets."expiresAt" END
    RETURNING count`;
  return rows[0].count <= max;
}
export function privateBucket(email: string, secret: string) {
  return `email:${createHmac("sha256", secret).update(email).digest("hex")}`;
}
