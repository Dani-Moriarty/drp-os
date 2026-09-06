import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Localizacion } from '../../core/services/localization.service';
import { IdArchivoAudio, IdEntradaEscritorio } from '../../desktop/models/desktop.models';
import { TIPO_ARRASTRE_ENTRADA } from '../../desktop/services/desktop-file-system.service';
import { MAPA_PISTAS, PistaAudio, esIdArchivoAudio } from './audio-catalog';
import { ServicioReproductor } from './audio-player.service';

@Component({
  selector: 'app-audio-player',
  templateUrl: './audio-player.html',
  styleUrl: './audio-player.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reproductor implements AfterViewInit {
  @ViewChild('visualizer') private visualizer?: ElementRef<HTMLCanvasElement>;

  readonly availableTrackIds = input<readonly IdArchivoAudio[]>([]);
  readonly closeRequested = output<void>();
  readonly player = inject(ServicioReproductor);
  readonly i18n = inject(Localizacion);
  private readonly destroyRef = inject(DestroyRef);

  readonly selectedTrackId = signal<IdArchivoAudio | null>(null);
  readonly addDialogOpen = signal(false);
  readonly pendingAddIds = signal<ReadonlySet<IdArchivoAudio>>(new Set());
  readonly availableTracks = computed(() =>
    this.availableTrackIds().flatMap((id) => {
      const pista = MAPA_PISTAS.get(id);
      return pista ? [pista] : [];
    }),
  );

  private animationFrame = 0;

  ngAfterViewInit(): void {
    this.drawVisualizer();
    this.destroyRef.onDestroy(() => globalThis.cancelAnimationFrame?.(this.animationFrame));
  }

  text(es: string, en: string): string {
    return this.i18n.language() === 'es' ? es : en;
  }

  formatTime(segundos: number): string {
    if (!Number.isFinite(segundos) || segundos < 0) return '00:00';
    const whole = Math.floor(segundos);
    return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
  }

  displayDuration(pista: PistaAudio): number {
    return this.player.currentTrackId() === pista.id && this.player.duration()
      ? this.player.duration()
      : pista.durationSeconds;
  }

  repeatDescription(): string {
    const modo = this.player.repeat();
    const label = modo === 'one'
      ? this.text('una pista', 'one track')
      : modo === 'all'
        ? this.text('toda la lista', 'all tracks')
        : this.text('desactivado', 'off');
    return `${this.text('Repetir', 'Repeat')}: ${label}`;
  }

  selectTrack(id: IdArchivoAudio): void { this.selectedTrackId.set(id); }

  openAddDialog(): void {
    this.pendingAddIds.set(new Set());
    this.addDialogOpen.set(true);
  }

  togglePending(id: IdArchivoAudio, checked: boolean): void {
    const siguiente = new Set(this.pendingAddIds());
    if (checked) siguiente.add(id);
    else siguiente.delete(id);
    this.pendingAddIds.set(siguiente);
  }

  addPendingTracks(): void {
    this.player.addTracks([...this.pendingAddIds()]);
    this.addDialogOpen.set(false);
  }

  removeSelected(): void {
    const id = this.selectedTrackId();
    if (!id) return;
    this.player.removeTrack(id);
    this.selectedTrackId.set(null);
  }

  onSeek(evento: Event): void {
    this.player.seek(Number((evento.target as HTMLInputElement).value));
  }

  onVolume(evento: Event): void {
    this.player.setVolume(Number((evento.target as HTMLInputElement).value));
  }

  onDrop(evento: DragEvent): void {
    evento.preventDefault();
    const valorGuardado = evento.dataTransfer?.getData(TIPO_ARRASTRE_ENTRADA);
    if (!valorGuardado) return;
    try {
      const identificadores = JSON.parse(valorGuardado) as IdEntradaEscritorio[];
      this.player.addTracks(identificadores.filter((id): id is IdArchivoAudio => typeof id === 'string' && esIdArchivoAudio(id)));
    } catch { /* Ignore malformed data from outside DRP OS. */ }
  }

  private drawVisualizer(): void {
    const lienzo = this.visualizer?.nativeElement;
    if (!lienzo) return;
    const contexto = lienzo.getContext('2d');
    if (!contexto) return;
    const analizador = this.player.analyser();
    const valores = new Uint8Array(analizador?.frequencyBinCount ?? 32);
    if (analizador) analizador.getByteFrequencyData(valores);
    contexto.fillStyle = '#001005';
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);
    const bars = 28;
    const gap = 3;
    const ancho = Math.max(2, Math.floor((lienzo.width - gap * (bars + 1)) / bars));
    const rowHeight = 5;
    for (let indice = 0; indice < bars; indice += 1) {
      const sample = valores[Math.floor(indice * valores.length / bars)] ?? 0;
      const filas = Math.round(sample / 255 * 15);
      for (let fila = 0; fila < filas; fila += 1) {
        const ratio = fila / 15;
        contexto.fillStyle = ratio > 0.8 ? '#ff4b24' : ratio > 0.62 ? '#ffe631' : '#49ff61';
        contexto.fillRect(
          gap + indice * (ancho + gap),
          lienzo.height - 6 - fila * (rowHeight + 2),
          ancho,
          rowHeight,
        );
      }
    }
    this.animationFrame = globalThis.requestAnimationFrame?.(() => this.drawVisualizer()) ?? 0;
  }
}
