import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { afterAll, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "../../src/generated/prisma/client";
import { enforceRuntimePolicy } from "../../src/server/runtime-policy";

config({ path: ".env.runtime", quiet: true });
if (!process.env.RUNTIME_DATABASE_URL)
  throw new Error("Run npm run db:runtime before testing");
const target = new URL(process.env.RUNTIME_DATABASE_URL);
if (
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  target.username !== "fitness_runtime"
)
  throw new Error("Expected local restricted runtime credentials");
target.pathname = "/fitness_test";
const runtime = new PrismaClient({
  adapter: new PrismaPg({ connectionString: target.toString() }),
});
afterAll(async () => {
  await runtime.$disconnect();
});

describe("least-privilege database role", () => {
  it("rejects elevated application credentials under the production policy", async () => {
    const previous = process.env.NODE_ENV;
    try {
      vi.stubEnv("NODE_ENV", "production");
      await expect(enforceRuntimePolicy()).rejects.toThrow(
        "Restricted runtime database role required",
      );
    } finally {
      vi.stubEnv("NODE_ENV", previous);
    }
  });
  it("is neither superuser nor schema owner and cannot create tables", async () => {
    const [role] = await runtime.$queryRaw<
      { rolsuper: boolean; rolcreatedb: boolean }[]
    >`SELECT rolsuper, rolcreatedb FROM pg_roles WHERE rolname = current_user`;
    expect(role.rolsuper).toBe(false);
    expect(role.rolcreatedb).toBe(false);
    await expect(
      runtime.$executeRawUnsafe(
        "CREATE TABLE public.forbidden_runtime_test (id int)",
      ),
    ).rejects.toThrow();
  });
  it("cannot issue invitations or alter capacity", async () => {
    await expect(
      runtime.invitation.create({
        data: {
          email: "forbidden@example.test",
          tokenHash: "forbidden",
          expiresAt: new Date(),
        },
      }),
    ).rejects.toThrow();
    await expect(
      runtime.capacity.update({ where: { id: 1 }, data: { occupied: 0 } }),
    ).rejects.toThrow();
  });
  it("cannot edit/delete audit history or bypass account invitation guard", async () => {
    await expect(runtime.auditEvent.deleteMany()).rejects.toThrow();
    await expect(
      runtime.user.create({
        data: {
          id: "uninvited",
          email: "uninvited@example.test",
          name: "Uninvited",
        },
      }),
    ).rejects.toThrow();
  });
});
