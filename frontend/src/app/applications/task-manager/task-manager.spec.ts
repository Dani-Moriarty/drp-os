import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAPA_APLICACIONES } from '../../desktop/config/desktop-applications';
import { GestorVentanas } from '../../desktop/services/window-manager.service';
import { ActividadSistema } from '../../core/system-activity/system-activity.service';
import { AdministradorTareas } from './task-manager';

describe('TaskManager', () => {
  let montaje: ComponentFixture<AdministradorTareas>;
  let componente: AdministradorTareas;
  let ventanas: GestorVentanas;
  let actividad: ActividadSistema;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({ imports: [AdministradorTareas] }).compileComponents();
    ventanas = TestBed.inject(GestorVentanas);
    actividad = TestBed.inject(ActividadSistema);
    ventanas.reiniciar();
    actividad.reset();

    const perfil = MAPA_APLICACIONES.get('about');
    const taskManager = MAPA_APLICACIONES.get('task-manager');
    if (perfil && taskManager) {
      ventanas.abrir(perfil, { width: 1280, height: 720 });
      ventanas.abrir(taskManager, { width: 1280, height: 720 });
    }
    montaje = TestBed.createComponent(AdministradorTareas);
    componente = montaje.componentInstance;
    montaje.detectChanges();
  });

  afterEach(() => {
    ventanas.reiniciar();
    actividad.reset();
  });

  it('lists real windows and can close the selected task', () => {
    componente.selectTab('applications');
    montaje.detectChanges();
    expect(montaje.nativeElement.textContent).toContain('Sobre mí');
    expect(montaje.nativeElement.textContent).toContain('Administrador de tareas');

    const perfil = ventanas.ventanas().find((estadoVentana) => estadoVentana.id === 'about');
    if (!perfil) {
      throw new Error('Expected the About window to be open.');
    }
    componente.selectWindow(perfil);
    componente.endSelectedTask();

    expect(ventanas.ventanas().some((estadoVentana) => estadoVentana.id === 'about')).toBe(false);
  });

  it('reacts to real message board network activity in the system map', () => {
    actividad.begin({
      source: 'message-board',
      method: 'POST',
      url: '/api/message-board/messages',
      uploadBytes: 80,
    });
    montaje.detectChanges();

    const map = montaje.nativeElement as HTMLElement;
    expect(map.textContent).toContain('POST /api/message-board/messages');
    expect(map.textContent).toContain('Procesando');
    expect(map.querySelector('.wire--active')).not.toBeNull();
    expect(map.textContent).toContain('Frontend');
    expect(map.textContent).toContain('Backend');
  });

  it('shows honest session traffic and latency instead of CPU or RAM', () => {
    const id = actividad.begin({ source: 'terminal', method: 'GET', url: '/api/health' });
    actividad.complete(id, 200, 64);
    componente.selectTab('map');
    montaje.detectChanges();

    expect(montaje.nativeElement.textContent).toContain('Datos HTTP ↑ / ↓ ≈');
    expect(montaje.nativeElement.textContent).toContain('64 B');
    expect(montaje.nativeElement.textContent).not.toContain('CPU:');
    expect(montaje.nativeElement.textContent).not.toContain('RAM:');
  });

  it('shows every open application in the map instead of limiting the topology', () => {
    ['paint', 'solitaire', 'minesweeper', 'terminal', 'message-board'].forEach((idAplicacion) => {
      const aplicacion = MAPA_APLICACIONES.get(idAplicacion as never);
      if (aplicacion) ventanas.abrir(aplicacion, { width: 1280, height: 720 });
    });
    montaje.detectChanges();

    expect(montaje.nativeElement.querySelectorAll('.map-node--application').length).toBe(6);
  });

  it('ends the application rail at the last open window', () => {
    const expectedEnd = componente.applicationNodes().at(-1)!.top + 35;
    montaje.detectChanges();

    const rutas = [...montaje.nativeElement.querySelectorAll('.system-map__wires path')] as SVGPathElement[];
    expect(rutas.some((ruta) => ruta.getAttribute('d') === `M45 100 V${expectedEnd}`)).toBe(true);
    expect(rutas.some((ruta) => ruta.getAttribute('d')?.includes(String(componente.mapHeight() - 38)))).toBe(false);
  });

  it('visualizes a real local action without counting it as network traffic', () => {
    actividad.pulse('about', 'focus');
    montaje.detectChanges();

    const aboutNode = montaje.nativeElement.querySelector('[data-application="about"]');
    const rutas = [...montaje.nativeElement.querySelectorAll('.system-map__wires path')] as SVGPathElement[];
    const firstNodeCenter = componente.applicationNodes()[0].top + 35;
    const applicationRoute = rutas.find(
      (ruta) => ruta.getAttribute('d') === `M45 100 V${firstNodeCenter} H72`,
    );
    const sessionRoute = rutas.find((ruta) => ruta.getAttribute('d') === 'M105 100 V140 H495 V170');
    expect(aboutNode?.classList.contains('map-node--local')).toBe(true);
    expect(componente.frontendLocalActive()).toBe(true);
    expect(applicationRoute?.classList.contains('wire--local')).toBe(true);
    expect(sessionRoute?.classList.contains('wire--local')).toBe(false);
    expect(montaje.nativeElement.textContent).toContain('Sobre mí · Activar ventana');
    expect(actividad.metrics().totalRequests).toBe(0);
  });
});
