import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/server/auth";
import { enforceRuntimePolicy } from "@/server/runtime-policy";

export async function requireSession() {
  await enforceRuntimePolicy();
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");
  return session;
}
