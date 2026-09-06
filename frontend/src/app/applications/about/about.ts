import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { DatosPortfolio } from '../../core/models/portfolio.model';
import { Localizacion, ClaveTraduccion } from '../../core/services/localization.service';

type PestanaPerfil = 'general' | 'contact';

@Component({
  selector: 'app-about',
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SobreMi {
  readonly i18n = inject(Localizacion);
  readonly portfolio = input.required<DatosPortfolio>();
  readonly activeTab = signal<PestanaPerfil>('general');

  readonly tabs: readonly { id: PestanaPerfil; labelKey: ClaveTraduccion }[] = [
    { id: 'general', labelKey: 'about.tab.general' },
    { id: 'contact', labelKey: 'about.tab.contact' },
  ];

  technologyLine(names: readonly string[]): string {
    return names
      .filter((nombre) => this.portfolio().technologies.some((tecnologia) => tecnologia.name === nombre))
      .join(' / ');
  }
}
