import { leerAlmacenamiento } from '../../core/services/system-storage';
import { ActividadSistema } from '../../core/system-activity/system-activity.service';
import { inject, Injectable, computed, signal } from '@angular/core';
import { APLICACIONES_CON_ICONO } from '../config/desktop-applications';
import {
  IdAplicacion,
  IdContenedor,
  IdEntradaEscritorio,
  OrdenEscritorio,
  IdDocumentoExperiencia,
  IdEntradaUsuario,
  EntradaUsuario,
  IdCarpetaUsuario,
  IdImagenUsuario,
  IdTextoUsuario,
} from '../models/desktop.models';
import { IDS_ARCHIVOS_AUDIO, esIdArchivoAudio } from '../../applications/audio-player/audio-catalog';
import { IDS_FOTOGRAFIAS, esIdFotografia } from '../config/photo-album';

export const TIPO_ARRASTRE_ENTRADA = 'application/x-drp-os-entry';
export const ID_CLIENTE_LEAGUE = 'league-client' as const;

const CLAVE_ALMACENAMIENTO = 'drp-os.file-system.v6';
const CLAVES_ALMACENAMIENTO_ANTERIORES = [
  'drp-os.file-system.v5',
  'drp-os.file-system.v4',
  'drp-os.file-system.v3',
  'drp-os.file-system.v2',
  'drp-os.file-system.v1',
];
const LONGITUD_MAXIMA_IMAGEN = 3_000_000;
const IDS_INMOVIBLES = new Set<IdEntradaEscritorio>(['recycle-bin', ID_CLIENTE_LEAGUE]);
const IDS_PROTEGIDOS_BORRADO = new Set<IdEntradaEscritorio>(['recycle-bin']);
const IDS_APLICACIONES = new Set<IdAplicacion>(
  APLICACIONES_CON_ICONO.map((aplicacion) => aplicacion.id),
);
const CONTENEDORES_SISTEMA = new Set<IdContenedor>([
  'desktop',
  'work-experience',
  'music',
  'photo-album',
  'recycle-bin',
]);

type UbicacionEntrada = IdContenedor | 'deleted';

interface SistemaArchivosGuardadoV6 {
  version: 6;
  locations: Partial<Record<IdEntradaEscritorio, UbicacionEntrada>>;
  recycleOrigins: Partial<Record<IdEntradaEscritorio, IdContenedor>>;
  userEntries: Partial<Record<IdEntradaUsuario, EntradaUsuario>>;
  sortModes: Partial<Record<IdContenedor, OrdenEscritorio>>;
}

interface SistemaArchivosAnterior {
  version: 1 | 2 | 3 | 4 | 5;
  locations: Partial<Record<IdEntradaEscritorio, IdContenedor>>;
  recycleOrigins?: Partial<Record<IdEntradaEscritorio, IdContenedor>>;
  userEntries?: Partial<Record<IdEntradaUsuario, EntradaUsuario>>;
  sortModes?: Partial<Record<IdContenedor, OrdenEscritorio>>;
}

interface EstadoSistemaArchivos {
  locations: Record<IdEntradaEscritorio, UbicacionEntrada>;
  recycleOrigins: Partial<Record<IdEntradaEscritorio, IdContenedor>>;
  userEntries: Partial<Record<IdEntradaUsuario, EntradaUsuario>>;
  sortModes: Partial<Record<IdContenedor, OrdenEscritorio>>;
}

export function idDocumentoExperiencia(idExperiencia: number): IdDocumentoExperiencia {
  return `experience-${idExperiencia}`;
}

export function experienciaDesdeDocumento(id: string): number | null {
  const coincidencia = /^experience-(\d+)$/u.exec(id);
  if (!coincidencia) {
    return null;
  }
  const idExperiencia = Number(coincidencia[1]);
  return Number.isSafeInteger(idExperiencia) ? idExperiencia : null;
}

function esIdCarpetaUsuario(id: string): id is IdCarpetaUsuario {
  return id.startsWith('user-folder-');
}

function esIdTextoUsuario(id: string): id is IdTextoUsuario {
  return id.startsWith('user-text-');
}

function esIdImagenUsuario(id: string): id is IdImagenUsuario {
  return id.startsWith('user-image-');
}

function esIdEntradaUsuario(id: string): id is IdEntradaUsuario {
  return esIdCarpetaUsuario(id) || esIdTextoUsuario(id) || esIdImagenUsuario(id);
}

function ubicacionesIniciales(): Record<IdEntradaEscritorio, UbicacionEntrada> {
  return Object.fromEntries([
    ...APLICACIONES_CON_ICONO.map((aplicacion) => [aplicacion.id, 'desktop']),
    ...IDS_ARCHIVOS_AUDIO.map((id) => [id, 'music']),
    ...IDS_FOTOGRAFIAS.map((id) => [id, 'photo-album']),
    [ID_CLIENTE_LEAGUE, 'recycle-bin'],
  ]) as Record<IdEntradaEscritorio, UbicacionEntrada>;
}

@Injectable({ providedIn: 'root' })
export class SistemaArchivosEscritorio {
  private readonly activity = inject(ActividadSistema);
  private readonly storedState = this.readStoredState();
  readonly locations = signal<Record<IdEntradaEscritorio, UbicacionEntrada>>(this.storedState.locations);
  readonly userEntries = signal<Partial<Record<IdEntradaUsuario, EntradaUsuario>>>(
    this.storedState.userEntries,
  );
  readonly sortModes = signal<Partial<Record<IdContenedor, OrdenEscritorio>>>(
    this.storedState.sortModes,
  );
  private readonly recycleOrigins = signal<
    Partial<Record<IdEntradaEscritorio, IdContenedor>>
  >(this.storedState.recycleOrigins);

  readonly desktopIds = computed(() => this.idsIn('desktop'));
  readonly workExperienceIds = computed(() => this.idsIn('work-experience'));
  readonly recycledIds = computed(() => this.idsIn('recycle-bin'));

  private registeredExperienceIds: IdDocumentoExperiencia[] = [];
  private idSequence = 0;

  registerExperienceDocuments(experienceIds: readonly number[]): void {
    const registered = experienceIds.map(idDocumentoExperiencia);
    const registeredSet = new Set(registered);
    const actual = this.locations();
    const siguiente = { ...actual };
    let modificado = false;

    for (const id of Object.keys(siguiente)) {
      if (experienciaDesdeDocumento(id) !== null && !registeredSet.has(id as IdDocumentoExperiencia)) {
        delete siguiente[id as IdEntradaEscritorio];
        modificado = true;
      }
    }

    for (const id of registered) {
      if (!siguiente[id]) {
        siguiente[id] = 'work-experience';
        modificado = true;
      }
    }

    this.registeredExperienceIds = registered;
    if (modificado) {
      this.locations.set(siguiente);
      this.persist();
    }
  }

  idsIn(contenedor: IdContenedor): IdEntradaEscritorio[] {
    const ubicaciones = this.locations();
    const applications = APLICACIONES_CON_ICONO.filter(
      (aplicacion) => ubicaciones[aplicacion.id] === contenedor,
    ).map((aplicacion) => aplicacion.id);
    const experiences = this.registeredExperienceIds.filter((id) => ubicaciones[id] === contenedor);
    const audioFiles = IDS_ARCHIVOS_AUDIO.filter((id) => ubicaciones[id] === contenedor);
    const photoFiles = IDS_FOTOGRAFIAS.filter((id) => ubicaciones[id] === contenedor);
    const systemFiles =
      ubicaciones[ID_CLIENTE_LEAGUE] === contenedor ? [ID_CLIENTE_LEAGUE] : [];
    const entradasUsuario = Object.keys(this.userEntries()).filter(
      (id): id is IdEntradaUsuario => esIdEntradaUsuario(id) && ubicaciones[id] === contenedor,
    );
    return [
      ...applications,
      ...experiences,
      ...audioFiles,
      ...photoFiles,
      ...systemFiles,
      ...entradasUsuario,
    ];
  }

  userEntry(id: string): EntradaUsuario | undefined {
    return esIdEntradaUsuario(id) ? this.userEntries()[id] : undefined;
  }

  locationOf(id: IdEntradaEscritorio): UbicacionEntrada | undefined {
    return this.locations()[id];
  }

  isManagedEntry(id: string): id is IdEntradaEscritorio {
    return (
      IDS_APLICACIONES.has(id as IdAplicacion) ||
      id === ID_CLIENTE_LEAGUE ||
      esIdArchivoAudio(id) ||
      esIdFotografia(id) ||
      this.registeredExperienceIds.includes(id as IdDocumentoExperiencia) ||
      Boolean(this.userEntry(id))
    );
  }

  isUserEntry(id: string): id is IdEntradaUsuario {
    return Boolean(this.userEntry(id));
  }

  isContainer(id: string): id is IdContenedor {
    if (CONTENEDORES_SISTEMA.has(id as IdContenedor)) {
      return true;
    }
    const entrada = this.userEntry(id);
    const ubicacion = this.locations()[id as IdEntradaEscritorio];
    return entrada?.kind === 'folder' && ubicacion !== 'deleted' && ubicacion !== 'recycle-bin';
  }

  sortMode(contenedor: IdContenedor): OrdenEscritorio {
    return this.sortModes()[contenedor] ?? 'original';
  }

  setSortMode(contenedor: IdContenedor, modo: OrdenEscritorio): void {
    if (!this.isContainer(contenedor)) {
      return;
    }
    this.sortModes.update((modes) => ({ ...modes, [contenedor]: modo }));
    this.persist();
  }

  createFolder(contenedor: IdContenedor, defaultName: string): IdCarpetaUsuario {
    const id = `user-folder-${this.newId()}` as IdCarpetaUsuario;
    const ahora = Date.now();
    const entrada: EntradaUsuario = {
      id,
      kind: 'folder',
      name: this.uniqueName(contenedor, this.cleanName(defaultName, 'New folder')),
      createdAt: ahora,
      updatedAt: ahora,
    };
    this.addUserEntry(entrada, contenedor);
    return id;
  }

  createTextFile(contenedor: IdContenedor, defaultName: string): IdTextoUsuario {
    const id = `user-text-${this.newId()}` as IdTextoUsuario;
    const ahora = Date.now();
    const baseName = this.ensureTextExtension(this.cleanName(defaultName, 'New text document.txt'));
    const entrada: EntradaUsuario = {
      id,
      kind: 'text-file',
      name: this.uniqueName(contenedor, baseName),
      content: '',
      createdAt: ahora,
      updatedAt: ahora,
    };
    this.addUserEntry(entrada, contenedor);
    return id;
  }

  rename(id: IdEntradaUsuario, nombreSolicitado: string): EntradaUsuario | null {
    const actual = this.userEntry(id);
    const contenedor = this.locations()[id];
    if (!actual || !contenedor || contenedor === 'deleted') {
      return null;
    }
    let nombre = this.cleanName(nombreSolicitado, actual.name);
    if (actual.kind === 'text-file') {
      nombre = this.ensureTextExtension(nombre);
    } else if (actual.kind === 'image-file') {
      nombre = this.ensureImageExtension(nombre, actual.mimeType);
    }
    nombre = this.uniqueName(contenedor, nombre, id);
    const updated = { ...actual, name: nombre, updatedAt: Date.now() } as EntradaUsuario;
    this.userEntries.update((entradas) => ({ ...entradas, [id]: updated }));
    this.persist();
    return updated;
  }

  writeTextFile(id: IdTextoUsuario, contenido: string): void {
    const actual = this.userEntry(id);
    if (actual?.kind !== 'text-file') {
      return;
    }
    this.userEntries.update((entradas) => ({
      ...entradas,
      [id]: { ...actual, content: contenido.slice(0, 100_000), updatedAt: Date.now() },
    }));
    this.persist();
  }

  saveImageFile(
    id: IdImagenUsuario | null,
    contenedor: IdContenedor,
    nombreSolicitado: string,
    urlDatos: string,
    tipoMime: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
    ancho: number,
    alto: number,
  ): { id: IdImagenUsuario; created: boolean; name: string } {
    if (
      !urlDatos.startsWith(`data:${tipoMime};base64,`) ||
      urlDatos.length > LONGITUD_MAXIMA_IMAGEN ||
      !Number.isFinite(ancho) ||
      !Number.isFinite(alto) ||
      ancho <= 0 ||
      alto <= 0
    ) {
      throw new Error('Invalid virtual image.');
    }

    const actual = id ? this.userEntry(id) : undefined;
    const targetContainer = actual ? this.locations()[actual.id] : contenedor;
    const validContainer =
      targetContainer && targetContainer !== 'deleted' && this.isContainer(targetContainer)
        ? targetContainer
        : 'desktop';
    const ahora = Date.now();
    const imageId =
      actual?.kind === 'image-file'
        ? actual.id
        : (`user-image-${this.newId()}` as IdImagenUsuario);
    const nombre = this.uniqueName(
      validContainer,
      this.ensureImageExtension(this.cleanName(nombreSolicitado, 'drawing.png'), tipoMime),
      actual?.kind === 'image-file' ? actual.id : undefined,
    );
    const entrada: Extract<EntradaUsuario, { kind: 'image-file' }> = {
      id: imageId,
      kind: 'image-file',
      name: nombre,
      dataUrl: urlDatos,
      mimeType: tipoMime,
      width: Math.round(ancho),
      height: Math.round(alto),
      createdAt: actual?.kind === 'image-file' ? actual.createdAt : ahora,
      updatedAt: ahora,
    };
    this.userEntries.update((entradas) => ({ ...entradas, [imageId]: entrada }));
    this.locations.update((ubicaciones) => ({ ...ubicaciones, [imageId]: validContainer }));
    this.persist();
    return { id: imageId, created: actual?.kind !== 'image-file', name: nombre };
  }

  move(identificadores: readonly IdEntradaEscritorio[], destino: IdContenedor): IdEntradaEscritorio[] {
    if (!this.isContainer(destino)) {
      return [];
    }
    const actual = this.locations();
    const siguiente = { ...actual };
    const nextOrigins = { ...this.recycleOrigins() };
    const movido: IdEntradaEscritorio[] = [];

    for (const id of identificadores) {
      if (
        !this.isManagedEntry(id) ||
        IDS_INMOVIBLES.has(id) ||
        id === destino ||
        actual[id] === destino ||
        (esIdCarpetaUsuario(id) && this.isDescendantContainer(destino, id))
      ) {
        continue;
      }
      if (destino === 'recycle-bin' && actual[id] && actual[id] !== 'deleted') {
        nextOrigins[id] = actual[id] as IdContenedor;
      } else if (destino !== 'recycle-bin') {
        delete nextOrigins[id];
      }
      siguiente[id] = destino;
      movido.push(id);
    }

    if (movido.length > 0) {
      this.locations.set(siguiente);
      this.recycleOrigins.set(nextOrigins);
      this.persist();
    }
    return movido;
  }

  copy(identificadores: readonly IdEntradaEscritorio[], destino: IdContenedor): IdEntradaEscritorio[] {
    if (!this.isContainer(destino) || destino === 'recycle-bin') {
      return [];
    }
    const copied: IdEntradaEscritorio[] = [];
    for (const id of identificadores) {
      const entrada = this.userEntry(id);
      if (entrada) {
        copied.push(this.cloneUserEntry(entrada, destino, true));
      }
    }
    if (copied.length > 0) {
      this.persist();
    }
    return copied;
  }

  restore(identificadores: readonly IdEntradaEscritorio[]): IdEntradaEscritorio[] {
    const ubicaciones = { ...this.locations() };
    const origins = { ...this.recycleOrigins() };
    const restoring = new Set(
      identificadores.filter((id) => ubicaciones[id] === 'recycle-bin' && !IDS_INMOVIBLES.has(id)),
    );
    const restaurado: IdEntradaEscritorio[] = [];

    for (const id of restoring) {
      const origin = origins[id];
      const userOriginValid =
        origin &&
        esIdCarpetaUsuario(origin) &&
        this.userEntry(origin)?.kind === 'folder' &&
        ubicaciones[origin] !== 'deleted' &&
        (ubicaciones[origin] !== 'recycle-bin' || restoring.has(origin));
      const validOrigin =
        origin &&
        origin !== 'recycle-bin' &&
        origin !== id &&
        (origin === 'desktop' ||
          origin === 'work-experience' ||
          origin === 'music' ||
          origin === 'photo-album' ||
          userOriginValid);
      ubicaciones[id] = validOrigin ? origin : 'desktop';
      delete origins[id];
      restaurado.push(id);
    }

    if (restaurado.length > 0) {
      this.locations.set(ubicaciones);
      this.recycleOrigins.set(origins);
      this.persist();
    }
    return restaurado;
  }

  deletePermanently(identificadores: readonly IdEntradaEscritorio[]): IdEntradaEscritorio[] {
    const ubicaciones = { ...this.locations() };
    const origins = { ...this.recycleOrigins() };
    const entradas = { ...this.userEntries() };
    const eliminado = new Set<IdEntradaEscritorio>();

    const remove = (id: IdEntradaEscritorio): void => {
      if (eliminado.has(id) || IDS_PROTEGIDOS_BORRADO.has(id)) {
        return;
      }
      const entradaUsuario = entradas[id as IdEntradaUsuario];
      if (entradaUsuario?.kind === 'folder') {
        for (const childId of Object.keys(ubicaciones)) {
          if (ubicaciones[childId as IdEntradaEscritorio] === id) {
            remove(childId as IdEntradaEscritorio);
          }
        }
      }
      if (entradaUsuario) {
        delete entradas[id as IdEntradaUsuario];
        delete ubicaciones[id];
      } else if (this.isManagedEntry(id)) {
        ubicaciones[id] = 'deleted';
      }
      delete origins[id];
      eliminado.add(id);
    };

    identificadores.forEach(remove);
    if (eliminado.size > 0) {
      this.locations.set(ubicaciones);
      this.recycleOrigins.set(origins);
      this.userEntries.set(entradas);
      this.persist();
    }
    return [...eliminado];
  }

  emptyRecycleBin(): IdEntradaEscritorio[] {
    return this.deletePermanently(this.recycledIds());
  }

  pathTo(contenedor: IdContenedor): EntradaUsuario[] {
    const ruta: EntradaUsuario[] = [];
    const visitadas = new Set<string>();
    let actual: IdContenedor | undefined = contenedor;
    while (actual && esIdCarpetaUsuario(actual) && !visitadas.has(actual)) {
      visitadas.add(actual);
      const entrada = this.userEntry(actual);
      if (!entrada || entrada.kind !== 'folder') {
        break;
      }
      ruta.unshift(entrada);
      const padre: UbicacionEntrada | undefined = this.locations()[actual];
      actual = padre && padre !== 'deleted' ? padre : undefined;
    }
    return ruta;
  }

  descendantsOf(idCarpeta: IdCarpetaUsuario): IdEntradaEscritorio[] {
    const descendants: IdEntradaEscritorio[] = [];
    const visit = (contenedor: IdContenedor): void => {
      for (const id of this.idsIn(contenedor)) {
        descendants.push(id);
        const entrada = this.userEntry(id);
        if (entrada?.kind === 'folder') {
          visit(entrada.id);
        }
      }
    };
    visit(idCarpeta);
    return descendants;
  }

  reset(): void {
    const defaults = ubicacionesIniciales();
    this.registeredExperienceIds.forEach((id) => (defaults[id] = 'work-experience'));
    this.locations.set(defaults);
    this.userEntries.set({});
    this.recycleOrigins.set({});
    this.sortModes.set({});
    try {
      globalThis.localStorage?.removeItem(CLAVE_ALMACENAMIENTO);
      CLAVES_ALMACENAMIENTO_ANTERIORES.forEach((clave) => globalThis.localStorage?.removeItem(clave));
    } catch {
      // Reiniciar también las carpetas en memoria si el almacenamiento no está disponible.
    }
  }

  private addUserEntry(entrada: EntradaUsuario, requestedContainer: IdContenedor): void {
    const contenedor = this.isContainer(requestedContainer) ? requestedContainer : 'desktop';
    this.userEntries.update((entradas) => ({ ...entradas, [entrada.id]: entrada }));
    this.locations.update((ubicaciones) => ({ ...ubicaciones, [entrada.id]: contenedor }));
    this.persist();
  }

  private cloneUserEntry(
    origen: EntradaUsuario,
    destino: IdContenedor,
    makeUnique: boolean,
  ): IdEntradaUsuario {
    const children = origen.kind === 'folder' ? [...this.idsIn(origen.id)] : [];
    const ahora = Date.now();
    const nombre = makeUnique ? this.uniqueCopyName(destino, origen) : origen.name;
    const prefijo =
      origen.kind === 'folder'
        ? 'user-folder'
        : origen.kind === 'text-file'
          ? 'user-text'
          : 'user-image';
    const id = `${prefijo}-${this.newId()}` as IdEntradaUsuario;
    const copia =
      origen.kind === 'folder'
        ? ({ id, kind: 'folder', name: nombre, createdAt: ahora, updatedAt: ahora } as EntradaUsuario)
        : origen.kind === 'text-file'
          ? ({
            id,
            kind: 'text-file',
            name: nombre,
            content: origen.content,
            createdAt: ahora,
            updatedAt: ahora,
          } as EntradaUsuario)
          : ({ ...origen, id, name: nombre, createdAt: ahora, updatedAt: ahora } as EntradaUsuario);
    this.userEntries.update((entradas) => ({ ...entradas, [id]: copia }));
    this.locations.update((ubicaciones) => ({ ...ubicaciones, [id]: destino }));

    if (copia.kind === 'folder') {
      children.forEach((childId) => {
        const child = this.userEntry(childId);
        if (child) {
          this.cloneUserEntry(child, copia.id, false);
        }
      });
    }
    return id;
  }

  private uniqueCopyName(contenedor: IdContenedor, origen: EntradaUsuario): string {
    if (origen.kind === 'folder') {
      return this.uniqueName(contenedor, `${origen.name} - copia`);
    }
    const separator = origen.name.lastIndexOf('.');
    const stem = separator > 0 ? origen.name.slice(0, separator) : origen.name;
    const extension = separator > 0 ? origen.name.slice(separator) : '';
    return this.uniqueName(contenedor, `${stem} - copia${extension}`);
  }

  private uniqueName(contenedor: IdContenedor, requested: string, ignoredId?: IdEntradaUsuario): string {
    const existente = new Set(
      this.idsIn(contenedor)
        .filter((id) => id !== ignoredId)
        .map((id) => this.userEntry(id)?.name.toLocaleLowerCase())
        .filter((nombre): nombre is string => Boolean(nombre)),
    );
    if (!existente.has(requested.toLocaleLowerCase())) {
      return requested;
    }
    const separator = requested.lastIndexOf('.');
    const stem = separator > 0 ? requested.slice(0, separator) : requested;
    const extension = separator > 0 ? requested.slice(separator) : '';
    let suffix = 2;
    while (existente.has(`${stem} (${suffix})${extension}`.toLocaleLowerCase())) {
      suffix += 1;
    }
    return `${stem} (${suffix})${extension}`;
  }

  private cleanName(valor: string, alternativa: string): string {
    const cleaned = valor.replace(/[\\/:*?"<>|]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, 80);
    return cleaned || alternativa;
  }

  private ensureTextExtension(valor: string): string {
    const withoutTrailingDots = valor.replace(/[. ]+$/gu, '');
    return withoutTrailingDots.toLocaleLowerCase().endsWith('.txt')
      ? withoutTrailingDots
      : `${withoutTrailingDots}.txt`;
  }

  private ensureImageExtension(
    valor: string,
    tipoMime: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
  ): string {
    const extension =
      tipoMime === 'image/jpeg'
        ? '.jpg'
        : tipoMime === 'image/webp'
          ? '.webp'
          : tipoMime === 'image/gif'
            ? '.gif'
            : '.png';
    return valor.replace(/[. ]+$/gu, '').replace(/\.(png|jpe?g|webp|gif|bmp)$/iu, '') + extension;
  }

  private isDescendantContainer(destino: IdContenedor, idCarpeta: IdCarpetaUsuario): boolean {
    let actual: IdContenedor | undefined = destino;
    const visitadas = new Set<string>();
    while (actual && !visitadas.has(actual)) {
      if (actual === idCarpeta) {
        return true;
      }
      visitadas.add(actual);
      if (!esIdCarpetaUsuario(actual)) {
        return false;
      }
      const padre: UbicacionEntrada | undefined = this.locations()[actual];
      actual = padre && padre !== 'deleted' ? padre : undefined;
    }
    return false;
  }

  private newId(): string {
    this.idSequence += 1;
    const aleatorio = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${this.idSequence}`;
    return aleatorio.replaceAll('-', '');
  }

  private readStoredState(): EstadoSistemaArchivos {
    const empty: EstadoSistemaArchivos = {
      locations: ubicacionesIniciales(),
      recycleOrigins: {},
      userEntries: {},
      sortModes: {},
    };
    try {
      const valorGuardado =
        leerAlmacenamiento(CLAVE_ALMACENAMIENTO) ??
        CLAVES_ALMACENAMIENTO_ANTERIORES.map((clave) => leerAlmacenamiento(clave)).find(Boolean);
      if (!valorGuardado) {
        return empty;
      }
      const guardado = JSON.parse(valorGuardado) as Partial<SistemaArchivosGuardadoV6 | SistemaArchivosAnterior>;
      if (
        (guardado.version !== 1 &&
          guardado.version !== 2 &&
          guardado.version !== 3 &&
          guardado.version !== 4 &&
          guardado.version !== 5 &&
          guardado.version !== 6) ||
        !guardado.locations
      ) {
        return empty;
      }

      const entradasUsuario: Partial<Record<IdEntradaUsuario, EntradaUsuario>> = {};
      if (
        (guardado.version === 3 || guardado.version === 4 || guardado.version === 5 || guardado.version === 6) &&
        guardado.userEntries &&
        typeof guardado.userEntries === 'object'
      ) {
        for (const [id, candidate] of Object.entries(guardado.userEntries)) {
          if (
            esIdEntradaUsuario(id) &&
            candidate &&
            candidate.id === id &&
            typeof candidate.name === 'string' &&
            Number.isFinite(candidate.createdAt) &&
            Number.isFinite(candidate.updatedAt) &&
            ((esIdCarpetaUsuario(id) && candidate.kind === 'folder') ||
              (esIdTextoUsuario(id) &&
                candidate.kind === 'text-file' &&
                typeof candidate.content === 'string') ||
              ((guardado.version === 4 || guardado.version === 5 || guardado.version === 6) &&
                esIdImagenUsuario(id) &&
                candidate.kind === 'image-file' &&
                typeof candidate.dataUrl === 'string' &&
                candidate.dataUrl.length <= LONGITUD_MAXIMA_IMAGEN &&
                (candidate.mimeType === 'image/png' ||
                  candidate.mimeType === 'image/jpeg' ||
                  candidate.mimeType === 'image/webp' ||
                  candidate.mimeType === 'image/gif') &&
                Number.isFinite(candidate.width) &&
                Number.isFinite(candidate.height)))
          ) {
            entradasUsuario[id] = candidate;
          }
        }
      }

      const ubicaciones = ubicacionesIniciales();
      const validEntry = (id: string): id is IdEntradaEscritorio =>
        IDS_APLICACIONES.has(id as IdAplicacion) ||
        id === ID_CLIENTE_LEAGUE ||
        esIdArchivoAudio(id) ||
        esIdFotografia(id) ||
        experienciaDesdeDocumento(id) !== null ||
        Boolean(entradasUsuario[id as IdEntradaUsuario]);
      const validContainer = (ubicacion: string): ubicacion is UbicacionEntrada =>
        ubicacion === 'deleted' ||
        CONTENEDORES_SISTEMA.has(ubicacion as IdContenedor) ||
        entradasUsuario[ubicacion as IdEntradaUsuario]?.kind === 'folder';

      for (const [id, location] of Object.entries(guardado.locations)) {
        if (
          validEntry(id) &&
          typeof location === 'string' &&
          validContainer(location) &&
          !IDS_PROTEGIDOS_BORRADO.has(id)
        ) {
          ubicaciones[id] = location;
        }
      }

      const recycleOrigins: Partial<Record<IdEntradaEscritorio, IdContenedor>> = {};
      const sortModes: Partial<Record<IdContenedor, OrdenEscritorio>> = {};
      if (
        guardado.version === 3 ||
        guardado.version === 4 ||
        guardado.version === 5 ||
        guardado.version === 6
      ) {
        for (const [id, origin] of Object.entries(guardado.recycleOrigins ?? {})) {
          if (validEntry(id) && typeof origin === 'string' && validContainer(origin)) {
            recycleOrigins[id] = origin;
          }
        }
        for (const [container, mode] of Object.entries(guardado.sortModes ?? {})) {
          if (
            validContainer(container) &&
            container !== 'deleted' &&
            (mode === 'original' || mode === 'name' || mode === 'type' || mode === 'created')
          ) {
            sortModes[container] = mode;
          }
        }
      }
      return { locations: ubicaciones, recycleOrigins, userEntries: entradasUsuario, sortModes };
    } catch {
      return empty;
    }
  }

  private persist(): void {
    this.activity.pulse('files', 'write');
    try {
      const guardado: SistemaArchivosGuardadoV6 = {
        version: 6,
        locations: this.locations(),
        recycleOrigins: this.recycleOrigins(),
        userEntries: this.userEntries(),
        sortModes: this.sortModes(),
      };
      globalThis.localStorage?.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(guardado));
      CLAVES_ALMACENAMIENTO_ANTERIORES.forEach((clave) => globalThis.localStorage?.removeItem(clave));
    } catch {
      // Las carpetas siguen siendo utilizables aunque no puedan guardarse.
    }
  }
}
