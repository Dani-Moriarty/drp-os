export type IdAplicacion =
  | 'welcome'
  | 'about'
  | 'work-experience'
  | 'education'
  | 'linkedin'
  | 'source-code'
  | 'pdf-viewer'
  | 'terminal'
  | 'job-offer'
  | 'paint'
  | 'solitaire'
  | 'minesweeper'
  | 'message-board'
  | 'task-manager'
  | 'drp-explorer'
  | 'music-folder'
  | 'audio-player'
  | 'photo-album'
  | 'recycle-bin'
  | 'experience-notepad'
  | 'virtual-folder'
  | 'text-notepad'
  | 'image-viewer'
  | 'source-code-message';

export type TipoAplicacion =
  | 'welcome'
  | 'about'
  | 'explorer'
  | 'notepad'
  | 'external'
  | 'pdf-viewer'
  | 'terminal'
  | 'job-offer'
  | 'paint'
  | 'solitaire'
  | 'minesweeper'
  | 'message-board'
  | 'task-manager'
  | 'browser'
  | 'audio-player'
  | 'image-viewer'
  | 'message-box';

export type NombreIcono =
  | 'task-manager'
  | 'browser'
  | 'computer'
  | 'folder'
  | 'text-file'
  | 'linkedin'
  | 'source-code'
  | 'pdf-file'
  | 'terminal'
  | 'mail'
  | 'paint'
  | 'playing-cards'
  | 'mine'
  | 'message-board'
  | 'image-file'
  | 'audio-file'
  | 'audio-player'
  | 'league-client'
  | 'recycle-bin'
  | 'recycle-bin-empty'
  | 'windows';

export interface PuntoEscritorio {
  x: number;
  y: number;
}

export interface SeleccionIcono {
  id: string;
  additive: boolean;
  range: boolean;
}

export type IdContenedorSistema =
  | 'desktop'
  | 'work-experience'
  | 'music'
  | 'photo-album'
  | 'recycle-bin';
export type IdArchivoAudio = `audio-${string}`;
export type IdFotografia = `photo-${string}`;
export type IdArchivoSistema = 'league-client';
export type IdCarpetaUsuario = `user-folder-${string}`;
export type IdTextoUsuario = `user-text-${string}`;
export type IdImagenUsuario = `user-image-${string}`;
export type IdEntradaUsuario = IdCarpetaUsuario | IdTextoUsuario | IdImagenUsuario;
export type IdContenedor = IdContenedorSistema | IdCarpetaUsuario;
export type IdDocumentoExperiencia = `experience-${number}`;
export type IdEntradaEscritorio =
  | IdAplicacion
  | IdDocumentoExperiencia
  | IdArchivoAudio
  | IdFotografia
  | IdArchivoSistema
  | IdEntradaUsuario;

export interface ImagenVisualizable {
  id: IdFotografia | IdImagenUsuario;
  name: string;
  source: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
  width: number;
  height: number;
}

export type EntradaUsuario =
  | {
      id: IdCarpetaUsuario;
      kind: 'folder';
      name: string;
      createdAt: number;
      updatedAt: number;
    }
  | {
      id: IdTextoUsuario;
      kind: 'text-file';
      name: string;
      content: string;
      createdAt: number;
      updatedAt: number;
    }
  | {
      id: IdImagenUsuario;
      kind: 'image-file';
      name: string;
      dataUrl: string;
      mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
      width: number;
      height: number;
      createdAt: number;
      updatedAt: number;
    };

export type OrdenEscritorio = 'original' | 'name' | 'type' | 'created';

export interface EntradaEscritorio {
  id: IdEntradaEscritorio;
  label: string;
  icon: NombreIcono;
  applicationId?: IdAplicacion;
  experienceId?: number;
  description?: string;
  dropContainer?: IdContenedor;
  addedToFolder?: boolean;
  userCreated?: boolean;
  createdAt?: number;
  updatedAt?: number;
  kind?: 'application' | 'folder' | 'text-file' | 'image-file' | 'audio-file' | 'executable-file';
}

export interface SolicitudContextoExplorador {
  event: MouseEvent;
  container: IdContenedor;
  ids: IdEntradaEscritorio[];
}

export interface OpcionMenuContextual {
  id: string;
  label: string;
  disabled?: boolean;
  separatorBefore?: boolean;
  children?: OpcionMenuContextual[];
}

export interface ResultadoArrastreIcono {
  position: PuntoEscritorio;
  clientPosition: PuntoEscritorio;
}

export interface LimitesEscritorio {
  width: number;
  height: number;
}

export interface ConfiguracionVentana {
  width: number;
  height: number;
}

export type DireccionRedimensionado = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export interface AplicacionEscritorio {
  id: IdAplicacion;
  label: string;
  title: string;
  type: TipoAplicacion;
  icon: NombreIcono;
  showOnDesktop: boolean;
  defaultPosition?: PuntoEscritorio;
  defaultHorizontalAnchor?: 'left' | 'right';
  windowConfig?: ConfiguracionVentana;
}

export interface DatosVentana {
  experienceId?: number;
  folderId?: IdCarpetaUsuario;
  fileId?: IdTextoUsuario;
  imageFileId?: IdFotografia | IdImagenUsuario;
}

export interface OpcionesApertura {
  windowId?: string;
  title?: string;
  payload?: DatosVentana;
}

export interface GeometriaRestauracion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EstadoVentana {
  id: string;
  applicationId: IdAplicacion;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  restoreState?: GeometriaRestauracion;
  payload?: DatosVentana;
}
