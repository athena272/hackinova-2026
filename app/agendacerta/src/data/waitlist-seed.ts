import seedData from "../../data/waitlist.seed.json";
import type { WaitlistEntry } from "@/domain/waitlist";

export function loadWaitlistSeed(): WaitlistEntry[] {
  return seedData.map((item) => ({ ...item })) as WaitlistEntry[];
}
