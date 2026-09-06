import { OnDestroy, Injectable, computed, signal } from '@angular/core';
import {
  EventoActividad,
  MetricasActividad,
  OrigenActividad,
  DestinoActividad,
  EstadoNodo,
} from './system-activity.models';

const LIMITE_HISTORIAL = 60;
const RESALTADO_MS = 3000;
export type AccionLocal = 'open' | 'close' | 'focus' | 'minimize' | 'restore' | 'maximize'
  | 'move' | 'resize' | 'command' | 'draw' | 'undo' | 'redo' | 'write' | 'language'
  | 'session' | 'game' | 'navigate' | 'restart' | 'load' | 'play' | 'pause'
  | 'stop' | 'seek' | 'volume' | 'playlist';
export interface ActividadLocal {
  id: number;
  source: string;
  action: AccionLocal;
  at: number;
}

@Injectable({ providedIn: 'root' })
export class ActividadSistema implements OnDestroy {
  private readonly activityEvents = signal<EventoActividad[]>([]);
  private readonly highlightedIds = signal<ReadonlySet<number>>(new Set());
  private readonly highlightTimers = new Map<number, number>();
  private sequence = 0;
  private readonly localHistory = signal<ActividadLocal[]>([]);
  private readonly localHighlights = signal<ReadonlyMap<string, ActividadLocal>>(new Map());
  private readonly localTimers = new Map<string, number>();
  readonly localEvents = this.localHistory.asReadonly();
  readonly localPulses = computed(() => [...this.localHighlights().values()]);
  private readonly totals = signal({ requests: 0, completed: 0, errors: 0, duration: 0, up: 0, down: 0 });
  readonly resources = signal({ count: 0, transferBytes: 0 });
  private resourceObserver?: PerformanceObserver;

  /** Las acciones locales no son tráfico de red; agrupamos los movimientos repetidos del puntero. */
  pulse(origen: string, accion: AccionLocal): void {
    const clave = origen + ':' + accion;
    const anterior = this.localHighlights().get(clave);
    if (anterior && Date.now() - anterior.at < 200) return;
    const evento = { id: ++this.sequence, source: origen, action: accion, at: Date.now() };
    this.localHistory.update((eventos) => [evento, ...eventos].slice(0, LIMITE_HISTORIAL));
    this.localHighlights.update((eventos) => new Map(eventos).set(clave, evento));
    globalThis.clearTimeout(this.localTimers.get(clave));
    this.localTimers.set(clave, globalThis.setTimeout(() => {
      this.localHighlights.update((eventos) => {
        const siguiente = new Map(eventos);
        siguiente.delete(clave);
        return siguiente;
      });
      this.localTimers.delete(clave);
    }, RESALTADO_MS));
  }

  sourceHighlighted(origen: string): boolean {
    return this.highlightedEvents().some((evento) => evento.source === origen) ||
      this.localPulses().some((evento) => evento.source === origen);
  }

  /** Observar los recursos del mismo origen sin volver a descargarlos ni guardar sus URL. */
  observeResources(): void {
    if (this.resourceObserver || typeof PerformanceObserver === 'undefined') return;
    try {
      this.resourceObserver = new PerformanceObserver((list) => {
        const entradas = list.getEntries().filter((entrada) => {
          const resource = entrada as PerformanceResourceTiming;
          return ['img', 'css', 'script', 'link', 'iframe', 'audio'].includes(resource.initiatorType) &&
            new URL(resource.name, location.origin).origin === location.origin;
        }) as PerformanceResourceTiming[];
        if (!entradas.length) return;
        this.resources.update((valor) => ({
          count: valor.count + entradas.length,
          transferBytes: valor.transferBytes + entradas.reduce((total, entrada) => total + entrada.transferSize, 0),
        }));
        this.pulse('assets', 'open');
      });
      this.resourceObserver.observe({ type: 'resource', buffered: true });
    } catch {
      this.resourceObserver?.disconnect();
      this.resourceObserver = undefined;
    }
  }

  ngOnDestroy(): void {
    this.resourceObserver?.disconnect();
    this.reset();
  }

  readonly events = this.activityEvents.asReadonly();
  readonly activeEvents = computed(() =>
    this.activityEvents().filter((evento) => evento.status === 'active'),
  );
  readonly highlightedEvents = computed(() => {
    const identificadores = this.highlightedIds();
    return this.activityEvents().filter((evento) => identificadores.has(evento.id));
  });
  readonly metrics = computed<MetricasActividad>(() => {
    const eventos = this.activityEvents();
    const totals = this.totals();
    return {
      totalRequests: totals.requests,
      activeRequests: eventos.filter((evento) => evento.status === 'active').length,
      completedRequests: totals.completed,
      errorRequests: totals.errors,
      averageLatencyMs: totals.completed ? Math.round(totals.duration / totals.completed) : 0,
      uploadBytes: totals.up,
      downloadBytes: totals.down,
    };
  });

  begin(solicitud: {
    source: OrigenActividad;
    method: string;
    url: string;
    uploadBytes?: number;
  }): number {
    const evento: EventoActividad = {
      id: ++this.sequence,
      source: solicitud.source,
      method: solicitud.method.toUpperCase(),
      path: this.pathFrom(solicitud.url),
      targets: this.targetsFor(solicitud.url),
      startedAt: Date.now(),
      status: 'active',
      uploadBytes: solicitud.uploadBytes ?? 0,
      downloadBytes: 0,
    };
    this.totals.update((valor) => ({ ...valor, requests: valor.requests + 1, up: valor.up + evento.uploadBytes }));
    this.activityEvents.update((eventos) => [
      evento, ...eventos.filter((elemento) => elemento.status === 'active'),
      ...eventos.filter((elemento) => elemento.status !== 'active').slice(0, LIMITE_HISTORIAL - 1),
    ]);
    this.highlightedIds.update((identificadores) => new Set([...identificadores, evento.id]));
    return evento.id;
  }

  complete(id: number, codigoEstado: number, downloadBytes: number): void {
    this.finish(id, codigoEstado >= 400 ? 'error' : 'success', codigoEstado, downloadBytes);
  }

  fail(id: number, codigoEstado = 0): void {
    this.finish(id, 'error', codigoEstado, 0);
  }

  cancel(id: number): void {
    this.finish(id, 'cancelled', undefined, 0);
  }

  nodeStatus(destino: DestinoActividad): EstadoNodo {
    const relevant = this.activityEvents().filter((evento) => evento.targets.includes(destino));
    if (relevant.some((evento) => evento.status === 'active')) {
      return 'processing';
    }
    const ultimo = relevant[0];
    if (!ultimo) {
      return 'unknown';
    }
    // Un fallo HTTP no basta para afirmar que SQL Server está caído.
    if (destino === 'database' && ultimo.status !== 'success') return 'unknown';
    return ultimo.status === 'cancelled' ? 'unknown' : ultimo.status === 'error' ? 'error' : 'online';
  }

  sourceStatus(origen: OrigenActividad): EstadoNodo {
    const relevant = this.activityEvents().filter((evento) => evento.source === origen);
    if (relevant.some((evento) => evento.status === 'active')) {
      return 'processing';
    }
    return relevant[0]?.status === 'error' ? 'error' : 'online';
  }

  reset(): void {
    this.localTimers.forEach((temporizador) => globalThis.clearTimeout(temporizador));
    this.localTimers.clear();
    this.localHighlights.set(new Map());
    this.localHistory.set([]);
    this.resources.set({ count: 0, transferBytes: 0 });
    this.totals.set({ requests: 0, completed: 0, errors: 0, duration: 0, up: 0, down: 0 });
    this.highlightTimers.forEach((temporizador) => globalThis.clearTimeout(temporizador));
    this.highlightTimers.clear();
    this.highlightedIds.set(new Set());
    this.activityEvents.set([]);
    // No reiniciar los IDs: aún puede terminar una petición de la sesión anterior.
  }

  private finish(
    id: number,
    estado: 'success' | 'error' | 'cancelled',
    codigoEstado: number | undefined,
    downloadBytes: number,
  ): void {
    const original = this.activityEvents().find((evento) => evento.id === id && evento.status === 'active');
    if (!original) return;
    const finishedAt = Date.now();
    if (estado === 'success' || estado === 'error') {
      this.totals.update((valor) => ({
        ...valor, completed: valor.completed + 1,
        errors: valor.errors + (estado === 'error' ? 1 : 0),
        duration: valor.duration + Math.max(0, finishedAt - original.startedAt),
        down: valor.down + downloadBytes,
      }));
    }
    this.activityEvents.update((eventos) =>
      eventos.map((evento) =>
        evento.id === id && evento.status === 'active'
          ? {
              ...evento,
              status: estado,
              statusCode: codigoEstado,
              downloadBytes,
              finishedAt,
              durationMs: Math.max(0, finishedAt - evento.startedAt),
            }
          : evento,
      ),
    );
    this.highlightTimers.set(
      id,
      globalThis.setTimeout(() => {
        this.highlightedIds.update((identificadores) => {
          const siguiente = new Set(identificadores);
          siguiente.delete(id);
          return siguiente;
        });
        this.highlightTimers.delete(id);
      }, RESALTADO_MS),
    );
  }

  private pathFrom(url: string): string {
    try {
      const base = globalThis.location?.origin ?? 'http://drp-os.local';
      const datosLeidos = new URL(url, base);
      return datosLeidos.pathname;
    } catch {
      return url;
    }
  }

  private targetsFor(url: string): readonly DestinoActividad[] {
    const ruta = this.pathFrom(url);
    if (ruta.startsWith('/data/') || ruta.includes('/assets/')) {
      return ['assets'];
    }
    if (!ruta.includes('/api/')) {
      return [];
    }
    const databaseBacked =
      /^\/api\/message-board\/messages(?:\/\d+)?$/u.test(ruta) ||
      ruta.includes('/api/health') ||
      /^\/api\/(portfolio|profile|experiences|technologies|competencies|education|languages)/u.test(
        ruta,
      );
    return databaseBacked ? ['api', 'database'] : ['api'];
  }
}
