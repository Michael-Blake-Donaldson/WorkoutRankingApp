import { getAuth } from "@/server/auth";
import { enforceRuntimePolicy } from "@/server/runtime-policy";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    await enforceRuntimePolicy();
    const session = await getAuth().api.getSession({
      headers: request.headers,
    });
    if (!session)
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    // Identity comes exclusively from the server session, never a requested user ID.
    return Response.json(
      { id: session.user.id, email: session.user.email },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Service temporarily unavailable" },
      { status: 503 },
    );
  }
}
