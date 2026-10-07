export {
  blockKey,
  encaixeAppointmentIds,
  groupByBlock,
  overbookingsOfBlock,
  slotBlockOf,
  type BlockGroup,
} from "./blocks";
export { coveredAppointmentIds, isSlotCoveredByOverbooking, type CoverageInput } from "./coexistence";
export {
  createEncaixe,
  refuseOverbooking,
  type CreateEncaixeInput,
  type CreateEncaixeResult,
  type RefuseOverbookingInput,
} from "./create-encaixe";
export { OverbookingError, type OverbookingErrorCode } from "./errors";
export {
  isOverbookingDecisionInput,
  MAX_OVERBOOKINGS_PER_BLOCK,
  OVERBOOKING_DECISIONS,
  OVERBOOKING_RISK_BAND,
  type OverbookingDecisionInput,
} from "./overbooking-rules";
export {
  assertCanOverbook,
  findOverbookingOpportunities,
  findOverbookingSuggestions,
  pickEncaixeCandidate,
  type DecisionCheckInput,
  type OpportunityInput,
  type SuggestionInput,
} from "./suggestions";
export type {
  AcceptedOverbooking,
  EncaixeCandidate,
  Overbooking,
  OverbookingDecision,
  OverbookingOpportunity,
  OverbookingOverview,
  OverbookingSuggestion,
  RefusedOverbooking,
  SlotBlock,
} from "./types";
