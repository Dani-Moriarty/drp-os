import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Localizacion } from '../../core/services/localization.service';
import { DescargaArchivos } from '../../core/services/file-download.service';
import { MenuArchivo } from '../../desktop/components/classic-file-menu/classic-file-menu';
import { IdTextoUsuario } from '../../desktop/models/desktop.models';

@Component({
  selector: 'app-text-notepad',
  imports: [MenuArchivo],
  templateUrl: './text-notepad.html',
  styleUrl: './text-notepad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlocTexto {
  readonly i18n = inject(Localizacion);
  private readonly downloads = inject(DescargaArchivos);
  readonly fileId = input.required<IdTextoUsuario>();
  readonly name = input.required<string>();
  readonly content = input.required<string>();
  readonly contentChanged = output<{ id: IdTextoUsuario; content: string }>();

  onInput(evento: Event): void {
    this.contentChanged.emit({ id: this.fileId(), content: (evento.target as HTMLTextAreaElement).value });
  }

  download(): void {
    this.downloads.descargarTexto(this.name(), this.content());
  }
}
