export interface BorradorOferta {
  company: string;
  positionDescription: string;
  contactName: string;
  contactEmail: string;
  website: string;
}

export interface SolicitudOferta {
  company: string;
  positionDescription: string;
  contactName: string;
  contactEmail: string;
  website: string;
}

export type CampoOferta = keyof BorradorOferta;

export const LIMITES_OFERTA = {
  company: 120,
  positionDescription: 2000,
  contactName: 100,
  contactEmail: 254,
  website: 200,
} as const;
