export {
  activeAppointmentIdsOf,
  buildDuplicateOverview,
  isEffectiveOpenCheck,
  resolveDuplicateCheck,
  startDuplicateCheck,
  type DuplicateOverviewInput,
  type ResolveDuplicateCheckInput,
  type StartDuplicateCheckInput,
} from "./duplicate-check";
export {
  DUPLICATE_WINDOW_DAYS,
  DUPLICATE_WINDOW_MS,
  groupKeyOf,
  serviceKeyOf,
} from "./duplicate-rules";
export { DuplicateBookingError, type DuplicateBookingErrorCode } from "./errors";
export { findDuplicateGroups, findGroupByAppointmentIds, isLegitimateReturn } from "./find-duplicates";
export type {
  DuplicateAlert,
  DuplicateBookingOverview,
  DuplicateCheck,
  DuplicateCheckResolution,
  DuplicateCheckStatus,
  DuplicateGroup,
  OpenDuplicateCheck,
  ResolvedDuplicateCheck,
} from "./types";
