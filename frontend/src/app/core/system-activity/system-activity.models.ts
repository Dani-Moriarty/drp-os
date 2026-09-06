export type OrigenActividad =
  | 'shell'
  | 'message-board'
  | 'terminal'
  | 'job-offer'
  | 'portfolio'
  | 'audio-player';

export type DestinoActividad = 'api' | 'database' | 'assets';
export type EstadoActividad = 'active' | 'success' | 'error' | 'cancelled';
export type EstadoNodo = 'online' | 'processing' | 'error' | 'unknown';

export interface EventoActividad {
  id: number;
  source: OrigenActividad;
  method: string;
  path: string;
  targets: readonly DestinoActividad[];
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  status: EstadoActividad;
  statusCode?: number;
  uploadBytes: number;
  downloadBytes: number;
}

export interface MetricasActividad {
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  errorRequests: number;
  averageLatencyMs: number;
  uploadBytes: number;
  downloadBytes: number;
}
