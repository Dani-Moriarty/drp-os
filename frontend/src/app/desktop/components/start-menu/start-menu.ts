import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Localizacion } from '../../../core/services/localization.service';
import { APLICACIONES_CON_ICONO } from '../../config/desktop-applications';
import { AplicacionEscritorio } from '../../models/desktop.models';
import { IconoPixel } from '../pixel-icon/pixel-icon';

@Component({
  selector: 'app-start-menu',
  imports: [IconoPixel],
  templateUrl: './start-menu.html',
  styleUrl: './start-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuInicio {
  readonly i18n = inject(Localizacion);
  readonly open = input(false);
  readonly launched = output<AplicacionEscritorio>();
  readonly restartRequested = output<void>();

  readonly applications = APLICACIONES_CON_ICONO;
}
