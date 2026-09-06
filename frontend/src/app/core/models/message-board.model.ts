export interface MensajeTablon {
  id: number;
  author: string;
  createdAt: string;
  message: string;
  administrator: boolean;
}

export interface PaginaTablon {
  messages: MensajeTablon[];
  page: number;
  totalPages: number;
  totalMessages: number;
  hasOlder: boolean;
  hasNewer: boolean;
}

export interface SolicitudPublicacion {
  author: string;
  message: string;
  website: string;
}

export interface EstadoAdministrador {
  administrator: boolean;
}
