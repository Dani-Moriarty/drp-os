import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { Localizacion } from '../../../core/services/localization.service';
import { MAPA_APLICACIONES } from '../../config/desktop-applications';
import { EstadoVentana, NombreIcono } from '../../models/desktop.models';
import { IconoPixel } from '../pixel-icon/pixel-icon';

@Component({
  selector: 'app-taskbar',
  imports: [IconoPixel],
  templateUrl: './taskbar.html',
  styleUrl: './taskbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraTareas {
  readonly i18n = inject(Localizacion);
  readonly windows = input.required<EstadoVentana[]>();
  readonly activeWindowId = input<string | null>(null);
  readonly startMenuOpen = input(false);

  readonly startToggled = output<void>();
  readonly windowToggled = output<string>();

  readonly time = signal(this.formatTime());
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const temporizador = globalThis.setInterval(() => this.time.set(this.formatTime()), 15_000);
    this.destroyRef.onDestroy(() => globalThis.clearInterval(temporizador));
  }

  iconFor(estadoVentana: EstadoVentana): NombreIcono {
    return MAPA_APLICACIONES.get(estadoVentana.applicationId)?.icon ?? 'computer';
  }

  private formatTime(): string {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(
      new Date(),
    );
  }
}
