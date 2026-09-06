import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  input,
  output,
} from '@angular/core';
import { DatosPortfolio } from '../../core/models/portfolio.model';
import { Localizacion } from '../../core/services/localization.service';
import { IdAplicacion } from '../../desktop/models/desktop.models';
import { SesionTerminal } from './terminal-session.service';

@Component({
  selector: 'app-terminal',
  templateUrl: './terminal.html',
  styleUrl: './terminal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Terminal {
  readonly portfolio = input.required<DatosPortfolio>();
  readonly applicationRequested = output<IdAplicacion>();
  readonly closeRequested = output<void>();

  @ViewChild('terminal') private terminal?: ElementRef<HTMLElement>;
  @ViewChild('commandLine') private commandLine?: ElementRef<HTMLInputElement>;

  readonly i18n = inject(Localizacion);
  readonly session = inject(SesionTerminal);

  updateCommand(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.session.setInput(valor);
  }

  async onKeyDown(evento: KeyboardEvent): Promise<void> {
    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      this.session.previousHistory();
      return;
    }
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      this.session.nextHistory();
      return;
    }
    if (evento.key !== 'Enter') {
      return;
    }

    evento.preventDefault();
    const effect = await this.session.execute(this.session.input(), {
      portfolio: this.portfolio(),
      language: this.i18n.language(),
    });

    if (effect?.type === 'open') {
      this.applicationRequested.emit(effect.applicationId);
    } else if (effect?.type === 'close') {
      this.closeRequested.emit();
      return;
    }
    this.focusCommandLine();
  }

  focusCommandLine(): void {
    globalThis.setTimeout(() => {
      const terminal = this.terminal?.nativeElement;
      if (terminal) {
        terminal.scrollTop = terminal.scrollHeight;
      }
      this.commandLine?.nativeElement.focus();
    });
  }
}
