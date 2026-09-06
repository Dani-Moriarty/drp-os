import { TestBed } from '@angular/core/testing';
import { ActividadSistema } from './system-activity.service';

describe('SystemActivityService', () => {
  let servicio: ActividadSistema;

  beforeEach(() => {
    servicio = TestBed.runInInjectionContext(() => new ActividadSistema());
  });

  afterEach(() => servicio.reset());

  it('records measured API and database activity without inventing device metrics', () => {
    const id = servicio.begin({
      source: 'message-board',
      method: 'POST',
      url: 'https://api.example.test/api/message-board/messages',
      uploadBytes: 42,
    });

    expect(servicio.activeEvents()).toHaveLength(1);
    expect(servicio.nodeStatus('api')).toBe('processing');
    expect(servicio.nodeStatus('database')).toBe('processing');

    servicio.complete(id, 201, 128);

    expect(servicio.metrics()).toMatchObject({
      totalRequests: 1,
      activeRequests: 0,
      completedRequests: 1,
      errorRequests: 0,
      uploadBytes: 42,
      downloadBytes: 128,
    });
    expect(servicio.nodeStatus('api')).toBe('online');
  });

  it('marks failed requests and clears the complete session on restart', () => {
    const id = servicio.begin({ source: 'terminal', method: 'GET', url: '/api/health' });
    servicio.fail(id, 503);

    expect(servicio.sourceStatus('terminal')).toBe('error');
    expect(servicio.metrics().errorRequests).toBe(1);

    servicio.reset();

    expect(servicio.events()).toEqual([]);
    expect(servicio.metrics().totalRequests).toBe(0);
    expect(servicio.nodeStatus('api')).toBe('unknown');
  });

  it('classifies the static portfolio snapshot as asset traffic', () => {
    const id = servicio.begin({ source: 'portfolio', method: 'GET', url: '/data/portfolio.json' });
    servicio.complete(id, 200, 512);

    expect(servicio.nodeStatus('assets')).toBe('online');
    expect(servicio.events()[0].targets).toEqual(['assets']);
  });

  it('keeps cumulative metrics after the bounded request history is full', () => {
    for (let indice = 0; indice < 75; indice += 1) {
      const id = servicio.begin({ source: 'terminal', method: 'GET', url: '/api/health' });
      servicio.complete(id, 200, 10);
    }

    expect(servicio.events()).toHaveLength(60);
    expect(servicio.metrics()).toMatchObject({
      totalRequests: 75,
      completedRequests: 75,
      downloadBytes: 750,
    });
  });

  it('keeps local actions separate from HTTP traffic and coalesces rapid repeats', () => {
    servicio.pulse('paint', 'draw');
    servicio.pulse('paint', 'draw');

    expect(servicio.localEvents()).toHaveLength(1);
    expect(servicio.sourceHighlighted('paint')).toBe(true);
    expect(servicio.metrics().totalRequests).toBe(0);
  });

  it('does not claim a database failure from an unavailable API request', () => {
    const id = servicio.begin({
      source: 'message-board',
      method: 'GET',
      url: '/api/message-board/messages',
    });
    servicio.fail(id, 0);

    expect(servicio.nodeStatus('api')).toBe('error');
    expect(servicio.nodeStatus('database')).toBe('unknown');
  });

  it('does not classify the administrator session endpoint as database traffic', () => {
    const id = servicio.begin({
      source: 'message-board',
      method: 'GET',
      url: '/api/message-board/admin/session',
    });

    expect(servicio.events()[0].targets).toEqual(['api']);
    servicio.cancel(id);
    expect(servicio.metrics().completedRequests).toBe(0);
  });
});
