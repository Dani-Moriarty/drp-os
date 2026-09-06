import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  output,
  signal,
} from '@angular/core';
import { Localizacion } from '../../../core/services/localization.service';

@Component({
  selector: 'app-classic-file-menu',
  templateUrl: './classic-file-menu.html',
  styleUrl: './classic-file-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuArchivo {
  readonly i18n = inject(Localizacion);
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly downloadRequested = output<void>();
  readonly open = signal(false);

  toggle(evento: Event): void {
    evento.stopPropagation();
    this.open.update((valor) => !valor);
  }

  download(evento: Event): void {
    evento.stopPropagation();
    this.open.set(false);
    this.downloadRequested.emit();
  }

  @HostListener('document:pointerdown', ['$event'])
  close(evento: PointerEvent): void {
    if (!this.host.nativeElement.contains(evento.target as Node)) {
      this.open.set(false);
    }
  }
}
