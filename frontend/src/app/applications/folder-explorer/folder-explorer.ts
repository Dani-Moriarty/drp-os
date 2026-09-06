import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Localizacion } from '../../core/services/localization.service';
import { IconoPixel } from '../../desktop/components/pixel-icon/pixel-icon';
import {
  IdContenedor,
  EntradaEscritorio,
  IdEntradaEscritorio,
  SolicitudContextoExplorador,
} from '../../desktop/models/desktop.models';
import { TIPO_ARRASTRE_ENTRADA } from '../../desktop/services/desktop-file-system.service';

@Component({
  selector: 'app-folder-explorer',
  imports: [IconoPixel],
  templateUrl: './folder-explorer.html',
  styleUrl: './folder-explorer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExploradorCarpetas {
  readonly i18n = inject(Localizacion);
  readonly container = input.required<IdContenedor>();
  readonly path = input.required<string>();
  readonly entries = input<EntradaEscritorio[]>([]);
  readonly entryOpened = output<EntradaEscritorio>();
  readonly movedToDesktop = output<IdEntradaEscritorio[]>();
  readonly parentRequested = output<void>();
  readonly contextRequested = output<SolicitudContextoExplorador>();
  readonly selectedIds = signal<ReadonlySet<IdEntradaEscritorio>>(new Set());

  select(evento: MouseEvent, id: IdEntradaEscritorio): void {
    const siguiente = new Set(this.selectedIds());
    if (evento.ctrlKey || evento.metaKey) {
      if (siguiente.has(id)) {
        siguiente.delete(id);
      } else {
        siguiente.add(id);
      }
    } else {
      siguiente.clear();
      siguiente.add(id);
    }
    this.selectedIds.set(siguiente);
  }

  clearSelection(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) {
      this.selectedIds.set(new Set());
    }
  }

  clearSelectedEntries(): void {
    this.selectedIds.set(new Set());
  }

  moveSelectionToDesktop(): void {
    const identificadores = [...this.selectedIds()];
    if (identificadores.length > 0) {
      this.movedToDesktop.emit(identificadores);
      this.selectedIds.set(new Set());
    }
  }

  requestItemContext(evento: MouseEvent, id: IdEntradaEscritorio): void {
    evento.preventDefault();
    evento.stopPropagation();
    if (!this.selectedIds().has(id)) {
      this.selectedIds.set(new Set([id]));
    }
    this.contextRequested.emit({
      event: evento,
      container: this.container(),
      ids: [...this.selectedIds()],
    });
  }

  requestBackgroundContext(evento: MouseEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.selectedIds.set(new Set());
    this.contextRequested.emit({ event: evento, container: this.container(), ids: [] });
  }

  startDrag(evento: DragEvent, id: IdEntradaEscritorio): void {
    const seleccionado = this.selectedIds();
    const identificadores = seleccionado.has(id) ? [...seleccionado] : [id];
    evento.dataTransfer?.setData(TIPO_ARRASTRE_ENTRADA, JSON.stringify(identificadores));
    if (evento.dataTransfer) {
      evento.dataTransfer.effectAllowed = 'move';
    }
  }
}
