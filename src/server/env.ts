import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z
    .url()
    .refine(
      (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
    ),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(64),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_FROM: z.string().min(1),
  SMTP_SECURE: z.enum(["true", "false"]).default("true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

export function readEnv(input: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Invalid configuration fields: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  const value = result.data;
  const url = new URL(value.BETTER_AUTH_URL);
  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error("BETTER_AUTH_URL must be an origin only");
  if (
    input.NODE_ENV === "production" &&
    (url.protocol !== "https:" ||
      value.SMTP_SECURE !== "true" ||
      !value.SMTP_USER ||
      !value.SMTP_PASSWORD)
  ) {
    throw new Error("Production requires HTTPS and authenticated TLS SMTP");
  }
  return { ...value, BETTER_AUTH_URL: url.origin };
}
