import { z } from "zod";
import { getAuth } from "../../server/auth";
import { readEnv } from "../../server/env";
import { consumeBucket } from "../../server/rate-limit";
import { enforceRuntimePolicy } from "../../server/runtime-policy";
import { readSmallJson } from "../auth/http";
import { mutationSchema } from "./contracts";
import { getProfileBundle, mutateProfile, ProfileError } from "./service";

const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store", Vary: "Cookie" },
  });
export async function profileHttp(request: Request) {
  try {
    const env = readEnv();
    await enforceRuntimePolicy();
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session)
      return reply({ error: "Sign in to access your profile." }, 401);
    // This endpoint has no user selector; all ownership comes from this session.
    const query = new URL(request.url).searchParams;
    const cursor = query.get("cursor");
    if (
      [...query.keys()].some((key) => key !== "cursor") ||
      query.getAll("cursor").length > 1 ||
      (cursor !== null && !z.uuid().safeParse(cursor).success) ||
      (request.method !== "GET" && query.size)
    )
      return reply(
        { error: "Profile queries do not accept account selectors." },
        400,
      );
    if (request.method === "GET")
      return reply(
        await getProfileBundle(session.user.id, cursor ?? undefined),
      );
    if (request.method !== "POST")
      return reply({ error: "Method not allowed" }, 405);
    if (
      request.headers.get("origin") !== env.BETTER_AUTH_URL ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return reply({ error: "Request origin rejected" }, 403);
    if (request.headers.get("x-profile-owner") !== session.user.id)
      return reply(
        {
          error:
            "The signed-in account changed. Reload before saving this profile.",
        },
        409,
      );
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return reply({ error: "JSON required" }, 415);
    if (!(await consumeBucket(`profile:${session.user.id}`, 60, 60)))
      return reply(
        { error: "Too many changes. Wait a minute and retry." },
        429,
      );
    const parsed = mutationSchema.safeParse(
      await readSmallJson(request, 20_480),
    );
    if (!parsed.success)
      return reply(
        {
          error: "Review these fields.",
          fields: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    return reply(await mutateProfile(session.user.id, parsed.data));
  } catch (error) {
    if (error instanceof ProfileError)
      return reply({ error: error.message }, error.status);
    return reply(
      {
        error:
          "Your profile could not be loaded or saved. Check your connection and retry.",
      },
      503,
    );
  }
}
