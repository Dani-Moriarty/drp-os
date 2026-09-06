import { TestBed } from '@angular/core/testing';
import { AplicacionEscritorio } from '../models/desktop.models';
import { GestorVentanas } from './window-manager.service';

const aplicacion: AplicacionEscritorio = {
  id: 'about',
  label: 'Sobre mí',
  title: 'Sobre mí',
  type: 'about',
  icon: 'computer',
  showOnDesktop: true,
  defaultPosition: { x: 20, y: 20 },
  windowConfig: { width: 600, height: 450 },
};

describe('WindowManagerService', () => {
  let servicio: GestorVentanas;

  beforeEach(() => {
    servicio = TestBed.runInInjectionContext(() => new GestorVentanas());
  });

  it('opens, focuses and closes windows with an increasing z-index', () => {
    servicio.abrir(aplicacion, { width: 1200, height: 700 });
    const firstZIndex = servicio.ventanas()[0].zIndex;

    servicio.abrir(
      { ...aplicacion, id: 'terminal', title: 'Terminal.exe', type: 'terminal' },
      { width: 1200, height: 700 },
    );
    expect(servicio.ventanas()).toHaveLength(2);
    expect(servicio.idVentanaActiva()).toBe('terminal');

    servicio.enfocar('about');
    expect(servicio.idVentanaActiva()).toBe('about');
    expect(servicio.ventanas().find((estadoVentana) => estadoVentana.id === 'about')?.zIndex).toBeGreaterThan(
      firstZIndex,
    );

    servicio.cerrar('about');
    expect(servicio.ventanas()).toHaveLength(1);
    expect(servicio.idVentanaActiva()).toBe('terminal');
  });

  it('minimizes and restores a window from the taskbar', () => {
    servicio.abrir(aplicacion, { width: 1000, height: 650 });
    servicio.minimizar('about');

    expect(servicio.ventanas()[0].minimized).toBe(true);
    expect(servicio.ventanasVisibles()).toHaveLength(0);

    servicio.alternarDesdeBarra('about');
    expect(servicio.ventanas()[0].minimized).toBe(false);
    expect(servicio.idVentanaActiva()).toBe('about');

    servicio.alternarDesdeBarra('about');
    expect(servicio.ventanas()[0].minimized).toBe(true);
  });

  it('reuses an existing window instead of opening a duplicate', () => {
    servicio.abrir(aplicacion, { width: 1000, height: 650 });
    servicio.minimizar('about');
    servicio.abrir(aplicacion, { width: 1000, height: 650 });

    expect(servicio.ventanas()).toHaveLength(1);
    expect(servicio.ventanas()[0].minimized).toBe(false);
  });

  it('maximizes a window and restores its previous geometry', () => {
    const limites = { width: 1000, height: 650 };
    servicio.abrir(aplicacion, limites);
    const original = servicio.ventanas()[0];

    servicio.alternarMaximizado('about', limites);
    expect(servicio.ventanas()[0]).toMatchObject({
      x: 0,
      y: 0,
      width: 1000,
      height: 650,
      maximized: true,
    });

    servicio.alternarMaximizado('about', limites);
    expect(servicio.ventanas()[0]).toMatchObject({
      x: original.x,
      y: original.y,
      width: original.width,
      height: original.height,
      maximized: false,
    });
  });

  it('resets every open window as part of a computer restart', () => {
    servicio.abrir(aplicacion, { width: 1000, height: 650 });
    servicio.reiniciar();

    expect(servicio.ventanas()).toHaveLength(0);
    expect(servicio.idVentanaActiva()).toBeNull();
  });

  it('resizes a normal window within the desktop bounds', () => {
    const limites = { width: 1000, height: 650 };
    servicio.abrir(aplicacion, limites);
    const abierto = servicio.ventanas()[0];

    servicio.redimensionar('about', { width: 760, height: 520 }, limites);
    expect(servicio.ventanas()[0]).toMatchObject({ width: 760, height: 520 });

    servicio.redimensionar('about', { width: 5000, height: 5000 }, limites);
    expect(servicio.ventanas()[0].width).toBe(limites.width - abierto.x);
    expect(servicio.ventanas()[0].height).toBe(limites.height - abierto.y);
  });

  it('resizes from the top and left while keeping the opposite edges fixed', () => {
    const limites = { width: 1000, height: 650 };
    servicio.abrir(aplicacion, limites);
    const abierto = servicio.ventanas()[0];
    const derecha = abierto.x + abierto.width;
    const bottom = abierto.y + abierto.height;

    servicio.redimensionar(
      'about',
      { x: abierto.x - 80, y: abierto.y - 60, width: abierto.width + 80, height: abierto.height + 60 },
      limites,
    );

    const redimensionado = servicio.ventanas()[0];
    expect(redimensionado.x).toBe(abierto.x - 80);
    expect(redimensionado.y).toBe(abierto.y - 60);
    expect(redimensionado.x + redimensionado.width).toBe(derecha);
    expect(redimensionado.y + redimensionado.height).toBe(bottom);
  });

  it('keeps moved and resized windows reachable inside the desktop', () => {
    servicio.abrir(aplicacion, { width: 1000, height: 650 });
    servicio.mover('about', { x: 9999, y: 9999 }, { width: 1000, height: 650 });

    expect(servicio.ventanas()[0].x).toBeLessThan(1000);
    expect(servicio.ventanas()[0].y).toBeLessThan(650);

    servicio.ajustarAlEscritorio({ width: 390, height: 790 });
    expect(servicio.ventanas()[0].x).toBeGreaterThanOrEqual(0);
    expect(servicio.ventanas()[0].y).toBeGreaterThanOrEqual(0);
  });
});
