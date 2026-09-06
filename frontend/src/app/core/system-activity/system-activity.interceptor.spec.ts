import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ServicioTablon } from '../services/message-board.service';
import { interceptorActividad } from './system-activity.interceptor';
import { ActividadSistema } from './system-activity.service';

describe('systemActivityInterceptor', () => {
  let tablero: ServicioTablon;
  let http: HttpTestingController;
  let actividad: ActividadSistema;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([interceptorActividad])),
        provideHttpClientTesting(),
      ],
    });
    tablero = TestBed.inject(ServicioTablon);
    http = TestBed.inject(HttpTestingController);
    actividad = TestBed.inject(ActividadSistema);
  });

  afterEach(() => {
    http.verify();
    actividad.reset();
  });

  it('measures a real service request and attributes it to its application', () => {
    tablero.messages().subscribe();

    const solicitud = http.expectOne('/api/message-board/messages?page=0&size=30');
    expect(actividad.activeEvents()[0]).toMatchObject({
      source: 'message-board',
      method: 'GET',
      status: 'active',
    });
    solicitud.flush({
      messages: [],
      page: 0,
      totalPages: 1,
      totalMessages: 0,
      hasOlder: false,
      hasNewer: false,
    });

    expect(actividad.events()[0]).toMatchObject({
      source: 'message-board',
      status: 'success',
      statusCode: 200,
    });
    expect(actividad.metrics().downloadBytes).toBeGreaterThan(0);
  });

  it('records backend failures without exposing their bodies in the monitor', () => {
    tablero.messages().subscribe({ error: () => undefined });
    http
      .expectOne('/api/message-board/messages?page=0&size=30')
      .flush({ internal: 'secret detail' }, { status: 503, statusText: 'Unavailable' });

    expect(actividad.events()[0]).toMatchObject({ status: 'error', statusCode: 503 });
    expect(JSON.stringify(actividad.events()[0])).not.toContain('secret detail');
  });
});
