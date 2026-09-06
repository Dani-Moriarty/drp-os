import { leerAlmacenamiento } from '../../core/services/system-storage';
import { Injectable, signal } from '@angular/core';
import {
  MAPA_APLICACIONES,
  APLICACIONES_CON_ICONO,
} from '../config/desktop-applications';
import { IdAplicacion, LimitesEscritorio, PuntoEscritorio } from '../models/desktop.models';

const CLAVE_ALMACENAMIENTO = 'drp-os.desktop-layout.v3';
const CLAVES_ALMACENAMIENTO_ANTERIORES = ['drp-os.desktop-layout.v2', 'drp-os.desktop-layout.v1'] as const;
const ANCHO_ICONO = 108;
const ALTO_ICONO = 108;
const ORIGEN_CUADRICULA_X = 34;
const ORIGEN_CUADRICULA_Y = 20;
const PASO_CUADRICULA_X = 124;
const PASO_CUADRICULA_Y = 102;

interface DistribucionGuardada {
  version: 3;
  mode: ModoDistribucion;
  positions: Record<string, PuntoEscritorio>;
}

interface DistribucionAnterior {
  version: 1 | 2;
  positions: Record<string, PuntoEscritorio>;
}

type ModoDistribucion = 'default' | 'custom';

interface CopiaDistribucion {
  mode: ModoDistribucion;
  positions: Record<string, PuntoEscritorio>;
}

function posicionesIniciales(): Record<string, PuntoEscritorio> {
  return Object.fromEntries(
    APLICACIONES_CON_ICONO.map((aplicacion) => [
      aplicacion.id,
      { ...(aplicacion.defaultPosition ?? { x: 0, y: 0 }) },
    ]),
  );
}

@Injectable({ providedIn: 'root' })
export class DistribucionEscritorio {
  private readonly distribucionInicial = this.leerDistribucionGuardada();
  private modoDistribucion = this.distribucionInicial.mode;
  readonly positions = signal<Record<string, PuntoEscritorio>>(this.distribucionInicial.positions);

  moverIcono(
    id: string,
    posicion: PuntoEscritorio,
    limites: LimitesEscritorio,
    idsVisibles: readonly string[] = APLICACIONES_CON_ICONO.map((aplicacion) => aplicacion.id),
  ): void {
    this.moverIconos([id], id, posicion, limites, idsVisibles);
  }

  moverIconos(
    identificadores: readonly string[],
    idAncla: string,
    posicionAncla: PuntoEscritorio,
    limites: LimitesEscritorio,
    idsVisibles: readonly string[] = APLICACIONES_CON_ICONO.map((aplicacion) => aplicacion.id),
  ): void {
    const casillas = this.casillasCuadricula(limites);
    const ocupadas = new Set<string>();
    const siguiente: Record<string, PuntoEscritorio> = { ...this.positions() };
    const visibles = new Set(idsVisibles);
    const movingIds = [...new Set(identificadores)].filter((idEnMovimiento) => visibles.has(idEnMovimiento));
    const enMovimiento = new Set(movingIds);

    if (!enMovimiento.has(idAncla)) {
      return;
    }

    for (const visibleId of idsVisibles) {
      if (enMovimiento.has(visibleId)) {
        continue;
      }

      const actual = this.positions()[visibleId] ?? this.posicionInicialDe(visibleId);
      const casilla = this.casillaLibreMasCercana(actual, casillas, ocupadas);
      siguiente[visibleId] = casilla;
      ocupadas.add(this.clavePunto(casilla));
    }

    const anchorOrigin = this.positions()[idAncla] ?? this.posicionInicialDe(idAncla);
    const delta = {
      x: posicionAncla.x - anchorOrigin.x,
      y: posicionAncla.y - anchorOrigin.y,
    };
    const placementOrder = [idAncla, ...movingIds.filter((idEnMovimiento) => idEnMovimiento !== idAncla)];

    for (const idEnMovimiento of placementOrder) {
      const origin = this.positions()[idEnMovimiento] ?? this.posicionInicialDe(idEnMovimiento);
      const destino = {
        x: origin.x + delta.x,
        y: origin.y + delta.y,
      };
      const casilla = this.casillaLibreMasCercana(destino, casillas, ocupadas);
      siguiente[idEnMovimiento] = casilla;
      ocupadas.add(this.clavePunto(casilla));
    }

    this.positions.set(siguiente);
    this.modoDistribucion = 'custom';
    this.guardar();
  }

  colocarIconosNuevos(
    identificadores: readonly string[],
    posicion: PuntoEscritorio,
    limites: LimitesEscritorio,
    idsVisibles: readonly string[],
  ): void {
    if (identificadores.length === 0) {
      return;
    }

    const casillas = this.casillasCuadricula(limites);
    const siguiente = { ...this.positions() };
    const newIds = new Set(identificadores);
    const visibles = new Set(idsVisibles);
    const ocupadas = new Set<string>();

    for (const visibleId of idsVisibles) {
      if (newIds.has(visibleId)) {
        continue;
      }
      const actual = this.positions()[visibleId] ?? this.posicionInicialDe(visibleId);
      const nearestCell = this.casillaLibreMasCercana(actual, casillas, new Set());
      ocupadas.add(this.clavePunto(nearestCell));
    }

    identificadores.forEach((id, indice) => {
      if (!visibles.has(id)) {
        return;
      }
      const destino = { x: posicion.x + indice * 12, y: posicion.y + indice * 12 };
      const casilla = this.casillaLibreMasCercana(destino, casillas, ocupadas);
      siguiente[id] = casilla;
      ocupadas.add(this.clavePunto(casilla));
    });

    this.positions.set(siguiente);
    this.modoDistribucion = 'custom';
    this.guardar();
  }

  ordenar(identificadores: readonly string[], limites: LimitesEscritorio): void {
    const casillas = this.casillasCuadricula(limites);
    const siguiente = { ...this.positions() };
    identificadores.forEach((id, indice) => {
      siguiente[id] = casillas[indice] ?? this.limitarPunto(this.posicionInicialDe(id), limites);
    });
    this.positions.set(siguiente);
    this.modoDistribucion = 'custom';
    this.guardar();
  }

  olvidar(identificadores: readonly string[]): void {
    if (identificadores.length === 0) {
      return;
    }
    const siguiente = { ...this.positions() };
    identificadores.forEach((id) => delete siguiente[id]);
    this.positions.set(siguiente);
    this.guardar();
  }

  reiniciar(): void {
    this.modoDistribucion = 'default';
    this.positions.set(posicionesIniciales());
    try {
      globalThis.localStorage?.removeItem(CLAVE_ALMACENAMIENTO);
      CLAVES_ALMACENAMIENTO_ANTERIORES.forEach((clave) => globalThis.localStorage?.removeItem(clave));
    } catch {
      // Aunque el navegador bloquee el almacenamiento, el reinicio debe funcionar en memoria.
    }
  }

  ajustarAlEscritorio(
    limites: LimitesEscritorio,
    persistChanges = true,
    idsVisibles: readonly string[] = APLICACIONES_CON_ICONO.map((aplicacion) => aplicacion.id),
  ): void {
    const actual = this.positions();
    const casillas = this.casillasCuadricula(limites);
    const ocupadas = new Set<string>();
    const siguiente: Record<string, PuntoEscritorio> = { ...actual };
    const rightmostX = casillas.at(-1)?.x ?? ORIGEN_CUADRICULA_X;

    for (const id of idsVisibles) {
      const isRegisteredApplication = MAPA_APLICACIONES.has(id as IdAplicacion);
      const destino =
        this.modoDistribucion === 'default' && isRegisteredApplication
          ? this.posicionInicialDe(id, rightmostX)
          : (actual[id] ?? this.posicionInicialDe(id, rightmostX));
      const casilla = this.casillaLibreMasCercana(destino, casillas, ocupadas);
      siguiente[id] = casilla;
      ocupadas.add(this.clavePunto(casilla));
    }

    const modificado = Object.entries(siguiente).some(([id, point]) => {
      const anterior = actual[id];
      return !anterior || anterior.x !== point.x || anterior.y !== point.y;
    });

    if (modificado) {
      this.positions.set(siguiente);
      if (persistChanges) {
        this.guardar();
      }
    }
  }

  private leerDistribucionGuardada(): CopiaDistribucion {
    const defaults = posicionesIniciales();

    try {
      const currentRaw = leerAlmacenamiento(CLAVE_ALMACENAMIENTO);
      const legacyRaw = CLAVES_ALMACENAMIENTO_ANTERIORES.map((clave) =>
        leerAlmacenamiento(clave),
      ).find((valor) => valor !== null);
      const valorGuardado = currentRaw ?? legacyRaw;
      if (!valorGuardado) {
        return { mode: 'default', positions: defaults };
      }

      const datosLeidos = JSON.parse(valorGuardado) as Partial<DistribucionGuardada | DistribucionAnterior>;
      if (
        (datosLeidos.version !== 1 && datosLeidos.version !== 2 && datosLeidos.version !== 3) ||
        !datosLeidos.positions ||
        typeof datosLeidos.positions !== 'object'
      ) {
        return { mode: 'default', positions: defaults };
      }

      for (const [id, stored] of Object.entries(datosLeidos.positions)) {
        if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
          defaults[id] = { x: stored.x, y: stored.y };
        }
      }

      const modo: ModoDistribucion =
        datosLeidos.version === 3 && 'mode' in datosLeidos && datosLeidos.mode === 'default'
          ? 'default'
          : 'custom';
      return { mode: modo, positions: defaults };
    } catch {
      return { mode: 'default', positions: defaults };
    }
  }

  private guardar(): void {
    try {
      const valor: DistribucionGuardada = {
        version: 3,
        mode: this.modoDistribucion,
        positions: this.positions(),
      };
      globalThis.localStorage?.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(valor));
      CLAVES_ALMACENAMIENTO_ANTERIORES.forEach((clave) => globalThis.localStorage?.removeItem(clave));
    } catch {
      // Si el navegador bloquea el guardado, conservar la sesión en memoria.
    }
  }

  private posicionInicialDe(id: string, rightmostX?: number): PuntoEscritorio {
    const aplicacion = MAPA_APLICACIONES.get(id as IdAplicacion);
    const posicion = aplicacion?.defaultPosition ?? { x: ORIGEN_CUADRICULA_X, y: ORIGEN_CUADRICULA_Y };
    return {
      x:
        aplicacion?.defaultHorizontalAnchor === 'right' && rightmostX !== undefined
          ? rightmostX
          : posicion.x,
      y: posicion.y,
    };
  }

  private casillasCuadricula(limites: LimitesEscritorio): PuntoEscritorio[] {
    const maxX = Math.max(0, limites.width - ANCHO_ICONO);
    const maxY = Math.max(0, limites.height - ALTO_ICONO);
    const originX = Math.min(ORIGEN_CUADRICULA_X, maxX);
    const originY = Math.min(ORIGEN_CUADRICULA_Y, maxY);
    const columnas = Math.max(1, Math.floor((maxX - originX) / PASO_CUADRICULA_X) + 1);
    const filas = Math.max(1, Math.floor((maxY - originY) / PASO_CUADRICULA_Y) + 1);
    const casillas: PuntoEscritorio[] = [];

    for (let columna = 0; columna < columnas; columna += 1) {
      for (let fila = 0; fila < filas; fila += 1) {
        casillas.push({
          x: originX + columna * PASO_CUADRICULA_X,
          y: originY + fila * PASO_CUADRICULA_Y,
        });
      }
    }

    return casillas;
  }

  private casillaLibreMasCercana(
    destino: PuntoEscritorio,
    casillas: readonly PuntoEscritorio[],
    ocupadas: ReadonlySet<string>,
  ): PuntoEscritorio {
    const available = casillas.filter((casilla) => !ocupadas.has(this.clavePunto(casilla)));
    const closest = available.reduce<PuntoEscritorio | undefined>((best, casilla) => {
      if (!best) {
        return casilla;
      }

      return this.distanciaCuadrada(destino, casilla) < this.distanciaCuadrada(destino, best) ? casilla : best;
    }, undefined);

    return closest ?? this.limitarPunto(destino, { width: ANCHO_ICONO, height: ALTO_ICONO });
  }

  private distanciaCuadrada(primero: PuntoEscritorio, second: PuntoEscritorio): number {
    return (primero.x - second.x) ** 2 + (primero.y - second.y) ** 2;
  }

  private clavePunto(punto: PuntoEscritorio): string {
    return `${punto.x}:${punto.y}`;
  }

  private limitarPunto(punto: PuntoEscritorio, limites: LimitesEscritorio): PuntoEscritorio {
    return {
      x: Math.max(0, Math.min(punto.x, Math.max(0, limites.width - ANCHO_ICONO))),
      y: Math.max(0, Math.min(punto.y, Math.max(0, limites.height - ALTO_ICONO))),
    };
  }
}
