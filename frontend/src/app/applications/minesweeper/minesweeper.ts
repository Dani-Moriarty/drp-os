import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { Localizacion, ClaveTraduccion } from '../../core/services/localization.service';
import {
  CasillaBuscaminas,
  DificultadBuscaminas,
  JuegoBuscaminas,
} from './minesweeper-game.service';

type MenuBuscaminas = 'game' | 'help';
type DialogoBuscaminas = 'rules' | 'about' | null;

@Component({
  selector: 'app-minesweeper',
  templateUrl: './minesweeper.html',
  styleUrl: './minesweeper.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Buscaminas {
  readonly closeRequested = output<void>();
  readonly i18n = inject(Localizacion);
  readonly game = inject(JuegoBuscaminas);
  readonly difficulties: readonly DificultadBuscaminas[] = ['beginner', 'intermediate', 'expert'];

  readonly activeMenu = signal<MenuBuscaminas | null>(null);
  readonly dialog = signal<DialogoBuscaminas>(null);
  readonly flagMode = signal(false);

  toggleMenu(menu: MenuBuscaminas): void {
    this.activeMenu.update((actual) => (actual === menu ? null : menu));
  }

  dismissMenu(evento: PointerEvent): void {
    if (!(evento.target as HTMLElement).closest('.minesweeper__menu')) {
      this.activeMenu.set(null);
    }
  }

  newGame(dificultad?: DificultadBuscaminas): void {
    this.game.newGame(dificultad);
    this.activeMenu.set(null);
    this.flagMode.set(false);
  }

  activateCell(casilla: CasillaBuscaminas): void {
    if (this.flagMode()) {
      this.game.toggleFlag(casilla.row, casilla.column);
      return;
    }
    this.game.reveal(casilla.row, casilla.column);
  }

  flagCell(evento: MouseEvent, casilla: CasillaBuscaminas): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.game.toggleFlag(casilla.row, casilla.column);
  }

  chord(casilla: CasillaBuscaminas): void {
    this.game.chord(casilla.row, casilla.column);
  }

  setDifficulty(dificultad: DificultadBuscaminas): void {
    this.newGame(dificultad);
  }

  difficultyLabel(dificultad: DificultadBuscaminas): string {
    return this.i18n.t(`minesweeper.difficulty.${dificultad}` as ClaveTraduccion);
  }

  statusLabel(): string {
    return this.i18n.t(`minesweeper.status.${this.game.state().status}` as ClaveTraduccion);
  }

  cellLabel(casilla: CasillaBuscaminas): string {
    if (casilla.flagged && !casilla.revealed) {
      return this.i18n.t('minesweeper.cell.flagged', { row: casilla.row + 1, column: casilla.column + 1 });
    }
    if (!casilla.revealed) {
      return this.i18n.t('minesweeper.cell.hidden', { row: casilla.row + 1, column: casilla.column + 1 });
    }
    if (casilla.isMine) {
      return this.i18n.t('minesweeper.cell.mine');
    }
    return this.i18n.t('minesweeper.cell.revealed', {
      row: casilla.row + 1,
      column: casilla.column + 1,
      mines: casilla.adjacentMines,
    });
  }

  counter(valor: number): string {
    return Math.max(0, Math.min(999, valor)).toString().padStart(3, '0');
  }

  face(): string {
    return { ready: '🙂', playing: '🙂', won: '😎', lost: '😵' }[this.game.state().status];
  }

  openDialog(dialogo: Exclude<DialogoBuscaminas, null>): void {
    this.activeMenu.set(null);
    this.dialog.set(dialogo);
  }

  closeDialog(): void {
    this.dialog.set(null);
  }
}
