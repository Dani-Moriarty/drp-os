import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { ORIGEN_ACTIVIDAD } from './system-activity.context';
import { ActividadSistema } from './system-activity.service';

export const interceptorActividad: HttpInterceptorFn = (
  solicitud: HttpRequest<unknown>,
  siguiente: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const actividad = inject(ActividadSistema);
  const id = actividad.begin({
    source: solicitud.context.get(ORIGEN_ACTIVIDAD),
    method: solicitud.method,
    url: solicitud.urlWithParams,
    uploadBytes: estimarBytes(solicitud.body),
  });
  let recorded = false;

  return siguiente(solicitud).pipe(
    tap({
      next: (evento) => {
        if (evento instanceof HttpResponse) {
          recorded = true;
          actividad.complete(id, evento.status, estimarBytes(evento.body));
        }
      },
      error: (error: unknown) => {
        recorded = true;
        actividad.fail(id, error instanceof HttpErrorResponse ? error.status : 0);
      },
    }),
    finalize(() => {
      if (!recorded) {
        actividad.cancel(id);
      }
    }),
  );
};

function estimarBytes(valor: unknown): number {
  if (valor === null || valor === undefined) {
    return 0;
  }
  if (typeof Blob !== 'undefined' && valor instanceof Blob) {
    return valor.size;
  }
  if (typeof ArrayBuffer !== 'undefined' && valor instanceof ArrayBuffer) {
    return valor.byteLength;
  }
  try {
    return new TextEncoder().encode(typeof valor === 'string' ? valor : JSON.stringify(valor)).length;
  } catch {
    return 0;
  }
}
