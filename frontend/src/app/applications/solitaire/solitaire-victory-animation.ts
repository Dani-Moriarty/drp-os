import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import {
  SOLITAIRE_SUITS,
  CartaSolitario,
  PartidaSolitario,
  PaloSolitario,
  cardColor,
} from './solitaire-game.service';

const LAUNCH_INTERVAL_MS = 92;
const TRAIL_FRAME_MS = 34;
const GRAVITY = 560;
const COMPLETE_DELAY_MS = 1300;

interface PilaLanzamientoBase {
  readonly suit: PaloSolitario;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly cards: CartaSolitario[];
}

interface CartaVoladora {
  readonly card: CartaSolitario;
  readonly width: number;
  readonly height: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

@Component({
  selector: 'app-solitaire-victory-animation',
  templateUrl: './solitaire-victory-animation.html',
  styleUrl: './solitaire-victory-animation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimacionVictoriaSolitario implements AfterViewInit, OnDestroy {
  readonly foundations = input.required<PartidaSolitario['foundations']>();
  readonly sequenceComplete = output<void>();

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly zone = inject(NgZone);

  private context: CanvasRenderingContext2D | null = null;
  private piles: PilaLanzamientoBase[] = [];
  private flyingCards: CartaVoladora[] = [];
  private animationFrame: number | null = null;
  private completionTimer: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private startedAt = 0;
  private lastFrameAt = 0;
  private lastTrailAt = 0;
  private launchedCards = 0;
  private totalCards = 0;
  private running = false;

  ngAfterViewInit(): void {
    const tablero = this.canvas().nativeElement.closest<HTMLElement>('.solitaire__board');
    if (!tablero) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.restart());
        this.resizeObserver.observe(tablero);
      }
      this.restart();
    });
  }

  ngOnDestroy(): void {
    this.stop();
    this.resizeObserver?.disconnect();
  }

  private restart(): void {
    this.stopAnimationLoop();

    const lienzo = this.canvas().nativeElement;
    const tablero = lienzo.closest<HTMLElement>('.solitaire__board');
    const contexto = lienzo.getContext('2d');
    if (!tablero || !contexto) {
      return;
    }

    const boardRect = tablero.getBoundingClientRect();
    if (boardRect.width <= 0 || boardRect.height <= 0) {
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = Math.max(1, Math.round(boardRect.width * pixelRatio));
    lienzo.height = Math.max(1, Math.round(boardRect.height * pixelRatio));
    contexto.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    contexto.imageSmoothingEnabled = false;
    contexto.clearRect(0, 0, boardRect.width, boardRect.height);
    this.context = contexto;

    const foundationElements = Array.from(
      tablero.querySelectorAll<HTMLElement>('.solitaire__foundation'),
    );
    this.piles = SOLITAIRE_SUITS.map((palo, indice) => {
      const rectangulo = foundationElements[indice]?.getBoundingClientRect();
      return {
        suit: palo,
        x: (rectangulo?.left ?? boardRect.left) - boardRect.left,
        y: (rectangulo?.top ?? boardRect.top) - boardRect.top,
        width: rectangulo?.width ?? 68,
        height: rectangulo?.height ?? 94,
        cards: [...this.foundations()[palo]].reverse().map((carta) => ({ ...carta })),
      };
    });
    this.flyingCards = [];
    this.launchedCards = 0;
    this.totalCards = this.piles.reduce((total, pila) => total + pila.cards.length, 0);
    this.startedAt = performance.now();
    this.lastFrameAt = this.startedAt;
    this.lastTrailAt = 0;
    this.running = true;

    this.piles.forEach((pila) => this.drawCard(pila.cards[0], pila.x, pila.y, pila.width, pila.height));
    this.animationFrame = requestAnimationFrame((tiempo) => this.animate(tiempo));
  }

  private animate(tiempo: number): void {
    if (!this.running || !this.context) {
      return;
    }

    const lienzo = this.canvas().nativeElement;
    const ancho = lienzo.clientWidth;
    const alto = lienzo.clientHeight;
    const deltaSeconds = Math.min((tiempo - this.lastFrameAt) / 1000, 0.05);
    this.lastFrameAt = tiempo;

    while (
      this.launchedCards < this.totalCards &&
      tiempo - this.startedAt >= this.launchedCards * LAUNCH_INTERVAL_MS
    ) {
      this.launchNextCard();
    }

    this.flyingCards.forEach((trayectoria) => {
      trayectoria.velocityY += GRAVITY * deltaSeconds;
      trayectoria.x += trayectoria.velocityX * deltaSeconds;
      trayectoria.y += trayectoria.velocityY * deltaSeconds;

      const floor = alto - trayectoria.height - 2;
      if (trayectoria.y >= floor && trayectoria.velocityY > 0) {
        trayectoria.y = floor;
        trayectoria.velocityY = -Math.abs(trayectoria.velocityY) * (0.68 + Math.random() * 0.08);
      }
    });

    this.flyingCards = this.flyingCards.filter(
      (trayectoria) => trayectoria.x > -trayectoria.width * 1.25 && trayectoria.x < ancho + trayectoria.width * 1.25,
    );

    if (tiempo - this.lastTrailAt >= TRAIL_FRAME_MS) {
      this.flyingCards.forEach((trayectoria) =>
        this.drawCard(trayectoria.card, trayectoria.x, trayectoria.y, trayectoria.width, trayectoria.height),
      );
      this.lastTrailAt = tiempo;
    }

    if (this.launchedCards >= this.totalCards && this.completionTimer === null) {
      this.completionTimer = window.setTimeout(() => {
        this.zone.run(() => this.sequenceComplete.emit());
      }, COMPLETE_DELAY_MS);
    }

    if (this.launchedCards < this.totalCards || this.flyingCards.length > 0) {
      this.animationFrame = requestAnimationFrame((nextTime) => this.animate(nextTime));
    } else {
      this.animationFrame = null;
    }
  }

  private launchNextCard(): void {
    const pila = this.nextPopulatedPile();
    const carta = pila?.cards.shift();
    if (!pila || !carta || !this.context) {
      this.launchedCards = this.totalCards;
      return;
    }

    const lienzo = this.canvas().nativeElement;
    this.context.clearRect(pila.x - 3, pila.y - 3, pila.width + 6, pila.height + 6);
    this.drawCard(pila.cards[0], pila.x, pila.y, pila.width, pila.height);

    const direccion = this.launchedCards % 3 === 0 ? 1 : -1;
    const horizontalSpeed = 115 + Math.random() * 205;
    const verticalSpeed = 185 + Math.random() * 285;
    this.flyingCards.push({
      card: carta,
      x: pila.x,
      y: pila.y,
      width: pila.width,
      height: pila.height,
      velocityX: direccion * horizontalSpeed,
      velocityY: -verticalSpeed,
    });
    this.launchedCards += 1;

    // Mantener el rebote dentro del tapete. El canvas recorta las salidas laterales;
    // la colisión con el suelo produce el rebote clásico.
    if (lienzo.clientHeight <= pila.height) {
      this.flyingCards.at(-1)!.velocityY = 0;
    }
  }

  private nextPopulatedPile(): PilaLanzamientoBase | undefined {
    for (let desplazamiento = 0; desplazamiento < this.piles.length; desplazamiento += 1) {
      const indice = (this.launchedCards + desplazamiento) % this.piles.length;
      if (this.piles[indice].cards.length > 0) {
        return this.piles[indice];
      }
    }
    return undefined;
  }

  private drawCard(
    carta: CartaSolitario | undefined,
    x: number,
    y: number,
    ancho: number,
    alto: number,
  ): void {
    const contexto = this.context;
    if (!contexto || !carta) {
      return;
    }

    const inset = Math.max(2, Math.round(ancho * 0.035));
    contexto.fillStyle = '#202020';
    contexto.fillRect(x + 2, y + 2, ancho, alto);
    contexto.fillStyle = '#fffef5';
    contexto.fillRect(x, y, ancho - 2, alto - 2);
    contexto.fillStyle = '#ffffff';
    contexto.fillRect(x, y, ancho - 2, 2);
    contexto.fillRect(x, y, 2, alto - 2);
    contexto.strokeStyle = '#555555';
    contexto.lineWidth = 1;
    contexto.strokeRect(x + inset, y + inset, ancho - inset * 2 - 2, alto - inset * 2 - 2);

    const color = cardColor(carta) === 'red' ? '#c60000' : '#111111';
    const valorCarta = ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' } as Record<number, string>)[carta.rank] ??
      String(carta.rank);
    const palo = ({ clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' } as const)[
      carta.suit
    ];

    contexto.fillStyle = color;
    contexto.textAlign = 'left';
    contexto.textBaseline = 'top';
    contexto.font = `700 ${Math.max(11, Math.round(ancho * 0.24))}px Arial, sans-serif`;
    contexto.fillText(valorCarta, x + Math.max(4, ancho * 0.07), y + Math.max(3, alto * 0.04));
    contexto.textAlign = 'center';
    contexto.textBaseline = 'middle';
    contexto.font = `700 ${Math.max(20, Math.round(ancho * 0.47))}px Georgia, serif`;
    contexto.fillText(palo, x + ancho / 2, y + alto * 0.58);
  }

  private stop(): void {
    this.running = false;
    this.stopAnimationLoop();
    this.context = null;
    this.flyingCards = [];
    this.piles = [];
  }

  private stopAnimationLoop(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.completionTimer !== null) {
      window.clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
  }
}
