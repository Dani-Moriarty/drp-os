import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { Localizacion, ClaveTraduccion } from '../../core/services/localization.service';
import {
  SOLITAIRE_SUITS,
  CartaSolitario,
  JuegoSolitario,
  OrigenSolitario,
  PaloSolitario,
  DestinoSolitario,
  cardColor,
} from './solitaire-game.service';
import { AnimacionVictoriaSolitario } from './solitaire-victory-animation';

type MenuSolitario = 'game' | 'help';
type DialogoSolitario = 'rules' | 'about' | null;

@Component({
  selector: 'app-solitaire',
  imports: [AnimacionVictoriaSolitario],
  templateUrl: './solitaire.html',
  styleUrl: './solitaire.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Solitario {
  readonly closeRequested = output<void>();
  readonly i18n = inject(Localizacion);
  readonly game = inject(JuegoSolitario);
  readonly suits = SOLITAIRE_SUITS;
  readonly tableauColumns = [0, 1, 2, 3, 4, 5, 6] as const;

  readonly selected = signal<OrigenSolitario | null>(null);
  readonly activeMenu = signal<MenuSolitario | null>(null);
  readonly dialog = signal<DialogoSolitario>(null);
  readonly showWinDialog = signal(false);

  toggleMenu(menu: MenuSolitario): void {
    this.activeMenu.update((actual) => (actual === menu ? null : menu));
  }

  dismissMenu(evento: PointerEvent): void {
    if (!(evento.target as HTMLElement).closest('.solitaire__menu')) {
      this.activeMenu.set(null);
    }
  }

  newGame(): void {
    this.game.newGame();
    this.selected.set(null);
    this.activeMenu.set(null);
    this.showWinDialog.set(false);
  }

  undo(): void {
    this.game.undo();
    this.selected.set(null);
    this.activeMenu.set(null);
    this.showWinDialog.set(false);
  }

  draw(): void {
    this.game.draw();
    this.selected.set(null);
  }

  clearOnBoardPointerDown(evento: PointerEvent): void {
    if (evento.target === evento.currentTarget) {
      this.selected.set(null);
    }
  }

  selectWaste(): void {
    if (this.game.state().waste.length === 0) {
      return;
    }
    this.toggleSelection({ zone: 'waste' });
  }

  selectFoundation(palo: PaloSolitario): void {
    const origen: OrigenSolitario = { zone: 'foundation', suit: palo };
    const actual = this.selected();
    if (actual && !mismoOrigen(actual, origen) && this.tryMove(actual, { zone: 'foundation', suit: palo })) {
      return;
    }
    if (this.game.state().foundations[palo].length > 0) {
      this.toggleSelection(origen);
    }
  }

  selectTableau(columna: number, indiceCarta: number): void {
    const pila = this.game.state().tableau[columna];
    const carta = pila?.[indiceCarta];
    if (!carta) {
      this.moveToTableau(columna);
      return;
    }

    if (!carta.faceUp) {
      if (indiceCarta === pila.length - 1) {
        this.game.flipTableau(columna);
      }
      this.selected.set(null);
      return;
    }

    const origen: OrigenSolitario = { zone: 'tableau', column: columna, cardIndex: indiceCarta };
    const actual = this.selected();
    if (actual && !mismoOrigen(actual, origen) && this.tryMove(actual, { zone: 'tableau', column: columna })) {
      return;
    }
    this.toggleSelection(origen);
  }

  moveToTableau(columna: number): void {
    const origen = this.selected();
    if (origen) {
      this.tryMove(origen, { zone: 'tableau', column: columna });
    }
  }

  autoMove(origen: OrigenSolitario): void {
    if (this.game.autoMove(origen)) {
      this.selected.set(null);
    }
  }

  beginDrag(evento: DragEvent, origen: OrigenSolitario): void {
    if (this.game.cardsFor(origen).length === 0) {
      evento.preventDefault();
      return;
    }
    this.selected.set(origen);
    evento.dataTransfer?.setData('application/x-daniel-solitaire', JSON.stringify(origen));
    if (evento.dataTransfer) {
      evento.dataTransfer.effectAllowed = 'move';
    }
  }

  allowDrop(evento: DragEvent): void {
    evento.preventDefault();
    if (evento.dataTransfer) {
      evento.dataTransfer.dropEffect = 'move';
    }
  }

  drop(evento: DragEvent, destino: DestinoSolitario): void {
    evento.preventDefault();
    evento.stopPropagation();
    const origen = this.readDraggedSource(evento) ?? this.selected();
    if (origen) {
      this.tryMove(origen, destino);
    }
  }

  isSelected(origen: OrigenSolitario): boolean {
    const actual = this.selected();
    return !!actual && mismoOrigen(actual, origen);
  }

  isTableauCardSelected(columna: number, indiceCarta: number): boolean {
    const actual = this.selected();
    return actual?.zone === 'tableau' && actual.column === columna && indiceCarta >= actual.cardIndex;
  }

  topCard(cartas: readonly CartaSolitario[]): CartaSolitario | undefined {
    return cartas.at(-1);
  }

  rank(carta: CartaSolitario): string {
    return { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[carta.rank] ?? String(carta.rank);
  }

  suitSymbol(palo: PaloSolitario): string {
    return { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' }[palo];
  }

  suitLabel(palo: PaloSolitario): string {
    return this.i18n.t(`solitaire.suit.${palo}` as ClaveTraduccion);
  }

  color(carta: CartaSolitario): 'red' | 'black' {
    return cardColor(carta);
  }

  cardLabel(carta: CartaSolitario): string {
    return this.i18n.t('solitaire.card.label', {
      rank: this.rank(carta),
      suit: this.i18n.t(`solitaire.suit.${carta.suit}` as ClaveTraduccion),
    });
  }

  openDialog(dialogo: Exclude<DialogoSolitario, null>): void {
    this.activeMenu.set(null);
    this.dialog.set(dialogo);
  }

  closeDialog(): void {
    this.dialog.set(null);
  }

  finishVictoryAnimation(): void {
    if (this.game.won()) {
      this.showWinDialog.set(true);
    }
  }

  private toggleSelection(origen: OrigenSolitario): void {
    this.selected.update((actual) => (actual && mismoOrigen(actual, origen) ? null : origen));
  }

  private tryMove(origen: OrigenSolitario, destino: DestinoSolitario): boolean {
    const movido = this.game.move(origen, destino);
    if (movido) {
      this.selected.set(null);
      if (!this.game.won()) {
        this.showWinDialog.set(false);
      }
    }
    return movido;
  }

  private readDraggedSource(evento: DragEvent): OrigenSolitario | null {
    const valor = evento.dataTransfer?.getData('application/x-daniel-solitaire');
    if (!valor) {
      return null;
    }
    try {
      return JSON.parse(valor) as OrigenSolitario;
    } catch {
      return null;
    }
  }
}

function mismoOrigen(izquierda: OrigenSolitario, derecha: OrigenSolitario): boolean {
  if (izquierda.zone !== derecha.zone) {
    return false;
  }
  if (izquierda.zone === 'waste' && derecha.zone === 'waste') {
    return true;
  }
  if (izquierda.zone === 'foundation' && derecha.zone === 'foundation') {
    return izquierda.suit === derecha.suit;
  }
  return (
    izquierda.zone === 'tableau' &&
    derecha.zone === 'tableau' &&
    izquierda.column === derecha.column &&
    izquierda.cardIndex === derecha.cardIndex
  );
}
