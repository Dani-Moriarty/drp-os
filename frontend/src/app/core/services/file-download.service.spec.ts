import { vi } from 'vitest';
import { DescargaArchivos } from './file-download.service';

describe('FileDownloadService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('downloads text with the requested file name', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:http://localhost/text-file');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    new DescargaArchivos().descargarTexto('Notas.txt', 'Contenido editable');

    expect(createObjectUrl).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text/plain;charset=utf-8' }),
    );
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="Notas.txt"]')).toBeNull();
  });

  it('uses the virtual image data URL and file name for image downloads', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const append = vi.spyOn(document.body, 'append');

    new DescargaArchivos().descargarUrlDatos(
      'drawing.png',
      'data:image/png;base64,iVBORw0KGgo=',
    );

    const enlace = append.mock.calls[0][0] as HTMLAnchorElement;
    expect(enlace.download).toBe('drawing.png');
    expect(enlace.href).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(click).toHaveBeenCalledOnce();
  });
});
