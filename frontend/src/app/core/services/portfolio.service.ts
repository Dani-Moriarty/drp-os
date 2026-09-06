import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { DatosPortfolio } from '../models/portfolio.model';
import { contextoActividad } from '../system-activity/system-activity.context';

@Injectable({ providedIn: 'root' })
export class ServicioPortfolio {
  private readonly http = inject(HttpClient);

  obtenerPortfolio(): Observable<DatosPortfolio> {
    return this.http.get<DatosPortfolio>('/data/portfolio.json', {
      context: contextoActividad('portfolio'),
    });
  }
}
