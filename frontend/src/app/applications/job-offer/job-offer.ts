import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Perfil } from '../../core/models/portfolio.model';
import {
  LIMITES_OFERTA,
  BorradorOferta,
  CampoOferta,
  SolicitudOferta,
} from '../../core/models/job-offer.model';
import { ServicioOfertas } from '../../core/services/job-offer.service';
import { Localizacion } from '../../core/services/localization.service';
import { IconoPixel } from '../../desktop/components/pixel-icon/pixel-icon';

type ResultadoEnvio = 'success' | 'error' | null;
type ErroresFormulario = Partial<Record<CampoOferta, string>>;

const FORMULARIO_INICIAL: BorradorOferta = {
  company: '',
  positionDescription: '',
  contactName: '',
  contactEmail: '',
  website: '',
};

const CAMPOS_VISIBLES: CampoOferta[] = [
  'company',
  'positionDescription',
  'contactName',
  'contactEmail',
];

@Component({
  selector: 'app-job-offer',
  imports: [IconoPixel],
  templateUrl: './job-offer.html',
  styleUrl: './job-offer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormularioOferta {
  @ViewChild('resultButton') private resultButton?: ElementRef<HTMLButtonElement>;

  readonly profile = input.required<Perfil>();
  readonly i18n = inject(Localizacion);
  readonly limits = LIMITES_OFERTA;
  readonly form = signal<BorradorOferta>({ ...FORMULARIO_INICIAL });
  readonly touched = signal<Partial<Record<CampoOferta, boolean>>>({});
  readonly submitting = signal(false);
  readonly result = signal<ResultadoEnvio>(null);
  readonly errors = computed<ErroresFormulario>(() => this.validate(this.form()));
  readonly positionLength = computed(() => this.form().positionDescription.length);

  private readonly jobOffers = inject(ServicioOfertas);

  update(campo: CampoOferta, evento: Event): void {
    const valor = (evento.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    this.form.update((formulario) => ({ ...formulario, [campo]: valor }));
  }

  markTouched(campo: CampoOferta): void {
    this.touched.update((visitado) => ({ ...visitado, [campo]: true }));
  }

  visibleError(campo: CampoOferta): string | null {
    return this.touched()[campo] ? (this.errors()[campo] ?? null) : null;
  }

  async submit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.touched.set(Object.fromEntries(CAMPOS_VISIBLES.map((campo) => [campo, true])));
    if (Object.keys(this.errors()).length > 0) {
      return;
    }

    this.submitting.set(true);
    this.result.set(null);
    try {
      await firstValueFrom(this.jobOffers.submit(this.toRequest(this.form())));
      this.form.set({ ...FORMULARIO_INICIAL });
      this.touched.set({});
      this.showResult('success');
    } catch {
      this.showResult('error');
    } finally {
      this.submitting.set(false);
    }
  }

  dismissResult(): void {
    this.result.set(null);
  }

  private showResult(resultado: Exclude<ResultadoEnvio, null>): void {
    this.result.set(resultado);
    globalThis.setTimeout(() => this.resultButton?.nativeElement.focus());
  }

  private validate(formulario: BorradorOferta): ErroresFormulario {
    const errores: ErroresFormulario = {};
    this.required(errores, 'company', formulario.company);
    this.required(errores, 'positionDescription', formulario.positionDescription);
    this.required(errores, 'contactName', formulario.contactName);
    this.required(errores, 'contactEmail', formulario.contactEmail);

    this.maxLength(errores, 'company', formulario.company, this.limits.company);
    this.maxLength(
      errores,
      'positionDescription',
      formulario.positionDescription,
      this.limits.positionDescription,
    );
    this.maxLength(errores, 'contactName', formulario.contactName, this.limits.contactName);
    this.maxLength(errores, 'contactEmail', formulario.contactEmail, this.limits.contactEmail);

    if (formulario.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(formulario.contactEmail.trim())) {
      errores.contactEmail = this.i18n.t('hire.validation.email');
    }
    return errores;
  }

  private required(errores: ErroresFormulario, campo: CampoOferta, valor: string): void {
    if (!valor.trim()) {
      errores[campo] = this.i18n.t('hire.validation.required');
    }
  }

  private maxLength(
    errores: ErroresFormulario,
    campo: CampoOferta,
    valor: string,
    limite: number,
  ): void {
    if (valor.length > limite) {
      errores[campo] = this.i18n.t('hire.validation.maxLength', { count: limite });
    }
  }

  private toRequest(formulario: BorradorOferta): SolicitudOferta {
    return {
      company: formulario.company.trim(),
      positionDescription: formulario.positionDescription.trim(),
      contactName: formulario.contactName.trim(),
      contactEmail: formulario.contactEmail.trim(),
      website: formulario.website,
    };
  }
}
