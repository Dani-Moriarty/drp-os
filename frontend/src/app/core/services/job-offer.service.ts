import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { resolverUrlApi } from '../config/api.config';
import { SolicitudOferta } from '../models/job-offer.model';
import { contextoActividad } from '../system-activity/system-activity.context';

@Injectable({ providedIn: 'root' })
export class ServicioOfertas {
  private readonly http = inject(HttpClient);

  submit(solicitud: SolicitudOferta): Observable<void> {
    const endpoint = resolverUrlApi('/api/job-offers');
    if (!endpoint) {
      return throwError(() => new Error('The public backend URL is not configured yet.'));
    }
    return this.http.post<void>(endpoint, solicitud, {
      context: contextoActividad('job-offer'),
    });
  }
}
