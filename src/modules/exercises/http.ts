import { z } from "zod";
import { getAuth } from "../../server/auth";
import { readEnv } from "../../server/env";
import { consumeBucket } from "../../server/rate-limit";
import { enforceRuntimePolicy } from "../../server/runtime-policy";
import { readSmallJson } from "../auth/http";
import { ProfileError } from "../profile/service";
import { getAlternatives } from "./service";

const inputSchema = z
  .object({
    exerciseId: z.uuid(),
    equipmentProfileId: z.uuid(),
    expectedProfileVersion: z.number().int().min(1),
  })
  .strict();
const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store", Vary: "Cookie" },
  });
export async function alternativesHttp(request: Request) {
  try {
    await enforceRuntimePolicy();
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session)
      return reply({ error: "Sign in to compare alternatives." }, 401);
    if (request.method !== "POST")
      return reply({ error: "Method not allowed" }, 405);
    if (new URL(request.url).search)
      return reply({ error: "Queries are not accepted." }, 400);
    if (
      request.headers.get("origin") !== readEnv().BETTER_AUTH_URL ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return reply({ error: "Request origin rejected" }, 403);
    if (request.headers.get("x-profile-owner") !== session.user.id)
      return reply(
        { error: "The signed-in account changed. Reload before comparing." },
        409,
      );
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return reply({ error: "JSON required" }, 415);
    if (!(await consumeBucket(`alternatives:${session.user.id}`, 60, 60)))
      return reply(
        { error: "Too many requests. Wait a minute and retry." },
        429,
      );
    const input = inputSchema.safeParse(await readSmallJson(request, 4096));
    if (!input.success)
      return reply(
        {
          error:
            "Choose a current exercise, equipment location and profile version.",
        },
        400,
      );
    return reply(await getAlternatives(session.user.id, input.data));
  } catch (error) {
    if (error instanceof ProfileError)
      return reply({ error: error.message }, error.status);
    return reply(
      {
        error: "Alternatives are unavailable. Check your connection and retry.",
      },
      503,
    );
  }
}
