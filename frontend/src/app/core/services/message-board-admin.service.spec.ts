import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdministracionTablon } from './message-board-admin.service';

describe('MessageBoardAdminService', () => {
  let servicio: AdministracionTablon;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AdministracionTablon);
    http = TestBed.inject(HttpTestingController);
    history.replaceState(null, '', '/');
  });

  afterEach(() => {
    history.replaceState(null, '', '/');
    http.verify();
  });

  it('restores a valid administrator cookie without exposing it to JavaScript', () => {
    servicio.initialize();

    const solicitud = http.expectOne('/api/message-board/admin/session');
    expect(solicitud.request.method).toBe('GET');
    expect(solicitud.request.withCredentials).toBe(true);
    solicitud.flush({ administrator: true });

    expect(servicio.administrator()).toBe(true);
  });

  it('exchanges and immediately removes a one-time fragment activation', () => {
    history.replaceState(null, '', '/#message-board-admin=one-time-code');
    servicio.initialize();

    expect(location.hash).toBe('');
    const solicitud = http.expectOne('/api/message-board/admin/session');
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toEqual({ code: 'one-time-code' });
    expect(solicitud.request.withCredentials).toBe(true);
    solicitud.flush({ administrator: true });

    expect(servicio.administrator()).toBe(true);
  });

  it('does not retry or reveal failed activations', () => {
    history.replaceState(null, '', '/#message-board-admin=invalid');
    servicio.initialize();
    http.expectOne('/api/message-board/admin/session').flush({}, { status: 403, statusText: 'Forbidden' });

    servicio.initialize();
    http.expectNone('/api/message-board/admin/session');
    expect(servicio.administrator()).toBe(false);
    expect(location.hash).toBe('');
  });
});
