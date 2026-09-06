import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatosPortfolio } from '../../core/models/portfolio.model';
import { DrpExplorer } from './drp-explorer';
import { SesionExplorador } from './drp-explorer-session.service';

const portfolio = {
  profile: {
    fullName: 'Daniel Ramón Pérez', headline: 'Full-Stack Developer', location: 'Barcelona',
    phone: '', email: '', linkedInUrl: 'https://www.linkedin.com/in/daniel-ramón-pérez', summary: '',
  },
  technologies: [], competencies: [], experiences: [], education: [], languages: [],
} satisfies DatosPortfolio;

describe('DrpExplorer', () => {
  let montaje: ComponentFixture<DrpExplorer>;
  let sesion: SesionExplorador;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DrpExplorer] }).compileComponents();
    sesion = TestBed.inject(SesionExplorador);
    sesion.reset();
    montaje = TestBed.createComponent(DrpExplorer);
    montaje.componentRef.setInput('portfolio', portfolio);
    montaje.detectChanges();
  });

  afterEach(() => {
    sesion.reset();
    vi.restoreAllMocks();
  });

  it('renders the retro home page and its real quick links', () => {
    const texto = montaje.nativeElement.textContent as string;
    expect(texto).toContain('DRP Explorer');
    expect(texto).not.toContain('danielramonperez.com');
    expect(texto).toContain('GitHub');
    expect(texto).toContain('LinkedIn');
  });

  it('opens Google searches directly in a real browser tab', () => {
    const open = vi.spyOn(globalThis, 'open').mockReturnValue(null);
    component().query.set('Angular');
    component().submitSearch(new Event('submit'));
    montaje.detectChanges();

    expect(open).toHaveBeenCalledWith(
      'https://www.google.com/search?q=Angular',
      '_blank',
      'noopener,noreferrer',
    );
    expect(montaje.nativeElement.textContent).not.toContain('Página no disponible dentro de la ventana');
    expect(montaje.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('opens GitHub and LinkedIn quick access directly in real browser tabs', () => {
    const open = vi.spyOn(globalThis, 'open').mockReturnValue(null);
    const quickAccess = Array.from(
      (montaje.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        '.explorer-home__favorites button',
      ),
    );

    quickAccess[0]?.click();
    quickAccess[1]?.click();
    montaje.detectChanges();

    expect(open).toHaveBeenNthCalledWith(
      1,
      'https://github.com/Dani-Moriarty/drp-os',
      '_blank',
      'noopener,noreferrer',
    );
    expect(open).toHaveBeenNthCalledWith(
      2,
      portfolio.profile.linkedInUrl,
      '_blank',
      'noopener,noreferrer',
    );
    expect(sesion.current().kind).toBe('home');
    expect(montaje.nativeElement.textContent).not.toContain('Página no disponible dentro de la ventana');
  });

  it('renders validated ordinary URLs in a sandboxed iframe', () => {
    component().navigate('https://example.com');
    montaje.detectChanges();

    const frame = montaje.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    expect(frame).toBeTruthy();
    expect(frame.getAttribute('sandbox')).not.toContain('allow-top-navigation');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin');
    expect(frame.getAttribute('src')).toBe('https://example.com/');
  });

  function component(): DrpExplorer {
    return montaje.componentInstance;
  }
});
