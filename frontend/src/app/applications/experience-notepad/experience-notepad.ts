import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Experiencia } from '../../core/models/portfolio.model';
import { DocumentosSesion } from '../../core/services/document-session.service';
import { DescargaArchivos } from '../../core/services/file-download.service';
import { Localizacion } from '../../core/services/localization.service';
import { MenuArchivo } from '../../desktop/components/classic-file-menu/classic-file-menu';

@Component({
  selector: 'app-experience-notepad',
  imports: [MenuArchivo],
  templateUrl: './experience-notepad.html',
  styleUrl: './experience-notepad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlocExperiencia {
  readonly i18n = inject(Localizacion);
  private readonly documents = inject(DocumentosSesion);
  private readonly downloads = inject(DescargaArchivos);
  readonly experience = input.required<Experiencia>();
  readonly fileName = computed(() => `${this.experience().company.replaceAll(' ', '_')}.txt`);
  private readonly documentKey = computed(
    () => `experience:${this.experience().id}:${this.i18n.language()}`,
  );
  readonly documentText = computed(() =>
    this.documents.read(this.documentKey(), this.originalDocument()),
  );

  formatDate(valor: string): string {
    const [year, month] = valor.split('-');
    return `${month}/${year}`;
  }

  technologyNames(): string {
    return this.experience().technologies.map((tecnologia) => tecnologia.name).join(' · ');
  }

  onDocumentInput(evento: Event): void {
    this.documents.write(this.documentKey(), (evento.target as HTMLTextAreaElement).value);
  }

  download(): void {
    this.downloads.descargarTexto(this.fileName(), this.documentText());
  }

  private originalDocument(): string {
    const experiencia = this.experience();
    return [
      `${this.i18n.t('notepad.workPath')}\\${this.fileName()}`,
      '',
      experiencia.company,
      experiencia.role,
      `${this.formatDate(experiencia.startDate)} - ${this.formatDate(experiencia.endDate)}`,
      '',
      this.i18n.t('notepad.context'),
      experiencia.context,
      '',
      this.i18n.t('notepad.responsibilities'),
      ...experiencia.responsibilities.map((responsabilidad) => `• ${responsabilidad}`),
      '',
      this.i18n.t('notepad.technologies'),
      this.technologyNames(),
      '',
      this.i18n.t('notepad.competencies'),
      ...experiencia.competencies.map(
        (competencia) => `• ${competencia.name}: ${competencia.evidence}`,
      ),
    ].join('\n');
  }
}
