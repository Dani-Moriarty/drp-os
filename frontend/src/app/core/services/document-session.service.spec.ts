import { DocumentosSesion } from './document-session.service';

describe('DocumentSessionService', () => {
  it('keeps edits in memory until the session is reset', () => {
    const servicio = new DocumentosSesion();

    expect(servicio.read('education:es', 'Original')).toBe('Original');
    servicio.write('education:es', 'Editado');
    expect(servicio.read('education:es', 'Original')).toBe('Editado');

    servicio.reset();
    expect(servicio.read('education:es', 'Original')).toBe('Original');
  });
});
