import { ActividadSistema } from './core/system-activity/system-activity.service';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatosPortfolio } from './core/models/portfolio.model';
import { ServicioPortfolio } from './core/services/portfolio.service';
import { Localizacion } from './core/services/localization.service';
import { Escritorio } from './desktop/components/desktop-shell/desktop-shell';

@Component({
  selector: 'app-root',
  imports: [Escritorio],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Aplicacion {
  readonly i18n = inject(Localizacion);
  private readonly servicioPortfolio = inject(ServicioPortfolio);
  private readonly referenciaDestruccion = inject(DestroyRef);

  readonly portfolio = signal<DatosPortfolio | null>(null);
  readonly cargando = signal(true);
  readonly error = signal(false);

  private readonly actividad = inject(ActividadSistema);

  constructor() {
    this.actividad.observeResources();
    this.actividad.pulse('shell', 'open');
    this.cargarPortfolio();
  }

  reintentar(): void {
    this.cargarPortfolio();
  }

  private cargarPortfolio(): void {
    this.cargando.set(true);
    this.error.set(false);
    this.servicioPortfolio
      .obtenerPortfolio()
      .pipe(takeUntilDestroyed(this.referenciaDestruccion))
      .subscribe({
        next: (portfolio) => {
          this.portfolio.set(portfolio);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.error.set(true);
        },
      });
  }
}
