import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { SobreMi } from '../../../applications/about/about';
import { Reproductor } from '../../../applications/audio-player/audio-player';
import { ServicioReproductor } from '../../../applications/audio-player/audio-player.service';
import { IDS_ARCHIVOS_AUDIO, MAPA_PISTAS, esIdArchivoAudio } from '../../../applications/audio-player/audio-catalog';
import { BlocFormacion } from '../../../applications/education-notepad/education-notepad';
import { DrpExplorer } from '../../../applications/drp-explorer/drp-explorer';
import { SesionExplorador } from '../../../applications/drp-explorer/drp-explorer-session.service';
import { BlocExperiencia } from '../../../applications/experience-notepad/experience-notepad';
import { ExploradorCarpetas } from '../../../applications/folder-explorer/folder-explorer';
import { FormularioOferta } from '../../../applications/job-offer/job-offer';
import { VisorImagen } from '../../../applications/image-viewer/image-viewer';
import { Buscaminas } from '../../../applications/minesweeper/minesweeper';
import { JuegoBuscaminas } from '../../../applications/minesweeper/minesweeper-game.service';
import { TablonMensajes } from '../../../applications/message-board/message-board';
import { AplicacionPaint } from '../../../applications/paint/paint';
import { DocumentosPaint } from '../../../applications/paint/paint-document.service';
import { SesionPaint } from '../../../applications/paint/paint-session.service';
import { VisorPdf } from '../../../applications/pdf-viewer/pdf-viewer';
import { Papelera } from '../../../applications/recycle-bin/recycle-bin';
import { Solitario } from '../../../applications/solitaire/solitaire';
import { JuegoSolitario } from '../../../applications/solitaire/solitaire-game.service';
import { AvisoCodigoFuente } from '../../../applications/source-code-message/source-code-message';
import { SesionTerminal } from '../../../applications/terminal/terminal-session.service';
import { Terminal } from '../../../applications/terminal/terminal';
import { BlocTexto } from '../../../applications/text-notepad/text-notepad';
import { AdministradorTareas } from '../../../applications/task-manager/task-manager';
import { Bienvenida } from '../../../applications/welcome/welcome';
import { ExperienciaLaboral } from '../../../applications/work-experience/work-experience';
import { Experiencia, DatosPortfolio } from '../../../core/models/portfolio.model';
import { DocumentosSesion } from '../../../core/services/document-session.service';
import { Localizacion } from '../../../core/services/localization.service';
import { ActividadSistema } from '../../../core/system-activity/system-activity.service';
import {
  MAPA_APLICACIONES,
} from '../../config/desktop-applications';
import { MAPA_FOTOGRAFIAS, esIdFotografia } from '../../config/photo-album';
import { URL_CODIGO_FUENTE } from '../../config/source-code.config';
import {
  IdArchivoAudio,
  AplicacionEscritorio,
  IdAplicacion,
  LimitesEscritorio,
  IdContenedor,
  EntradaEscritorio,
  IdEntradaEscritorio,
  OrdenEscritorio,
  ResultadoArrastreIcono,
  SeleccionIcono,
  PuntoEscritorio,
  EstadoVentana,
  OpcionMenuContextual,
  SolicitudContextoExplorador,
  ImagenVisualizable,
  IdEntradaUsuario,
  EntradaUsuario,
  IdTextoUsuario,
} from '../../models/desktop.models';
import { DistribucionEscritorio } from '../../services/desktop-layout.service';
import {
  TIPO_ARRASTRE_ENTRADA,
  SistemaArchivosEscritorio,
  ID_CLIENTE_LEAGUE,
  idDocumentoExperiencia,
  experienciaDesdeDocumento,
} from '../../services/desktop-file-system.service';
import { GestorVentanas } from '../../services/window-manager.service';
import { MenuContextual } from '../context-menu/context-menu';
import { IconoEscritorio } from '../desktop-icon/desktop-icon';
import { MenuInicio } from '../start-menu/start-menu';
import { BarraTareas } from '../taskbar/taskbar';
import { MarcoVentana } from '../window-frame/window-frame';

@Component({
  selector: 'app-desktop-shell',
  imports: [
    SobreMi,
    Reproductor,
    MenuContextual,
    IconoEscritorio,
    DrpExplorer,
    BlocFormacion,
    BlocExperiencia,
    ExploradorCarpetas,
    VisorImagen,
    FormularioOferta,
    TablonMensajes,
    Buscaminas,
    AplicacionPaint,
    VisorPdf,
    Papelera,
    Solitario,
    AvisoCodigoFuente,
    MenuInicio,
    BarraTareas,
    AdministradorTareas,
    Terminal,
    BlocTexto,
    Bienvenida,
    MarcoVentana,
    ExperienciaLaboral,
  ],
  templateUrl: './desktop-shell.html',
  styleUrl: './desktop-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Escritorio implements OnInit, AfterViewInit {
  readonly portfolio = input.required<DatosPortfolio>();

  @ViewChild('workspace', { static: true }) private workspace?: ElementRef<HTMLElement>;

  readonly windowManager = inject(GestorVentanas);
  readonly layout = inject(DistribucionEscritorio);
  readonly i18n = inject(Localizacion);
  readonly fileSystem = inject(SistemaArchivosEscritorio);
  private readonly documents = inject(DocumentosSesion);
  private readonly audioPlayer = inject(ServicioReproductor);
  private readonly drpExplorerSession = inject(SesionExplorador);
  private readonly terminalSession = inject(SesionTerminal);
  private readonly paintSession = inject(SesionPaint);
  private readonly paintDocuments = inject(DocumentosPaint);
  private readonly solitaireGame = inject(JuegoSolitario);
  private readonly minesweeperGame = inject(JuegoBuscaminas);
  private readonly systemActivity = inject(ActividadSistema);
  private readonly destroyRef = inject(DestroyRef);

  readonly desktopEntries = computed(() => this.entriesFor(this.fileSystem.desktopIds(), 'desktop'));
  readonly folderEntries = computed(() =>
    this.entriesFor(this.fileSystem.workExperienceIds(), 'work-experience'),
  );
  readonly recycledEntries = computed(() =>
    this.entriesFor(this.fileSystem.recycledIds(), 'recycle-bin'),
  );
  readonly musicEntries = computed(() => this.entriesFor(this.fileSystem.idsIn('music'), 'music'));
  readonly photoEntries = computed(() =>
    this.entriesFor(this.fileSystem.idsIn('photo-album'), 'photo-album'),
  );
  readonly availableAudioTrackIds = computed(() =>
    IDS_ARCHIVOS_AUDIO.filter((id) => {
      const ubicacion = this.fileSystem.locationOf(id);
      return ubicacion !== 'deleted' && ubicacion !== 'recycle-bin';
    }),
  );
  readonly selectedIconIds = signal<ReadonlySet<string>>(new Set());
  readonly contextMenu = signal<{
    x: number;
    y: number;
    anchorX: number;
    anchorY: number;
    container: IdContenedor;
    ids: IdEntradaEscritorio[];
  } | null>(null);
  readonly clipboard = signal<{ mode: 'cut' | 'copy'; ids: IdEntradaEscritorio[] } | null>(null);
  readonly renameDialog = signal<{ id: IdEntradaUsuario; value: string } | null>(null);
  readonly propertiesDialog = signal<{ title: string; rows: { label: string; value: string }[] } | null>(
    null,
  );
  readonly confirmationDialog = signal<{
    title: string;
    message: string;
    action: 'trash' | 'permanent' | 'empty';
    ids: IdEntradaEscritorio[];
  } | null>(null);
  readonly noticeDialog = signal<{ title: string; message: string } | null>(null);
  readonly selectionBox = signal<{ x: number; y: number; width: number; height: number } | null>(
    null,
  );
  readonly iconDragPreview = signal<{
    anchorId: IdEntradaEscritorio;
    ids: ReadonlySet<string>;
    offset: PuntoEscritorio;
  } | null>(null);
  readonly startMenuOpen = signal(false);
  readonly restartPhase = signal<'idle' | 'shutting-down' | 'booting'>('idle');
  readonly mobile = signal(false);
  readonly bounds = signal<LimitesEscritorio>({ width: 1280, height: 672 });
  readonly localizedPortfolio = computed(() => this.i18n.localizePortfolio(this.portfolio()));
  readonly contextMenuItems = computed(() => this.buildContextMenuItems());

  private resizeObserver?: ResizeObserver;
  private readonly restartTimers: number[] = [];
  private longPressTimer?: number;
  private longPressStart?: PuntoEscritorio;
  private selectionAnchorId: string | null = null;
  private selectionStart: {
    pointer: PuntoEscritorio;
    retained: ReadonlySet<string>;
    moved: boolean;
    pointerId: number;
  } | null = null;

  ngOnInit(): void {
    this.fileSystem.registerExperienceDocuments(
      this.portfolio().experiences.map((experiencia) => experiencia.id),
    );
    this.paintDocuments.connectVirtualFileAdapter({
      open: async (ruta) => {
        const archivo = Object.values(this.fileSystem.userEntries()).find(
          (entrada) => entrada?.kind === 'image-file' && entrada.name === ruta,
        );
        return archivo?.kind === 'image-file' ? (await fetch(archivo.dataUrl)).blob() : null;
      },
      save: async (solicitud) => {
        const resultado = this.fileSystem.saveImageFile(
          solicitud.existingId,
          'desktop',
          solicitud.path,
          await this.blobToDataUrl(solicitud.contents),
          'image/png',
          solicitud.width,
          solicitud.height,
        );
        if (resultado.created && !this.mobile()) {
          this.layout.colocarIconosNuevos(
            [resultado.id],
            { x: 158, y: 128 },
            this.bounds(),
            this.fileSystem.desktopIds(),
          );
        }
        this.windowManager.actualizarTitulo('paint', `${resultado.name} - Paint 98`);
        return resultado;
      },
    });
  }

  ngAfterViewInit(): void {
    this.measureWorkspace();
    this.mobile.set(globalThis.matchMedia?.('(max-width: 640px)').matches ?? false);
    this.destroyRef.onDestroy(() => {
      this.restartTimers.forEach((temporizador) => globalThis.clearTimeout(temporizador));
      if (this.longPressTimer) {
        globalThis.clearTimeout(this.longPressTimer);
      }
    });

    if (typeof ResizeObserver !== 'undefined' && this.workspace) {
      this.resizeObserver = new ResizeObserver(() => this.measureWorkspace());
      this.resizeObserver.observe(this.workspace.nativeElement);
      this.destroyRef.onDestroy(() => this.resizeObserver?.disconnect());
    } else {
      const listener = () => this.measureWorkspace();
      globalThis.addEventListener?.('resize', listener);
      this.destroyRef.onDestroy(() => globalThis.removeEventListener?.('resize', listener));
    }

    const hasAdminActivation = new URLSearchParams(
      (globalThis.location?.hash ?? '').replace(/^#/u, ''),
    ).has('message-board-admin');
    const initialApplication = MAPA_APLICACIONES.get(
      hasAdminActivation ? 'message-board' : 'welcome',
    );
    if (initialApplication) {
      this.windowManager.abrir(initialApplication, this.bounds());
    }
  }

  externalUrl(entrada: EntradaEscritorio): string | null {
    if (entrada.applicationId === 'linkedin') {
      return this.portfolio().profile.linkedInUrl;
    }
    if (entrada.applicationId === 'source-code') {
      return URL_CODIGO_FUENTE;
    }
    return null;
  }

  launchEntry(entrada: EntradaEscritorio): void {
    this.selectedIconIds.set(new Set([entrada.id]));
    this.selectionAnchorId = entrada.id;

    if (esIdArchivoAudio(entrada.id)) {
      const ubicacion = this.fileSystem.locationOf(entrada.id);
      const hermanos = ubicacion && ubicacion !== 'deleted'
        ? this.fileSystem.idsIn(ubicacion).filter((id): id is IdArchivoAudio => esIdArchivoAudio(id))
        : [entrada.id];
      void this.audioPlayer.playFolderTrack(entrada.id, hermanos);
      this.launch('audio-player');
      return;
    }

    if (esIdFotografia(entrada.id)) {
      const archivo = MAPA_FOTOGRAFIAS.get(entrada.id);
      if (archivo) this.openImageFile(archivo);
      return;
    }

    const entradaUsuario = this.fileSystem.userEntry(entrada.id);
    if (entradaUsuario?.kind === 'folder') {
      this.openUserFolder(entradaUsuario);
      return;
    }
    if (entradaUsuario?.kind === 'text-file') {
      this.openUserTextFile(entradaUsuario);
      return;
    }
    if (entradaUsuario?.kind === 'image-file') {
      this.openUserImageFile(entradaUsuario);
      return;
    }

    if (entrada.experienceId !== undefined) {
      const experiencia = this.localizedPortfolio().experiences.find(
        (candidato) => candidato.id === entrada.experienceId,
      );
      if (experiencia) {
        this.openExperience(experiencia);
      }
      return;
    }

    if (entrada.applicationId) {
      this.launch(entrada.applicationId);
    }
  }

  launch(applicationOrId: AplicacionEscritorio | IdAplicacion): void {
    const aplicacion =
      typeof applicationOrId === 'string'
        ? MAPA_APLICACIONES.get(applicationOrId)
        : applicationOrId;
    if (!aplicacion) {
      return;
    }

    this.startMenuOpen.set(false);
    this.closeContextMenu();
    this.selectedIconIds.set(new Set([aplicacion.id]));
    this.selectionAnchorId = aplicacion.id;

    if (aplicacion.id === 'linkedin') {
      this.openExternal(this.portfolio().profile.linkedInUrl);
      return;
    }

    if (aplicacion.id === 'source-code') {
      if (URL_CODIGO_FUENTE) {
        this.openExternal(URL_CODIGO_FUENTE);
      } else {
        const mensaje = MAPA_APLICACIONES.get('source-code-message');
        if (mensaje) {
          this.windowManager.abrir(mensaje, this.bounds());
        }
      }
      return;
    }

    this.windowManager.abrir(aplicacion, this.bounds());
  }

  toggleStartMenu(): void {
    this.closeContextMenu();
    this.startMenuOpen.update((open) => !open);
  }

  openExperience(experiencia: Experiencia): void {
    const aplicacion = MAPA_APLICACIONES.get('experience-notepad');
    if (!aplicacion) {
      return;
    }

    this.windowManager.abrir(aplicacion, this.bounds(), {
      windowId: idDocumentoExperiencia(experiencia.id),
      title: `${experiencia.company.replaceAll(' ', '_')}.txt - Notepad`,
      payload: { experienceId: experiencia.id },
    });
  }

  openUserFolder(folder: Extract<EntradaUsuario, { kind: 'folder' }>): void {
    const aplicacion = MAPA_APLICACIONES.get('virtual-folder');
    if (!aplicacion) {
      return;
    }
    this.windowManager.abrir(aplicacion, this.bounds(), {
      windowId: folder.id,
      title: folder.name,
      payload: { folderId: folder.id },
    });
  }

  openUserTextFile(archivo: Extract<EntradaUsuario, { kind: 'text-file' }>): void {
    const aplicacion = MAPA_APLICACIONES.get('text-notepad');
    if (!aplicacion) {
      return;
    }
    this.windowManager.abrir(aplicacion, this.bounds(), {
      windowId: archivo.id,
      title: `${archivo.name} - Notepad`,
      payload: { fileId: archivo.id },
    });
  }

  openUserImageFile(archivo: Extract<EntradaUsuario, { kind: 'image-file' }>): void {
    this.openImageFile({ ...archivo, source: archivo.dataUrl });
  }

  openImageFile(archivo: ImagenVisualizable): void {
    const aplicacion = MAPA_APLICACIONES.get('image-viewer');
    if (!aplicacion) {
      return;
    }
    this.windowManager.abrir(aplicacion, this.bounds(), {
      windowId: archivo.id,
      title: `${archivo.name} - Image Viewer`,
      payload: { imageFileId: archivo.id },
    });
  }

  userFolderFor(
    estadoVentana: EstadoVentana,
  ): Extract<EntradaUsuario, { kind: 'folder' }> | undefined {
    const entrada = estadoVentana.payload?.folderId
      ? this.fileSystem.userEntry(estadoVentana.payload.folderId)
      : undefined;
    return entrada?.kind === 'folder' ? entrada : undefined;
  }

  userTextFileFor(
    estadoVentana: EstadoVentana,
  ): Extract<EntradaUsuario, { kind: 'text-file' }> | undefined {
    const entrada = estadoVentana.payload?.fileId
      ? this.fileSystem.userEntry(estadoVentana.payload.fileId)
      : undefined;
    return entrada?.kind === 'text-file' ? entrada : undefined;
  }

  userImageFileFor(
    estadoVentana: EstadoVentana,
  ): Extract<EntradaUsuario, { kind: 'image-file' }> | undefined {
    const entrada = estadoVentana.payload?.imageFileId
      ? this.fileSystem.userEntry(estadoVentana.payload.imageFileId)
      : undefined;
    return entrada?.kind === 'image-file' ? entrada : undefined;
  }

  imageFilesFor(estadoVentana: EstadoVentana): readonly ImagenVisualizable[] {
    const initialId = estadoVentana.payload?.imageFileId;
    if (!initialId) return [];
    const initialFile = this.viewableImageFile(initialId);
    if (!initialFile) return [];
    const ubicacion = this.fileSystem.locationOf(initialId);
    if (!ubicacion || ubicacion === 'deleted' || initialFile.mimeType !== 'image/png') {
      return [initialFile];
    }
    return this.entriesForContainer(ubicacion)
      .filter((entrada) => entrada.kind === 'image-file')
      .map((entrada) => this.viewableImageFile(entrada.id))
      .filter((archivo): archivo is ImagenVisualizable => archivo?.mimeType === 'image/png');
  }

  updateImageViewerTitle(idVentana: string, archivo: ImagenVisualizable): void {
    this.windowManager.actualizarTitulo(idVentana, `${archivo.name} - Image Viewer`);
  }

  entriesForContainer(contenedor: IdContenedor): EntradaEscritorio[] {
    return this.entriesFor(this.fileSystem.idsIn(contenedor), contenedor);
  }

  folderPath(contenedor: IdContenedor): string {
    if (contenedor === 'work-experience') {
      return this.i18n.t('explorer.workPath');
    }
    if (contenedor === 'desktop') {
      return 'C:\\Portfolio';
    }
    if (contenedor === 'music') {
      return 'C:\\Música';
    }
    if (contenedor === 'photo-album') {
      return 'C:\\Álbum de fotos';
    }
    if (contenedor === 'recycle-bin') {
      return this.i18n.t('recycle.path');
    }
    const ruta = this.fileSystem.pathTo(contenedor);
    const rootParent = ruta[0] ? this.fileSystem.locationOf(ruta[0].id) : 'desktop';
    const base =
      rootParent === 'work-experience'
        ? this.i18n.t('explorer.workPath')
        : rootParent === 'music'
          ? 'C:\\Música'
        : rootParent === 'photo-album'
          ? 'C:\\Álbum de fotos'
        : 'C:\\Portfolio';
    return `${base}\\${ruta.map((entrada) => entrada.name).join('\\')}`;
  }

  openParentFolder(estadoVentana: EstadoVentana): void {
    const idCarpeta = estadoVentana.payload?.folderId;
    if (!idCarpeta) {
      return;
    }
    const padre = this.fileSystem.locationOf(idCarpeta);
    this.windowManager.cerrar(estadoVentana.id);
    if (padre === 'work-experience') {
      this.launch('work-experience');
    } else if (padre === 'music') {
      this.launch('music-folder');
    } else if (padre === 'photo-album') {
      this.launch('photo-album');
    } else if (padre && padre !== 'desktop' && padre !== 'recycle-bin' && padre !== 'deleted') {
      const parentFolder = this.fileSystem.userEntry(padre);
      if (parentFolder?.kind === 'folder') {
        this.openUserFolder(parentFolder);
      }
    }
  }

  writeUserTextFile(change: { id: IdTextoUsuario; content: string }): void {
    this.fileSystem.writeTextFile(change.id, change.content);
  }

  experienceFor(estadoVentana: EstadoVentana): Experiencia | undefined {
    return this.localizedPortfolio().experiences.find(
      (experiencia) => experiencia.id === estadoVentana.payload?.experienceId,
    );
  }

  completeIconDrag(id: IdEntradaEscritorio, resultado: ResultadoArrastreIcono): void {
    const identificadores = this.draggedIconIds(id);
    const destino = this.dropDestinationAt(resultado.clientPosition, id);
    if (destino && destino !== 'desktop') {
      this.moveEntries(identificadores as IdEntradaEscritorio[], destino);
      this.iconDragPreview.set(null);
      return;
    }

    this.layout.moverIconos(identificadores, id, resultado.position, this.bounds(), this.fileSystem.desktopIds());
    this.selectedIconIds.set(new Set(identificadores));
    this.selectionAnchorId = id;
    this.iconDragPreview.set(null);
  }

  previewIconDrag(id: IdEntradaEscritorio, desplazamiento: PuntoEscritorio | null): void {
    if (!desplazamiento) {
      this.iconDragPreview.set(null);
      return;
    }
    this.iconDragPreview.set({
      anchorId: id,
      ids: new Set(this.draggedIconIds(id)),
      offset: desplazamiento,
    });
  }

  groupDragOffsetFor(id: IdEntradaEscritorio): PuntoEscritorio | null {
    const preview = this.iconDragPreview();
    return preview && preview.anchorId !== id && preview.ids.has(id) ? preview.offset : null;
  }

  private draggedIconIds(id: IdEntradaEscritorio): IdEntradaEscritorio[] {
    const seleccionado = this.selectedIconIds();
    if (!seleccionado.has(id)) {
      return [id];
    }
    return this.fileSystem
      .desktopIds()
      .filter((desktopId): desktopId is IdEntradaEscritorio => seleccionado.has(desktopId));
  }

  selectIcon(seleccion: SeleccionIcono): void {
    const actual = new Set(this.selectedIconIds());

    if (seleccion.range && this.selectionAnchorId) {
      const entradas = this.desktopEntries();
      const anchorIndex = entradas.findIndex(
        (entrada) => entrada.id === this.selectionAnchorId,
      );
      const indiceDestino = entradas.findIndex(
        (entrada) => entrada.id === seleccion.id,
      );
      if (anchorIndex >= 0 && indiceDestino >= 0) {
        const range = entradas
          .slice(Math.min(anchorIndex, indiceDestino), Math.max(anchorIndex, indiceDestino) + 1)
          .map((entrada) => entrada.id);
        const siguiente = seleccion.additive ? actual : new Set<string>();
        range.forEach((id) => siguiente.add(id));
        this.selectedIconIds.set(siguiente);
        return;
      }
    }

    if (seleccion.additive) {
      if (actual.has(seleccion.id)) {
        actual.delete(seleccion.id);
      } else {
        actual.add(seleccion.id);
      }
      this.selectedIconIds.set(actual);
    } else {
      this.selectedIconIds.set(new Set([seleccion.id]));
    }
    this.selectionAnchorId = seleccion.id;
  }

  moveWindow(idVentana: string, posicion: PuntoEscritorio): void {
    this.windowManager.mover(idVentana, posicion, this.bounds());
  }

  closeWindow(idVentana: string): void {
    const destino = this.windowManager.ventanas().find((estadoVentana) => estadoVentana.id === idVentana);
    if (destino?.applicationId === 'audio-player') this.audioPlayer.close();
    this.windowManager.cerrar(idVentana);
  }

  restartComputer(): void {
    if (this.restartPhase() !== 'idle') {
      return;
    }

    this.restartPhase.set('shutting-down');
    this.audioPlayer.close();
    this.startMenuOpen.set(false);
    this.selectedIconIds.set(new Set());
    this.selectionAnchorId = null;
    this.selectionStart = null;
    this.selectionBox.set(null);
    this.windowManager.reiniciar();

    this.restartTimers.push(
      globalThis.setTimeout(() => this.restartPhase.set('booting'), 850),
      globalThis.setTimeout(() => this.finishRestart(), 2600),
    );
  }

  private finishRestart(): void {
    this.layout.reiniciar();
    this.fileSystem.reset();
    this.documents.reset();
    this.drpExplorerSession.reset();
    this.audioPlayer.reset();
    this.terminalSession.reset();
    this.paintSession.reset();
    this.solitaireGame.reset();
    this.minesweeperGame.reset();
    this.systemActivity.reset();
    this.windowManager.reiniciar();
    if (!this.mobile()) {
      this.layout.ajustarAlEscritorio(this.bounds(), false, this.fileSystem.desktopIds());
    }
    this.startMenuOpen.set(false);
    this.contextMenu.set(null);
    this.clipboard.set(null);
    this.renameDialog.set(null);
    this.propertiesDialog.set(null);
    this.confirmationDialog.set(null);
    this.noticeDialog.set(null);
    this.selectedIconIds.set(new Set());
    this.selectionAnchorId = null;
    const welcome = MAPA_APLICACIONES.get('welcome');
    if (welcome) {
      this.windowManager.abrir(welcome, this.bounds());
    }
    this.restartPhase.set('idle');
  }

  onWorkspacePointerDown(evento: PointerEvent): void {
    const destino = evento.target;
    this.closeContextMenu();
    this.startMenuOpen.set(false);
    if (
      this.mobile() &&
      evento.pointerType === 'touch' &&
      destino instanceof Element &&
      !destino.closest('textarea, input, [contenteditable="true"], app-taskbar, app-start-menu')
    ) {
      this.startLongPress(evento, destino);
    }
    if (!(destino instanceof Element) || destino.closest('app-desktop-icon')) {
      return;
    }

    const keepSelection = evento.ctrlKey || evento.metaKey || evento.shiftKey;
    if (!keepSelection) {
      this.selectedIconIds.set(new Set());
      this.selectionAnchorId = null;
    }

    if (
      this.mobile() ||
      evento.button !== 0 ||
      destino.closest('app-window-frame') ||
      destino.closest('app-start-menu') ||
      destino.closest('app-taskbar')
    ) {
      return;
    }

    const areaTrabajo = this.workspace?.nativeElement;
    if (!areaTrabajo) {
      return;
    }
    const rectangulo = areaTrabajo.getBoundingClientRect();
    this.selectionStart = {
      pointer: { x: evento.clientX - rectangulo.left, y: evento.clientY - rectangulo.top },
      retained: keepSelection ? new Set(this.selectedIconIds()) : new Set(),
      moved: false,
      pointerId: evento.pointerId,
    };
    areaTrabajo.setPointerCapture?.(evento.pointerId);
  }

  onWorkspacePointerMove(evento: PointerEvent): void {
    if (
      this.longPressStart &&
      Math.hypot(evento.clientX - this.longPressStart.x, evento.clientY - this.longPressStart.y) > 8
    ) {
      this.cancelLongPress();
    }
    if (!this.selectionStart || evento.pointerId !== this.selectionStart.pointerId) {
      return;
    }

    const areaTrabajo = this.workspace?.nativeElement;
    if (!areaTrabajo) {
      return;
    }
    const rectangulo = areaTrabajo.getBoundingClientRect();
    const actual = { x: evento.clientX - rectangulo.left, y: evento.clientY - rectangulo.top };
    if (
      !this.selectionStart.moved &&
      Math.hypot(
        actual.x - this.selectionStart.pointer.x,
        actual.y - this.selectionStart.pointer.y,
      ) < 4
    ) {
      return;
    }

    this.selectionStart.moved = true;
    const box = {
      x: Math.min(this.selectionStart.pointer.x, actual.x),
      y: Math.min(this.selectionStart.pointer.y, actual.y),
      width: Math.abs(actual.x - this.selectionStart.pointer.x),
      height: Math.abs(actual.y - this.selectionStart.pointer.y),
    };
    this.selectionBox.set(box);

    const siguiente = new Set(this.selectionStart.retained);
    for (const entrada of this.desktopEntries()) {
      const posicion = this.layout.positions()[entrada.id];
      if (
        posicion &&
        posicion.x < box.x + box.width &&
        posicion.x + 110 > box.x &&
        posicion.y < box.y + box.height &&
        posicion.y + 108 > box.y
      ) {
        siguiente.add(entrada.id);
      }
    }
    this.selectedIconIds.set(siguiente);
  }

  onWorkspacePointerUp(evento: PointerEvent): void {
    this.cancelLongPress();
    if (!this.selectionStart || evento.pointerId !== this.selectionStart.pointerId) {
      return;
    }

    const areaTrabajo = this.workspace?.nativeElement;
    if (areaTrabajo?.hasPointerCapture?.(evento.pointerId)) {
      areaTrabajo.releasePointerCapture(evento.pointerId);
    }
    this.selectionStart = null;
    this.selectionBox.set(null);
  }

  onWorkspaceDragOver(evento: DragEvent): void {
    if (Array.from(evento.dataTransfer?.types ?? []).includes(TIPO_ARRASTRE_ENTRADA)) {
      evento.preventDefault();
      if (evento.dataTransfer) {
        evento.dataTransfer.dropEffect = 'move';
      }
    }
  }

  onWorkspaceDrop(evento: DragEvent): void {
    const valorGuardado = evento.dataTransfer?.getData(TIPO_ARRASTRE_ENTRADA);
    if (!valorGuardado) {
      return;
    }

    evento.preventDefault();
    const identificadores = this.parseDraggedIds(valorGuardado);
    if (identificadores.length === 0) {
      return;
    }

    const elementoDestino = evento.target instanceof Element ? evento.target : null;
    const destino = this.containerFromElement(elementoDestino) ?? 'desktop';
    if (destino === 'desktop' && elementoDestino?.closest('app-window-frame')) {
      return;
    }

    this.moveEntries(identificadores, destino);
    if (destino === 'desktop') {
      const areaTrabajo = this.workspace?.nativeElement;
      const rectangulo = areaTrabajo?.getBoundingClientRect();
      const posicion = {
        x: Math.max(0, evento.clientX - (rectangulo?.left ?? 0) - 55),
        y: Math.max(0, evento.clientY - (rectangulo?.top ?? 0) - 48),
      };
      identificadores.forEach((id, indice) =>
        this.layout.moverIcono(
          id,
          { x: posicion.x + indice * 12, y: posicion.y + indice * 12 },
          this.bounds(),
          this.fileSystem.desktopIds(),
        ),
      );
    }
  }

  moveEntries(identificadores: readonly IdEntradaEscritorio[], destino: IdContenedor): void {
    if (
      destino !== 'recycle-bin' &&
      identificadores.includes(ID_CLIENTE_LEAGUE) &&
      this.fileSystem.locationOf(ID_CLIENTE_LEAGUE) === 'recycle-bin'
    ) {
      this.showLeagueRestoreNotice();
    }
    const movido = this.fileSystem.move(identificadores, destino);
    if (destino === 'recycle-bin') {
      movido.flatMap((id) => {
        const entrada = this.fileSystem.userEntry(id);
        return entrada?.kind === 'folder' ? [id, ...this.fileSystem.descendantsOf(entrada.id)] : [id];
      }).forEach((id) => this.closeWindow(id));
    }
    if (!this.mobile()) {
      this.layout.ajustarAlEscritorio(this.bounds(), true, this.fileSystem.desktopIds());
    }
    this.selectedIconIds.set(new Set());
    this.selectionAnchorId = null;
  }

  restoreEntries(identificadores: readonly IdEntradaEscritorio[]): void {
    const attemptedLeagueRestore = identificadores.includes(ID_CLIENTE_LEAGUE);
    const restaurado = this.fileSystem.restore(
      identificadores.filter((id) => id !== ID_CLIENTE_LEAGUE),
    );
    if (restaurado.length > 0 && !this.mobile()) {
      this.layout.ajustarAlEscritorio(this.bounds(), true, this.fileSystem.desktopIds());
    }
    if (attemptedLeagueRestore) {
      this.showLeagueRestoreNotice();
    }
  }

  showLeagueRestoreNotice(): void {
    this.noticeDialog.set({
      title: 'LeagueClient.exe',
      message: 'LeagueClient.exe está bien donde está.',
    });
  }

  onWorkspaceContextMenu(evento: MouseEvent): void {
    const destino = evento.target instanceof Element ? evento.target : null;
    if (
      !destino ||
      destino.closest('textarea, input, [contenteditable="true"], app-terminal, app-taskbar, app-start-menu')
    ) {
      return;
    }

    const icono = destino.closest<HTMLElement>('[data-desktop-entry-id]');
    const iconId = icono?.dataset['desktopEntryId'];
    const iconLocation =
      iconId && this.fileSystem.isManagedEntry(iconId) ? this.fileSystem.locationOf(iconId) : undefined;
    const contenedor =
      iconLocation && iconLocation !== 'deleted'
        ? iconLocation
        : (this.containerFromElement(destino) ?? 'desktop');
    if (destino.closest('app-window-frame') && contenedor === 'desktop') {
      return;
    }

    evento.preventDefault();
    const id = iconId;
    let identificadores: IdEntradaEscritorio[] = [];
    if (id && this.fileSystem.isManagedEntry(id)) {
      if (!this.selectedIconIds().has(id)) {
        this.selectedIconIds.set(new Set([id]));
        this.selectionAnchorId = id;
      }
      identificadores = [...this.selectedIconIds()].filter((entryId): entryId is IdEntradaEscritorio =>
        this.fileSystem.isManagedEntry(entryId),
      );
    } else {
      this.selectedIconIds.set(new Set());
      this.selectionAnchorId = null;
    }
    this.openContextMenu(evento, contenedor, identificadores);
  }

  onExplorerContext(solicitud: SolicitudContextoExplorador): void {
    this.openContextMenu(solicitud.event, solicitud.container, solicitud.ids);
  }

  onWorkspaceKeyDown(evento: KeyboardEvent): void {
    if (evento.key !== 'ContextMenu' && !(evento.shiftKey && evento.key === 'F10')) {
      return;
    }
    const destino = evento.target instanceof Element ? evento.target : null;
    const icono = destino?.closest<HTMLElement>('[data-desktop-entry-id]');
    const id = icono?.dataset['desktopEntryId'];
    const rectangulo = icono?.getBoundingClientRect();
    evento.preventDefault();
    const identificadores = id && this.fileSystem.isManagedEntry(id) ? [id] : [];
    const ubicacion = identificadores[0] ? this.fileSystem.locationOf(identificadores[0]) : undefined;
    const contenedor = ubicacion && ubicacion !== 'deleted' ? ubicacion : 'desktop';
    this.openContextMenuAt(rectangulo?.left ?? 24, rectangulo?.bottom ?? 24, contenedor, identificadores);
  }

  closeContextMenu(): void {
    this.contextMenu.set(null);
  }

  performContextAction(accion: string): void {
    const menu = this.contextMenu();
    if (!menu) {
      return;
    }
    const destino = this.contextDestination(menu);
    this.closeContextMenu();

    if (accion === 'new-folder' || accion === 'new-text') {
      const id =
        accion === 'new-folder'
          ? this.fileSystem.createFolder(menu.container, this.i18n.t('filesystem.newFolder'))
          : this.fileSystem.createTextFile(menu.container, this.i18n.t('filesystem.newText'));
      this.positionCreatedEntries([id], menu);
      this.requestRename(id);
      return;
    }
    if (accion === 'paste') {
      this.pasteClipboard(destino, menu);
      return;
    }
    if (accion.startsWith('sort-')) {
      this.sortContainer(menu.container, accion.slice(5) as OrdenEscritorio);
      return;
    }
    if (accion === 'align' || accion === 'refresh') {
      if (menu.container === 'desktop') {
        this.layout.ordenar(
          this.desktopEntries().map((entrada) => entrada.id),
          this.bounds(),
        );
      }
      return;
    }
    if (accion === 'open' || accion === 'edit') {
      const entrada = this.entryById(menu.ids[0], menu.container);
      if (entrada) {
        this.launchEntry(entrada);
      }
      return;
    }
    if (accion === 'cut' || accion === 'copy') {
      this.clipboard.set({ mode: accion, ids: menu.ids });
      return;
    }
    if (accion === 'rename') {
      const id = menu.ids[0];
      if (id && this.fileSystem.isUserEntry(id)) {
        this.requestRename(id);
      }
      return;
    }
    if (accion === 'delete') {
      this.confirmationDialog.set({
        title: this.i18n.t('dialog.deleteTitle'),
        message: this.i18n.t('dialog.deleteMessage'),
        action: 'trash',
        ids: menu.ids,
      });
      return;
    }
    if (accion === 'restore') {
      this.restoreEntries(menu.ids);
      return;
    }
    if (accion === 'delete-permanent') {
      this.confirmationDialog.set({
        title: this.i18n.t('dialog.permanentDeleteTitle'),
        message: this.i18n.t('dialog.permanentDeleteMessage'),
        action: 'permanent',
        ids: menu.ids,
      });
      return;
    }
    if (accion === 'empty-recycle') {
      this.requestEmptyRecycleBin();
      return;
    }
    if (accion === 'properties') {
      this.showProperties(menu.container, menu.ids);
      return;
    }
    if (accion.startsWith('send:')) {
      const destino = accion.slice(5);
      if (this.fileSystem.isContainer(destino)) {
        this.moveEntries(menu.ids, destino);
      }
    }
  }

  updateRenameValue(evento: Event): void {
    const dialogo = this.renameDialog();
    if (dialogo) {
      this.renameDialog.set({ ...dialogo, value: (evento.target as HTMLInputElement).value });
    }
  }

  commitRename(evento?: Event): void {
    evento?.preventDefault();
    const dialogo = this.renameDialog();
    if (!dialogo) {
      return;
    }
    const renamed = this.fileSystem.rename(dialogo.id, dialogo.value);
    if (renamed) {
      const titulo =
        renamed.kind === 'text-file'
          ? `${renamed.name} - Notepad`
          : renamed.kind === 'image-file'
            ? `${renamed.name} - Image Viewer`
            : renamed.name;
      this.windowManager.actualizarTitulo(
        renamed.id,
        titulo,
      );
    }
    this.renameDialog.set(null);
  }

  requestEmptyRecycleBin(): void {
    if (this.fileSystem.recycledIds().length === 0) {
      return;
    }
    this.confirmationDialog.set({
      title: this.i18n.t('dialog.emptyRecycleTitle'),
      message: this.i18n.t('dialog.emptyRecycleMessage'),
      action: 'empty',
      ids: [],
    });
  }

  confirmPendingAction(): void {
    const confirmation = this.confirmationDialog();
    if (!confirmation) {
      return;
    }
    if (confirmation.action === 'trash') {
      this.moveEntries(confirmation.ids, 'recycle-bin');
    } else {
      const eliminado =
        confirmation.action === 'empty'
          ? this.fileSystem.emptyRecycleBin()
          : this.fileSystem.deletePermanently(confirmation.ids);
      eliminado.forEach((id) => this.closeWindow(id));
      this.layout.olvidar(eliminado);
      this.clipboard.update((portapapeles) =>
        portapapeles && portapapeles.ids.some((id) => eliminado.includes(id)) ? null : portapapeles,
      );
      if (eliminado.includes(ID_CLIENTE_LEAGUE)) {
        this.noticeDialog.set({
          title: 'LeagueClient.exe',
          message: 'Has hecho lo correcto.',
        });
      }
    }
    this.confirmationDialog.set(null);
  }

  private openContextMenu(
    evento: MouseEvent,
    contenedor: IdContenedor,
    identificadores: IdEntradaEscritorio[],
  ): void {
    this.openContextMenuAt(evento.clientX, evento.clientY, contenedor, identificadores);
  }

  private startLongPress(evento: PointerEvent, destino: Element): void {
    this.cancelLongPress();
    this.longPressStart = { x: evento.clientX, y: evento.clientY };
    const icono = destino.closest<HTMLElement>('[data-desktop-entry-id]');
    const id = icono?.dataset['desktopEntryId'];
    this.longPressTimer = globalThis.setTimeout(() => {
      const identificadores = id && this.fileSystem.isManagedEntry(id) ? [id] : [];
      const ubicacion = identificadores[0] ? this.fileSystem.locationOf(identificadores[0]) : undefined;
      const contenedor =
        ubicacion && ubicacion !== 'deleted'
          ? ubicacion
          : (this.containerFromElement(destino) ?? 'desktop');
      this.openContextMenuAt(evento.clientX, evento.clientY, contenedor, identificadores);
      this.longPressTimer = undefined;
      this.longPressStart = undefined;
    }, 650);
  }

  private cancelLongPress(): void {
    if (this.longPressTimer) {
      globalThis.clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
    this.longPressStart = undefined;
  }

  private openContextMenuAt(
    clientX: number,
    clientY: number,
    contenedor: IdContenedor,
    identificadores: IdEntradaEscritorio[],
  ): void {
    const x = Math.max(4, Math.min(clientX, (globalThis.innerWidth || 1280) - 244));
    const y = Math.max(4, Math.min(clientY, (globalThis.innerHeight || 720) - 330));
    this.startMenuOpen.set(false);
    this.contextMenu.set({ x, y, anchorX: clientX, anchorY: clientY, container: contenedor, ids: identificadores });
  }

  private buildContextMenuItems(): OpcionMenuContextual[] {
    const menu = this.contextMenu();
    if (!menu) {
      return [];
    }
    if (menu.ids.length === 0) {
      if (menu.container === 'recycle-bin') {
        return [
          {
            id: 'empty-recycle',
            label: this.i18n.t('context.emptyRecycle'),
            disabled: this.fileSystem.recycledIds().length === 0,
          },
          { id: 'properties', label: this.i18n.t('context.properties'), separatorBefore: true },
        ];
      }
      return [
        {
          id: 'new',
          label: this.i18n.t('context.new'),
          children: [
            { id: 'new-folder', label: this.i18n.t('context.newFolder') },
            { id: 'new-text', label: this.i18n.t('context.newText') },
          ],
        },
        {
          id: 'paste',
          label: this.i18n.t('context.paste'),
          disabled: !this.canPasteTo(menu.container),
        },
        {
          id: 'sort',
          label: this.i18n.t('context.sort'),
          separatorBefore: true,
          children: this.sortMenuItems(),
        },
        {
          id: 'align',
          label: this.i18n.t('context.align'),
          disabled: menu.container !== 'desktop',
        },
        { id: 'refresh', label: this.i18n.t('context.refresh') },
        { id: 'properties', label: this.i18n.t('context.properties'), separatorBefore: true },
      ];
    }

    if (menu.container === 'recycle-bin') {
      return [
        { id: 'restore', label: this.i18n.t('context.restore') },
        {
          id: 'delete-permanent',
          label: this.i18n.t('context.deletePermanent'),
          separatorBefore: true,
        },
        { id: 'properties', label: this.i18n.t('context.properties'), separatorBefore: true },
      ];
    }

    const firstUserEntry = this.fileSystem.userEntry(menu.ids[0]);
    const allUserEntries = menu.ids.every((id) => this.fileSystem.isUserEntry(id));
    const movable = menu.ids.every((id) => id !== 'recycle-bin');
    const items: OpcionMenuContextual[] = [
      { id: 'open', label: this.i18n.t('context.open'), disabled: menu.ids.length !== 1 },
    ];
    if (firstUserEntry?.kind === 'text-file' && menu.ids.length === 1) {
      items.push({ id: 'edit', label: this.i18n.t('context.edit') });
    }
    items.push(
      { id: 'cut', label: this.i18n.t('context.cut'), disabled: !movable, separatorBefore: true },
      { id: 'copy', label: this.i18n.t('context.copy'), disabled: !allUserEntries },
    );
    if (firstUserEntry?.kind === 'folder' && menu.ids.length === 1) {
      items.push({
        id: 'paste',
        label: this.i18n.t('context.paste'),
        disabled: !this.canPasteTo(firstUserEntry.id),
      });
    }
    items.push(
      {
        id: 'rename',
        label: this.i18n.t('context.rename'),
        disabled: menu.ids.length !== 1 || !firstUserEntry,
        separatorBefore: true,
      },
      {
        id: 'send-to',
        label: this.i18n.t('context.sendTo'),
        disabled: !movable,
        children: this.sendToMenuItems(menu),
      },
      { id: 'delete', label: this.i18n.t('context.delete'), disabled: !movable },
      { id: 'properties', label: this.i18n.t('context.properties'), separatorBefore: true },
    );
    return items;
  }

  private sortMenuItems(): OpcionMenuContextual[] {
    return [
      { id: 'sort-name', label: this.i18n.t('context.sortName') },
      { id: 'sort-type', label: this.i18n.t('context.sortType') },
      { id: 'sort-created', label: this.i18n.t('context.sortCreated') },
      { id: 'sort-original', label: this.i18n.t('context.sortOriginal') },
    ];
  }

  private sendToMenuItems(menu: {
    container: IdContenedor;
    ids: IdEntradaEscritorio[];
  }): OpcionMenuContextual[] {
    const standard: OpcionMenuContextual[] = [
      {
        id: 'send:desktop',
        label: this.i18n.t('context.sendDesktop'),
        disabled: menu.container === 'desktop',
      },
      {
        id: 'send:work-experience',
        label: this.i18n.t('context.sendWork'),
        disabled: menu.container === 'work-experience',
      },
      {
        id: 'send:music',
        label: this.i18n.t('context.sendMusic'),
        disabled: menu.container === 'music',
      },
    ];
    const folders = Object.values(this.fileSystem.userEntries())
      .filter(
        (entrada): entrada is Extract<EntradaUsuario, { kind: 'folder' }> =>
          entrada?.kind === 'folder' &&
          this.fileSystem.locationOf(entrada.id) !== 'deleted' &&
          this.fileSystem.locationOf(entrada.id) !== 'recycle-bin',
      )
      .map((folder) => ({
        id: `send:${folder.id}`,
        label: folder.name,
        disabled: menu.container === folder.id || menu.ids.includes(folder.id),
      }));
    return [
      ...standard,
      ...folders,
      {
        id: 'send:recycle-bin',
        label: this.i18n.t('context.sendRecycle'),
        separatorBefore: folders.length > 0,
      },
    ];
  }

  private contextDestination(menu: {
    container: IdContenedor;
    ids: IdEntradaEscritorio[];
  }): IdContenedor {
    if (menu.ids.length === 1) {
      const entrada = this.fileSystem.userEntry(menu.ids[0]);
      if (entrada?.kind === 'folder') {
        return entrada.id;
      }
    }
    return menu.container;
  }

  private canPasteTo(destino: IdContenedor): boolean {
    const portapapeles = this.clipboard();
    return Boolean(
      portapapeles &&
        destino !== 'recycle-bin' &&
        portapapeles.ids.some((id) => this.fileSystem.isManagedEntry(id)),
    );
  }

  private pasteClipboard(
    destino: IdContenedor,
    menu: {
      x: number;
      y: number;
      anchorX?: number;
      anchorY?: number;
      container: IdContenedor;
    },
  ): void {
    const portapapeles = this.clipboard();
    if (!portapapeles) {
      return;
    }
    const pasted =
      portapapeles.mode === 'copy'
        ? this.fileSystem.copy(portapapeles.ids, destino)
        : this.fileSystem.move(portapapeles.ids, destino);
    if (portapapeles.mode === 'cut') {
      this.clipboard.set(null);
    }
    if (destino === 'desktop') {
      this.positionCreatedEntries(pasted, menu);
    }
  }

  private positionCreatedEntries(
    identificadores: readonly IdEntradaEscritorio[],
    menu: {
      x: number;
      y: number;
      anchorX?: number;
      anchorY?: number;
      container: IdContenedor;
    },
  ): void {
    if (menu.container !== 'desktop' || this.mobile()) {
      return;
    }
    const rectangulo = this.workspace?.nativeElement.getBoundingClientRect();
    this.layout.colocarIconosNuevos(
      identificadores,
      {
        x: (menu.anchorX ?? menu.x) - (rectangulo?.left ?? 0) - 55,
        y: (menu.anchorY ?? menu.y) - (rectangulo?.top ?? 0) - 48,
      },
      this.bounds(),
      this.fileSystem.desktopIds(),
    );
  }

  private sortContainer(contenedor: IdContenedor, modo: OrdenEscritorio): void {
    this.fileSystem.setSortMode(contenedor, modo);
    if (contenedor === 'desktop' && !this.mobile()) {
      this.layout.ordenar(
        this.desktopEntries().map((entrada) => entrada.id),
        this.bounds(),
      );
    }
  }

  private requestRename(id: IdEntradaUsuario): void {
    const entrada = this.fileSystem.userEntry(id);
    if (!entrada) {
      return;
    }
    this.renameDialog.set({ id, value: entrada.name });
    globalThis.setTimeout(() => {
      const entrada = globalThis.document?.querySelector<HTMLInputElement>('[data-rename-input]');
      entrada?.focus();
      entrada?.select();
    });
  }

  private showProperties(contenedor: IdContenedor, identificadores: IdEntradaEscritorio[]): void {
    if (identificadores.length !== 1) {
      this.propertiesDialog.set({
        title: this.i18n.t('dialog.propertiesTitle'),
        rows: [
          {
            label: this.i18n.t('dialog.items'),
            value: String(identificadores.length || this.fileSystem.idsIn(contenedor).length),
          },
          { label: this.i18n.t('dialog.location'), value: this.folderPath(contenedor) },
        ],
      });
      return;
    }
    const entrada = this.entryById(identificadores[0], contenedor);
    if (!entrada) {
      return;
    }
    const entradaUsuario = this.fileSystem.userEntry(entrada.id);
    const filas = [
      {
        label: this.i18n.t('dialog.type'),
        value:
          entradaUsuario?.kind === 'folder'
            ? this.i18n.t('filesystem.folder')
            : entradaUsuario?.kind === 'text-file'
              ? this.i18n.t('filesystem.text')
              : entradaUsuario?.kind === 'image-file'
                ? this.i18n.t('filesystem.image')
              : entrada.kind === 'audio-file'
                ? this.i18n.t('filesystem.audio')
              : entrada.kind === 'folder'
                ? this.i18n.t('filesystem.folder')
                : 'DRP OS',
      },
      { label: this.i18n.t('dialog.location'), value: this.folderPath(contenedor) },
    ];
    if (entradaUsuario) {
      filas.push(
        { label: this.i18n.t('dialog.created'), value: this.formatDate(entradaUsuario.createdAt) },
        { label: this.i18n.t('dialog.modified'), value: this.formatDate(entradaUsuario.updatedAt) },
      );
      if (entradaUsuario.kind === 'text-file') {
        filas.push({
          label: this.i18n.t('dialog.size'),
          value: this.i18n.t('dialog.characters', { count: entradaUsuario.content.length }),
        });
      } else if (entradaUsuario.kind === 'folder') {
        filas.push({
          label: this.i18n.t('dialog.items'),
          value: String(this.fileSystem.idsIn(entradaUsuario.id).length),
        });
      } else {
        filas.push({
          label: this.i18n.t('dialog.size'),
          value: `${entradaUsuario.width} × ${entradaUsuario.height} px`,
        });
      }
    }
    this.propertiesDialog.set({ title: `${entrada.label} - ${this.i18n.t('dialog.propertiesTitle')}`, rows: filas });
  }

  private formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat(this.i18n.language() === 'en' ? 'en-GB' : 'es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  }

  private entryById(id: IdEntradaEscritorio | undefined, contenedor: IdContenedor): EntradaEscritorio | undefined {
    return id ? this.entriesFor([id], contenedor)[0] : undefined;
  }

  private measureWorkspace(): void {
    const elemento = this.workspace?.nativeElement;
    const nextBounds = {
      width: Math.max(320, elemento?.clientWidth || globalThis.innerWidth || 1280),
      height: Math.max(300, elemento?.clientHeight || (globalThis.innerHeight || 720) - 48),
    };
    this.bounds.set(nextBounds);
    this.mobile.set(nextBounds.width <= 640);
    if (nextBounds.width > 640) {
      this.layout.ajustarAlEscritorio(nextBounds, true, this.fileSystem.desktopIds());
    }
    this.windowManager.ajustarAlEscritorio(nextBounds);
  }

  private openExternal(url: string): void {
    const abierto = globalThis.open(url, '_blank', 'noopener,noreferrer');
    if (abierto) {
      abierto.opener = null;
    }
  }

  private dropDestinationAt(
    punto: PuntoEscritorio,
    draggedId: IdEntradaEscritorio,
  ): IdContenedor | null {
    const elements = globalThis.document?.elementsFromPoint?.(punto.x, punto.y) ?? [];
    for (const elemento of elements) {
      const desktopIcon = elemento.closest<HTMLElement>('[data-desktop-entry-id]');
      if (desktopIcon?.dataset['desktopEntryId'] === draggedId) {
        continue;
      }
      const destino = this.containerFromElement(elemento);
      if (destino) {
        return destino;
      }
    }

    const elemento = globalThis.document?.elementFromPoint?.(punto.x, punto.y) ?? null;
    const desktopIcon = elemento?.closest<HTMLElement>('[data-desktop-entry-id]');
    return desktopIcon?.dataset['desktopEntryId'] === draggedId
      ? null
      : this.containerFromElement(elemento);
  }

  private containerFromElement(elemento: Element | null): IdContenedor | null {
    const valor = elemento?.closest<HTMLElement>('[data-drop-container]')?.dataset['dropContainer'];
    return valor && this.fileSystem.isContainer(valor) ? valor : null;
  }

  private parseDraggedIds(valorGuardado: string): IdEntradaEscritorio[] {
    try {
      const datosLeidos = JSON.parse(valorGuardado) as unknown;
      if (!Array.isArray(datosLeidos)) {
        return [];
      }
      return datosLeidos.filter(
        (id): id is IdEntradaEscritorio =>
          typeof id === 'string' && this.fileSystem.isManagedEntry(id),
      );
    } catch {
      return [];
    }
  }

  private entriesFor(
    identificadores: readonly IdEntradaEscritorio[],
    contenedor: IdContenedor,
  ): EntradaEscritorio[] {
    const entradas = identificadores.flatMap<EntradaEscritorio>((id): EntradaEscritorio[] => {
      if (id === ID_CLIENTE_LEAGUE) {
        return [
          {
            id,
            label: 'LeagueClient.exe',
            icon: 'league-client',
            description: 'Aplicación',
            kind: 'executable-file',
          },
        ];
      }

      const aplicacion = MAPA_APLICACIONES.get(id as IdAplicacion);
      if (aplicacion) {
        return [
          {
            id,
            label: this.i18n.applicationLabel(aplicacion.id),
            icon:
              aplicacion.id === 'recycle-bin' && this.fileSystem.recycledIds().length === 0
                ? 'recycle-bin-empty'
                : aplicacion.icon,
            applicationId: aplicacion.id,
            dropContainer:
              aplicacion.id === 'work-experience'
                ? 'work-experience'
                : aplicacion.id === 'music-folder'
                  ? 'music'
                  : aplicacion.id === 'photo-album'
                    ? 'photo-album'
                  : aplicacion.id === 'recycle-bin'
                    ? 'recycle-bin'
                : undefined,
            description:
              contenedor === 'work-experience' ? this.i18n.t('explorer.addedItems') : undefined,
            addedToFolder: contenedor === 'work-experience',
            kind:
              aplicacion.id === 'work-experience' ||
              aplicacion.id === 'music-folder' ||
              aplicacion.id === 'photo-album' ||
              aplicacion.id === 'recycle-bin'
                ? 'folder'
                : 'application',
          },
        ];
      }

      const idExperiencia = experienciaDesdeDocumento(id);
      const experiencia = this.localizedPortfolio().experiences.find(
        (candidato) => candidato.id === idExperiencia,
      );
      if (experiencia && idExperiencia !== null) {
        return [
          {
            id,
            label: `${experiencia.company.replaceAll(' ', '_')}.txt`,
            icon: 'text-file' as const,
            experienceId: idExperiencia,
            description: `${experiencia.role} · ${experiencia.company}`,
            kind: 'text-file' as const,
          },
        ];
      }

      if (esIdArchivoAudio(id)) {
        const pista = MAPA_PISTAS.get(id);
        if (!pista) return [];
        return [{
          id,
          label: pista.fileName,
          icon: 'audio-file',
          description: [pista.artist, pista.album, this.formatAudioDuration(pista.durationSeconds)]
            .filter(Boolean)
            .join(' · '),
          kind: 'audio-file',
        }];
      }

      if (esIdFotografia(id)) {
        const archivo = MAPA_FOTOGRAFIAS.get(id);
        if (!archivo) return [];
        return [{
          id,
          label: archivo.name,
          icon: 'image-file',
          description: `${archivo.width} × ${archivo.height} px · PNG`,
          kind: 'image-file',
        }];
      }

      const entradaUsuario = this.fileSystem.userEntry(id);
      if (!entradaUsuario) {
        return [];
      }
      return [
        {
          id,
          label: entradaUsuario.name,
          icon:
            entradaUsuario.kind === 'folder'
              ? ('folder' as const)
              : entradaUsuario.kind === 'image-file'
                ? ('image-file' as const)
                : ('text-file' as const),
          dropContainer: entradaUsuario.kind === 'folder' ? entradaUsuario.id : undefined,
          description:
            entradaUsuario.kind === 'folder'
              ? this.i18n.t('filesystem.folder')
              : entradaUsuario.kind === 'image-file'
                ? this.i18n.t('filesystem.image')
                : this.i18n.t('filesystem.text'),
          userCreated: true,
          createdAt: entradaUsuario.createdAt,
          updatedAt: entradaUsuario.updatedAt,
          kind: entradaUsuario.kind,
        },
      ];
    });
    return this.sortEntries(entradas, this.fileSystem.sortMode(contenedor));
  }

  private sortEntries(entradas: EntradaEscritorio[], modo: OrdenEscritorio): EntradaEscritorio[] {
    if (modo === 'original') {
      return entradas;
    }
    return [...entradas].sort((izquierda, derecha) => {
      if (modo === 'name') {
        return izquierda.label.localeCompare(derecha.label, this.i18n.language(), { sensitivity: 'base' });
      }
      if (modo === 'type') {
        const typeOrder = (entrada: EntradaEscritorio): number =>
          entrada.kind === 'folder'
            ? 0
            : entrada.kind === 'text-file'
              ? 1
              : entrada.kind === 'image-file'
                ? 2
                : entrada.kind === 'audio-file'
                  ? 3
                  : 4;
        return typeOrder(izquierda) - typeOrder(derecha) || izquierda.label.localeCompare(derecha.label);
      }
      return (izquierda.createdAt ?? 0) - (derecha.createdAt ?? 0);
    });
  }

  private formatAudioDuration(segundos: number): string {
    return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
  }

  private viewableImageFile(id: IdEntradaEscritorio): ImagenVisualizable | undefined {
    if (esIdFotografia(id)) return MAPA_FOTOGRAFIAS.get(id);
    const entrada = this.fileSystem.userEntry(id);
    return entrada?.kind === 'image-file' ? { ...entrada, source: entrada.dataUrl } : undefined;
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onerror = () => rechazar(new Error('The image could not be stored.'));
      lector.onload = () => resolver(String(lector.result));
      lector.readAsDataURL(blob);
    });
  }
}
