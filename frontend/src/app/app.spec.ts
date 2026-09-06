import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Aplicacion } from './app';
import { DatosPortfolio } from './core/models/portfolio.model';
import { SistemaArchivosEscritorio } from './desktop/services/desktop-file-system.service';
import { DistribucionEscritorio } from './desktop/services/desktop-layout.service';

const portfolioFixture: DatosPortfolio = {
  profile: {
    fullName: 'Daniel Ramón Pérez',
    headline: 'Full-Stack Developer',
    location: 'Barcelona, España',
    phone: '+34 672226319',
    email: 'danielramonperez@hotmail.com',
    linkedInUrl: 'https://www.linkedin.com/in/daniel-ramón-pérez',
    summary: 'Desarrollador Full-Stack con más de 3 años de experiencia.',
  },
  technologies: [
    { id: 1, name: 'Angular', category: 'FRONTEND', evidenceType: 'EXPLICIT' },
    { id: 2, name: 'TypeScript', category: 'FRONTEND', evidenceType: 'EXPLICIT' },
    { id: 3, name: 'Java', category: 'BACKEND', evidenceType: 'EXPLICIT' },
    { id: 4, name: 'Spring Boot', category: 'BACKEND', evidenceType: 'EXPLICIT' },
    { id: 5, name: 'SQL Server', category: 'DATABASE', evidenceType: 'EXPLICIT' },
    { id: 6, name: 'WinDev', category: 'OTHER', evidenceType: 'EXPLICIT' },
  ],
  competencies: [
    {
      id: 1,
      name: 'Aplicaciones web de gestión',
      category: 'FRONTEND',
      evidence: 'Aplicaciones Angular.',
      evidenceType: 'DERIVED',
    },
  ],
  experiences: [
    {
      id: 1,
      role: 'Full-Stack Developer',
      company: 'CROS Ingenieros',
      startDate: '2023-02-01',
      endDate: '2026-03-01',
      context: 'Software hospitalario.',
      responsibilities: ['Desarrollo de aplicaciones web.'],
      technologies: [{ id: 1, name: 'Angular', category: 'FRONTEND', evidenceType: 'EXPLICIT' }],
      competencies: [
        {
          id: 1,
          name: 'Aplicaciones web de gestión',
          category: 'FRONTEND',
          evidence: 'Aplicaciones Angular.',
          evidenceType: 'DERIVED',
        },
      ],
    },
    {
      id: 2,
      role: 'Backend Developer',
      company: 'GiroHosting SL',
      startDate: '2022-01-01',
      endDate: '2022-06-01',
      context: 'Backend para plataformas CRM.',
      responsibilities: ['Desarrollo backend de aplicaciones CRM.'],
      technologies: [{ id: 3, name: 'Java', category: 'BACKEND', evidenceType: 'EXPLICIT' }],
      competencies: [],
    },
  ],
  education: [
    {
      id: 1,
      qualification: 'Grado en Ingeniería Informática',
      institution: 'UAB',
      startYear: 2020,
      endYear: 2022,
    },
    {
      id: 2,
      qualification: 'Técnico Superior DAM',
      institution: 'IFP',
      startYear: 2018,
      endYear: 2020,
    },
  ],
  languages: [{ id: 1, language: 'Inglés', level: 'B2 First', issuer: 'Cambridge' }],
};

describe('Interactive portfolio desktop', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Aplicacion],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('renders a retro loading screen while the static portfolio loads', () => {
    const montaje = TestBed.createComponent(Aplicacion);
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="Cargando portfolio"]')).toBeTruthy();
  });

  it('renders the classic error dialog and retries the static portfolio request', () => {
    const montaje = TestBed.createComponent(Aplicacion);
    montaje.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/data/portfolio.json').flush(null, {
      status: 500,
      statusText: 'Server Error',
    });
    montaje.detectChanges();

    expect(element(montaje).querySelector('[role="alertdialog"]')).toBeTruthy();
    expect(element(montaje).textContent).toContain('No se ha podido cargar el perfil.');

    click(findButton(montaje, 'Reintentar'));
    montaje.detectChanges();
    http.expectOne('/data/portfolio.json').flush(portfolioFixture);
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="Bienvenido"]')).toBeTruthy();
  });

  it('opens Welcome with the essential profile and no Tech Stack desktop application', () => {
    const montaje = renderPortfolio();
    const elementoRenderizado = element(montaje);

    expect(elementoRenderizado.querySelector('[aria-label="Bienvenido"]')).toBeTruthy();
    expect(elementoRenderizado.textContent).toContain('Daniel Ramón Pérez');
    expect(elementoRenderizado.textContent).toContain('Desarrollador Full-Stack');
    expect(elementoRenderizado.textContent).toContain(
      '¡Hola! Soy Dani Ramón Pérez, desarrollador Full-Stack con más de 3 años de experiencia.',
    );
    expect(elementoRenderizado.textContent).toContain('Este CV está hecho para explorarlo');
    expect(elementoRenderizado.querySelector('.welcome-app__summary strong')?.textContent).toBe(
      'reiniciar el sistema desde Start',
    );
    expect(elementoRenderizado.querySelector('.welcome-app__summary')?.textContent).not.toContain(
      'especializado en Angular/TypeScript',
    );
    expect(elementoRenderizado.querySelector('[aria-label="Abrir Tech Stack"]')).toBeNull();
  });

  it('opens, minimizes, restores and closes Sobre mí', () => {
    const montaje = renderPortfolio();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Sobre mí"]'));
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="Sobre mí"]')).toBeTruthy();
    click(element(montaje).querySelector('[aria-label="Minimizar Sobre mí"]'));
    montaje.detectChanges();
    expect(element(montaje).querySelector('[aria-label="Sobre mí"]')).toBeNull();

    click(findTaskbarButton(montaje, 'Sobre mí'));
    montaje.detectChanges();
    expect(element(montaje).querySelector('[aria-label="Sobre mí"]')).toBeTruthy();

    click(element(montaje).querySelector('[aria-label="Cerrar Sobre mí"]'));
    montaje.detectChanges();
    expect(element(montaje).querySelector('[aria-label="Sobre mí"]')).toBeNull();
  });

  it('opens Contratar through the desktop registry and localizes its window', () => {
    const montaje = renderPortfolio();
    const icono = element(montaje).querySelector('[aria-label="Abrir Contratar"]');

    expect(icono).toBeTruthy();
    dispatchDoubleClick(icono);
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="Enviar una oferta"]')).toBeTruthy();
    expect(findTaskbarButton(montaje, 'Enviar una oferta')).toBeTruthy();
    expect(element(montaje).textContent).toContain('Cuéntame brevemente qué tenéis entre manos.');

    click(findButton(montaje, 'EN'));
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="Send a job offer"]')).toBeTruthy();
    expect(element(montaje).textContent).toContain("Tell me briefly what you're working on.");
    expect(element(montaje).textContent).toContain('What is the position about?');
  });

  it('opens Paint 98 through the desktop registry and adds it to the taskbar', () => {
    const contextoLienzo = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const montaje = renderPortfolio();
    const icono = element(montaje).querySelector('[aria-label="Abrir Paint 98"]');

    expect(icono).toBeTruthy();
    dispatchDoubleClick(icono);
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="sin título - Paint 98"]')).toBeTruthy();
    expect(findTaskbarButton(montaje, 'sin título - Paint 98')).toBeTruthy();
    expect(element(montaje).querySelector('.paint-app')).toBeTruthy();
    contextoLienzo.mockRestore();
  });

  it('opens Solitaire through the desktop registry and adds the playable game to the taskbar', () => {
    const montaje = renderPortfolio();
    const icono = element(montaje).querySelector('[aria-label="Abrir Solitario"]');

    expect(icono).toBeTruthy();
    dispatchDoubleClick(icono);
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="Solitario"]')).toBeTruthy();
    expect(findTaskbarButton(montaje, 'Solitario')).toBeTruthy();
    expect(element(montaje).querySelectorAll('.solitaire__column')).toHaveLength(7);

    click(findButton(montaje, 'EN'));
    montaje.detectChanges();
    expect(element(montaje).querySelector('[aria-label="Solitaire"]')).toBeTruthy();
  });

  it('opens Minesweeper through the desktop registry and adds it to the taskbar', () => {
    const montaje = renderPortfolio();
    const icono = element(montaje).querySelector('[aria-label="Abrir Buscaminas"]');

    expect(icono).toBeTruthy();
    dispatchDoubleClick(icono);
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="Buscaminas"]')).toBeTruthy();
    expect(findTaskbarButton(montaje, 'Buscaminas')).toBeTruthy();
    expect(element(montaje).querySelectorAll('.minesweeper__cell')).toHaveLength(81);

    click(findButton(montaje, 'EN'));
    montaje.detectChanges();
    expect(element(montaje).querySelector('[aria-label="Minesweeper"]')).toBeTruthy();
  });

  it('opens the shared Message Board through the desktop registry and localizes it', () => {
    const montaje = renderPortfolio();
    const icono = element(montaje).querySelector('[aria-label="Abrir Message Board"]');

    expect(icono).toBeTruthy();
    dispatchDoubleClick(icono);
    montaje.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/message-board/admin/session')
      .flush({ administrator: false });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/message-board/messages?page=0&size=30')
      .flush({
        messages: [
          {
            id: 1,
            author: 'Daniel Ramón Pérez',
            createdAt: '2026-09-04T10:00:00Z',
            message: 'Mensaje inicial',
            administrator: true,
          },
        ],
        page: 0,
        totalPages: 1,
        totalMessages: 1,
        hasOlder: false,
        hasNewer: false,
      });
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="Message Board"]')).toBeTruthy();
    expect(findTaskbarButton(montaje, 'Message Board')).toBeTruthy();
    expect(element(montaje).textContent).toContain('Administrador');

    click(findButton(montaje, 'EN'));
    montaje.detectChanges();
    expect(element(montaje).textContent).toContain('Administrator');
  });

  it('opens DRP Explorer through the desktop registry and keeps it inside the window system', () => {
    const montaje = renderPortfolio();
    const icono = element(montaje).querySelector('[aria-label="Abrir DRP Explorer"]');

    expect(icono).toBeTruthy();
    dispatchDoubleClick(icono);
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="DRP Explorer"]')).toBeTruthy();
    expect(findTaskbarButton(montaje, 'DRP Explorer')).toBeTruthy();
    expect(element(montaje).querySelector('.explorer-home')).toBeTruthy();
  });

  it('keeps every Contratar control available in the mobile desktop layout', () => {
    const originalWidth = globalThis.innerWidth;
    Object.defineProperty(globalThis, 'innerWidth', { configurable: true, value: 390 });
    try {
      const montaje = renderPortfolio();
      globalThis.dispatchEvent(new Event('resize'));
      montaje.detectChanges();
      dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Contratar"]'));
      montaje.detectChanges();

      expect(element(montaje).querySelector('.desktop-workspace--mobile')).toBeTruthy();
      expect(element(montaje).querySelector('[aria-label="Enviar una oferta"]')).toBeTruthy();
      expect(element(montaje).querySelectorAll('.job-offer-app input')).toHaveLength(4);
      expect(element(montaje).querySelectorAll('.job-offer-app textarea')).toHaveLength(1);
      expect(element(montaje).querySelectorAll('.job-offer-app select')).toHaveLength(0);
      expect(findButton(montaje, 'Enviar oferta')).toBeTruthy();
    } finally {
      Object.defineProperty(globalThis, 'innerWidth', {
        configurable: true,
        value: originalWidth,
      });
    }
  });

  it('shows the supplied pixel-art portrait in Sobre mí', () => {
    const montaje = renderPortfolio();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Sobre mí"]'));
    montaje.detectChanges();

    const portrait = element(montaje).querySelector<HTMLImageElement>(
      'img[alt="Retrato pixel-art de Daniel Ramón Pérez"]',
    );
    expect(portrait?.getAttribute('src')).toBe('/assets/daniel-pixel-portrait.png?v=3');
    expect(portrait?.getAttribute('width')).toBe('1151');
    expect(portrait?.getAttribute('height')).toBe('1060');
  });

  it('keeps only General and Contacto in Sobre mí and marks the active tab', () => {
    const montaje = renderPortfolio();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Sobre mí"]'));
    montaje.detectChanges();

    const pestanas = Array.from(
      element(montaje).querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    expect(pestanas.map((pestana) => pestana.textContent?.trim())).toEqual(['General', 'Contacto']);

    const contactTab = pestanas.find((pestana) => pestana.textContent?.trim() === 'Contacto');
    click(contactTab);
    montaje.detectChanges();

    expect(contactTab?.getAttribute('aria-selected')).toBe('true');
    expect(contactTab?.classList.contains('classic-tabs__tab--active')).toBe(true);
    expect(element(montaje).querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(
      'about-tab-contact',
    );
  });

  it('maximizes and restores any application window', () => {
    const montaje = renderPortfolio();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Sobre mí"]'));
    montaje.detectChanges();

    click(element(montaje).querySelector('[aria-label="Maximizar Sobre mí"]'));
    montaje.detectChanges();

    const dialogo = element(montaje).querySelector('[aria-label="Sobre mí"]');
    expect(dialogo?.classList.contains('window-frame--maximized')).toBe(true);
    expect((dialogo as HTMLElement | null)?.style.left).toBe('0px');
    expect(element(montaje).querySelector('[aria-label="Restaurar Sobre mí"]')).toBeTruthy();

    click(element(montaje).querySelector('[aria-label="Restaurar Sobre mí"]'));
    montaje.detectChanges();
    expect(dialogo?.classList.contains('window-frame--maximized')).toBe(false);
  });

  it('clears the selected icon when the empty desktop background is pressed', () => {
    const montaje = renderPortfolio();
    const elementoRenderizado = element(montaje);
    const aboutIcon = elementoRenderizado.querySelector('[aria-label="Abrir Sobre mí"]');
    click(aboutIcon);
    montaje.detectChanges();
    expect(aboutIcon?.classList.contains('desktop-icon--selected')).toBe(true);

    elementoRenderizado
      .querySelector('.desktop-workspace__icons')
      ?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    montaje.detectChanges();

    expect(aboutIcon?.classList.contains('desktop-icon--selected')).toBe(false);
  });

  it('opens Work Experience and each job as a reusable Notepad window', () => {
    const montaje = renderPortfolio();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Experiencia laboral"]'));
    montaje.detectChanges();

    const archivos = element(montaje).querySelectorAll('.explorer-file');
    expect(archivos).toHaveLength(2);
    dispatchDoubleClick(archivos[0]);
    montaje.detectChanges();

    expect(element(montaje).textContent).toContain('CROS_Ingenieros.txt - Bloc de notas');
    const editor = element(montaje).querySelector<HTMLTextAreaElement>(
      '[aria-label="Editor de CROS_Ingenieros.txt"]',
    );
    expect(editor?.value).toContain('RESPONSABILIDADES');
    expect(editor?.value).toContain('TECNOLOGÍAS UTILIZADAS');
  });

  it('moves experience documents onto the desktop and desktop files into Work Experience', () => {
    const montaje = renderPortfolio();
    const sistemaArchivos = TestBed.inject(SistemaArchivosEscritorio);
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Experiencia laboral"]'));
    montaje.detectChanges();

    const crosDocument = Array.from(
      element(montaje).querySelectorAll<HTMLButtonElement>('.explorer-file'),
    ).find((archivo) => archivo.textContent?.includes('CROS_Ingenieros.txt'));
    click(crosDocument);
    montaje.detectChanges();
    click(findButton(montaje, 'Mover al escritorio'));
    montaje.detectChanges();

    const extractedDocument = element(montaje).querySelector(
      '[aria-label="Abrir CROS_Ingenieros.txt"]',
    );
    expect(extractedDocument).toBeTruthy();
    expect(sistemaArchivos.desktopIds()).toContain('experience-1');
    dispatchDoubleClick(extractedDocument);
    montaje.detectChanges();
    expect(element(montaje).textContent).toContain('CROS_Ingenieros.txt - Bloc de notas');

    sistemaArchivos.move(['education'], 'work-experience');
    montaje.detectChanges();
    expect(element(montaje).querySelector('[aria-label="Abrir Formación.txt"]')).toBeNull();

    const educationInFolder = Array.from(
      element(montaje).querySelectorAll<HTMLButtonElement>('.explorer-file'),
    ).find((archivo) => archivo.textContent?.includes('Formación.txt'));
    expect(educationInFolder).toBeTruthy();
    dispatchDoubleClick(educationInFolder ?? null);
    montaje.detectChanges();
    expect(element(montaje).querySelector('[aria-label="Formación.txt - Bloc de notas"]')).toBeTruthy();
  });

  it('opens Education.txt in Notepad with the CV education', () => {
    const montaje = renderPortfolio();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Formación.txt"]'));
    montaje.detectChanges();

    const editor = element(montaje).querySelector<HTMLTextAreaElement>(
      '[aria-label="Editor de Formación.txt"]',
    );
    expect(editor?.value).toContain('Grado en Ingeniería Informática');
    expect(editor?.value).toContain('Técnico Superior DAM');
    expect(editor?.value).toContain('B2 First');
  });

  it('opens the integrated PDF viewer with a download control', () => {
    const montaje = renderPortfolio();
    dispatchDoubleClick(
      element(montaje).querySelector('[aria-label="Abrir Daniel_Ramon_Perez_CV.pdf"]'),
    );
    montaje.detectChanges();

    expect(element(montaje).querySelector('iframe[title="Currículum de Daniel Ramón Pérez"]')).toBeTruthy();
    expect(element(montaje).querySelector('a[download="Daniel_Ramon_Perez_CV_ES.pdf"]')).toBeTruthy();

    const spanishFrame = element(montaje).querySelector<HTMLIFrameElement>('iframe');
    expect(spanishFrame?.getAttribute('src')).toContain('CV.pdf#view=FitH');

    click(findButton(montaje, 'EN'));
    montaje.detectChanges();

    expect(element(montaje).querySelector('a[download="Daniel_Ramon_Perez_CV_EN.pdf"]')).toBeTruthy();
    expect(spanishFrame?.getAttribute('src')).toContain('CV.en.pdf#view=FitH');
    expect(spanishFrame?.title).toBe('Curriculum vitae of Daniel Ramón Pérez');
  });

  it('shows CSS flags in the language selector', () => {
    const montaje = renderPortfolio();
    const elementoRenderizado = element(montaje);

    expect(elementoRenderizado.querySelector('.taskbar__flag--es')).toBeTruthy();
    expect(elementoRenderizado.querySelector('.taskbar__flag--en')).toBeTruthy();
    expect(elementoRenderizado.querySelector('.welcome-app__flag--es')).toBeTruthy();
    expect(elementoRenderizado.querySelector('.welcome-app__flag--en')).toBeTruthy();
    expect(findButton(montaje, 'ES')).toBeTruthy();
    expect(findButton(montaje, 'EN')).toBeTruthy();

    const welcomeLanguages = elementoRenderizado.querySelectorAll<HTMLButtonElement>(
      '.welcome-app__language-option',
    );
    expect(Array.from(welcomeLanguages, (boton) => boton.textContent?.trim())).toEqual([
      'Bienvenido',
      'Welcome',
    ]);
    welcomeLanguages[1].click();
    montaje.detectChanges();
    expect(document.documentElement.lang).toBe('en');
    expect(welcomeLanguages[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('executes Terminal commands and keeps the session when it reopens', async () => {
    const montaje = renderPortfolio();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Terminal.exe"]'));
    montaje.detectChanges();

    let lineaComando = element(montaje).querySelector<HTMLInputElement>(
      '[aria-label="Línea de comandos de Terminal"]',
    );
    expect(lineaComando).toBeTruthy();
    lineaComando!.value = 'whoami';
    lineaComando!.dispatchEvent(new Event('input', { bubbles: true }));
    lineaComando!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    await montaje.whenStable();
    montaje.detectChanges();
    expect(element(montaje).textContent).toContain(
      'Daniel Ramón Pérez — Full-Stack Developer',
    );

    click(element(montaje).querySelector('[aria-label="Cerrar Terminal.exe"]'));
    montaje.detectChanges();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Terminal.exe"]'));
    montaje.detectChanges();

    lineaComando = element(montaje).querySelector<HTMLInputElement>(
      '[aria-label="Línea de comandos de Terminal"]',
    );
    expect(lineaComando?.value).toBe('');
    expect(element(montaje).textContent).toContain(
      'Daniel Ramón Pérez — Full-Stack Developer',
    );
  });

  it('opens desktop applications from Terminal and closes Terminal with exit', async () => {
    const montaje = renderPortfolio();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Terminal.exe"]'));
    montaje.detectChanges();

    await runTerminalCommand(montaje, 'start cv');
    expect(
      element(montaje).querySelector('iframe[title="Currículum de Daniel Ramón Pérez"]'),
    ).toBeTruthy();

    await runTerminalCommand(montaje, 'exit');
    expect(element(montaje).querySelector('[aria-label="Terminal.exe"]')).toBeNull();
  });

  it('exposes LinkedIn and the configured source repository as safe real links', () => {
    const montaje = renderPortfolio();
    const elementoRenderizado = element(montaje);
    const linkedIn = elementoRenderizado.querySelector<HTMLAnchorElement>('[aria-label^="Abrir LinkedIn"]');
    const sourceCode = elementoRenderizado.querySelector<HTMLAnchorElement>(
      '[aria-label^="Abrir Código fuente"]',
    );

    expect(linkedIn?.href).toContain('linkedin.com/in/daniel-ram%C3%B3n-p%C3%A9rez');
    expect(linkedIn?.target).toBe('_blank');
    expect(linkedIn?.rel).toContain('noopener');
    expect(linkedIn?.draggable).toBe(false);
    expect(sourceCode?.href).toBe('https://github.com/Dani-Moriarty/drp-os');
    expect(sourceCode?.target).toBe('_blank');
    expect(sourceCode?.rel).toContain('noopener');
    expect(sourceCode?.draggable).toBe(false);
  });

  it('shows moved items inside folders and restores Recycle Bin items to the desktop', () => {
    const montaje = renderPortfolio();
    const sistemaArchivos = TestBed.inject(SistemaArchivosEscritorio);

    sistemaArchivos.move(['linkedin'], 'work-experience');
    sistemaArchivos.move(['education'], 'recycle-bin');
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label^="Abrir LinkedIn"]')).toBeNull();
    expect(element(montaje).querySelector('[aria-label="Abrir Formación.txt"]')).toBeNull();

    dispatchDoubleClick(
      element(montaje).querySelector('[aria-label="Abrir Experiencia laboral"]'),
    );
    dispatchDoubleClick(
      element(montaje).querySelector('[aria-label="Abrir Papelera de reciclaje"]'),
    );
    montaje.detectChanges();

    expect(element(montaje).querySelector('.explorer-file--stored')?.textContent).toContain(
      'LinkedIn',
    );
    const recycledEducation = element(montaje).querySelector(
      '[data-desktop-entry-id="education"]',
    );
    expect(recycledEducation?.textContent).toContain('Formación.txt');

    click(recycledEducation);
    montaje.detectChanges();
    click(findButton(montaje, 'Restaurar seleccionados'));
    montaje.detectChanges();

    expect(element(montaje).querySelector('[aria-label="Abrir Formación.txt"]')).toBeTruthy();
    expect(
      element(montaje).querySelector('.recycle-app [data-desktop-entry-id="league-client"]'),
    ).toBeTruthy();
    expect(
      element(montaje).querySelector('.recycle-app [data-desktop-entry-id="education"]'),
    ).toBeNull();
  });

  it('keeps LeagueClient.exe in the Recycle Bin and explains failed restore attempts', () => {
    const montaje = renderPortfolio();
    const sistemaArchivos = TestBed.inject(SistemaArchivosEscritorio);

    dispatchDoubleClick(
      element(montaje).querySelector('[aria-label="Abrir Papelera de reciclaje"]'),
    );
    montaje.detectChanges();

    const leagueClient = element(montaje).querySelector(
      '[data-desktop-entry-id="league-client"]',
    );
    expect(leagueClient?.textContent).toContain('LeagueClient.exe');

    dispatchDoubleClick(leagueClient);
    montaje.detectChanges();

    expect(element(montaje).textContent).toContain('LeagueClient.exe está bien donde está.');
    expect(sistemaArchivos.recycledIds()).toContain('league-client');

    click(findButton(montaje, 'Cerrar'));
    montaje.detectChanges();
    expect(element(montaje).textContent).not.toContain('LeagueClient.exe está bien donde está.');
    expect(sistemaArchivos.recycledIds()).toContain('league-client');
  });

  it('blocks dragging LeagueClient.exe out but permits its confirmed permanent deletion', () => {
    const montaje = renderPortfolio();
    const sistemaArchivos = TestBed.inject(SistemaArchivosEscritorio);
    dispatchDoubleClick(
      element(montaje).querySelector('[aria-label="Abrir Papelera de reciclaje"]'),
    );
    montaje.detectChanges();

    const leagueClient = element(montaje).querySelector(
      '.recycle-app [data-desktop-entry-id="league-client"]',
    );
    leagueClient?.dispatchEvent(new Event('dragstart', { bubbles: true }));
    montaje.detectChanges();

    expect(element(montaje).textContent).toContain('LeagueClient.exe está bien donde está.');
    expect(sistemaArchivos.recycledIds()).toContain('league-client');
    click(findButton(montaje, 'Cerrar'));
    montaje.detectChanges();

    dispatchContextMenu(leagueClient, 300, 200);
    montaje.detectChanges();
    click(findButton(montaje, 'Eliminar permanentemente'));
    montaje.detectChanges();
    click(findButton(montaje, 'Sí'));
    montaje.detectChanges();

    expect(sistemaArchivos.recycledIds()).not.toContain('league-client');
    expect(element(montaje).textContent).toContain('Has hecho lo correcto.');
    const recycleIcon = element(montaje).querySelector<HTMLImageElement>(
      '[data-desktop-entry-id="recycle-bin"] img',
    );
    expect(recycleIcon?.getAttribute('src')).toBe('/assets/desktop-icons/recycle-bin-empty.png');
  });

  it('creates folders and editable TXT files from the retro context menu', () => {
    const montaje = renderPortfolio();
    const areaTrabajo = element(montaje).querySelector('.desktop-workspace');

    dispatchContextMenu(areaTrabajo, 420, 180);
    montaje.detectChanges();
    expect(element(montaje).querySelector('[role="menu"]')).toBeTruthy();
    click(findButton(montaje, 'Carpeta'));
    montaje.detectChanges();

    let renameInput = element(montaje).querySelector<HTMLInputElement>('[data-rename-input]');
    expect(renameInput).toBeTruthy();
    renameInput!.value = 'Mis documentos';
    renameInput!.dispatchEvent(new Event('input', { bubbles: true }));
    click(findButton(montaje, 'Aceptar'));
    montaje.detectChanges();

    const folderIcon = element(montaje).querySelector('[aria-label="Abrir Mis documentos"]');
    expect(folderIcon).toBeTruthy();
    dispatchDoubleClick(folderIcon);
    montaje.detectChanges();

    const folderContents = element(montaje).querySelector('.folder-explorer__content');
    expect(folderContents).toBeTruthy();
    dispatchContextMenu(folderContents, 500, 250);
    montaje.detectChanges();
    click(findButton(montaje, 'Documento de texto'));
    montaje.detectChanges();

    renameInput = element(montaje).querySelector<HTMLInputElement>('[data-rename-input]');
    renameInput!.value = 'Ideas';
    renameInput!.dispatchEvent(new Event('input', { bubbles: true }));
    click(findButton(montaje, 'Aceptar'));
    montaje.detectChanges();

    const fileEntry = Array.from(element(montaje).querySelectorAll('.folder-entry')).find((entrada) =>
      entrada.textContent?.includes('Ideas.txt'),
    );
    expect(fileEntry).toBeTruthy();
    dispatchDoubleClick(fileEntry ?? null);
    montaje.detectChanges();

    const editor = element(montaje).querySelector<HTMLTextAreaElement>(
      '[aria-label="Editor de Ideas.txt"]',
    );
    expect(editor).toBeTruthy();
    editor!.value = 'Contenido conservado por el escritorio';
    editor!.dispatchEvent(new Event('input', { bubbles: true }));
    montaje.detectChanges();

    const sistemaArchivos = TestBed.inject(SistemaArchivosEscritorio);
    const createdFile = Object.values(sistemaArchivos.userEntries()).find(
      (entrada) => entrada?.kind === 'text-file' && entrada.name === 'Ideas.txt',
    );
    expect(createdFile).toMatchObject({ content: 'Contenido conservado por el escritorio' });
  });

  it('creates an item without reloading, reopening Welcome or moving existing icons', () => {
    const montaje = renderPortfolio();
    const elementoRenderizado = element(montaje);
    const sistemaArchivos = TestBed.inject(SistemaArchivosEscritorio);
    const disposicion = TestBed.inject(DistribucionEscritorio);
    const idsExistentes = [...sistemaArchivos.desktopIds()];
    const positionsBefore = structuredClone(disposicion.positions());

    click(elementoRenderizado.querySelector('[aria-label="Cerrar Bienvenido"]'));
    montaje.detectChanges();
    expect(elementoRenderizado.querySelector('[aria-label="Bienvenido"]')).toBeNull();

    dispatchContextMenu(elementoRenderizado.querySelector('.desktop-workspace'), 900, 400);
    montaje.detectChanges();
    click(findButton(montaje, 'Carpeta'));
    montaje.detectChanges();

    const renameInput = elementoRenderizado.querySelector<HTMLInputElement>('[data-rename-input]');
    renameInput!.value = 'Carpeta estable';
    renameInput!.dispatchEvent(new Event('input', { bubbles: true }));
    const renameForm = elementoRenderizado.querySelector<HTMLFormElement>('form.desktop-dialog');
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    renameForm!.dispatchEvent(submitEvent);
    montaje.detectChanges();

    expect(submitEvent.defaultPrevented).toBe(true);
    expect(elementoRenderizado.querySelector('[aria-label="Bienvenido"]')).toBeNull();
    expect(elementoRenderizado.querySelector('[aria-label="Abrir Carpeta estable"]')).toBeTruthy();
    idsExistentes.forEach((id) => expect(disposicion.positions()[id]).toEqual(positionsBefore[id]));

    const createdFolder = Object.values(sistemaArchivos.userEntries()).find(
      (entrada) => entrada?.kind === 'folder' && entrada.name === 'Carpeta estable',
    );
    expect(createdFolder).toBeTruthy();
    expect(disposicion.positions()[createdFolder!.id].x).toBeGreaterThan(700);
  });

  it('restarts the desktop with a retro sequence and restores the persisted layout', () => {
    vi.useFakeTimers();
    localStorage.setItem(
      'drp-os.desktop-layout.v1',
      JSON.stringify({ version: 1, positions: { about: { x: 500, y: 300 } } }),
    );
    localStorage.setItem(
      'drp-os.file-system.v1',
      JSON.stringify({ version: 1, locations: { education: 'recycle-bin' } }),
    );
    const montaje = renderPortfolio();
    click(findButton(montaje, 'Inicio'));
    montaje.detectChanges();
    expect(element(montaje).querySelector('.start-menu')).toBeTruthy();

    click(element(montaje).querySelector('.start-menu__reset'));
    montaje.detectChanges();
    expect(element(montaje).querySelector('.restart-screen')).toBeTruthy();
    expect(element(montaje).textContent).toContain('Cerrando aplicaciones');

    vi.advanceTimersByTime(900);
    montaje.detectChanges();
    expect(element(montaje).textContent).toContain('Restaurando el escritorio');

    vi.advanceTimersByTime(1700);
    montaje.detectChanges();
    expect(localStorage.getItem('drp-os.desktop-layout.v1')).toBeNull();
    expect(localStorage.getItem('drp-os.file-system.v1')).toBeNull();
    expect(element(montaje).querySelector('[aria-label="Abrir Formación.txt"]')).toBeTruthy();
    expect(element(montaje).querySelector('.restart-screen')).toBeNull();
    expect(element(montaje).querySelector('[aria-label="Bienvenido"]')).toBeTruthy();
    montaje.destroy();
    vi.useRealTimers();
  });

  it('keeps TXT edits while windows reopen and clears them when the computer restarts', () => {
    vi.useFakeTimers();
    const montaje = renderPortfolio();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Formación.txt"]'));
    montaje.detectChanges();

    let editor = element(montaje).querySelector<HTMLTextAreaElement>(
      '[aria-label="Editor de Formación.txt"]',
    );
    expect(editor).toBeTruthy();
    editor!.value = 'Documento editado por Daniel';
    editor!.dispatchEvent(new Event('input', { bubbles: true }));
    montaje.detectChanges();

    click(element(montaje).querySelector('[aria-label="Cerrar Formación.txt - Bloc de notas"]'));
    montaje.detectChanges();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Formación.txt"]'));
    montaje.detectChanges();
    editor = element(montaje).querySelector<HTMLTextAreaElement>(
      '[aria-label="Editor de Formación.txt"]',
    );
    expect(editor?.value).toBe('Documento editado por Daniel');

    click(findButton(montaje, 'Inicio'));
    montaje.detectChanges();
    click(element(montaje).querySelector('.start-menu__reset'));
    vi.advanceTimersByTime(2600);
    montaje.detectChanges();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Formación.txt"]'));
    montaje.detectChanges();
    editor = element(montaje).querySelector<HTMLTextAreaElement>(
      '[aria-label="Editor de Formación.txt"]',
    );
    expect(editor?.value).toContain('Grado en Ingeniería Informática');
    expect(editor?.value).not.toContain('Documento editado por Daniel');
    montaje.destroy();
    vi.useRealTimers();
  });

  it('supports Ctrl, Shift and drag-box multi-selection on desktop icons', () => {
    const montaje = renderPortfolio();
    const elementoRenderizado = element(montaje);
    const perfil = elementoRenderizado.querySelector('[aria-label="Abrir Sobre mí"]');
    const formacion = elementoRenderizado.querySelector('[aria-label="Abrir Formación.txt"]');

    perfil?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    formacion?.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    montaje.detectChanges();
    expect(elementoRenderizado.querySelectorAll('.desktop-icon--selected')).toHaveLength(2);

    formacion?.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    montaje.detectChanges();
    expect(elementoRenderizado.querySelectorAll('.desktop-icon--selected')).toHaveLength(1);

    perfil?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    formacion?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
    montaje.detectChanges();
    expect(elementoRenderizado.querySelectorAll('.desktop-icon--selected')).toHaveLength(4);

    const areaTrabajo = elementoRenderizado.querySelector('.desktop-workspace');
    areaTrabajo?.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 7, clientX: 0, clientY: 0 }),
    );
    areaTrabajo?.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 7, clientX: 150, clientY: 260 }),
    );
    montaje.detectChanges();
    expect(elementoRenderizado.querySelector('.desktop-selection')).toBeTruthy();
    areaTrabajo?.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, pointerId: 7, clientX: 150, clientY: 260 }),
    );
    montaje.detectChanges();
    expect(elementoRenderizado.querySelector('.desktop-selection')).toBeNull();
    expect(elementoRenderizado.querySelectorAll('.desktop-icon--selected')).toHaveLength(3);
  });

  it('moves all selected desktop icons together when one of them is dragged', () => {
    const montaje = renderPortfolio();
    const elementoRenderizado = element(montaje);
    const perfil = elementoRenderizado.querySelector<HTMLElement>('[aria-label="Abrir Sobre mí"]')!;
    const work = elementoRenderizado.querySelector<HTMLElement>('[aria-label="Abrir Experiencia laboral"]')!;
    Object.defineProperties(perfil, {
      setPointerCapture: { value: vi.fn() },
      hasPointerCapture: { value: vi.fn(() => false) },
      releasePointerCapture: { value: vi.fn() },
    });

    perfil.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    work.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    montaje.detectChanges();
    expect(elementoRenderizado.querySelectorAll('.desktop-icon--selected')).toHaveLength(2);

    perfil.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        button: 0,
        pointerId: 11,
        clientX: 50,
        clientY: 40,
      }),
    );
    perfil.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId: 11,
        clientX: 422,
        clientY: 256,
      }),
    );
    montaje.detectChanges();

    expect(perfil.style.left).toBe('406px');
    expect(perfil.style.top).toBe('236px');
    expect(work.style.left).toBe('406px');
    expect(work.style.top).toBe('338px');

    perfil.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 11,
        clientX: 422,
        clientY: 256,
      }),
    );
    perfil.click();
    montaje.detectChanges();

    expect(elementoRenderizado.querySelectorAll('.desktop-icon--selected')).toHaveLength(2);
    expect(perfil.style.left).toBe('406px');
    expect(perfil.style.top).toBe('224px');
    expect(work.style.left).toBe('406px');
    expect(work.style.top).toBe('326px');
    expect(new DistribucionEscritorio().positions()['work-experience']).toEqual({ x: 406, y: 326 });
  });

  it('switches all visible desktop and open-window copy between Spanish and English', () => {
    const montaje = renderPortfolio();
    dispatchDoubleClick(element(montaje).querySelector('[aria-label="Abrir Sobre mí"]'));
    montaje.detectChanges();

    expect(findButton(montaje, 'ES')?.getAttribute('aria-pressed')).toBe('true');
    expect(element(montaje).textContent).toContain('Desarrollador Full-Stack');

    click(findButton(montaje, 'EN'));
    montaje.detectChanges();

    expect(document.documentElement.lang).toBe('en');
    expect(findButton(montaje, 'EN')?.getAttribute('aria-pressed')).toBe('true');
    expect(findButton(montaje, 'Start')).toBeTruthy();
    expect(element(montaje).querySelector('[aria-label="About me"]')).toBeTruthy();
    expect(element(montaje).textContent).toContain('Full-Stack Developer');
    expect(element(montaje).textContent).toContain("Hi! I'm Dani Ramón Pérez");
    expect(element(montaje).textContent).toContain('Barcelona, Spain');
    expect(element(montaje).textContent).toContain('System information');
    expect(element(montaje).textContent).toContain('Work Experience');
    expect(localStorage.getItem('drp-os.language.v1')).toBe(
      JSON.stringify({ version: 1, language: 'en' }),
    );

    click(findButton(montaje, 'ES'));
    montaje.detectChanges();

    expect(document.documentElement.lang).toBe('es');
    expect(element(montaje).querySelector('[aria-label="Sobre mí"]')).toBeTruthy();
    expect(element(montaje).textContent).toContain('Información del sistema');
  });

  function renderPortfolio(): ComponentFixture<Aplicacion> {
    const montaje = TestBed.createComponent(Aplicacion);
    montaje.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/data/portfolio.json').flush(portfolioFixture);
    montaje.detectChanges();
    return montaje;
  }
});

function element(montaje: ComponentFixture<Aplicacion>): HTMLElement {
  return montaje.nativeElement as HTMLElement;
}

function click(destino: Element | null | undefined): void {
  (destino as HTMLElement | undefined)?.click();
}

function dispatchDoubleClick(destino: Element | null): void {
  destino?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
}

function dispatchContextMenu(destino: Element | null, clientX: number, clientY: number): void {
  destino?.dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY }),
  );
}

function findButton(montaje: ComponentFixture<Aplicacion>, texto: string): HTMLButtonElement | undefined {
  return Array.from(element(montaje).querySelectorAll<HTMLButtonElement>('button')).find(
    (boton) => boton.textContent?.trim() === texto,
  );
}

function findTaskbarButton(
  montaje: ComponentFixture<Aplicacion>,
  texto: string,
): HTMLButtonElement | undefined {
  return Array.from(
    element(montaje).querySelectorAll<HTMLButtonElement>('.taskbar__application'),
  ).find((boton) => boton.textContent?.trim() === texto);
}

async function runTerminalCommand(
  montaje: ComponentFixture<Aplicacion>,
  comando: string,
): Promise<void> {
  const lineaComando = element(montaje).querySelector<HTMLInputElement>(
    '[aria-label="Línea de comandos de Terminal"]',
  );
  expect(lineaComando).toBeTruthy();
  lineaComando!.value = comando;
  lineaComando!.dispatchEvent(new Event('input', { bubbles: true }));
  lineaComando!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
  await montaje.whenStable();
  montaje.detectChanges();
}
