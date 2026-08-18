import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Local dev talks to `prisma dev`, whose Postgres is PGlite (a single WASM
// instance) reached over raw TCP. Opening a second connection to it wedges the
// server into resetting *every* connection until it is restarted, which any
// page running queries in parallel triggers. `prisma dev` also exposes a pooled
// HTTP endpoint, but v0.16.27 rejects it for client 7.8.0 ("use a direct TCP
// connection string"), so capping the pool is the supported way to stay on one
// connection. Set DATABASE_POOL_MAX=1 in a local .env; leave it unset against a
// real Postgres (production) to keep pg's default pool.
const poolMax = Number(process.env.DATABASE_POOL_MAX);

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ...(Number.isFinite(poolMax) && poolMax > 0 ? { max: poolMax } : {}),
});

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
