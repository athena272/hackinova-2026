import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppointmentRepository } from "./create-appointment-repository";
import { createWaitlistRepository } from "./create-waitlist-repository";
import { InMemoryAppointmentRepository } from "./in-memory-appointment-repository";
import { InMemoryWaitlistRepository } from "./in-memory-waitlist-repository";
import { PrismaAppointmentRepository } from "./prisma-appointment-repository";
import { PrismaWaitlistRepository } from "./prisma-waitlist-repository";

const LOCAL_DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("factories de repositório", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usam o Prisma quando DATABASE_URL está definida", () => {
    vi.stubEnv("DATABASE_URL", LOCAL_DB);

    expect(createAppointmentRepository()).toBeInstanceOf(
      PrismaAppointmentRepository,
    );
    expect(createWaitlistRepository()).toBeInstanceOf(PrismaWaitlistRepository);
  });

  it("usam memória quando DATABASE_URL não está definida", () => {
    vi.stubEnv("DATABASE_URL", "");

    expect(createAppointmentRepository()).toBeInstanceOf(
      InMemoryAppointmentRepository,
    );
    expect(createWaitlistRepository()).toBeInstanceOf(
      InMemoryWaitlistRepository,
    );
  });
});
