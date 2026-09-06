import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { Localizacion } from '../../core/services/localization.service';

@Component({
  selector: 'app-pdf-viewer',
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisorPdf {
  readonly i18n = inject(Localizacion);
  private readonly sanitizer = inject(DomSanitizer);
  readonly pdfUrl = computed(() => this.i18n.cvUrl());
  readonly pdfViewerUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(`${this.pdfUrl()}#view=FitH`),
  );
  readonly downloadName = computed(() => this.i18n.cvDownloadName());
}
