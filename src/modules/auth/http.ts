import { z } from "zod";
import { getAuth } from "../../server/auth";
import { readEnv } from "../../server/env";
import { consumeBucket, privateBucket } from "../../server/rate-limit";
import { enforceRuntimePolicy } from "../../server/runtime-policy";
import { eligibleForLink, emailSchema } from "./invitations";

const inputSchema = z
  .object({
    email: emailSchema,
    invitationToken: z.string().max(64).optional(),
  })
  .strict();
const reply = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function handleAuth(request: Request): Promise<Response> {
  try {
    const env = readEnv();
    await enforceRuntimePolicy();
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api\/auth/, "");
    if (
      ![
        ["POST", "/sign-in/magic-link"],
        ["POST", "/sign-out"],
        ["GET", "/get-session"],
        ["POST", "/verify-link"],
      ].some(([m, p]) => m === request.method && p === path)
    )
      return reply({ error: "Not found" }, 404);
    if (
      request.method === "POST" &&
      (request.headers.get("origin") !== env.BETTER_AUTH_URL ||
        request.headers.get("sec-fetch-site") === "cross-site")
    )
      return reply({ error: "Request origin rejected" }, 403);
    if (!(await consumeBucket("auth:global", 120, 60)))
      return reply({ error: "Too many requests. Try again later." }, 429);

    if (path === "/get-session") {
      const session = await getAuth().api.getSession({
        headers: request.headers,
      });
      return reply(
        session
          ? {
              user: { id: session.user.id, email: session.user.email },
              expiresAt: session.session.expiresAt,
            }
          : { user: null },
      );
    }

    if (path === "/sign-in/magic-link") {
      if (!request.headers.get("content-type")?.startsWith("application/json"))
        return reply({ error: "JSON required" }, 415);
      // Limit actual streamed bytes, not a client-controlled Content-Length alone.
      const body = await readSmallJson(request);
      const parsed = inputSchema.safeParse(body);
      if (!parsed.success)
        return reply(
          { error: "Enter a valid email and invitation token." },
          400,
        );
      const { email, invitationToken } = parsed.data;
      if (
        !(await consumeBucket(
          privateBucket(email, env.BETTER_AUTH_SECRET),
          3,
          600,
        ))
      )
        return reply({ error: "Too many requests. Try again later." }, 429);
      if (await eligibleForLink(email, invitationToken)) {
        const headers = new Headers(request.headers);
        headers.delete("content-length");
        headers.set("content-type", "application/json");
        const response = await getAuth().handler(
          new Request(
            new URL("/api/auth/sign-in/magic-link", env.BETTER_AUTH_URL),
            {
              method: "POST",
              headers,
              body: JSON.stringify({
                email,
                callbackURL: "/",
                errorCallbackURL: "/sign-in?error=link",
              }),
            },
          ),
        );
        if (!response.ok)
          return reply(
            { error: "Sign-in delivery is unavailable. Try again later." },
            503,
          );
      }
      // Do not reveal account membership or whether an invitation is valid.
      return reply({
        message:
          "If your account or invitation is eligible, a sign-in link has been sent. Check your inbox.",
      });
    }
    if (path === "/verify-link") {
      const body = z
        .object({ token: z.string().min(20).max(256) })
        .strict()
        .safeParse(await readSmallJson(request));
      if (!body.success) return reply({ error: "Invalid link" }, 400);
      // The raw library verification GET is deliberately not exposed publicly.
      const target = new URL(
        "/api/auth/magic-link/verify",
        env.BETTER_AUTH_URL,
      );
      target.searchParams.set("token", body.data.token);
      const headers = new Headers(request.headers);
      headers.delete("content-length");
      headers.delete("content-type");
      const response = await getAuth().handler(
        new Request(target, { headers }),
      );
      if (!response.ok)
        return reply(
          { error: "Link is invalid or expired. Request a new sign-in link." },
          400,
        );
      // Never forward session tokens in JSON to the browser; HttpOnly cookies only.
      const result = reply({ message: "Signed in" });
      for (const cookie of response.headers.getSetCookie())
        result.headers.append("set-cookie", cookie);
      return result;
    }
    const response = await getAuth().handler(request);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    // No raw errors/URLs/body/token/database credentials in public responses or logs.
    return reply(
      { error: "Authentication is temporarily unavailable. Try again later." },
      503,
    );
  }
}

export async function readSmallJson(request: Request): Promise<unknown> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}
