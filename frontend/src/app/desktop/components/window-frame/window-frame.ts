import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Localizacion } from '../../../core/services/localization.service';
import {
  LimitesEscritorio,
  PuntoEscritorio,
  EstadoVentana,
  DireccionRedimensionado,
  GeometriaRestauracion,
} from '../../models/desktop.models';

const ANCHO_MINIMO_VENTANA = 280;
const ALTO_MINIMO_VENTANA = 220;

@Component({
  selector: 'app-window-frame',
  templateUrl: './window-frame.html',
  styleUrl: './window-frame.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarcoVentana {
  readonly i18n = inject(Localizacion);
  readonly state = input.required<EstadoVentana>();
  readonly active = input(false);
  readonly bounds = input.required<LimitesEscritorio>();
  readonly mobile = input(false);

  readonly focused = output<string>();
  readonly closed = output<string>();
  readonly minimized = output<string>();
  readonly maximized = output<string>();
  readonly moved = output<PuntoEscritorio>();
  readonly resized = output<GeometriaRestauracion>();

  readonly resizeHandles: readonly DireccionRedimensionado[] = [
    'n',
    'ne',
    'e',
    'se',
    's',
    'sw',
    'w',
    'nw',
  ];

  private readonly draftPosition = signal<PuntoEscritorio | null>(null);
  private readonly draftSize = signal<{ width: number; height: number } | null>(null);
  private dragStart: { pointer: PuntoEscritorio; window: PuntoEscritorio } | null = null;
  private resizeStart: {
    pointer: PuntoEscritorio;
    window: GeometriaRestauracion;
    direction: DireccionRedimensionado;
  } | null = null;

  readonly displayPosition = computed(() =>
    this.draftPosition() ?? { x: this.state().x, y: this.state().y },
  );
  readonly displaySize = computed(() =>
    this.draftSize() ?? { width: this.state().width, height: this.state().height },
  );

  onPointerDown(evento: PointerEvent): void {
    this.focused.emit(this.state().id);
    if (
      this.mobile() ||
      this.state().maximized ||
      evento.button !== 0 ||
      (evento.target as HTMLElement).closest('button')
    ) {
      return;
    }

    this.dragStart = {
      pointer: { x: evento.clientX, y: evento.clientY },
      window: { x: this.state().x, y: this.state().y },
    };
    (evento.currentTarget as HTMLElement).setPointerCapture(evento.pointerId);
  }

  onPointerMove(evento: PointerEvent): void {
    if (!this.dragStart) {
      return;
    }

    const x = this.dragStart.window.x + evento.clientX - this.dragStart.pointer.x;
    const y = this.dragStart.window.y + evento.clientY - this.dragStart.pointer.y;
    this.draftPosition.set({
      x: Math.max(0, Math.min(x, Math.max(0, this.bounds().width - this.state().width - 8))),
      y: Math.max(0, Math.min(y, Math.max(0, this.bounds().height - 32))),
    });
  }

  onPointerUp(evento: PointerEvent): void {
    if (!this.dragStart) {
      return;
    }

    if (this.draftPosition()) {
      this.moved.emit(this.draftPosition()!);
    }
    const destino = evento.currentTarget as HTMLElement;
    if (destino.hasPointerCapture(evento.pointerId)) {
      destino.releasePointerCapture(evento.pointerId);
    }
    this.dragStart = null;
    this.draftPosition.set(null);
  }

  onTitlebarDoubleClick(evento: MouseEvent): void {
    if ((evento.target as HTMLElement).closest('button')) {
      return;
    }
    this.maximized.emit(this.state().id);
  }

  onResizePointerDown(evento: PointerEvent, direccion: DireccionRedimensionado): void {
    if (this.mobile() || this.state().maximized || evento.button !== 0) {
      return;
    }
    evento.preventDefault();
    evento.stopPropagation();
    this.focused.emit(this.state().id);
    this.resizeStart = {
      pointer: { x: evento.clientX, y: evento.clientY },
      window: {
        x: this.state().x,
        y: this.state().y,
        width: this.state().width,
        height: this.state().height,
      },
      direction: direccion,
    };
    (evento.currentTarget as HTMLElement).setPointerCapture(evento.pointerId);
  }

  onResizePointerMove(evento: PointerEvent): void {
    if (!this.resizeStart) {
      return;
    }
    const { direction, window, pointer } = this.resizeStart;
    const deltaX = evento.clientX - pointer.x;
    const deltaY = evento.clientY - pointer.y;
    const derecha = window.x + window.width;
    const bottom = window.y + window.height;
    let x = window.x;
    let y = window.y;
    let ancho = window.width;
    let alto = window.height;

    if (direction.includes('e')) {
      ancho = Math.max(ANCHO_MINIMO_VENTANA, Math.min(window.width + deltaX, this.bounds().width - x));
    }
    if (direction.includes('s')) {
      alto = Math.max(ALTO_MINIMO_VENTANA, Math.min(window.height + deltaY, this.bounds().height - y));
    }
    if (direction.includes('w')) {
      x = Math.max(0, Math.min(window.x + deltaX, derecha - ANCHO_MINIMO_VENTANA));
      ancho = derecha - x;
    }
    if (direction.includes('n')) {
      y = Math.max(0, Math.min(window.y + deltaY, bottom - ALTO_MINIMO_VENTANA));
      alto = bottom - y;
    }

    this.draftPosition.set({ x, y });
    this.draftSize.set({ width: ancho, height: alto });
  }

  onResizePointerUp(evento: PointerEvent): void {
    if (!this.resizeStart) {
      return;
    }
    const posicion = this.draftPosition();
    const tamano = this.draftSize();
    if (posicion && tamano) {
      this.resized.emit({ ...posicion, ...tamano });
    }
    const destino = evento.currentTarget as HTMLElement;
    if (destino.hasPointerCapture(evento.pointerId)) {
      destino.releasePointerCapture(evento.pointerId);
    }
    this.resizeStart = null;
    this.draftPosition.set(null);
    this.draftSize.set(null);
  }
}
