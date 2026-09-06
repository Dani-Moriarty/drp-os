import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImagenVisualizable } from '../../desktop/models/desktop.models';
import { VisorImagen } from './image-viewer';

const archivos: readonly ImagenVisualizable[] = [
  {
    id: 'photo-viajando',
    name: 'Viajando.png',
    source: '/assets/photo-album/Viajando.png',
    mimeType: 'image/png',
    width: 941,
    height: 1672,
  },
  {
    id: 'photo-boda-calle',
    name: 'Boda Calle.png',
    source: '/assets/photo-album/Boda%20Calle.png',
    mimeType: 'image/png',
    width: 1086,
    height: 1448,
  },
];

describe('ImageViewer', () => {
  let montaje: ComponentFixture<VisorImagen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VisorImagen] }).compileComponents();
    montaje = TestBed.createComponent(VisorImagen);
    montaje.componentRef.setInput('files', archivos);
    montaje.componentRef.setInput('initialFileId', archivos[0].id);
    montaje.detectChanges();
  });

  it('navigates only through the files supplied by the current directory', () => {
    const modificado = vi.fn();
    montaje.componentInstance.fileChanged.subscribe(modificado);

    (montaje.nativeElement.querySelector('.image-viewer__navigation--next') as HTMLButtonElement).click();
    montaje.detectChanges();

    const imagen = montaje.nativeElement.querySelector('img') as HTMLImageElement;
    expect(imagen.getAttribute('src')).toBe('/assets/photo-album/Boda%20Calle.png');
    expect(montaje.nativeElement.textContent).toContain('2 / 2');
    expect(modificado).toHaveBeenCalledWith(archivos[1]);
  });

  it('fits the complete image inside the resizable stage without cropping it', () => {
    const stage = montaje.nativeElement.querySelector('.image-viewer__stage') as HTMLElement;
    const imagen = stage.querySelector('img') as HTMLImageElement;
    const stageStyle = getComputedStyle(stage);
    const imageStyle = getComputedStyle(imagen);

    expect(stageStyle.overflow).toBe('hidden');
    expect(imageStyle.width).toBe('100%');
    expect(imageStyle.height).toBe('100%');
    expect(imageStyle.objectFit).toBe('contain');
  });
});
