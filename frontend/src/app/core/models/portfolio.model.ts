export type CategoriaTecnologia = 'FRONTEND' | 'BACKEND' | 'DATABASE' | 'OTHER';

export type CategoriaCompetencia =
  | 'FRONTEND'
  | 'BACKEND'
  | 'DATABASES'
  | 'APIS_AND_ARCHITECTURE'
  | 'BUSINESS_LOGIC'
  | 'TOOLS_AND_COLLABORATION';

export interface Perfil {
  fullName: string;
  headline: string;
  location: string;
  phone: string;
  email: string;
  linkedInUrl: string;
  summary: string;
}

export interface Tecnologia {
  id: number;
  name: string;
  category: CategoriaTecnologia;
  evidenceType: 'EXPLICIT';
}

export interface Competencia {
  id: number;
  name: string;
  category: CategoriaCompetencia;
  evidence: string;
  evidenceType: 'DERIVED';
}

export interface Experiencia {
  id: number;
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  context: string;
  responsibilities: string[];
  technologies: Tecnologia[];
  competencies: Competencia[];
}

export interface Formacion {
  id: number;
  qualification: string;
  institution: string;
  startYear: number;
  endYear: number;
}

export interface AcreditacionIdioma {
  id: number;
  language: string;
  level: string;
  issuer: string;
}

export interface DatosPortfolio {
  profile: Perfil;
  experiences: Experiencia[];
  technologies: Tecnologia[];
  competencies: Competencia[];
  education: Formacion[];
  languages: AcreditacionIdioma[];
}
