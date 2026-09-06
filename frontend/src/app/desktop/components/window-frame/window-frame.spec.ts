import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstadoVentana } from '../../models/desktop.models';
import { MarcoVentana } from './window-frame';

const estadoVentana: EstadoVentana = {
  id: 'test-window',
  applicationId: 'about',
  title: 'Test window',
  x: 100,
  y: 80,
  width: 600,
  height: 450,
  zIndex: 10,
  minimized: false,
  maximized: false,
};

describe('WindowFrame resizing', () => {
  let montaje: ComponentFixture<MarcoVentana>;

  beforeEach(async () => {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: () => undefined,
    });
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      configurable: true,
      value: () => true,
    });
    await TestBed.configureTestingModule({ imports: [MarcoVentana] }).compileComponents();
    montaje = TestBed.createComponent(MarcoVentana);
    montaje.componentRef.setInput('state', estadoVentana);
    montaje.componentRef.setInput('bounds', { width: 1200, height: 800 });
    montaje.detectChanges();
  });

  it('renders handles for all four edges and all four corners', () => {
    expect(montaje.nativeElement.querySelectorAll('[data-resize-direction]')).toHaveLength(8);
  });

  it('resizes from the north-west corner while preserving the opposite edges', () => {
    let redimensionado: { x: number; y: number; width: number; height: number } | undefined;
    montaje.componentInstance.resized.subscribe((geometry) => (redimensionado = geometry));
    const handle = montaje.nativeElement.querySelector(
      '[data-resize-direction="nw"]',
    ) as HTMLElement;

    handle.dispatchEvent(pointer('pointerdown', 100, 80, 7));
    handle.dispatchEvent(pointer('pointermove', 20, 10, 7));
    handle.dispatchEvent(pointer('pointerup', 20, 10, 7));

    expect(redimensionado).toEqual({ x: 20, y: 10, width: 680, height: 520 });
  });
});

function pointer(
  tipo: string,
  clientX: number,
  clientY: number,
  idPuntero: number,
): PointerEvent {
  return new PointerEvent(tipo, { bubbles: true, button: 0, clientX, clientY, pointerId: idPuntero });
}
