import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Formacion, AcreditacionIdioma } from '../../core/models/portfolio.model';
import { DocumentosSesion } from '../../core/services/document-session.service';
import { DescargaArchivos } from '../../core/services/file-download.service';
import { Localizacion } from '../../core/services/localization.service';
import { MenuArchivo } from '../../desktop/components/classic-file-menu/classic-file-menu';

@Component({
  selector: 'app-education-notepad',
  imports: [MenuArchivo],
  templateUrl: './education-notepad.html',
  styleUrl: './education-notepad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlocFormacion {
  readonly i18n = inject(Localizacion);
  private readonly documents = inject(DocumentosSesion);
  private readonly downloads = inject(DescargaArchivos);
  readonly education = input.required<Formacion[]>();
  readonly languages = input.required<AcreditacionIdioma[]>();
  private readonly documentKey = computed(() => `education:${this.i18n.language()}`);
  readonly documentText = computed(() =>
    this.documents.read(this.documentKey(), this.originalDocument()),
  );

  onDocumentInput(evento: Event): void {
    this.documents.write(this.documentKey(), (evento.target as HTMLTextAreaElement).value);
  }

  download(): void {
    this.downloads.descargarTexto(this.i18n.applicationLabel('education'), this.documentText());
  }

  private originalDocument(): string {
    const educationLines = this.education().flatMap((elemento) => [
      elemento.qualification,
      elemento.institution,
      `${elemento.startYear} - ${elemento.endYear}`,
      '',
    ]);
    const languageLines = this.languages().flatMap((idioma) => [
      idioma.language,
      `${idioma.level} (${idioma.issuer})`,
      '',
    ]);

    return [
      this.i18n.t('education.path'),
      '',
      this.i18n.t('education.education'),
      ...educationLines,
      this.i18n.t('education.languages'),
      ...languageLines,
    ].join('\n');
  }
}
