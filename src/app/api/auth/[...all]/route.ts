import { handleAuth } from "@/modules/auth/http";
export const runtime = "nodejs";
export const GET = handleAuth;
export const POST = handleAuth;
