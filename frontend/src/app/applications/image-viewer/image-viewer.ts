import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DescargaArchivos } from '../../core/services/file-download.service';
import { Localizacion } from '../../core/services/localization.service';
import { MenuArchivo } from '../../desktop/components/classic-file-menu/classic-file-menu';
import { ImagenVisualizable } from '../../desktop/models/desktop.models';

@Component({
  selector: 'app-image-viewer',
  imports: [MenuArchivo],
  templateUrl: './image-viewer.html',
  styleUrl: './image-viewer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisorImagen {
  readonly i18n = inject(Localizacion);
  private readonly downloads = inject(DescargaArchivos);
  readonly files = input.required<readonly ImagenVisualizable[]>();
  readonly initialFileId = input.required<ImagenVisualizable['id']>();
  readonly fileChanged = output<ImagenVisualizable>();
  private readonly selectedFileId = signal<ImagenVisualizable['id'] | null>(null);
  readonly currentIndex = computed(() => {
    const selectedId = this.selectedFileId() ?? this.initialFileId();
    const indice = this.files().findIndex((archivo) => archivo.id === selectedId);
    return indice >= 0 ? indice : 0;
  });
  readonly file = computed(() => this.files()[this.currentIndex()]);
  readonly hasPrevious = computed(() => this.currentIndex() > 0);
  readonly hasNext = computed(() => this.currentIndex() < this.files().length - 1);

  download(): void {
    const archivo = this.file();
    if (archivo) this.downloads.descargarUrlDatos(archivo.name, archivo.source);
  }

  previous(): void {
    this.select(this.currentIndex() - 1);
  }

  next(): void {
    this.select(this.currentIndex() + 1);
  }

  private select(indice: number): void {
    const archivo = this.files()[indice];
    if (!archivo) return;
    this.selectedFileId.set(archivo.id);
    this.fileChanged.emit(archivo);
  }
}
