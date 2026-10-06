/** Bairro com coordenadas aproximadas (centro do bairro), usadas só para distância estimada. */
export type Neighborhood = {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
};

/** Paciente guarda bairro em vez de endereço completo (LGPD). */
export type Patient = {
  id: string;
  fullName: string;
  phoneMasked: string;
  neighborhoodId: string | null;
};

/** Onde o paciente mora, já resolvido; null quando o bairro não foi informado. */
export type PatientLocation = {
  patientId: string;
  neighborhood: Neighborhood | null;
};
