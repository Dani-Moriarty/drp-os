import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DatosPortfolio } from '../../core/models/portfolio.model';
import { SesionTerminal } from './terminal-session.service';

const portfolio: DatosPortfolio = {
  profile: {
    fullName: 'Daniel Ramón Pérez',
    headline: 'Full-Stack Developer',
    location: 'Barcelona, España',
    phone: '000000000',
    email: 'daniel@example.com',
    linkedInUrl: 'https://www.linkedin.com/in/daniel',
    summary: 'Desarrollador Full-Stack con más de 3 años de experiencia.',
  },
  experiences: [
    {
      id: 1,
      role: 'Full-Stack Developer',
      company: 'CROS Ingenieros',
      startDate: '2023-02-01',
      endDate: '2026-03-01',
      context: 'Software hospitalario.',
      responsibilities: ['Desarrollo de aplicaciones web.'],
      technologies: [
        { id: 1, name: 'Angular', category: 'FRONTEND', evidenceType: 'EXPLICIT' },
      ],
      competencies: [],
    },
  ],
  technologies: [
    { id: 1, name: 'Angular', category: 'FRONTEND', evidenceType: 'EXPLICIT' },
    { id: 2, name: 'TypeScript', category: 'FRONTEND', evidenceType: 'EXPLICIT' },
    { id: 3, name: 'Java', category: 'BACKEND', evidenceType: 'EXPLICIT' },
    { id: 4, name: 'Spring Boot', category: 'BACKEND', evidenceType: 'EXPLICIT' },
    { id: 5, name: 'SQL Server', category: 'DATABASE', evidenceType: 'EXPLICIT' },
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
  education: [
    {
      id: 1,
      qualification: 'Técnico Superior DAM',
      institution: 'IFP',
      startYear: 2018,
      endYear: 2020,
    },
  ],
  languages: [{ id: 1, language: 'Inglés', level: 'B2 First', issuer: 'Cambridge' }],
};

describe('TerminalSessionService', () => {
  let servicio: SesionTerminal;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(SesionTerminal);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows help and reports unknown commands without exposing hidden commands', async () => {
    await run('help');
    expect(lastOutput()).toContain('Comandos disponibles:');
    expect(lastOutput()).toContain('curl /api/...');

    await run('make-me-coffee');
    expect(lastOutput()).toContain("'make-me-coffee' no se reconoce");
    expect(servicio.transcript().at(-1)?.error).toBe(true);
  });

  it('navigates the CV file system and reads its generated text files', async () => {
    await run('dir');
    expect(lastOutput()).toContain('<DIR>          experience');

    await run('cd experience');
    await run('pwd');
    expect(lastOutput()).toBe('C:\\Users\\Daniel\\Portfolio\\experience');

    await run('ls');
    expect(lastOutput()).toContain('CROS_Ingenieros.txt');
    await run('type CROS_Ingenieros.txt');
    expect(lastOutput()).toContain('Software hospitalario.');

    await run('cd ..');
    await run('cat cv.pdf');
    expect(lastOutput()).toContain('archivo binario');
    await run('tree');
    expect(lastOutput()).toContain('├── experience');
    expect(lastOutput()).toContain('Education.txt');
  });

  it('supports identity, version, echo, date, time and public virtual environment commands', async () => {
    await run('whoami');
    expect(lastOutput()).toBe('Daniel Ramón Pérez — Full-Stack Developer');
    await run('hostname');
    expect(lastOutput()).toBe('DRP-PC');
    await run('uname');
    expect(lastOutput()).toContain('DRP OS v1.0');
    expect(lastOutput()).toContain('Angular · TypeScript · Java · Spring Boot · SQL Server');
    await run('echo hola mundo');
    expect(lastOutput()).toBe('hola mundo');
    await run('date');
    expect(lastOutput()).toBeTruthy();
    await run('time');
    expect(lastOutput()).toBeTruthy();
    await run('env');
    expect(lastOutput()).toContain('PORTFOLIO_MODE=PUBLIC_READ_ONLY');
    expect(lastOutput()).toContain('HOME=C:\\Users\\Daniel\\Portfolio');
  });

  it('keeps command history, supports arrow navigation and clears or resets the session', async () => {
    await run('echo uno');
    await run('echo dos');
    await run('history');
    expect(lastOutput()).toContain('1  echo uno');
    expect(lastOutput()).toContain('3  history');

    servicio.previousHistory();
    expect(servicio.input()).toBe('history');
    servicio.previousHistory();
    expect(servicio.input()).toBe('echo dos');
    servicio.nextHistory();
    expect(servicio.input()).toBe('history');

    await run('cls');
    expect(servicio.transcript()).toEqual([]);
    servicio.setInput('texto pendiente');
    servicio.reset();
    expect(servicio.input()).toBe('');
    expect(servicio.prompt()).toBe('C:\\Users\\Daniel\\Portfolio>');
  });

  it('returns honest repository information and desktop effects', async () => {
    await run('git status');
    expect(lastOutput()).toContain(
      'Repositorio público: https://github.com/Dani-Moriarty/drp-os',
    );
    await run('git log');
    expect(lastOutput()).toContain(
      'El historial público está disponible en https://github.com/Dani-Moriarty/drp-os',
    );

    expect(await run('start cv')).toEqual({ type: 'open', applicationId: 'pdf-viewer' });
    expect(await run('open experience')).toEqual({
      type: 'open',
      applicationId: 'work-experience',
    });
    expect(await run('start paint')).toEqual({ type: 'open', applicationId: 'paint' });
    expect(await run('start solitaire')).toEqual({ type: 'open', applicationId: 'solitaire' });
    expect(await run('start minesweeper')).toEqual({ type: 'open', applicationId: 'minesweeper' });
    expect(await run('start messageboard')).toEqual({
      type: 'open',
      applicationId: 'message-board',
    });
    expect(await run('start tareas')).toEqual({
      type: 'open',
      applicationId: 'task-manager',
    });
    expect(await run('exit')).toEqual({ type: 'close' });
  });

  it('only permits public portfolio API endpoints through curl', async () => {
    const promesaSolicitud = run('curl /api/profile');
    http.expectOne('/api/profile').flush({ fullName: 'Daniel Ramón Pérez' });
    await promesaSolicitud;
    expect(lastOutput()).toContain('"fullName": "Daniel Ramón Pérez"');

    await run('curl https://example.com/private');
    expect(lastOutput()).toContain('Endpoints permitidos:');
    http.expectNone('https://example.com/private');
  });

  it('queries the real backend health endpoint', async () => {
    const promesaSolicitud = run('curl /api/health');
    http.expectOne('/api/health').flush({ status: 'UP' });
    await promesaSolicitud;

    expect(lastOutput()).toContain('"status": "UP"');
  });

  function run(comando: string) {
    return servicio.execute(comando, { portfolio, language: 'es' });
  }

  function lastOutput(): string {
    return servicio.transcript().at(-1)?.output ?? '';
  }
});
