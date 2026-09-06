import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AplicacionPaint } from './paint';
import { DocumentosPaint, AdaptadorArchivosPaint } from './paint-document.service';
import { SesionPaint } from './paint-session.service';

describe('Paint 98', () => {
  let montaje: ComponentFixture<AplicacionPaint>;
  let contexto: {
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    lineCap: CanvasLineCap;
    lineJoin: CanvasLineJoin;
    imageSmoothingEnabled: boolean;
    save: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    getImageData: ReturnType<typeof vi.fn>;
    putImageData: ReturnType<typeof vi.fn>;
    beginPath: ReturnType<typeof vi.fn>;
    arc: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
    moveTo: ReturnType<typeof vi.fn>;
    lineTo: ReturnType<typeof vi.fn>;
    stroke: ReturnType<typeof vi.fn>;
    rect: ReturnType<typeof vi.fn>;
    ellipse: ReturnType<typeof vi.fn>;
    drawImage: ReturnType<typeof vi.fn>;
  };
  let pixeles: ImageData;

  beforeEach(async () => {
    localStorage.clear();
    pixeles = {
      data: new Uint8ClampedArray(800 * 500 * 4).fill(255),
      width: 800,
      height: 500,
    } as ImageData;
    contexto = {
      fillStyle: '#ffffff',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'round',
      lineJoin: 'round',
      imageSmoothingEnabled: false,
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(pixeles.data),
        width: 800,
        height: 500,
      } as ImageData)),
      putImageData: vi.fn((siguiente: ImageData) => (pixeles = siguiente)),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      rect: vi.fn(),
      ellipse: vi.fn(),
      drawImage: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      contexto as unknown as CanvasRenderingContext2D,
    );
    Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn(() => true),
    });

    await TestBed.configureTestingModule({ imports: [AplicacionPaint] }).compileComponents();
    TestBed.inject(SesionPaint).reset();
    montaje = TestBed.createComponent(AplicacionPaint);
    montaje.detectChanges();
    const lienzo = montaje.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    vi.spyOn(lienzo, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 800,
      bottom: 500,
      width: 800,
      height: 500,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows the complete retro menu and the required drawing tools', () => {
    const anfitrion = montaje.nativeElement as HTMLElement;
    const menus = Array.from(anfitrion.querySelectorAll('.paint-app__menu > button')).map((boton) =>
      boton.textContent?.trim(),
    );
    expect(menus).toEqual(['Archivo', 'Edición', 'Ver', 'Imagen', 'Colores', 'Ayuda']);
    expect(anfitrion.querySelectorAll('.paint-app__tool')).toHaveLength(7);
    expect(anfitrion.querySelectorAll('.paint-app__swatches')).toHaveLength(1);
  });

  it('captures fast freehand drawing even when the pointer leaves the canvas bounds', () => {
    const lienzo = montaje.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    lienzo.dispatchEvent(pointer('pointerdown', 10, 10, 4));
    lienzo.dispatchEvent(pointer('pointermove', 900, 600, 4));
    lienzo.dispatchEvent(pointer('pointerup', 900, 600, 4));
    montaje.detectChanges();

    expect(contexto.lineTo).toHaveBeenCalledWith(799, 499);
    expect(TestBed.inject(SesionPaint).canUndo()).toBe(true);
  });

  it('switches tools, previews a rectangle and supports undo and redo', () => {
    const anfitrion = montaje.nativeElement as HTMLElement;
    (anfitrion.querySelector('[aria-label="Rectángulo"]') as HTMLButtonElement).click();
    const lienzo = anfitrion.querySelector('canvas') as HTMLCanvasElement;
    lienzo.dispatchEvent(pointer('pointerdown', 20, 20, 8));
    lienzo.dispatchEvent(pointer('pointermove', 120, 90, 8));
    lienzo.dispatchEvent(pointer('pointerup', 120, 90, 8));
    montaje.detectChanges();

    expect(contexto.rect).toHaveBeenCalledWith(20, 20, 100, 70);
    expect(TestBed.inject(SesionPaint).canUndo()).toBe(true);
    montaje.componentInstance.execute('undo');
    montaje.componentInstance.execute('redo');
    expect(contexto.putImageData).toHaveBeenCalled();
  });

  it('fills a contiguous area with the selected palette color', () => {
    const anfitrion = montaje.nativeElement as HTMLElement;
    (anfitrion.querySelector('[aria-label="Relleno con color"]') as HTMLButtonElement).click();
    (anfitrion.querySelector('[aria-label="Seleccionar color #ff0000"]') as HTMLButtonElement).click();
    const lienzo = anfitrion.querySelector('canvas') as HTMLCanvasElement;
    lienzo.dispatchEvent(pointer('pointerdown', 200, 180, 12));
    montaje.detectChanges();

    expect(Array.from(pixeles.data.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(TestBed.inject(SesionPaint).canUndo()).toBe(true);
  });

  it('saves a PNG through the virtual desktop file adapter', async () => {
    const save = vi.fn(async () => ({
      id: 'user-image-test' as const,
      name: 'drawing.png',
      created: true,
    }));
    const adaptador: AdaptadorArchivosPaint = { open: async () => null, save };
    TestBed.inject(DocumentosPaint).connectVirtualFileAdapter(adaptador);
    const lienzo = montaje.nativeElement.querySelector('canvas') as HTMLCanvasElement;
    vi.spyOn(lienzo, 'toBlob').mockImplementation((alCompletar) => {
      alCompletar(new Blob(['png'], { type: 'image/png' }));
    });

    montaje.componentInstance.execute('save');
    await vi.waitFor(() => {
      expect(TestBed.inject(SesionPaint).fileId()).toBe('user-image-test');
    });

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'drawing.png',
        existingId: null,
        width: 800,
        height: 500,
      }),
    );
    expect(TestBed.inject(SesionPaint).dirty()).toBe(false);
  });
});

function pointer(tipo: string, clientX: number, clientY: number, idPuntero: number): PointerEvent {
  return new PointerEvent(tipo, { bubbles: true, button: 0, clientX, clientY, pointerId: idPuntero });
}
