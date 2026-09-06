import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Buscaminas } from './minesweeper';
import { JuegoBuscaminas } from './minesweeper-game.service';

describe('Minesweeper', () => {
  let montaje: ComponentFixture<Buscaminas>;
  let servicio: JuegoBuscaminas;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Buscaminas] }).compileComponents();
    montaje = TestBed.createComponent(Buscaminas);
    servicio = TestBed.inject(JuegoBuscaminas);
    montaje.detectChanges();
  });

  it('renders the beginner board, counters and reset face', () => {
    const anfitrion = montaje.nativeElement as HTMLElement;
    expect(anfitrion.querySelectorAll('.minesweeper__cell')).toHaveLength(81);
    expect(anfitrion.querySelectorAll('.minesweeper__counter')).toHaveLength(2);
    expect(anfitrion.querySelector('.minesweeper__face')).toBeTruthy();
  });

  it('reveals a safe first square and updates the game state', () => {
    const anfitrion = montaje.nativeElement as HTMLElement;
    anfitrion.querySelector<HTMLButtonElement>('.minesweeper__cell')?.click();
    montaje.detectChanges();

    expect(servicio.state().minesPlaced).toBe(true);
    expect(servicio.state().cells[0][0].revealed).toBe(true);
    expect(anfitrion.querySelectorAll('.minesweeper__cell--revealed').length).toBeGreaterThan(0);
  });

  it('switches to the intermediate board through the classic game menu', () => {
    const anfitrion = montaje.nativeElement as HTMLElement;
    anfitrion.querySelector<HTMLButtonElement>('.minesweeper__menu > button')?.click();
    montaje.detectChanges();
    const opciones = anfitrion.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    opciones[1].click();
    montaje.detectChanges();

    expect(servicio.state().difficulty).toBe('intermediate');
    expect(anfitrion.querySelectorAll('.minesweeper__cell')).toHaveLength(256);
  });
});
