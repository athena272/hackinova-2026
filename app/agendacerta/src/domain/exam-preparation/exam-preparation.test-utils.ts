import type { Appointment } from "../appointment";
import type { ExamPreparation } from "./types";

export const ULTRASSOM: ExamPreparation = {
  id: "prep-us-abdome-total",
  examName: "Ultrassonografia de abdome total",
  instructions: "Jejum de 8 horas e bexiga cheia.",
  items: [
    {
      id: "prep-us-abdome-total-jejum",
      position: 1,
      label: "Jejum de 8 horas",
      question: "Você vai conseguir ficar 8 horas sem comer antes do exame?",
    },
    {
      id: "prep-us-abdome-total-bexiga",
      position: 2,
      label: "Bexiga cheia",
      question: "Você vai beber a água indicada e chegar sem urinar?",
    },
  ],
};

export const JEJUM = ULTRASSOM.items[0].id;
export const BEXIGA = ULTRASSOM.items[1].id;

export function examAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "apt-008",
    patientId: "pat-demo-02",
    patientName: "Marcos Lima",
    specialty: "Ultrassonografia",
    scheduledAt: "2026-10-20T12:00:00.000Z",
    bookedAt: "2026-09-20T12:00:00.000Z",
    status: "pendente",
    phoneMasked: "(82) 9****-2222",
    procedure: { type: "exame", examName: ULTRASSOM.examName },
    preparation: null,
    unit: null,
    returnOfAppointmentId: null,
    ...overrides,
  };
}
