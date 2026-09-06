import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormularioOferta } from './job-offer';

const perfil = {
  fullName: 'Daniel Ramón Pérez',
  headline: 'Full-Stack Developer',
  location: 'Barcelona',
  phone: '+34 600 000 000',
  email: 'daniel@example.com',
  linkedInUrl: 'https://www.linkedin.com/in/daniel',
  summary: '',
};

describe('JobOffer', () => {
  let montaje: ComponentFixture<FormularioOferta>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [FormularioOferta],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    montaje = TestBed.createComponent(FormularioOferta);
    montaje.componentRef.setInput('profile', perfil);
    http = TestBed.inject(HttpTestingController);
    montaje.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('shows accessible errors for every required field before sending', async () => {
    await montaje.componentInstance.submit();
    montaje.detectChanges();

    expect(root().querySelectorAll('.classic-form-field__error').length).toBe(4);
    expect(root().textContent).toContain('Este campo es obligatorio.');
    expect(root().querySelector('#hire-company')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('uses real labels and native controls in keyboard order', () => {
    const controlIds = [
      'hire-company',
      'hire-position',
      'hire-contact-name',
      'hire-contact-email',
    ];

    for (const id of controlIds) {
      expect(root().querySelector(`label[for="${id}"]`)).toBeTruthy();
      expect(root().querySelector(`#${id}`)?.getAttribute('tabindex')).not.toBe('-1');
    }
    expect(root().querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('rejects an invalid contact email in the form', async () => {
    fillRequired();
    setValue('#hire-contact-email', 'correo-invalido');

    await montaje.componentInstance.submit();
    montaje.detectChanges();

    expect(root().textContent).toContain('Introduce un email válido.');
  });

  it('submits once, disables the button while loading and displays success', async () => {
    fillRequired();
    const firstSubmission = montaje.componentInstance.submit();
    const duplicateSubmission = montaje.componentInstance.submit();
    montaje.detectChanges();

    const solicitud = http.expectOne('/api/job-offers');
    expect(solicitud.request.method).toBe('POST');
    expect(solicitud.request.body).toMatchObject({
      company: 'Acme Software',
      positionDescription: 'Full-Stack para un producto SaaS con Angular, Java y Spring Boot.',
      contactEmail: 'laura@acme.com',
      website: '',
    });
    expect((root().querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true);
    expect(root().textContent).toContain('Enviando...');
    expect(http.match('/api/job-offers').length).toBe(0);

    solicitud.flush(null, { status: 202, statusText: 'Accepted' });
    await Promise.all([firstSubmission, duplicateSubmission]);
    montaje.detectChanges();

    expect(root().querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(root().textContent).toContain('Oferta enviada');
  });

  it('shows a safe message box when delivery fails', async () => {
    fillRequired();

    const submission = montaje.componentInstance.submit();
    montaje.detectChanges();
    http.expectOne('/api/job-offers').flush(null, {
      status: 503,
      statusText: 'Service Unavailable',
    });
    await submission;
    montaje.detectChanges();

    expect(root().querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(root().textContent).toContain('No se ha podido enviar el mensaje.');
    expect(root().textContent).toContain(perfil.email);
    expect(root().textContent).toContain(perfil.phone);
    expect(root().textContent).not.toContain('Service Unavailable');
  });

  function fillRequired(): void {
    setValue('#hire-company', ' Acme Software ');
    setValue(
      '#hire-position',
      'Full-Stack para un producto SaaS con Angular, Java y Spring Boot.',
    );
    setValue('#hire-contact-name', 'Laura García');
    setValue('#hire-contact-email', 'laura@acme.com');
  }

  function setValue(selector: string, valor: string): void {
    const control = root().querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    control.value = valor;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
    montaje.detectChanges();
  }

  function root(): HTMLElement {
    return montaje.nativeElement as HTMLElement;
  }
});
