import { ActividadSistema } from '../../core/system-activity/system-activity.service';
import { inject, Injectable, OnDestroy, signal } from '@angular/core';

export type DificultadBuscaminas = 'beginner' | 'intermediate' | 'expert';
export type EstadoBuscaminas = 'ready' | 'playing' | 'won' | 'lost';

export interface CasillaBuscaminas {
  readonly row: number;
  readonly column: number;
  readonly isMine: boolean;
  readonly adjacentMines: number;
  readonly revealed: boolean;
  readonly flagged: boolean;
  readonly exploded: boolean;
}

export interface PartidaBuscaminas {
  readonly difficulty: DificultadBuscaminas;
  readonly rows: number;
  readonly columns: number;
  readonly mineCount: number;
  readonly elapsedSeconds: number;
  readonly status: EstadoBuscaminas;
  readonly minesPlaced: boolean;
  readonly cells: readonly (readonly CasillaBuscaminas[])[];
}

export const MINESWEEPER_PRESETS: Readonly<
  Record<DificultadBuscaminas, { readonly rows: number; readonly columns: number; readonly mines: number }>
> = {
  beginner: { rows: 9, columns: 9, mines: 10 },
  intermediate: { rows: 16, columns: 16, mines: 40 },
  expert: { rows: 16, columns: 30, mines: 99 },
};

@Injectable({ providedIn: 'root' })
export class JuegoBuscaminas implements OnDestroy {
  private readonly activity = inject(ActividadSistema);
  private readonly gameState = signal<PartidaBuscaminas>(createEmptyState('beginner'));
  private timerId: ReturnType<typeof setInterval> | null = null;

  readonly state = this.gameState.asReadonly();

  newGame(dificultad: DificultadBuscaminas = this.gameState().difficulty): void {
    this.stopTimer();
    this.gameState.set(createEmptyState(dificultad));
  }

  reset(): void {
    this.newGame('beginner');
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  reveal(fila: number, columna: number, aleatorio: () => number = Math.random): boolean {
    let estado = this.gameState();
    if (estado.status === 'won' || estado.status === 'lost') {
      return false;
    }

    const destino = estado.cells[fila]?.[columna];
    if (!destino || destino.revealed || destino.flagged) {
      return false;
    }

    if (!estado.minesPlaced) {
      estado = placeMines(estado, fila, columna, aleatorio);
      this.gameState.set(estado);
      this.startTimer();
    }

    this.activity.pulse('minesweeper', 'game');
    const casillas = cloneCells(estado.cells);
    const casilla = casillas[fila][columna];
    if (casilla.isMine) {
      casillas[fila][columna] = { ...casilla, revealed: true, exploded: true };
      revealAllMines(casillas);
      this.stopTimer();
      this.gameState.set({ ...estado, cells: casillas, status: 'lost' });
      return true;
    }

    revealArea(casillas, fila, columna);
    const ganada = hasWon(casillas);
    if (ganada) {
      flagAllMines(casillas);
      this.stopTimer();
    }
    this.gameState.set({ ...estado, cells: casillas, status: ganada ? 'won' : 'playing' });
    return true;
  }

  toggleFlag(fila: number, columna: number): boolean {
    const estado = this.gameState();
    if (estado.status === 'won' || estado.status === 'lost') {
      return false;
    }
    const destino = estado.cells[fila]?.[columna];
    if (!destino || destino.revealed) {
      return false;
    }

    const flags = countFlags(estado.cells);
    if (!destino.flagged && flags >= estado.mineCount) {
      return false;
    }

    const casillas = cloneCells(estado.cells);
    casillas[fila][columna] = { ...destino, flagged: !destino.flagged };
    this.activity.pulse('minesweeper', 'game');
    this.gameState.set({ ...estado, cells: casillas });
    return true;
  }

  chord(fila: number, columna: number): boolean {
    const estado = this.gameState();
    const destino = estado.cells[fila]?.[columna];
    if (
      !destino?.revealed ||
      destino.adjacentMines === 0 ||
      estado.status === 'won' ||
      estado.status === 'lost'
    ) {
      return false;
    }

    const neighbours = adjacentCoordinates(estado.rows, estado.columns, fila, columna);
    const adjacentFlags = neighbours.filter(([nextRow, nextColumn]) =>
      estado.cells[nextRow][nextColumn].flagged,
    ).length;
    if (adjacentFlags !== destino.adjacentMines) {
      return false;
    }

    let modificado = false;
    for (const [nextRow, nextColumn] of neighbours) {
      const casilla = this.gameState().cells[nextRow][nextColumn];
      if (!casilla.revealed && !casilla.flagged) {
        modificado = this.reveal(nextRow, nextColumn) || modificado;
        if (this.gameState().status === 'lost') {
          break;
        }
      }
    }
    return modificado;
  }

  remainingMines(): number {
    return this.gameState().mineCount - countFlags(this.gameState().cells);
  }

  private startTimer(): void {
    this.stopTimer();
    this.gameState.update((estado) => ({ ...estado, status: 'playing' }));
    this.timerId = setInterval(() => {
      this.gameState.update((estado) =>
        estado.status === 'playing'
          ? { ...estado, elapsedSeconds: Math.min(999, estado.elapsedSeconds + 1) }
          : estado,
      );
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

function createEmptyState(dificultad: DificultadBuscaminas): PartidaBuscaminas {
  const preset = MINESWEEPER_PRESETS[dificultad];
  return {
    difficulty: dificultad,
    rows: preset.rows,
    columns: preset.columns,
    mineCount: preset.mines,
    elapsedSeconds: 0,
    status: 'ready',
    minesPlaced: false,
    cells: Array.from({ length: preset.rows }, (_, fila) =>
      Array.from({ length: preset.columns }, (_, columna): CasillaBuscaminas => ({
        row: fila,
        column: columna,
        isMine: false,
        adjacentMines: 0,
        revealed: false,
        flagged: false,
        exploded: false,
      })),
    ),
  };
}

function placeMines(
  estado: PartidaBuscaminas,
  safeRow: number,
  safeColumn: number,
  aleatorio: () => number,
): PartidaBuscaminas {
  const casillas = cloneCells(estado.cells);
  const safeCoordinates = new Set(
    [[safeRow, safeColumn], ...adjacentCoordinates(estado.rows, estado.columns, safeRow, safeColumn)].map(
      ([row, column]) => `${row}:${column}`,
    ),
  );
  const candidates = casillas
    .flat()
    .filter((casilla) => !safeCoordinates.has(`${casilla.row}:${casilla.column}`))
    .map((casilla) => [casilla.row, casilla.column] as const);

  for (let indice = candidates.length - 1; indice > 0; indice -= 1) {
    const indiceIntercambio = Math.floor(aleatorio() * (indice + 1));
    [candidates[indice], candidates[indiceIntercambio]] = [candidates[indiceIntercambio], candidates[indice]];
  }

  for (const [row, column] of candidates.slice(0, estado.mineCount)) {
    casillas[row][column] = { ...casillas[row][column], isMine: true };
  }

  for (const fila of casillas) {
    for (const casilla of fila) {
      const adjacentMines = adjacentCoordinates(estado.rows, estado.columns, casilla.row, casilla.column).filter(
        ([nextRow, nextColumn]) => casillas[nextRow][nextColumn].isMine,
      ).length;
      casillas[casilla.row][casilla.column] = { ...casilla, adjacentMines };
    }
  }

  return { ...estado, cells: casillas, minesPlaced: true, status: 'playing' };
}

function revealArea(casillas: CasillaBuscaminas[][], startRow: number, startColumn: number): void {
  const queue: [number, number][] = [[startRow, startColumn]];
  const visitadas = new Set<string>();
  while (queue.length > 0) {
    const [row, column] = queue.shift()!;
    const clave = `${row}:${column}`;
    if (visitadas.has(clave)) {
      continue;
    }
    visitadas.add(clave);
    const casilla = casillas[row][column];
    if (casilla.flagged || casilla.isMine) {
      continue;
    }
    casillas[row][column] = { ...casilla, revealed: true };
    if (casilla.adjacentMines === 0) {
      queue.push(...adjacentCoordinates(casillas.length, casillas[0].length, row, column));
    }
  }
}

function revealAllMines(casillas: CasillaBuscaminas[][]): void {
  for (const fila of casillas) {
    for (const casilla of fila) {
      if (casilla.isMine) {
        casillas[casilla.row][casilla.column] = { ...casilla, revealed: true };
      }
    }
  }
}

function flagAllMines(casillas: CasillaBuscaminas[][]): void {
  for (const fila of casillas) {
    for (const casilla of fila) {
      if (casilla.isMine) {
        casillas[casilla.row][casilla.column] = { ...casilla, flagged: true };
      }
    }
  }
}

function hasWon(casillas: readonly (readonly CasillaBuscaminas[])[]): boolean {
  return casillas.flat().every((casilla) => casilla.isMine || casilla.revealed);
}

function countFlags(casillas: readonly (readonly CasillaBuscaminas[])[]): number {
  return casillas.flat().filter((casilla) => casilla.flagged).length;
}

function cloneCells(casillas: readonly (readonly CasillaBuscaminas[])[]): CasillaBuscaminas[][] {
  return casillas.map((fila) => fila.map((casilla) => ({ ...casilla })));
}

function adjacentCoordinates(
  filas: number,
  columnas: number,
  fila: number,
  columna: number,
): [number, number][] {
  const coordinates: [number, number][] = [];
  for (let desplazamientoFila = -1; desplazamientoFila <= 1; desplazamientoFila += 1) {
    for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
      if (desplazamientoFila === 0 && columnOffset === 0) {
        continue;
      }
      const nextRow = fila + desplazamientoFila;
      const nextColumn = columna + columnOffset;
      if (nextRow >= 0 && nextRow < filas && nextColumn >= 0 && nextColumn < columnas) {
        coordinates.push([nextRow, nextColumn]);
      }
    }
  }
  return coordinates;
}
