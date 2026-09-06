import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
} from '@angular/core';
import { OpcionMenuContextual } from '../../models/desktop.models';

@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.html',
  styleUrl: './context-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuContextual implements AfterViewInit {
  @ViewChild('menu') private menu?: ElementRef<HTMLElement>;

  readonly items = input.required<OpcionMenuContextual[]>();
  readonly x = input.required<number>();
  readonly y = input.required<number>();
  readonly chosen = output<string>();
  readonly dismissed = output<void>();

  opensLeft(): boolean {
    return this.x() > (globalThis.innerWidth || 1280) - 480;
  }

  ngAfterViewInit(): void {
    globalThis.setTimeout(() => this.visibleButtons()[0]?.focus());
  }

  choose(elemento: OpcionMenuContextual): void {
    if (!elemento.disabled && !elemento.children?.length) {
      this.chosen.emit(elemento.id);
    }
  }

  onKeyDown(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      this.dismissed.emit();
      return;
    }

    const botones = this.visibleButtons();
    const actual = globalThis.document?.activeElement as HTMLButtonElement | null;
    const indiceActual = botones.indexOf(actual!);
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      const direccion = evento.key === 'ArrowDown' ? 1 : -1;
      const indiceSiguiente = (Math.max(0, indiceActual) + direccion + botones.length) % botones.length;
      botones[indiceSiguiente]?.focus();
    } else if (evento.key === 'ArrowRight') {
      const submenu = actual?.parentElement?.querySelector<HTMLDivElement>('.context-menu__submenu');
      const firstChild = submenu?.querySelector<HTMLButtonElement>('button:not(:disabled)');
      if (firstChild) {
        evento.preventDefault();
        firstChild.focus();
      }
    } else if (evento.key === 'ArrowLeft') {
      const submenu = actual?.closest('.context-menu__submenu');
      const parentButton = submenu?.parentElement?.querySelector<HTMLButtonElement>(':scope > button');
      if (parentButton) {
        evento.preventDefault();
        parentButton.focus();
      }
    }
  }

  private visibleButtons(): HTMLButtonElement[] {
    return Array.from(
      this.menu?.nativeElement.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    ).filter((boton) => boton.offsetParent !== null || boton === globalThis.document?.activeElement);
  }
}
