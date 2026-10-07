import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppointmentRepository } from "./create-appointment-repository";
import { createDuplicateCheckRepository } from "./create-duplicate-check-repository";
import { createExamPreparationRepository } from "./create-exam-preparation-repository";
import { createOverbookingRepository } from "./create-overbooking-repository";
import { createPatientRepository } from "./create-patient-repository";
import { createSlotOfferRepository } from "./create-slot-offer-repository";
import { createWaitlistRepository } from "./create-waitlist-repository";
import { InMemoryAppointmentRepository } from "./in-memory-appointment-repository";
import { InMemoryDuplicateCheckRepository } from "./in-memory-duplicate-check-repository";
import { InMemoryExamPreparationRepository } from "./in-memory-exam-preparation-repository";
import { InMemoryOverbookingRepository } from "./in-memory-overbooking-repository";
import { InMemoryPatientRepository } from "./in-memory-patient-repository";
import { InMemorySlotOfferRepository } from "./in-memory-slot-offer-repository";
import { InMemoryWaitlistRepository } from "./in-memory-waitlist-repository";
import { PrismaAppointmentRepository } from "./prisma-appointment-repository";
import { PrismaDuplicateCheckRepository } from "./prisma-duplicate-check-repository";
import { PrismaExamPreparationRepository } from "./prisma-exam-preparation-repository";
import { PrismaOverbookingRepository } from "./prisma-overbooking-repository";
import { PrismaPatientRepository } from "./prisma-patient-repository";
import { PrismaSlotOfferRepository } from "./prisma-slot-offer-repository";
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
    expect(createPatientRepository()).toBeInstanceOf(PrismaPatientRepository);
    expect(createExamPreparationRepository()).toBeInstanceOf(
      PrismaExamPreparationRepository,
    );
    expect(createSlotOfferRepository()).toBeInstanceOf(PrismaSlotOfferRepository);
    expect(createOverbookingRepository()).toBeInstanceOf(PrismaOverbookingRepository);
    expect(createDuplicateCheckRepository()).toBeInstanceOf(PrismaDuplicateCheckRepository);
  });

  it("usam memória quando DATABASE_URL não está definida", () => {
    vi.stubEnv("DATABASE_URL", "");

    expect(createAppointmentRepository()).toBeInstanceOf(
      InMemoryAppointmentRepository,
    );
    expect(createWaitlistRepository()).toBeInstanceOf(
      InMemoryWaitlistRepository,
    );
    expect(createPatientRepository()).toBeInstanceOf(InMemoryPatientRepository);
    expect(createExamPreparationRepository()).toBeInstanceOf(
      InMemoryExamPreparationRepository,
    );
    expect(createSlotOfferRepository()).toBeInstanceOf(InMemorySlotOfferRepository);
    expect(createOverbookingRepository()).toBeInstanceOf(InMemoryOverbookingRepository);
    expect(createDuplicateCheckRepository()).toBeInstanceOf(InMemoryDuplicateCheckRepository);
  });
});
