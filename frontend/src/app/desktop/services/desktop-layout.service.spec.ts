import { DistribucionEscritorio } from './desktop-layout.service';
import { APLICACIONES_CON_ICONO } from '../config/desktop-applications';

const DESKTOP_BOUNDS = { width: 1440, height: 852 };

describe('DesktopLayoutService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('persists icon positions and restores them in a new service instance', () => {
    const servicio = new DistribucionEscritorio();
    servicio.moverIcono('about', { x: 410, y: 210 }, DESKTOP_BOUNDS);

    const restaurado = new DistribucionEscritorio();
    expect(restaurado.positions()['about']).toEqual({ x: 406, y: 224 });
  });

  it('merges a stored layout with default positions for future icons', () => {
    localStorage.setItem(
      'drp-os.desktop-layout.v1',
      JSON.stringify({ version: 1, positions: { about: { x: 100, y: 80 } } }),
    );

    const servicio = new DistribucionEscritorio();
    expect(servicio.positions()['about']).toEqual({ x: 100, y: 80 });
    expect(servicio.positions()['work-experience']).toBeTruthy();
  });

  it('migrates desktop positions saved under the previous product name', () => {
    localStorage.setItem(
      'daniel-os.desktop-layout.v3',
      JSON.stringify({ version: 3, mode: 'custom', positions: { about: { x: 406, y: 224 } } }),
    );

    const servicio = new DistribucionEscritorio();

    expect(servicio.positions()['about']).toEqual({ x: 406, y: 224 });
    expect(localStorage.getItem('drp-os.desktop-layout.v3')).not.toBeNull();
    expect(localStorage.getItem('daniel-os.desktop-layout.v3')).toBeNull();
  });

  it('resets the layout and removes local persistence', () => {
    const servicio = new DistribucionEscritorio();
    servicio.moverIcono('about', { x: 500, y: 300 }, DESKTOP_BOUNDS);
    servicio.reiniciar();

    expect(servicio.positions()['about']).toEqual({ x: 34, y: 20 });
    expect(localStorage.getItem('drp-os.desktop-layout.v3')).toBeNull();
    expect(localStorage.getItem('drp-os.desktop-layout.v2')).toBeNull();
    expect(localStorage.getItem('drp-os.desktop-layout.v1')).toBeNull();
  });

  it('places and persists dynamic files extracted from a folder', () => {
    const idsVisibles = ['about', 'experience-11'];
    const servicio = new DistribucionEscritorio();

    servicio.ajustarAlEscritorio(DESKTOP_BOUNDS, true, idsVisibles);
    servicio.moverIcono('experience-11', { x: 600, y: 300 }, DESKTOP_BOUNDS, idsVisibles);

    expect(servicio.positions()['experience-11']).toEqual({ x: 654, y: 326 });
    expect(new DistribucionEscritorio().positions()['experience-11']).toEqual({ x: 654, y: 326 });
  });

  it('arranges a requested icon order into consecutive grid cells', () => {
    const servicio = new DistribucionEscritorio();

    servicio.ordenar(['education', 'about', 'terminal'], { width: 900, height: 700 });

    expect(servicio.positions()['education']).toEqual({ x: 34, y: 20 });
    expect(servicio.positions()['about']).toEqual({ x: 34, y: 122 });
    expect(servicio.positions()['terminal']).toEqual({ x: 34, y: 224 });
  });

  it('places new icons near the requested point without moving existing icons', () => {
    const servicio = new DistribucionEscritorio();
    const idsExistentes = [
      'about',
      'work-experience',
      'linkedin',
      'education',
      'source-code',
      'pdf-viewer',
      'terminal',
      'job-offer',
      'recycle-bin',
    ];
    servicio.ajustarAlEscritorio(DESKTOP_BOUNDS, false, idsExistentes);
    const before = structuredClone(servicio.positions());

    servicio.colocarIconosNuevos(
      ['user-folder-test'],
      { x: 900, y: 400 },
      DESKTOP_BOUNDS,
      [...idsExistentes, 'user-folder-test'],
    );

    idsExistentes.forEach((id) => expect(servicio.positions()[id]).toEqual(before[id]));
    expect(servicio.positions()['user-folder-test']).toEqual({ x: 902, y: 428 });
    expect(new DistribucionEscritorio().positions()['user-folder-test']).toEqual({ x: 902, y: 428 });
  });

  it('uses the requested left-column desktop order by default', () => {
    const servicio = new DistribucionEscritorio();
    const posiciones = servicio.positions();
    const identificadores = [
      'about',
      'work-experience',
      'linkedin',
      'education',
      'source-code',
      'pdf-viewer',
      'terminal',
      'job-offer',
      'task-manager',
      'recycle-bin',
    ];

    expect(identificadores.map((id) => posiciones[id].x)).toEqual(identificadores.map(() => 34));
    expect(identificadores.map((id) => posiciones[id].y)).toEqual([20, 122, 224, 326, 428, 530, 632, 734, 836, 938]);
  });

  it('uses the requested right-column desktop order and anchors it to the right edge', () => {
    const servicio = new DistribucionEscritorio();
    const identificadores = [
      'paint',
      'solitaire',
      'minesweeper',
      'message-board',
      'photo-album',
      'drp-explorer',
      'audio-player',
      'music-folder',
    ];
    const posicionesIniciales = servicio.positions();

    expect(identificadores.map((id) => posicionesIniciales[id].x)).toEqual(identificadores.map(() => 1770));
    expect(identificadores.map((id) => posicionesIniciales[id].y)).toEqual([20, 122, 224, 326, 428, 530, 632, 734]);

    servicio.ajustarAlEscritorio({ width: 1280, height: 1000 }, false);
    expect(identificadores.map((id) => servicio.positions()[id].x)).toEqual(identificadores.map(() => 1150));

    servicio.ajustarAlEscritorio({ width: 1920, height: 1000 }, false);
    expect(identificadores.map((id) => servicio.positions()[id].x)).toEqual(identificadores.map(() => 1770));

    servicio.ajustarAlEscritorio({ width: 2560, height: 1200 }, false);
    expect(identificadores.map((id) => servicio.positions()[id].x)).toEqual(identificadores.map(() => 2390));
    expect(servicio.positions()['recycle-bin'].x).toBe(34);
  });

  it('keeps a persisted default layout responsive on another screen', () => {
    const servicio = new DistribucionEscritorio();
    servicio.ajustarAlEscritorio({ width: 1280, height: 1000 });

    const persistido = JSON.parse(
      localStorage.getItem('drp-os.desktop-layout.v3') ?? '{}',
    ) as { version?: number; mode?: string };
    expect(persistido.version).toBe(3);
    expect(persistido.mode).toBe('default');

    const restaurado = new DistribucionEscritorio();
    restaurado.ajustarAlEscritorio({ width: 1920, height: 1000 }, false);
    expect(restaurado.positions()['paint']).toEqual({ x: 1770, y: 20 });
  });

  it('preserves a customized layout instead of reanchoring it after a resize', () => {
    const servicio = new DistribucionEscritorio();
    servicio.ajustarAlEscritorio({ width: 1920, height: 1000 }, false);
    servicio.moverIcono('paint', { x: 654, y: 326 }, { width: 1920, height: 1000 });

    servicio.ajustarAlEscritorio({ width: 2560, height: 1200 }, false);

    expect(servicio.positions()['paint']).toEqual({ x: 654, y: 326 });
  });

  it('treats legacy persisted positions as a customized layout', () => {
    localStorage.setItem(
      'drp-os.desktop-layout.v2',
      JSON.stringify({ version: 2, positions: { paint: { x: 654, y: 326 } } }),
    );
    const servicio = new DistribucionEscritorio();

    servicio.ajustarAlEscritorio({ width: 1920, height: 1000 }, false);

    expect(servicio.positions()['paint']).toEqual({ x: 654, y: 326 });
  });

  it('clamps icon positions when the desktop becomes smaller', () => {
    const servicio = new DistribucionEscritorio();
    servicio.moverIcono('about', { x: 902, y: 748 }, DESKTOP_BOUNDS);
    servicio.ajustarAlEscritorio({ width: 390, height: 700 });

    expect(servicio.positions()['about'].x).toBeLessThanOrEqual(282);
    expect(servicio.positions()['about'].y).toBeLessThanOrEqual(592);
  });

  it('snaps a moved icon to the nearest free grid cell', () => {
    const servicio = new DistribucionEscritorio();
    servicio.ajustarAlEscritorio(DESKTOP_BOUNDS);

    servicio.moverIcono('source-code', { x: 36, y: 22 }, DESKTOP_BOUNDS);

    expect(servicio.positions()['source-code']).toEqual({ x: 158, y: 20 });
    expect(new Set(Object.values(servicio.positions()).map(({ x, y }) => `${x}:${y}`)).size).toBe(
      APLICACIONES_CON_ICONO.length,
    );
  });

  it('moves selected icons together while preserving their relative grid positions', () => {
    const servicio = new DistribucionEscritorio();
    servicio.ajustarAlEscritorio(DESKTOP_BOUNDS);
    const aboutBefore = servicio.positions()['about'];
    const workBefore = servicio.positions()['work-experience'];

    servicio.moverIconos(
      ['about', 'work-experience'],
      'about',
      { x: aboutBefore.x + 372, y: aboutBefore.y + 216 },
      DESKTOP_BOUNDS,
    );

    const aboutAfter = servicio.positions()['about'];
    const workAfter = servicio.positions()['work-experience'];
    expect(aboutAfter).toEqual({ x: 406, y: 224 });
    expect(workAfter).toEqual({ x: 406, y: 326 });
    expect(workAfter.y - aboutAfter.y).toBe(workBefore.y - aboutBefore.y);
    expect(new DistribucionEscritorio().positions()['work-experience']).toEqual(workAfter);
    expect(new Set(Object.values(servicio.positions()).map(({ x, y }) => `${x}:${y}`)).size).toBe(
      APLICACIONES_CON_ICONO.length,
    );
  });

  it('repairs overlapping stored positions when reconciling the desktop', () => {
    const overlappingPositions = Object.fromEntries(
      [
        'about',
        'work-experience',
        'linkedin',
        'education',
        'source-code',
        'pdf-viewer',
        'terminal',
        'job-offer',
        'recycle-bin',
      ].map((id) => [id, { x: 34, y: 20 }]),
    );
    localStorage.setItem(
      'drp-os.desktop-layout.v1',
      JSON.stringify({ version: 1, positions: overlappingPositions }),
    );
    const servicio = new DistribucionEscritorio();

    servicio.ajustarAlEscritorio(DESKTOP_BOUNDS);

    const posiciones = Object.values(servicio.positions());
    expect(new Set(posiciones.map(({ x, y }) => `${x}:${y}`)).size).toBe(
      APLICACIONES_CON_ICONO.length,
    );
    expect(posiciones.every(({ x }) => (x - 34) % 124 === 0)).toBe(true);
    expect(posiciones.every(({ y }) => (y - 20) % 102 === 0)).toBe(true);
  });
});
