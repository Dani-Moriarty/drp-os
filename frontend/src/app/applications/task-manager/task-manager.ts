import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ServicioReproductor } from '../audio-player/audio-player.service';
import { Localizacion } from '../../core/services/localization.service';
import {
  OrigenActividad,
  DestinoActividad,
  EstadoNodo,
} from '../../core/system-activity/system-activity.models';
import { AccionLocal, ActividadSistema } from '../../core/system-activity/system-activity.service';
import { MAPA_APLICACIONES } from '../../desktop/config/desktop-applications';
import { IconoPixel } from '../../desktop/components/pixel-icon/pixel-icon';
import { IconoSistema } from '../../desktop/components/pixel-icon/system-icon';
import { IdAplicacion, NombreIcono, EstadoVentana } from '../../desktop/models/desktop.models';
import { GestorVentanas } from '../../desktop/services/window-manager.service';

type PestanaTareas = 'applications' | 'processes' | 'map';

interface NodoAplicacion {
  id: string;
  label: string;
  source: string;
  icon: NombreIcono;
  minimized: boolean;
  status: EstadoNodo;
  top: number;
}

@Component({
  selector: 'app-task-manager',
  imports: [IconoPixel, IconoSistema],
  templateUrl: './task-manager.html',
  styleUrl: './task-manager.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministradorTareas {
  readonly i18n = inject(Localizacion);
  readonly windowManager = inject(GestorVentanas);
  readonly activity = inject(ActividadSistema);
  private readonly audioPlayer = inject(ServicioReproductor);

  readonly activeTab = signal<PestanaTareas>('map');
  readonly selectedWindowId = signal<string | null>(null);
  readonly tabs: readonly PestanaTareas[] = ['applications', 'processes', 'map'];

  readonly selectedWindow = computed(() =>
    this.windowManager.ventanas().find((estadoVentana) => estadoVentana.id === this.selectedWindowId()),
  );
  readonly applicationNodes = computed<NodoAplicacion[]>(() =>
    this.windowManager
      .ventanas()
      .filter((estadoVentana) => estadoVentana.applicationId !== 'task-manager')
      .map((estadoVentana, indice) => {
        const origen = estadoVentana.applicationId;
        return {
          id: estadoVentana.id,
          label: this.i18n.windowTitle(estadoVentana),
          source: origen,
          icon: MAPA_APLICACIONES.get(estadoVentana.applicationId)?.icon ?? 'text-file',
          minimized: estadoVentana.minimized,
          status: estadoVentana.minimized
            ? 'unknown'
            : this.sourceFor(estadoVentana.applicationId)
              ? this.activity.sourceStatus(this.sourceFor(estadoVentana.applicationId)!)
              : 'online',
          top: 170 + indice * 82,
        };
      }),
  );
  readonly mapHeight = computed(() => Math.max(575, 190 + this.applicationNodes().length * 82));
  readonly applicationRailEnd = computed(() => {
    const nodes = this.applicationNodes();
    return nodes.length ? nodes[nodes.length - 1].top + 35 : 100;
  });
  readonly localPulse = computed(() => this.activity.localPulses().slice().sort((a, b) => b.at - a.at)[0] ?? null);
  readonly sessionActive = computed(() => this.activity.localPulses().some(
    (evento) => evento.source === 'shell' || evento.source === 'session' || evento.source === 'files',
  ));
  readonly frontendLocalActive = computed(() => this.sessionActive() || this.applicationNodes().some(
    (node) => this.activity.sourceHighlighted(node.source),
  ));
  readonly assetsActive = computed(() => this.connectionActive('assets') || this.activity.sourceHighlighted('assets'));
  readonly chartEvents = computed(() => this.activity.events().filter((evento) => evento.durationMs !== undefined).slice(0, 18).reverse());
  readonly chartMax = computed(() => Math.max(1, ...this.chartEvents().map((evento) => evento.durationMs ?? 0)));
  readonly currentOperation = computed(() => this.activity.highlightedEvents()[0] ?? null);
  readonly systemStatus = computed<'online' | 'processing' | 'degraded'>(() => {
    if (this.activity.metrics().activeRequests > 0) {
      return 'processing';
    }
    return this.activity.nodeStatus('api') === 'error' ||
      this.activity.nodeStatus('database') === 'error'
      ? 'degraded'
      : 'online';
  });

  selectTab(pestana: PestanaTareas): void {
    this.activeTab.set(pestana);
  }

  selectWindow(estadoVentana: EstadoVentana): void {
    this.selectedWindowId.set(estadoVentana.id);
  }

  switchToSelected(): void {
    const seleccionado = this.selectedWindow();
    if (seleccionado) {
      this.windowManager.restaurar(seleccionado.id);
    }
  }

  endSelectedTask(): void {
    const seleccionado = this.selectedWindow();
    if (seleccionado) {
      if (seleccionado.applicationId === 'audio-player') this.audioPlayer.close();
      this.windowManager.cerrar(seleccionado.id);
      this.selectedWindowId.set(null);
    }
  }

  processId(estadoVentana: EstadoVentana): string {
    let valor = 0;
    for (const character of estadoVentana.id) {
      valor = (valor * 31 + character.charCodeAt(0)) % 8000;
    }
    return String(valor + 1000);
  }

  statusLabel(estado: EstadoNodo): string {
    switch (estado) {
      case 'online': return this.i18n.t('taskManager.status.online');
      case 'processing': return this.i18n.t('taskManager.status.processing');
      case 'error': return this.i18n.t('taskManager.status.error');
      case 'unknown': return this.i18n.t('taskManager.status.unknown');
    }
  }

  tabLabel(pestana: PestanaTareas): string {
    switch (pestana) {
      case 'applications': return this.i18n.t('taskManager.tab.applications');
      case 'processes': return this.i18n.t('taskManager.tab.processes');
      case 'map': return this.i18n.t('taskManager.tab.map');
    }
  }

  generalStatusLabel(estado: 'online' | 'processing' | 'degraded'): string {
    switch (estado) {
      case 'online': return this.i18n.t('taskManager.general.online');
      case 'processing': return this.i18n.t('taskManager.general.processing');
      case 'degraded': return this.i18n.t('taskManager.general.degraded');
    }
  }

  windowStatus(estadoVentana: EstadoVentana): string {
    if (estadoVentana.minimized) {
      return this.i18n.t('taskManager.window.minimized');
    }
    return this.windowManager.idVentanaActiva() === estadoVentana.id
      ? this.i18n.t('taskManager.window.active')
      : this.i18n.t('taskManager.window.running');
  }

  nodeStatus(destino: DestinoActividad): EstadoNodo {
    return this.activity.nodeStatus(destino);
  }

  connectionActive(destino: DestinoActividad): boolean {
    return this.activity.highlightedEvents().some((evento) => evento.targets.includes(destino));
  }

  connectionError(destino: DestinoActividad): boolean {
    return this.activity.highlightedEvents().some(
      (evento) => evento.status === 'error' && evento.targets.includes(destino),
    );
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  durationWidth(durationMs = 0): number {
    return Math.max(2, Math.min(100, Math.round(durationMs / this.chartMax() * 100)));
  }

  text(es: string, en: string): string { return this.i18n.language() === 'es' ? es : en; }

  actionLabel(accion: AccionLocal): string {
    const labels: Record<AccionLocal, [string, string]> = {
      open: ['Abrir', 'Open'], close: ['Cerrar', 'Close'], focus: ['Activar ventana', 'Focus window'],
      minimize: ['Minimizar', 'Minimize'], restore: ['Restaurar', 'Restore'], maximize: ['Cambiar tamaño', 'Change size'],
      move: ['Mover ventana', 'Move window'], resize: ['Redimensionar', 'Resize'], command: ['Ejecutar comando', 'Run command'],
      draw: ['Dibujar', 'Draw'], undo: ['Deshacer', 'Undo'], redo: ['Rehacer', 'Redo'], write: ['Guardar cambios', 'Save changes'],
      language: ['Cambiar idioma', 'Change language'], session: ['Comprobar sesión', 'Check session'],
      game: ['Jugada', 'Game move'], navigate: ['Navegar', 'Navigate'], restart: ['Reiniciar', 'Restart'],
      load: ['Cargar audio', 'Load audio'], play: ['Reproducir', 'Play'], pause: ['Pausar', 'Pause'],
      stop: ['Detener', 'Stop'], seek: ['Cambiar posición', 'Seek'], volume: ['Cambiar volumen', 'Change volume'],
      playlist: ['Cambiar lista', 'Change playlist'],
    };
    return this.text(...labels[accion]);
  }

  sourceLabel(origen: string): string {
    if (origen === 'shell') return this.text('Frontend', 'Frontend');
    if (origen === 'session') return this.i18n.t('taskManager.localSession');
    if (origen === 'files') return this.text('Archivos locales', 'Local files');
    if (origen === 'assets' || origen === 'portfolio') return 'Assets';
    return this.i18n.applicationLabel(origen);
  }

  private sourceFor(idAplicacion: IdAplicacion): OrigenActividad | null {
    if (idAplicacion === 'message-board' || idAplicacion === 'terminal' || idAplicacion === 'job-offer') {
      return idAplicacion;
    }
    return null;
  }
}
