import { HttpContext, HttpContextToken } from '@angular/common/http';
import { OrigenActividad } from './system-activity.models';

export const ORIGEN_ACTIVIDAD = new HttpContextToken<OrigenActividad>(() => 'shell');

export function contextoActividad(origen: OrigenActividad): HttpContext {
  return new HttpContext().set(ORIGEN_ACTIVIDAD, origen);
}
