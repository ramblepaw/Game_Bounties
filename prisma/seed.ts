import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function upsertUser(
  username: string,
  password: string,
  displayName: string,
) {
  const passwordHash = await hash(password, 12);
  return db.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash, displayName },
  });
}

async function main() {
  const user1 = await upsertUser(
    process.env.SEED_USER_1_USERNAME ?? "player1",
    process.env.SEED_USER_1_PASSWORD ?? "changeme123",
    process.env.SEED_USER_1_DISPLAY_NAME ?? "Player One",
  );
  const user2 = await upsertUser(
    process.env.SEED_USER_2_USERNAME ?? "player2",
    process.env.SEED_USER_2_PASSWORD ?? "changeme123",
    process.env.SEED_USER_2_DISPLAY_NAME ?? "Player Two",
  );

  await db.badge.upsert({
    where: { key: "COMPLETIONIST_GENERIC" },
    update: {},
    create: {
      key: "COMPLETIONIST_GENERIC",
      name: "Completionist",
      description: "Awarded for completing a checklist.",
    },
  });

  console.log(`Seeded users: ${user1.username}, ${user2.username}`);
  if (!process.env.SEED_USER_1_PASSWORD || !process.env.SEED_USER_2_PASSWORD) {
    console.warn(
      "Using default seed passwords ('changeme123'). Set SEED_USER_1_PASSWORD / SEED_USER_2_PASSWORD env vars before deploying.",
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
