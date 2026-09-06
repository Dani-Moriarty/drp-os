import { inject, Injectable, computed, signal } from '@angular/core';
import { AccionLocal, ActividadSistema } from '../../core/system-activity/system-activity.service';
import { AplicacionEscritorio } from '../models/desktop.models';
import {
  LimitesEscritorio,
  PuntoEscritorio,
  EstadoVentana,
  OpcionesApertura,
} from '../models/desktop.models';

const MARGEN_VENTANA = 8;

@Injectable({ providedIn: 'root' })
export class GestorVentanas {
  private readonly actividad = inject(ActividadSistema);
  private registrarAccion(idVentana: string, accion: AccionLocal): void {
    const destino = this.estadosVentanas().find((ventana) => ventana.id === idVentana);
    if (destino) this.actividad.pulse(destino.applicationId, accion);
  }
  private readonly estadosVentanas = signal<EstadoVentana[]>([]);
  private zIndex = 10;

  readonly ventanas = this.estadosVentanas.asReadonly();
  readonly idVentanaActiva = signal<string | null>(null);
  readonly ventanasVisibles = computed(() =>
    this.estadosVentanas().filter((estadoVentana) => !estadoVentana.minimized),
  );

  abrir(
    aplicacion: AplicacionEscritorio,
    limites: LimitesEscritorio,
    opciones: OpcionesApertura = {},
  ): void {
    if (!aplicacion.windowConfig) {
      return;
    }

    const idVentana = opciones.windowId ?? aplicacion.id;
    const existente = this.estadosVentanas().find((estadoVentana) => estadoVentana.id === idVentana);
    if (existente) {
      this.restaurar(idVentana);
      return;
    }

    const ancho = Math.min(aplicacion.windowConfig.width, Math.max(280, limites.width - 16));
    const alto = Math.min(aplicacion.windowConfig.height, Math.max(220, limites.height - 16));
    const desplazamiento = this.estadosVentanas().length * 22;
    const preferido = {
      x: Math.round((limites.width - ancho) / 2) + desplazamiento,
      y: Math.round((limites.height - alto) / 2) + desplazamiento,
    };
    const posicion = this.limitarPosicion(preferido, ancho, alto, limites);
    const estado: EstadoVentana = {
      id: idVentana,
      applicationId: aplicacion.id,
      title: opciones.title ?? aplicacion.title,
      x: posicion.x,
      y: posicion.y,
      width: ancho,
      height: alto,
      zIndex: ++this.zIndex,
      minimized: false,
      maximized: false,
      payload: opciones.payload,
    };

    this.estadosVentanas.update((ventanas) => [...ventanas, estado]);
    this.registrarAccion(idVentana, 'open');
    this.idVentanaActiva.set(idVentana);
  }

  cerrar(idVentana: string): void {
    this.registrarAccion(idVentana, 'close');
    this.estadosVentanas.update((ventanas) => ventanas.filter((estadoVentana) => estadoVentana.id !== idVentana));
    if (this.idVentanaActiva() === idVentana) {
      this.activarVentanaSuperior();
    }
  }

  minimizar(idVentana: string): void {
    this.registrarAccion(idVentana, 'minimize');
    this.actualizarEstado(idVentana, { minimized: true });
    if (this.idVentanaActiva() === idVentana) {
      this.activarVentanaSuperior();
    }
  }

  restaurar(idVentana: string): void {
    this.registrarAccion(idVentana, 'restore');
    this.actualizarEstado(idVentana, { minimized: false, zIndex: ++this.zIndex });
    this.idVentanaActiva.set(idVentana);
  }

  enfocar(idVentana: string): void {
    const destino = this.estadosVentanas().find((estadoVentana) => estadoVentana.id === idVentana);
    if (!destino || destino.minimized) {
      return;
    }

    if (this.idVentanaActiva() !== idVentana) this.registrarAccion(idVentana, 'focus');
    this.actualizarEstado(idVentana, { zIndex: ++this.zIndex });
    this.idVentanaActiva.set(idVentana);
  }

  alternarMaximizado(idVentana: string, limites: LimitesEscritorio): void {
    const destino = this.estadosVentanas().find((estadoVentana) => estadoVentana.id === idVentana);
    if (!destino) {
      return;
    }

    this.registrarAccion(idVentana, 'maximize');
    if (destino.maximized) {
      const estadoRestauracion = destino.restoreState ?? destino;
      const ancho = Math.min(estadoRestauracion.width, Math.max(280, limites.width - 16));
      const alto = Math.min(estadoRestauracion.height, Math.max(220, limites.height - 16));
      const posicion = this.limitarPosicion(estadoRestauracion, ancho, alto, limites);
      this.actualizarEstado(idVentana, {
        ...posicion,
        width: ancho,
        height: alto,
        maximized: false,
        restoreState: undefined,
        zIndex: ++this.zIndex,
      });
    } else {
      this.actualizarEstado(idVentana, {
        x: 0,
        y: 0,
        width: limites.width,
        height: limites.height,
        maximized: true,
        minimized: false,
        restoreState: {
          x: destino.x,
          y: destino.y,
          width: destino.width,
          height: destino.height,
        },
        zIndex: ++this.zIndex,
      });
    }

    this.idVentanaActiva.set(idVentana);
  }

  alternarDesdeBarra(idVentana: string): void {
    const destino = this.estadosVentanas().find((estadoVentana) => estadoVentana.id === idVentana);
    if (!destino) {
      return;
    }

    if (destino.minimized) {
      this.restaurar(idVentana);
    } else if (this.idVentanaActiva() === idVentana) {
      this.minimizar(idVentana);
    } else {
      this.enfocar(idVentana);
    }
  }

  mover(idVentana: string, posicion: PuntoEscritorio, limites: LimitesEscritorio): void {
    const destino = this.estadosVentanas().find((estadoVentana) => estadoVentana.id === idVentana);
    if (!destino || destino.maximized) {
      return;
    }

    const clamped = this.limitarPosicion(posicion, destino.width, destino.height, limites);
    this.registrarAccion(idVentana, 'move');
    this.actualizarEstado(idVentana, clamped);
  }

  redimensionar(
    idVentana: string,
    geometry: { x?: number; y?: number; width: number; height: number },
    limites: LimitesEscritorio,
  ): void {
    const destino = this.estadosVentanas().find((estadoVentana) => estadoVentana.id === idVentana);
    if (!destino || destino.maximized) {
      return;
    }

    this.registrarAccion(idVentana, 'resize');
    const x = Math.max(0, Math.min(geometry.x ?? destino.x, Math.max(0, limites.width - 280)));
    const y = Math.max(0, Math.min(geometry.y ?? destino.y, Math.max(0, limites.height - 220)));
    this.actualizarEstado(idVentana, {
      x,
      y,
      width: Math.max(280, Math.min(geometry.width, limites.width - x)),
      height: Math.max(220, Math.min(geometry.height, limites.height - y)),
    });
  }

  actualizarTitulo(idVentana: string, titulo: string): void {
    this.actualizarEstado(idVentana, { title: titulo });
  }

  ajustarAlEscritorio(limites: LimitesEscritorio): void {
    this.estadosVentanas.update((ventanas) =>
      ventanas.map((estadoVentana) =>
        estadoVentana.maximized
          ? { ...estadoVentana, x: 0, y: 0, width: limites.width, height: limites.height }
          : {
              ...estadoVentana,
              ...this.limitarPosicion(
                { x: estadoVentana.x, y: estadoVentana.y },
                estadoVentana.width,
                estadoVentana.height,
                limites,
              ),
            },
      ),
    );
  }

  reiniciar(): void {
    this.actividad.pulse('shell', 'restart');
    this.estadosVentanas.set([]);
    this.idVentanaActiva.set(null);
    this.zIndex = 10;
  }

  private actualizarEstado(idVentana: string, patch: Partial<EstadoVentana>): void {
    this.estadosVentanas.update((ventanas) =>
      ventanas.map((estadoVentana) =>
        estadoVentana.id === idVentana ? { ...estadoVentana, ...patch } : estadoVentana,
      ),
    );
  }

  private activarVentanaSuperior(): void {
    const siguiente = this.estadosVentanas()
      .filter((estadoVentana) => !estadoVentana.minimized)
      .sort((izquierda, derecha) => derecha.zIndex - izquierda.zIndex)[0];
    this.idVentanaActiva.set(siguiente?.id ?? null);
  }

  private limitarPosicion(
    posicion: PuntoEscritorio,
    ancho: number,
    alto: number,
    limites: LimitesEscritorio,
  ): PuntoEscritorio {
    return {
      x: Math.max(0, Math.min(posicion.x, Math.max(0, limites.width - ancho - MARGEN_VENTANA))),
      y: Math.max(0, Math.min(posicion.y, Math.max(0, limites.height - alto - MARGEN_VENTANA))),
    };
  }
}
