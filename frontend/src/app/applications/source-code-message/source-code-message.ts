import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Localizacion } from '../../core/services/localization.service';
import { IconoPixel } from '../../desktop/components/pixel-icon/pixel-icon';

@Component({
  selector: 'app-source-code-message',
  imports: [IconoPixel],
  templateUrl: './source-code-message.html',
  styleUrl: './source-code-message.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvisoCodigoFuente {
  readonly i18n = inject(Localizacion);
}
