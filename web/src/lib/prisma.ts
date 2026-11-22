
import "dotenv/config";

import { existsSync } from "node:fs";
import { join } from "node:path";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const databasePath = join(process.cwd(), "dev.db");

  if (!existsSync(databasePath)) {
    throw new Error(
      `SQLite database not found: ${databasePath}`
    );
  }

  const adapter = new PrismaBetterSqlite3({
    url: `file:./dev.db`,
  });

  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
