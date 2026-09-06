import { ActividadSistema } from '../system-activity/system-activity.service';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';
import { resolverUrlApi } from '../config/api.config';
import { EstadoAdministrador } from '../models/message-board.model';
import { contextoActividad } from '../system-activity/system-activity.context';

const PARAMETRO_ACTIVACION = 'message-board-admin';

@Injectable({ providedIn: 'root' })
export class AdministracionTablon {
  readonly administrator = signal(false);
  readonly checking = signal(false);

  private readonly http = inject(HttpClient);
  private readonly activity = inject(ActividadSistema);
  private initialized = false;

  initialize(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.checking.set(true);

    const codigo = this.consumeActivationCode();
    const endpoint = resolverUrlApi('/api/message-board/admin/session');
    if (!endpoint) {
      this.checking.set(false);
      return;
    }

    const solicitud = codigo
      ? this.http.post<EstadoAdministrador>(endpoint, { code: codigo }, {
          withCredentials: true,
          context: contextoActividad('message-board'),
        })
      : this.http.get<EstadoAdministrador>(endpoint, {
          withCredentials: true,
          context: contextoActividad('message-board'),
        });

    solicitud
      .pipe(
        catchError(() => of({ administrator: false })),
        finalize(() => this.checking.set(false)),
      )
      .subscribe((estado) => {
        this.administrator.set(estado.administrator);
        this.activity.pulse('message-board', 'session');
      });
  }

  deleteMessage(id: number) {
    const endpoint = resolverUrlApi(`/api/message-board/messages/${id}`);
    if (!endpoint) {
      return of(false);
    }
    return this.http.delete<void>(endpoint, {
      withCredentials: true,
      context: contextoActividad('message-board'),
    }).pipe(
      catchError(() => {
        this.administrator.set(false);
        return of(false);
      }),
    );
  }

  private consumeActivationCode(): string | null {
    const hash = globalThis.location?.hash;
    if (!hash || !hash.startsWith('#')) {
      return null;
    }

    const parameters = new URLSearchParams(hash.slice(1));
    const codigo = parameters.get(PARAMETRO_ACTIVACION)?.trim() || null;
    if (!parameters.has(PARAMETRO_ACTIVACION)) {
      return null;
    }

    try {
      globalThis.history?.replaceState(
        globalThis.history.state,
        '',
        `${globalThis.location.pathname}${globalThis.location.search}`,
      );
    } catch {
      // El código de un solo uso tampoco debe acabar en el almacenamiento del navegador.
    }
    return codigo;
  }
}
