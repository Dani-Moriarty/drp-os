import { ActividadSistema } from '../../core/system-activity/system-activity.service';
import { inject, Injectable, signal } from '@angular/core';
import { IdImagenUsuario } from '../../desktop/models/desktop.models';

const LIMITE_HISTORIAL = 24;

@Injectable({ providedIn: 'root' })
export class SesionPaint {
  private readonly activity = inject(ActividadSistema);
  readonly documentName = signal('drawing.png');
  readonly fileId = signal<IdImagenUsuario | null>(null);
  readonly dirty = signal(false);
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  private current: ImageData | null = null;
  private readonly undoStack: ImageData[] = [];
  private readonly redoStack: ImageData[] = [];

  snapshot(): ImageData | null {
    return this.current ? this.clone(this.current) : null;
  }

  initialize(imagen: ImageData): void {
    if (!this.current) {
      this.current = this.clone(imagen);
    }
    this.updateAvailability();
  }

  commit(imagen: ImageData): void {
    this.activity.pulse('paint', 'draw');
    if (this.current) {
      this.undoStack.push(this.clone(this.current));
      if (this.undoStack.length > LIMITE_HISTORIAL) {
        this.undoStack.shift();
      }
    }
    this.current = this.clone(imagen);
    this.redoStack.length = 0;
    this.dirty.set(true);
    this.updateAvailability();
  }

  replace(
    imagen: ImageData,
    nombreDocumento = 'drawing.png',
    modificado = false,
    idArchivo: IdImagenUsuario | null = null,
  ): void {
    this.current = this.clone(imagen);
    this.documentName.set(nombreDocumento);
    this.fileId.set(idArchivo);
    this.dirty.set(modificado);
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.updateAvailability();
  }

  undo(): ImageData | null {
    const anterior = this.undoStack.pop();
    if (!anterior || !this.current) {
      return null;
    }
    this.activity.pulse('paint', 'undo');
    this.redoStack.push(this.clone(this.current));
    this.current = this.clone(anterior);
    this.dirty.set(true);
    this.updateAvailability();
    return this.clone(anterior);
  }

  redo(): ImageData | null {
    const siguiente = this.redoStack.pop();
    if (!siguiente || !this.current) {
      return null;
    }
    this.undoStack.push(this.clone(this.current));
    this.activity.pulse('paint', 'redo');
    this.current = this.clone(siguiente);
    this.dirty.set(true);
    this.updateAvailability();
    return this.clone(siguiente);
  }

  markSaved(nombreDocumento: string, idArchivo: IdImagenUsuario): void {
    this.activity.pulse('paint', 'write');
    this.documentName.set(nombreDocumento);
    this.fileId.set(idArchivo);
    this.dirty.set(false);
  }

  reset(): void {
    this.current = null;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.documentName.set('drawing.png');
    this.fileId.set(null);
    this.dirty.set(false);
    this.updateAvailability();
  }

  private clone(imagen: ImageData): ImageData {
    const datos = new Uint8ClampedArray(imagen.data);
    if (typeof ImageData !== 'undefined') {
      return new ImageData(datos, imagen.width, imagen.height);
    }
    return { data: datos, width: imagen.width, height: imagen.height } as ImageData;
  }

  private updateAvailability(): void {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }
}
