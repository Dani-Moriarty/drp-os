import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Solitario } from './solitaire';
import { JuegoSolitario } from './solitaire-game.service';

describe('Solitaire', () => {
  let montaje: ComponentFixture<Solitario>;
  let servicio: JuegoSolitario;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Solitario] }).compileComponents();
    montaje = TestBed.createComponent(Solitario);
    servicio = TestBed.inject(JuegoSolitario);
    servicio.newGame(() => 0.25);
    montaje.detectChanges();
  });

  it('renders a playable seven-column board and stock', () => {
    const anfitrion = montaje.nativeElement as HTMLElement;
    expect(anfitrion.querySelectorAll('.solitaire__column')).toHaveLength(7);
    expect(anfitrion.querySelector('.solitaire__stock')).toBeTruthy();
    expect(anfitrion.querySelectorAll('.solitaire-card--tableau')).toHaveLength(28);
  });

  it('draws and undoes from the toolbar', () => {
    const anfitrion = montaje.nativeElement as HTMLElement;
    (anfitrion.querySelector('.solitaire__stock') as HTMLButtonElement).click();
    montaje.detectChanges();
    expect(servicio.state().waste).toHaveLength(1);

    const botones = Array.from(anfitrion.querySelectorAll<HTMLButtonElement>('.solitaire__toolbar button'));
    botones[1].click();
    montaje.detectChanges();
    expect(servicio.state().waste).toHaveLength(0);
  });

  it('opens the rules dialog from the classic Help menu', () => {
    const anfitrion = montaje.nativeElement as HTMLElement;
    const menuButtons = anfitrion.querySelectorAll<HTMLButtonElement>('.solitaire__menubar > .solitaire__menu > button');
    menuButtons[1].click();
    montaje.detectChanges();
    anfitrion.querySelector<HTMLButtonElement>('.solitaire__dropdown button')?.click();
    montaje.detectChanges();
    expect(anfitrion.querySelector('.solitaire__dialog')).toBeTruthy();
  });

  it('renders the red DRP back design on every face-down card', () => {
    const anfitrion = montaje.nativeElement as HTMLElement;
    const backs = Array.from(anfitrion.querySelectorAll('.solitaire-card--back'));

    expect(backs.length).toBeGreaterThan(1);
    expect(backs.every((back) => back.querySelector('.solitaire-card__back-mark'))).toBe(true);
    expect(anfitrion.querySelector('.solitaire__signature')?.textContent).toContain('Daniel Ramón Pérez');
    expect(anfitrion.querySelector('.solitaire__signature')?.textContent).toContain('Full Stack Developer');
  });

  it('mounts and removes the victory animation only with a winning state', () => {
    const ganada = signal(false);
    const contextoLienzo = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    montaje.destroy();
    Object.defineProperty(servicio, 'won', { value: ganada.asReadonly(), configurable: true });
    montaje = TestBed.createComponent(Solitario);
    const anfitrion = montaje.nativeElement as HTMLElement;

    montaje.detectChanges();
    expect(anfitrion.querySelector('app-solitaire-victory-animation')).toBeNull();

    ganada.set(true);
    montaje.detectChanges();
    expect(anfitrion.querySelector('app-solitaire-victory-animation canvas')).toBeTruthy();
    expect(anfitrion.querySelector('[role="alertdialog"]')).toBeNull();

    montaje.componentInstance.finishVictoryAnimation();
    montaje.detectChanges();
    expect(anfitrion.querySelector('[role="alertdialog"]')).toBeTruthy();

    ganada.set(false);
    montaje.detectChanges();
    expect(anfitrion.querySelector('app-solitaire-victory-animation')).toBeNull();
    contextoLienzo.mockRestore();
  });
});
