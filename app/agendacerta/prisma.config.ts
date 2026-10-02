import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// O Prisma 7 não carrega .env sozinho; na Vercel/CI as variáveis já vêm do ambiente.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Vazio é aceito pelo `prisma generate` (postinstall sem banco); db pull exige a URL.
    url: process.env.DATABASE_URL ?? "",
  },
});
