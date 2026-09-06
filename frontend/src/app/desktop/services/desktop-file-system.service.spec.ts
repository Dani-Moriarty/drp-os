import { TestBed } from '@angular/core/testing';
import {
  SistemaArchivosEscritorio,
  ID_CLIENTE_LEAGUE,
} from './desktop-file-system.service';

describe('DesktopFileSystemService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('moves desktop entries into folders and persists their location', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());

    servicio.move(['linkedin', 'education'], 'work-experience');

    expect(servicio.desktopIds()).not.toContain('linkedin');
    expect(servicio.workExperienceIds()).toEqual(['linkedin', 'education']);
    expect(TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio()).workExperienceIds()).toEqual([
      'linkedin',
      'education',
    ]);
  });

  it('exposes the built-in audio files through the shared filesystem and migrates their locations', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());

    expect(servicio.idsIn('music')).toHaveLength(8);
    expect(servicio.idsIn('music').every((id) => id.startsWith('audio-'))).toBe(true);

    const firstTrack = servicio.idsIn('music')[0];
    servicio.move([firstTrack], 'desktop');

    const restaurado = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    expect(restaurado.desktopIds()).toContain(firstTrack);
    expect(restaurado.idsIn('music')).not.toContain(firstTrack);
  });

  it('exposes the seven album PNG files in their original order', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());

    expect(servicio.idsIn('photo-album')).toEqual([
      'photo-viajando',
      'photo-boda-calle',
      'photo-caballas',
      'photo-campeones-del-mundo',
      'photo-dni',
      'photo-valentina',
      'photo-fuengirola',
    ]);
  });

  it('registers experience documents as real folder entries and persists extracted files', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    servicio.registerExperienceDocuments([11, 22]);

    expect(servicio.workExperienceIds()).toEqual(['experience-11', 'experience-22']);

    servicio.move(['experience-11'], 'desktop');
    expect(servicio.desktopIds()).toContain('experience-11');
    expect(servicio.workExperienceIds()).toEqual(['experience-22']);

    const restaurado = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    restaurado.registerExperienceDocuments([11, 22]);
    expect(restaurado.desktopIds()).toContain('experience-11');
    expect(restaurado.workExperienceIds()).toEqual(['experience-22']);
  });

  it('migrates the previous directory schema without losing saved application locations', () => {
    localStorage.setItem(
      'drp-os.file-system.v1',
      JSON.stringify({ version: 1, locations: { education: 'work-experience' } }),
    );

    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    servicio.registerExperienceDocuments([11]);

    expect(servicio.workExperienceIds()).toEqual(['education', 'experience-11']);
    expect(localStorage.getItem('drp-os.file-system.v1')).toBeNull();
    expect(localStorage.getItem('drp-os.file-system.v6')).toBeTruthy();
  });

  it('creates nested folders and editable TXT files that survive reloads', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    const idCarpeta = servicio.createFolder('desktop', 'Proyectos');
    const idArchivo = servicio.createTextFile(idCarpeta, 'Ideas');
    servicio.writeTextFile(idArchivo, 'Portfolio retro');

    const restaurado = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    expect(restaurado.desktopIds()).toContain(idCarpeta);
    expect(restaurado.idsIn(idCarpeta)).toEqual([idArchivo]);
    expect(restaurado.userEntry(idArchivo)).toMatchObject({
      kind: 'text-file',
      name: 'Ideas.txt',
      content: 'Portfolio retro',
    });
  });

  it('creates persistent image files that can be renamed and copied', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    const urlDatos = 'data:image/png;base64,iVBORw0KGgo=';
    const imageId = servicio.saveImageFile(
      null,
      'desktop',
      'dibujo.bmp',
      urlDatos,
      'image/png',
      800,
      500,
    ).id;

    expect(servicio.userEntry(imageId)).toMatchObject({
      kind: 'image-file',
      name: 'dibujo.png',
      dataUrl: urlDatos,
      width: 800,
      height: 500,
    });

    servicio.rename(imageId, 'paisaje.jpg');
    const [copyId] = servicio.copy([imageId], 'work-experience');
    const restaurado = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());

    expect(restaurado.userEntry(imageId)?.name).toBe('paisaje.png');
    expect(restaurado.userEntry(copyId)?.name).toBe('paisaje - copia.png');
    expect(restaurado.workExperienceIds()).toContain(copyId);
  });

  it('copies folders recursively and blocks circular moves', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    const idCarpeta = servicio.createFolder('desktop', 'Carpeta');
    const nestedId = servicio.createFolder(idCarpeta, 'Interior');
    const idArchivo = servicio.createTextFile(nestedId, 'Notas.txt');

    expect(servicio.move([idCarpeta], nestedId)).toEqual([]);
    expect(servicio.locationOf(idCarpeta)).toBe('desktop');

    const [copyId] = servicio.copy([idCarpeta], 'work-experience');
    expect(copyId).toBeTruthy();
    const copiedChildren = servicio.idsIn(copyId as `user-folder-${string}`);
    expect(copiedChildren).toHaveLength(1);
    expect(servicio.userEntry(copiedChildren[0])?.kind).toBe('folder');
    expect(servicio.idsIn(copiedChildren[0] as `user-folder-${string}`)).toHaveLength(1);
    expect(servicio.userEntry(idArchivo)?.name).toBe('Notas.txt');
  });

  it('restores deleted files to their previous folder and can empty the Recycle Bin', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    const idCarpeta = servicio.createFolder('desktop', 'Documentos');
    const idArchivo = servicio.createTextFile(idCarpeta, 'Notas.txt');

    servicio.move([idArchivo], 'recycle-bin');
    servicio.restore([idArchivo]);
    expect(servicio.idsIn(idCarpeta)).toContain(idArchivo);
    expect(servicio.recycledIds()).toEqual([ID_CLIENTE_LEAGUE]);

    servicio.move([idCarpeta], 'recycle-bin');
    const eliminado = servicio.emptyRecycleBin();
    expect(eliminado).toContain(idCarpeta);
    expect(eliminado).toContain(ID_CLIENTE_LEAGUE);
    expect(servicio.userEntry(idCarpeta)).toBeUndefined();
    expect(servicio.userEntry(idArchivo)).toBeUndefined();
    expect(servicio.recycledIds()).toEqual([]);
  });

  it('blocks moving or restoring LeagueClient.exe but allows permanent deletion', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());

    expect(servicio.recycledIds()).toEqual([ID_CLIENTE_LEAGUE]);
    expect(servicio.restore([ID_CLIENTE_LEAGUE])).toEqual([]);
    expect(servicio.move([ID_CLIENTE_LEAGUE], 'desktop')).toEqual([]);
    expect(servicio.deletePermanently([ID_CLIENTE_LEAGUE])).toEqual([
      ID_CLIENTE_LEAGUE,
    ]);
    expect(servicio.recycledIds()).toEqual([]);
  });

  it('does not treat a recycled folder as an available destination', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    const idCarpeta = servicio.createFolder('desktop', 'Archivada');
    const idArchivo = servicio.createTextFile('desktop', 'Pendiente.txt');

    servicio.move([idCarpeta], 'recycle-bin');

    expect(servicio.isContainer(idCarpeta)).toBe(false);
    expect(servicio.move([idArchivo], idCarpeta)).toEqual([]);
    expect(servicio.locationOf(idArchivo)).toBe('desktop');
  });

  it('persists the selected arrangement mode for each directory', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    const idCarpeta = servicio.createFolder('desktop', 'Ordenada');
    servicio.setSortMode('desktop', 'name');
    servicio.setSortMode(idCarpeta, 'created');

    const restaurado = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    expect(restaurado.sortMode('desktop')).toBe('name');
    expect(restaurado.sortMode(idCarpeta)).toBe('created');
  });

  it('sends entries to the Recycle Bin and restores them to the desktop', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());

    servicio.move(['pdf-viewer'], 'recycle-bin');
    expect(servicio.recycledIds()).toEqual(['pdf-viewer', ID_CLIENTE_LEAGUE]);
    expect(servicio.desktopIds()).not.toContain('pdf-viewer');

    servicio.restore(['pdf-viewer']);
    expect(servicio.recycledIds()).toEqual([ID_CLIENTE_LEAGUE]);
    expect(servicio.desktopIds()).toContain('pdf-viewer');
  });

  it('keeps the Recycle Bin system icon protected and resets all directories', () => {
    const servicio = TestBed.runInInjectionContext(() => new SistemaArchivosEscritorio());
    servicio.registerExperienceDocuments([11]);
    servicio.move(['recycle-bin', 'education'], 'work-experience');
    servicio.move(['experience-11'], 'desktop');

    expect(servicio.desktopIds()).toContain('recycle-bin');
    expect(servicio.workExperienceIds()).toContain('education');

    servicio.reset();
    expect(servicio.workExperienceIds()).toEqual(['experience-11']);
    expect(servicio.recycledIds()).toEqual([ID_CLIENTE_LEAGUE]);
    expect(servicio.desktopIds()).toContain('education');
    expect(servicio.desktopIds()).not.toContain('experience-11');
    expect(localStorage.getItem('drp-os.file-system.v3')).toBeNull();
    expect(localStorage.getItem('drp-os.file-system.v4')).toBeNull();
    expect(localStorage.getItem('drp-os.file-system.v5')).toBeNull();
    expect(localStorage.getItem('drp-os.file-system.v6')).toBeNull();
    expect(localStorage.getItem('drp-os.file-system.v2')).toBeNull();
    expect(localStorage.getItem('drp-os.file-system.v1')).toBeNull();
  });
});
