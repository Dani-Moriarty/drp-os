import { TestBed } from '@angular/core/testing';
import {
  CartaSolitario,
  JuegoSolitario,
  canPlaceOnFoundation,
  canPlaceOnTableau,
  isMovableTableauSequence,
  isWinningState,
} from './solitaire-game.service';

describe('SolitaireGameService', () => {
  let servicio: JuegoSolitario;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(JuegoSolitario);
    servicio.newGame(() => 0.42);
  });

  it('deals a complete, unique 52-card Klondike game', () => {
    const estado = servicio.state();
    const cartas = [
      ...estado.stock,
      ...estado.waste,
      ...Object.values(estado.foundations).flat(),
      ...estado.tableau.flat(),
    ];

    expect(estado.stock).toHaveLength(24);
    expect(estado.tableau.map((pila) => pila.length)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(estado.tableau.every((pila) => pila.at(-1)?.faceUp)).toBe(true);
    expect(estado.tableau.every((pila) => pila.slice(0, -1).every((carta) => !carta.faceUp))).toBe(true);
    expect(cartas).toHaveLength(52);
    expect(new Set(cartas.map((carta) => carta.id)).size).toBe(52);
  });

  it('draws one card, recycles the waste and supports undo', () => {
    servicio.draw();
    expect(servicio.state().stock).toHaveLength(23);
    expect(servicio.state().waste).toHaveLength(1);
    expect(servicio.state().waste[0].faceUp).toBe(true);

    servicio.undo();
    expect(servicio.state().stock).toHaveLength(24);
    expect(servicio.state().waste).toHaveLength(0);

    for (let indice = 0; indice < 24; indice += 1) {
      servicio.draw();
    }
    expect(servicio.state().stock).toHaveLength(0);
    expect(servicio.state().waste).toHaveLength(24);

    servicio.draw();
    expect(servicio.state().stock).toHaveLength(24);
    expect(servicio.state().waste).toHaveLength(0);
    expect(servicio.state().stock.every((carta) => !carta.faceUp)).toBe(true);
  });

  it('enforces classic tableau and foundation rules', () => {
    const blackSeven = card('spades', 7);
    const redSix = card('hearts', 6);
    const redFive = card('diamonds', 5);
    const king = card('clubs', 13);
    const ace = card('hearts', 1);
    const two = card('hearts', 2);

    expect(canPlaceOnTableau(redSix, blackSeven)).toBe(true);
    expect(canPlaceOnTableau(redFive, redSix)).toBe(false);
    expect(canPlaceOnTableau(king, undefined)).toBe(true);
    expect(canPlaceOnTableau(blackSeven, undefined)).toBe(false);
    expect(canPlaceOnFoundation(ace, undefined, 'hearts')).toBe(true);
    expect(canPlaceOnFoundation(two, ace, 'hearts')).toBe(true);
    expect(canPlaceOnFoundation(two, ace, 'diamonds')).toBe(false);
    expect(isMovableTableauSequence([blackSeven, redSix])).toBe(true);
    expect(isMovableTableauSequence([redSix, redFive])).toBe(false);
  });

  it('recognizes victory only when all four foundations contain thirteen cards', () => {
    const estado = servicio.state();
    const completeSuit = (palo: CartaSolitario['suit']) =>
      Array.from({ length: 13 }, (_, indice) => card(palo, indice + 1));
    const winningState = {
      ...estado,
      foundations: {
        clubs: completeSuit('clubs'),
        diamonds: completeSuit('diamonds'),
        hearts: completeSuit('hearts'),
        spades: completeSuit('spades'),
      },
    };

    expect(isWinningState(estado)).toBe(false);
    expect(isWinningState(winningState)).toBe(true);
    expect(
      isWinningState({
        ...winningState,
        foundations: { ...winningState.foundations, spades: completeSuit('spades').slice(0, 12) },
      }),
    ).toBe(false);
  });
});

function card(palo: CartaSolitario['suit'], valorCarta: number): CartaSolitario {
  return { id: `${palo}-${valorCarta}`, suit: palo, rank: valorCarta, faceUp: true };
}
