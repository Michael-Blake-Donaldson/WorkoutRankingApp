import { getAuth } from "../../server/auth";
import { readEnv } from "../../server/env";
import { consumeBucket } from "../../server/rate-limit";
import { enforceRuntimePolicy } from "../../server/runtime-policy";
import { readSmallJson } from "../auth/http";
import { programMutationSchema } from "./contracts";
import { ProgramError } from "./errors";
import { getProgramBundle } from "./repository";
import { mutateProgram } from "./service";

const reply = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "cache-control": "private, no-store", Vary: "Cookie" },
  });
export async function programsHttp(request: Request) {
  try {
    await enforceRuntimePolicy();
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session) return reply({ error: "Sign in to access programs." }, 401);
    if (new URL(request.url).search)
      return reply(
        { error: "Program queries do not accept account selectors." },
        400,
      );
    if (request.method === "GET")
      return reply(await getProgramBundle(session.user.id));
    if (request.method !== "POST")
      return reply({ error: "Method not allowed" }, 405);
    if (
      request.headers.get("origin") !== readEnv().BETTER_AUTH_URL ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return reply({ error: "Request origin rejected" }, 403);
    if (request.headers.get("x-profile-owner") !== session.user.id)
      return reply(
        {
          error:
            "The signed-in account changed. Reload before changing programs.",
        },
        409,
      );
    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return reply({ error: "JSON required" }, 415);
    if (!(await consumeBucket(`program:${session.user.id}`, 30, 60)))
      return reply(
        { error: "Too many program changes. Wait a minute and retry." },
        429,
      );
    const input = programMutationSchema.safeParse(
      await readSmallJson(request, 8192),
    );
    if (!input.success)
      return reply(
        {
          error: "Review program fields.",
          fields: input.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        400,
      );
    return reply(await mutateProgram(session.user.id, input.data));
  } catch (error) {
    if (error instanceof ProgramError)
      return reply({ error: error.message }, error.status);
    return reply(
      {
        error:
          "Programs are temporarily unavailable. Your saved program was not replaced; reload its status before retrying.",
      },
      503,
    );
  }
}
