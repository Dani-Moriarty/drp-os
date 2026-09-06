import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DatosPortfolio } from '../../core/models/portfolio.model';
import { Localizacion, ClaveTraduccion } from '../../core/services/localization.service';
import { IdAplicacion, NombreIcono } from '../../desktop/models/desktop.models';
import { IconoPixel } from '../../desktop/components/pixel-icon/pixel-icon';

interface AccesoRapido {
  id: IdAplicacion;
  labelKey: ClaveTraduccion;
  icon: NombreIcono;
}

@Component({
  selector: 'app-welcome',
  imports: [IconoPixel],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bienvenida {
  readonly i18n = inject(Localizacion);
  readonly portfolio = input.required<DatosPortfolio>();
  readonly launched = output<IdAplicacion>();

  readonly primaryTechnologies = computed(() => {
    const preferido = ['Angular', 'TypeScript', 'Java', 'Spring Boot', 'SQL Server'];
    return preferido.filter((nombre) =>
      this.portfolio().technologies.some((tecnologia) => tecnologia.name === nombre),
    );
  });

  readonly actions: readonly AccesoRapido[] = [
    { id: 'work-experience', labelKey: 'welcome.work', icon: 'folder' },
    { id: 'about', labelKey: 'welcome.about', icon: 'computer' },
    { id: 'pdf-viewer', labelKey: 'welcome.viewCv', icon: 'pdf-file' },
    { id: 'source-code', labelKey: 'welcome.source', icon: 'source-code' },
    { id: 'linkedin', labelKey: 'application.linkedin.label', icon: 'linkedin' },
  ];
}
