import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MINESWEEPER_PRESETS, JuegoBuscaminas } from './minesweeper-game.service';

describe('MinesweeperGameService', () => {
  let servicio: JuegoBuscaminas;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(JuegoBuscaminas);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates the three classic difficulty boards', () => {
    for (const dificultad of ['beginner', 'intermediate', 'expert'] as const) {
      servicio.newGame(dificultad);
      const estado = servicio.state();
      expect(estado.rows).toBe(MINESWEEPER_PRESETS[dificultad].rows);
      expect(estado.columns).toBe(MINESWEEPER_PRESETS[dificultad].columns);
      expect(estado.mineCount).toBe(MINESWEEPER_PRESETS[dificultad].mines);
      expect(estado.cells.flat()).toHaveLength(estado.rows * estado.columns);
    }
  });

  it('keeps the first square and all of its neighbours safe', () => {
    servicio.reveal(4, 4, () => 0.25);
    const estado = servicio.state();

    expect(estado.cells.flat().filter((casilla) => casilla.isMine)).toHaveLength(10);
    expect(estado.cells[4][4].revealed).toBe(true);
    for (let fila = 3; fila <= 5; fila += 1) {
      for (let columna = 3; columna <= 5; columna += 1) {
        expect(estado.cells[fila][columna].isMine).toBe(false);
      }
    }
  });

  it('places and removes flags without revealing their squares', () => {
    expect(servicio.toggleFlag(0, 0)).toBe(true);
    expect(servicio.state().cells[0][0].flagged).toBe(true);
    expect(servicio.reveal(0, 0, () => 0.5)).toBe(false);
    expect(servicio.state().cells[0][0].revealed).toBe(false);
    expect(servicio.remainingMines()).toBe(9);
    servicio.toggleFlag(0, 0);
    expect(servicio.remainingMines()).toBe(10);
  });

  it('reveals every mine and stops the game after a loss', () => {
    servicio.reveal(4, 4, () => 0.1);
    const mine = servicio.state().cells.flat().find((casilla) => casilla.isMine)!;
    servicio.reveal(mine.row, mine.column);

    expect(servicio.state().status).toBe('lost');
    expect(servicio.state().cells.flat().filter((casilla) => casilla.isMine && casilla.revealed)).toHaveLength(10);
    expect(servicio.reveal(0, 0)).toBe(false);
  });

  it('wins after every safe square has been revealed', () => {
    servicio.reveal(4, 4, () => 0.7);
    for (const casilla of servicio.state().cells.flat()) {
      if (!casilla.isMine) {
        servicio.reveal(casilla.row, casilla.column);
      }
    }

    expect(servicio.state().status).toBe('won');
    expect(servicio.state().cells.flat().filter((casilla) => casilla.isMine && casilla.flagged)).toHaveLength(10);
    expect(servicio.remainingMines()).toBe(0);
  });

  it('starts the timer on the first reveal and resets it with a new game', () => {
    vi.useFakeTimers();
    servicio.reveal(4, 4, () => 0.3);
    vi.advanceTimersByTime(3100);
    expect(servicio.state().elapsedSeconds).toBe(3);

    servicio.newGame();
    vi.advanceTimersByTime(2000);
    expect(servicio.state().elapsedSeconds).toBe(0);
    expect(servicio.state().status).toBe('ready');
  });
});
