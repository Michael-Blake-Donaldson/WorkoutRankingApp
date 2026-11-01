import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalDb = globalThis as unknown as { fitnessDb?: PrismaClient };
export const db =
  globalDb.fitnessDb ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    // Deliberately omit query/parameter logging: auth and future health data are private.
  });
if (process.env.NODE_ENV !== "production") globalDb.fitnessDb = db;
