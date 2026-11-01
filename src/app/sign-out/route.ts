import { handleAuth } from "@/modules/auth/http";
import { readEnv } from "@/server/env";

export async function POST(request: Request) {
  const env = readEnv();
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  const result = await handleAuth(
    new Request(new URL("/api/auth/sign-out", env.BETTER_AUTH_URL), {
      method: "POST",
      headers,
      body: "{}",
    }),
  );
  if (!result.ok)
    return new Response(
      "Sign-out failed. Return to your profile and try again.",
      {
        status: result.status,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  const response = new Response(null, {
    status: 303,
    headers: {
      location: new URL("/sign-in", env.BETTER_AUTH_URL).toString(),
      "cache-control": "no-store",
    },
  });
  for (const cookie of result.headers.getSetCookie())
    response.headers.append("set-cookie", cookie);
  return response;
}
