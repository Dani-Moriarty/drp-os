import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Localizacion } from '../../../core/services/localization.service';
import {
  EntradaEscritorio,
  ResultadoArrastreIcono,
  SeleccionIcono,
  PuntoEscritorio,
} from '../../models/desktop.models';
import { IconoPixel } from '../pixel-icon/pixel-icon';

@Component({
  selector: 'app-desktop-icon',
  imports: [IconoPixel],
  templateUrl: './desktop-icon.html',
  styleUrl: './desktop-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconoEscritorio {
  readonly i18n = inject(Localizacion);
  readonly entry = input.required<EntradaEscritorio>();
  readonly position = input.required<PuntoEscritorio>();
  readonly selected = input(false);
  readonly mobile = input(false);
  readonly externalUrl = input<string | null>(null);
  readonly groupDragOffset = input<PuntoEscritorio | null>(null);

  readonly selectedChange = output<SeleccionIcono>();
  readonly activated = output<EntradaEscritorio>();
  readonly dragPreview = output<PuntoEscritorio | null>();
  readonly dragCompleted = output<ResultadoArrastreIcono>();

  private readonly draftPosition = signal<PuntoEscritorio | null>(null);
  private dragStart: { pointer: PuntoEscritorio; icon: PuntoEscritorio } | null = null;
  private moved = false;
  private lastDragAt = 0;

  readonly displayPosition = computed(() => {
    const draft = this.draftPosition();
    if (draft) {
      return draft;
    }
    const desplazamiento = this.groupDragOffset();
    const posicion = this.position();
    return desplazamiento
      ? { x: Math.max(0, posicion.x + desplazamiento.x), y: Math.max(0, posicion.y + desplazamiento.y) }
      : posicion;
  });

  readonly dragging = computed(() => this.draftPosition() !== null || this.groupDragOffset() !== null);

  select(evento: MouseEvent): void {
    evento.preventDefault();
    if (Date.now() - this.lastDragAt < 350) {
      return;
    }
    this.selectedChange.emit({
      id: this.entry().id,
      additive: evento.ctrlKey || evento.metaKey,
      range: evento.shiftKey,
    });
  }

  activate(evento: Event): void {
    evento.preventDefault();
    if (Date.now() - this.lastDragAt < 350) {
      return;
    }
    this.activated.emit(this.entry());
  }

  onPointerDown(evento: PointerEvent): void {
    if (this.mobile() || evento.button !== 0) {
      return;
    }

    this.dragStart = {
      pointer: { x: evento.clientX, y: evento.clientY },
      icon: { ...this.position() },
    };
    this.moved = false;
    (evento.currentTarget as HTMLElement).setPointerCapture(evento.pointerId);
  }

  onPointerMove(evento: PointerEvent): void {
    if (!this.dragStart) {
      return;
    }

    const deltaX = evento.clientX - this.dragStart.pointer.x;
    const deltaY = evento.clientY - this.dragStart.pointer.y;
    if (!this.moved && Math.hypot(deltaX, deltaY) < 5) {
      return;
    }

    this.moved = true;
    this.draftPosition.set({
      x: Math.max(0, this.dragStart.icon.x + deltaX),
      y: Math.max(0, this.dragStart.icon.y + deltaY),
    });
    this.dragPreview.emit({ x: deltaX, y: deltaY });
  }

  onPointerUp(evento: PointerEvent): void {
    if (!this.dragStart) {
      return;
    }

    if (this.moved && this.draftPosition()) {
      this.dragCompleted.emit({
        position: this.draftPosition()!,
        clientPosition: { x: evento.clientX, y: evento.clientY },
      });
      this.lastDragAt = Date.now();
    }

    this.dragPreview.emit(null);

    const destino = evento.currentTarget as HTMLElement;
    if (destino.hasPointerCapture(evento.pointerId)) {
      destino.releasePointerCapture(evento.pointerId);
    }
    this.dragStart = null;
    this.draftPosition.set(null);
  }

  preventNativeDrag(evento: DragEvent): void {
    evento.preventDefault();
  }
}
