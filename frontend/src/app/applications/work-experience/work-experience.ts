import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Localizacion } from '../../core/services/localization.service';
import { IconoPixel } from '../../desktop/components/pixel-icon/pixel-icon';
import {
  EntradaEscritorio,
  IdEntradaEscritorio,
  SolicitudContextoExplorador,
} from '../../desktop/models/desktop.models';
import { TIPO_ARRASTRE_ENTRADA } from '../../desktop/services/desktop-file-system.service';

@Component({
  selector: 'app-work-experience',
  imports: [IconoPixel],
  templateUrl: './work-experience.html',
  styleUrl: './work-experience.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienciaLaboral {
  readonly i18n = inject(Localizacion);
  readonly entries = input<EntradaEscritorio[]>([]);
  readonly entryOpened = output<EntradaEscritorio>();
  readonly movedToDesktop = output<IdEntradaEscritorio[]>();
  readonly contextRequested = output<SolicitudContextoExplorador>();
  readonly selectedEntryIds = signal<ReadonlySet<IdEntradaEscritorio>>(new Set());

  selectEntry(evento: MouseEvent, id: IdEntradaEscritorio): void {
    const siguiente = new Set(this.selectedEntryIds());
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
    this.selectedEntryIds.set(siguiente);
  }

  moveSelectionToDesktop(): void {
    const identificadores = [...this.selectedEntryIds()];
    if (identificadores.length > 0) {
      this.movedToDesktop.emit(identificadores);
      this.selectedEntryIds.set(new Set());
    }
  }

  clearSelection(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) {
      this.selectedEntryIds.set(new Set());
    }
  }

  clearSelectedEntries(): void {
    this.selectedEntryIds.set(new Set());
  }

  requestItemContext(evento: MouseEvent, id: IdEntradaEscritorio): void {
    evento.preventDefault();
    evento.stopPropagation();
    if (!this.selectedEntryIds().has(id)) {
      this.selectedEntryIds.set(new Set([id]));
    }
    this.contextRequested.emit({
      event: evento,
      container: 'work-experience',
      ids: [...this.selectedEntryIds()],
    });
  }

  requestBackgroundContext(evento: MouseEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.selectedEntryIds.set(new Set());
    this.contextRequested.emit({ event: evento, container: 'work-experience', ids: [] });
  }

  startDrag(evento: DragEvent, id: IdEntradaEscritorio): void {
    const seleccionado = this.selectedEntryIds();
    const identificadores = seleccionado.has(id) ? [...seleccionado] : [id];
    evento.dataTransfer?.setData(TIPO_ARRASTRE_ENTRADA, JSON.stringify(identificadores));
    if (evento.dataTransfer) {
      evento.dataTransfer.effectAllowed = 'move';
    }
  }
}
