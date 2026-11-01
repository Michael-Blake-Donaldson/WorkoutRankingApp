import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import nodemailer from "nodemailer";
import { db } from "./db";
import { readEnv } from "./env";

export function createAuth() {
  const env = readEnv();
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE === "true",
    ...(env.SMTP_USER
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
      : {}),
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return betterAuth({
    appName: "Fitness RPG",
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
    emailAndPassword: { enabled: false },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    // HTTP wrapper implements atomic persistent limits, including invalid invite requests.
    rateLimit: { enabled: false },
    advanced: {
      useSecureCookies: env.BETTER_AUTH_URL.startsWith("https:"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
      ipAddress: { disableIpTracking: true },
    },
    plugins: [
      magicLink({
        expiresIn: 300,
        storeToken: "hashed",
        async sendMagicLink({ email, token }) {
          // Show a confirmation page first: email scanners must not consume a login GET.
          const confirmation = new URL("/verify", env.BETTER_AUTH_URL);
          confirmation.hash = new URLSearchParams({
            token,
          }).toString();
          await transport.sendMail({
            from: env.SMTP_FROM,
            to: email,
            subject: "Your Fitness RPG sign-in link",
            text: `Confirm sign-in on your device: ${confirmation.toString()}\n\nThis link expires in 5 minutes and works once. If you did not request it, ignore this email.`,
          });
        },
      }),
    ],
    logger: { disabled: true },
  });
}

let auth: ReturnType<typeof createAuth> | undefined;
export const getAuth = () => (auth ??= createAuth());
