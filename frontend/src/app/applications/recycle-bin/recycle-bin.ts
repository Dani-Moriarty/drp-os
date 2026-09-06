import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Localizacion } from '../../core/services/localization.service';
import { IconoPixel } from '../../desktop/components/pixel-icon/pixel-icon';
import {
  EntradaEscritorio,
  IdEntradaEscritorio,
  SolicitudContextoExplorador,
} from '../../desktop/models/desktop.models';
import {
  TIPO_ARRASTRE_ENTRADA,
  ID_CLIENTE_LEAGUE,
} from '../../desktop/services/desktop-file-system.service';

@Component({
  selector: 'app-recycle-bin',
  imports: [IconoPixel],
  templateUrl: './recycle-bin.html',
  styleUrl: './recycle-bin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Papelera {
  readonly i18n = inject(Localizacion);
  readonly entries = input<EntradaEscritorio[]>([]);
  readonly restored = output<IdEntradaEscritorio[]>();
  readonly protectedRestoreAttempted = output<void>();
  readonly emptyRequested = output<void>();
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

  restoreSelection(): void {
    const identificadores = [...this.selectedIds()];
    if (identificadores.length > 0) {
      this.restored.emit(identificadores);
      this.selectedIds.set(new Set());
    }
  }

  restoreOne(id: IdEntradaEscritorio): void {
    this.restored.emit([id]);
    this.selectedIds.set(new Set());
  }

  isLeagueClient(id: IdEntradaEscritorio): boolean {
    return id === ID_CLIENTE_LEAGUE;
  }

  hasEntries(): boolean {
    return this.entries().length > 0;
  }

  requestItemContext(evento: MouseEvent, id: IdEntradaEscritorio): void {
    evento.preventDefault();
    evento.stopPropagation();
    if (!this.selectedIds().has(id)) {
      this.selectedIds.set(new Set([id]));
    }
    this.contextRequested.emit({
      event: evento,
      container: 'recycle-bin',
      ids: [...this.selectedIds()],
    });
  }

  requestBackgroundContext(evento: MouseEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.selectedIds.set(new Set());
    this.contextRequested.emit({ event: evento, container: 'recycle-bin', ids: [] });
  }

  startDrag(evento: DragEvent, id: IdEntradaEscritorio): void {
    const seleccionado = this.selectedIds();
    const identificadores = seleccionado.has(id) ? [...seleccionado] : [id];
    if (identificadores.includes(ID_CLIENTE_LEAGUE)) {
      this.protectedRestoreAttempted.emit();
    }
    evento.dataTransfer?.setData(TIPO_ARRASTRE_ENTRADA, JSON.stringify(identificadores));
    if (evento.dataTransfer) {
      evento.dataTransfer.effectAllowed = 'move';
    }
  }
}
