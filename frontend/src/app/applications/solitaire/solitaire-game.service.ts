import { ActividadSistema } from '../../core/system-activity/system-activity.service';
import { inject, Injectable, computed, signal } from '@angular/core';

export type PaloSolitario = 'clubs' | 'diamonds' | 'hearts' | 'spades';

export interface CartaSolitario {
  readonly id: string;
  readonly suit: PaloSolitario;
  readonly rank: number;
  readonly faceUp: boolean;
}

export interface PartidaSolitario {
  readonly stock: readonly CartaSolitario[];
  readonly waste: readonly CartaSolitario[];
  readonly foundations: Readonly<Record<PaloSolitario, readonly CartaSolitario[]>>;
  readonly tableau: readonly (readonly CartaSolitario[])[];
  readonly moves: number;
}

export type OrigenSolitario =
  | { readonly zone: 'waste' }
  | { readonly zone: 'foundation'; readonly suit: PaloSolitario }
  | { readonly zone: 'tableau'; readonly column: number; readonly cardIndex: number };

export type DestinoSolitario =
  | { readonly zone: 'foundation'; readonly suit: PaloSolitario }
  | { readonly zone: 'tableau'; readonly column: number };

export const SOLITAIRE_SUITS: readonly PaloSolitario[] = [
  'clubs',
  'diamonds',
  'hearts',
  'spades',
];

const LIMITE_HISTORIAL = 100;

export function cardColor(carta: Pick<CartaSolitario, 'suit'>): 'red' | 'black' {
  return carta.suit === 'diamonds' || carta.suit === 'hearts' ? 'red' : 'black';
}

export function canPlaceOnTableau(
  carta: CartaSolitario,
  destino: CartaSolitario | undefined,
): boolean {
  if (!destino) {
    return carta.rank === 13;
  }

  return destino.faceUp && destino.rank === carta.rank + 1 && cardColor(destino) !== cardColor(carta);
}

export function canPlaceOnFoundation(
  carta: CartaSolitario,
  destino: CartaSolitario | undefined,
  palo: PaloSolitario,
): boolean {
  return carta.suit === palo && (destino ? carta.rank === destino.rank + 1 : carta.rank === 1);
}

export function isMovableTableauSequence(cartas: readonly CartaSolitario[]): boolean {
  if (cartas.length === 0 || cartas.some((carta) => !carta.faceUp)) {
    return false;
  }

  return cartas.every((carta, indice) => {
    const siguiente = cartas[indice + 1];
    return !siguiente || (carta.rank === siguiente.rank + 1 && cardColor(carta) !== cardColor(siguiente));
  });
}

export function isWinningState(estado: PartidaSolitario): boolean {
  return SOLITAIRE_SUITS.every((palo) => estado.foundations[palo].length === 13);
}

@Injectable({ providedIn: 'root' })
export class JuegoSolitario {
  private readonly activity = inject(ActividadSistema);
  private readonly gameState = signal<PartidaSolitario>(createGame());
  private readonly history = signal<readonly PartidaSolitario[]>([]);

  readonly state = this.gameState.asReadonly();
  readonly canUndo = computed(() => this.history().length > 0);
  readonly won = computed(() => isWinningState(this.gameState()));

  newGame(aleatorio: () => number = Math.random): void {
    this.history.set([]);
    this.gameState.set(createGame(aleatorio));
  }

  reset(): void {
    this.newGame();
  }

  draw(): void {
    const estado = this.gameState();
    this.remember(estado);

    if (estado.stock.length > 0) {
      const stock = [...estado.stock];
      const carta = stock.pop();
      if (!carta) {
        return;
      }
      this.gameState.set({
        ...estado,
        stock,
        waste: [...estado.waste, { ...carta, faceUp: true }],
        moves: estado.moves + 1,
      });
      return;
    }

    if (estado.waste.length === 0) {
      this.history.update((entradas) => entradas.slice(0, -1));
      return;
    }

    this.gameState.set({
      ...estado,
      stock: [...estado.waste].reverse().map((carta) => ({ ...carta, faceUp: false })),
      waste: [],
      moves: estado.moves + 1,
    });
  }

  flipTableau(columna: number): boolean {
    const estado = this.gameState();
    const pila = estado.tableau[columna];
    const carta = pila?.at(-1);
    if (!carta || carta.faceUp) {
      return false;
    }

    this.remember(estado);
    const columnasJuego = estado.tableau.map((entrada) => [...entrada]);
    columnasJuego[columna][columnasJuego[columna].length - 1] = { ...carta, faceUp: true };
    this.gameState.set({ ...estado, tableau: columnasJuego, moves: estado.moves + 1 });
    return true;
  }

  move(origen: OrigenSolitario, destino: DestinoSolitario): boolean {
    if (origen.zone === destino.zone) {
      if (origen.zone !== 'tableau' || destino.zone !== 'tableau' || origen.column === destino.column) {
        return false;
      }
    }

    const estado = this.gameState();
    const enMovimiento = this.cardsFrom(estado, origen);
    if (!enMovimiento || enMovimiento.length === 0) {
      return false;
    }

    const primero = enMovimiento[0];
    if (destino.zone === 'foundation') {
      if (
        enMovimiento.length !== 1 ||
        !canPlaceOnFoundation(primero, estado.foundations[destino.suit].at(-1), destino.suit)
      ) {
        return false;
      }
    } else if (!canPlaceOnTableau(primero, estado.tableau[destino.column]?.at(-1))) {
      return false;
    }

    this.remember(estado);
    const siguiente = cloneState(estado);
    const retirado = this.removeFrom(siguiente, origen);
    if (destino.zone === 'foundation') {
      siguiente.foundations[destino.suit].push(...retirado);
    } else {
      siguiente.tableau[destino.column].push(...retirado);
    }

    this.gameState.set({ ...siguiente, moves: estado.moves + 1 });
    return true;
  }

  autoMove(origen: OrigenSolitario): boolean {
    const cartas = this.cardsFrom(this.gameState(), origen);
    if (!cartas || cartas.length !== 1) {
      return false;
    }
    return this.move(origen, { zone: 'foundation', suit: cartas[0].suit });
  }

  undo(): void {
    const entradas = this.history();
    const anterior = entradas.at(-1);
    if (!anterior) {
      return;
    }
    this.gameState.set(cloneReadonlyState(anterior));
    this.history.set(entradas.slice(0, -1));
  }

  cardsFor(origen: OrigenSolitario): readonly CartaSolitario[] {
    return this.cardsFrom(this.gameState(), origen) ?? [];
  }

  private cardsFrom(estado: PartidaSolitario, origen: OrigenSolitario): readonly CartaSolitario[] | null {
    if (origen.zone === 'waste') {
      const carta = estado.waste.at(-1);
      return carta ? [carta] : null;
    }

    if (origen.zone === 'foundation') {
      const carta = estado.foundations[origen.suit].at(-1);
      return carta ? [carta] : null;
    }

    const pila = estado.tableau[origen.column];
    if (!pila || origen.cardIndex < 0 || origen.cardIndex >= pila.length) {
      return null;
    }
    const cartas = pila.slice(origen.cardIndex);
    return isMovableTableauSequence(cartas) ? cartas : null;
  }

  private removeFrom(estado: PartidaSolitarioMutable, origen: OrigenSolitario): CartaSolitario[] {
    if (origen.zone === 'waste') {
      return estado.waste.splice(-1);
    }
    if (origen.zone === 'foundation') {
      return estado.foundations[origen.suit].splice(-1);
    }

    const retirado = estado.tableau[origen.column].splice(origen.cardIndex);
    const revealed = estado.tableau[origen.column].at(-1);
    if (revealed && !revealed.faceUp) {
      estado.tableau[origen.column][estado.tableau[origen.column].length - 1] = {
        ...revealed,
        faceUp: true,
      };
    }
    return retirado;
  }

  private remember(estado: PartidaSolitario): void {
    this.activity.pulse('solitaire', 'game');
    this.history.update((entradas) => [...entradas.slice(-(LIMITE_HISTORIAL - 1)), cloneReadonlyState(estado)]);
  }
}

interface PartidaSolitarioMutable {
  stock: CartaSolitario[];
  waste: CartaSolitario[];
  foundations: Record<PaloSolitario, CartaSolitario[]>;
  tableau: CartaSolitario[][];
  moves: number;
}

function createGame(aleatorio: () => number = Math.random): PartidaSolitario {
  const deck = SOLITAIRE_SUITS.flatMap((palo) =>
    Array.from({ length: 13 }, (_, indice): CartaSolitario => ({
      id: `${palo}-${indice + 1}`,
      suit: palo,
      rank: indice + 1,
      faceUp: false,
    })),
  );

  for (let indice = deck.length - 1; indice > 0; indice -= 1) {
    const indiceIntercambio = Math.floor(aleatorio() * (indice + 1));
    [deck[indice], deck[indiceIntercambio]] = [deck[indiceIntercambio], deck[indice]];
  }

  const columnasJuego: CartaSolitario[][] = [];
  for (let columna = 0; columna < 7; columna += 1) {
    const pila: CartaSolitario[] = [];
    for (let fila = 0; fila <= columna; fila += 1) {
      const carta = deck.pop();
      if (carta) {
        pila.push({ ...carta, faceUp: fila === columna });
      }
    }
    columnasJuego.push(pila);
  }

  return {
    stock: deck,
    waste: [],
    foundations: { clubs: [], diamonds: [], hearts: [], spades: [] },
    tableau: columnasJuego,
    moves: 0,
  };
}

function cloneState(estado: PartidaSolitario): PartidaSolitarioMutable {
  return {
    stock: estado.stock.map((carta) => ({ ...carta })),
    waste: estado.waste.map((carta) => ({ ...carta })),
    foundations: {
      clubs: estado.foundations.clubs.map((carta) => ({ ...carta })),
      diamonds: estado.foundations.diamonds.map((carta) => ({ ...carta })),
      hearts: estado.foundations.hearts.map((carta) => ({ ...carta })),
      spades: estado.foundations.spades.map((carta) => ({ ...carta })),
    },
    tableau: estado.tableau.map((pila) => pila.map((carta) => ({ ...carta }))),
    moves: estado.moves,
  };
}

function cloneReadonlyState(estado: PartidaSolitario): PartidaSolitario {
  return cloneState(estado);
}
