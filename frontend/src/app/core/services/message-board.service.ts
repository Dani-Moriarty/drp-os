import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { resolverUrlApi } from '../config/api.config';
import {
  MensajeTablon,
  PaginaTablon,
  SolicitudPublicacion,
} from '../models/message-board.model';
import { contextoActividad } from '../system-activity/system-activity.context';

@Injectable({ providedIn: 'root' })
export class ServicioTablon {
  private readonly http = inject(HttpClient);

  messages(pagina = 0, tamano = 30): Observable<PaginaTablon> {
    const endpoint = resolverUrlApi('/api/message-board/messages');
    if (!endpoint) {
      return throwError(() => new Error('The public backend URL is not configured yet.'));
    }
    const parametros = new HttpParams().set('page', pagina).set('size', tamano);
    return this.http.get<PaginaTablon>(endpoint, {
      params: parametros,
      context: contextoActividad('message-board'),
    });
  }

  publish(solicitud: SolicitudPublicacion): Observable<MensajeTablon> {
    const endpoint = resolverUrlApi('/api/message-board/messages');
    if (!endpoint) {
      return throwError(() => new Error('The public backend URL is not configured yet.'));
    }
    return this.http.post<MensajeTablon>(endpoint, solicitud, {
      withCredentials: true,
      context: contextoActividad('message-board'),
    });
  }
}
