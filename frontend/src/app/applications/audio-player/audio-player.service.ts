import { Injectable, computed, inject, signal } from '@angular/core';
import { ActividadSistema } from '../../core/system-activity/system-activity.service';
import { IdArchivoAudio } from '../../desktop/models/desktop.models';
import { MAPA_PISTAS } from './audio-catalog';

type EstadoReproduccion = 'empty' | 'loading' | 'playing' | 'paused' | 'stopped' | 'error';
type ModoRepeticion = 'off' | 'all' | 'one';

const CLAVE_PREFERENCIAS = 'drp-os.audio-player.preferences.v1';

@Injectable({ providedIn: 'root' })
export class ServicioReproductor {
  private readonly activity = inject(ActividadSistema);
  private readonly audio: HTMLAudioElement | null = typeof Audio === 'undefined' ? null : new Audio();
  private audioContext?: AudioContext;
  private analyserNode?: AnalyserNode;
  private sourceNode?: MediaElementAudioSourceNode;
  private readonly preferences = this.readPreferences();

  readonly playlistIds = signal<IdArchivoAudio[]>([]);
  readonly currentTrackId = signal<IdArchivoAudio | null>(null);
  readonly state = signal<EstadoReproduccion>('empty');
  readonly currentTime = signal(0);
  readonly duration = signal(0);
  readonly volume = signal(this.preferences.volume);
  readonly muted = signal(this.preferences.muted);
  readonly shuffle = signal(this.preferences.shuffle);
  readonly repeat = signal<ModoRepeticion>(this.preferences.repeat);
  readonly errorMessage = signal<string | null>(null);

  readonly playlist = computed(() =>
    this.playlistIds().flatMap((id) => {
      const elemento = MAPA_PISTAS.get(id);
      return elemento ? [elemento] : [];
    }),
  );
  readonly currentTrack = computed(() => {
    const id = this.currentTrackId();
    return id ? MAPA_PISTAS.get(id) ?? null : null;
  });

  constructor() {
    if (!this.audio) return;
    this.audio.preload = 'metadata';
    this.audio.crossOrigin = 'anonymous';
    this.audio.volume = this.volume();
    this.audio.muted = this.muted();
    this.audio.addEventListener('loadstart', () => {
      this.state.set('loading');
      this.activity.pulse('audio-player', 'load');
    });
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(Number.isFinite(this.audio?.duration) ? this.audio?.duration ?? 0 : 0);
      this.state.set(this.audio?.paused ? 'paused' : 'playing');
      this.activity.pulse('assets', 'open');
    });
    this.audio.addEventListener('durationchange', () =>
      this.duration.set(Number.isFinite(this.audio?.duration) ? this.audio?.duration ?? 0 : 0),
    );
    this.audio.addEventListener('timeupdate', () => this.currentTime.set(this.audio?.currentTime ?? 0));
    this.audio.addEventListener('play', () => this.state.set('playing'));
    this.audio.addEventListener('pause', () => {
      if (this.state() === 'playing') this.state.set('paused');
    });
    this.audio.addEventListener('ended', () => this.handleEnded());
    this.audio.addEventListener('error', () => {
      this.state.set('error');
      this.errorMessage.set('No se ha podido cargar esta pista.');
      this.activity.pulse('audio-player', 'stop');
    });
  }

  addTracks(identificadores: readonly IdArchivoAudio[]): void {
    const valid = identificadores.filter((id) => MAPA_PISTAS.has(id));
    this.playlistIds.update((actual) => [...actual, ...valid.filter((id) => !actual.includes(id))]);
    if (valid.length) this.activity.pulse('audio-player', 'playlist');
  }

  async playFolderTrack(id: IdArchivoAudio, hermanos: readonly IdArchivoAudio[]): Promise<void> {
    this.playlistIds.set([...new Set(hermanos.filter((elemento) => MAPA_PISTAS.has(elemento)))]);
    await this.playTrack(id);
  }

  async playTrack(id: IdArchivoAudio): Promise<void> {
    const pista = MAPA_PISTAS.get(id);
    if (!pista || !this.audio) return;
    this.addTracks([id]);
    this.errorMessage.set(null);
    if (this.currentTrackId() !== id || !this.audio.src) {
      this.currentTrackId.set(id);
      this.currentTime.set(0);
      this.duration.set(pista.durationSeconds);
      this.audio.src = pista.assetUrl;
      this.audio.load();
    }
    try {
      const resume = this.resumeContext();
      const playback = this.audio.play();
      await Promise.all([resume, playback]);
      this.state.set('playing');
      this.activity.pulse('audio-player', 'play');
    } catch {
      this.state.set('paused');
      this.errorMessage.set('El navegador ha bloqueado la reproducción. Pulsa Reproducir.');
    }
  }

  async play(): Promise<void> {
    const actual = this.currentTrackId() ?? this.playlistIds()[0];
    if (actual) await this.playTrack(actual);
  }

  pause(): void {
    if (this.audio && !this.audio.paused) this.audio.pause();
    if (this.currentTrackId()) this.state.set('paused');
    this.activity.pulse('audio-player', 'pause');
  }

  stop(): void {
    if (this.audio && !this.audio.paused) this.audio.pause();
    if (this.audio) this.audio.currentTime = 0;
    this.currentTime.set(0);
    this.state.set(this.currentTrackId() ? 'stopped' : 'empty');
    this.activity.pulse('audio-player', 'stop');
  }

  async previous(): Promise<void> { await this.step(-1); }
  async next(): Promise<void> { await this.step(1); }

  seek(segundos: number): void {
    if (!this.audio || !Number.isFinite(segundos)) return;
    this.audio.currentTime = Math.max(0, Math.min(segundos, this.duration() || segundos));
    this.currentTime.set(this.audio.currentTime);
    this.activity.pulse('audio-player', 'seek');
  }

  setVolume(valor: number): void {
    const volumen = Math.max(0, Math.min(1, valor));
    this.volume.set(volumen);
    if (this.audio) this.audio.volume = volumen;
    if (volumen > 0 && this.muted()) this.setMuted(false);
    this.persistPreferences();
    this.activity.pulse('audio-player', 'volume');
  }

  setMuted(silenciado: boolean): void {
    this.muted.set(silenciado);
    if (this.audio) this.audio.muted = silenciado;
    this.persistPreferences();
    this.activity.pulse('audio-player', 'volume');
  }

  toggleShuffle(): void {
    this.shuffle.update((valor) => !valor);
    this.persistPreferences();
    this.activity.pulse('audio-player', 'playlist');
  }

  cycleRepeat(): void {
    this.repeat.update((valor) => valor === 'off' ? 'all' : valor === 'all' ? 'one' : 'off');
    this.persistPreferences();
    this.activity.pulse('audio-player', 'playlist');
  }

  removeTrack(id: IdArchivoAudio): void {
    const identificadores = this.playlistIds();
    const wasCurrent = this.currentTrackId() === id;
    this.playlistIds.set(identificadores.filter((elemento) => elemento !== id));
    if (wasCurrent) {
      this.stop();
      this.currentTrackId.set(null);
      this.duration.set(0);
      this.state.set(this.playlistIds().length ? 'stopped' : 'empty');
    }
    this.activity.pulse('audio-player', 'playlist');
  }

  clearPlaylist(): void {
    this.stop();
    this.playlistIds.set([]);
    this.currentTrackId.set(null);
    this.duration.set(0);
    this.state.set('empty');
    if (this.audio) this.audio.removeAttribute('src');
    this.activity.pulse('audio-player', 'playlist');
  }

  close(): void { this.stop(); }

  reset(): void {
    this.clearPlaylist();
    this.errorMessage.set(null);
  }

  analyser(): AnalyserNode | null {
    return this.analyserNode ?? null;
  }

  private async step(direccion: -1 | 1): Promise<void> {
    const identificadores = this.playlistIds();
    if (!identificadores.length) return;
    const indiceActual = Math.max(0, identificadores.indexOf(this.currentTrackId() ?? identificadores[0]));
    let indiceSiguiente: number;
    if (this.shuffle() && identificadores.length > 1) {
      const choices = identificadores.map((_, indice) => indice).filter((indice) => indice !== indiceActual);
      indiceSiguiente = choices[Math.floor(Math.random() * choices.length)];
    } else {
      indiceSiguiente = (indiceActual + direccion + identificadores.length) % identificadores.length;
    }
    await this.playTrack(identificadores[indiceSiguiente]);
  }

  private async handleEnded(): Promise<void> {
    if (this.repeat() === 'one' && this.audio) {
      this.audio.currentTime = 0;
      await this.play();
      return;
    }
    const identificadores = this.playlistIds();
    const indice = identificadores.indexOf(this.currentTrackId() ?? identificadores[0]);
    if (this.shuffle() || indice < identificadores.length - 1 || this.repeat() === 'all') {
      await this.next();
    } else {
      this.state.set('stopped');
      this.currentTime.set(this.duration());
    }
  }

  private async resumeContext(): Promise<void> {
    if (!this.audio) return;
    if (!this.audioContext) {
      const AudioContextType = globalThis.AudioContext;
      if (!AudioContextType) return;
      this.audioContext = new AudioContextType();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.72;
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      this.sourceNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') await this.audioContext.resume();
  }

  private readPreferences(): { volume: number; muted: boolean; shuffle: boolean; repeat: ModoRepeticion } {
    const alternativa = { volume: 0.72, muted: false, shuffle: false, repeat: 'off' as ModoRepeticion };
    try {
      const datosLeidos = JSON.parse(globalThis.localStorage?.getItem(CLAVE_PREFERENCIAS) ?? 'null') as Partial<typeof alternativa> | null;
      return {
        volume: typeof datosLeidos?.volume === 'number' ? Math.max(0, Math.min(1, datosLeidos.volume)) : alternativa.volume,
        muted: typeof datosLeidos?.muted === 'boolean' ? datosLeidos.muted : alternativa.muted,
        shuffle: typeof datosLeidos?.shuffle === 'boolean' ? datosLeidos.shuffle : alternativa.shuffle,
        repeat: datosLeidos?.repeat === 'all' || datosLeidos?.repeat === 'one' ? datosLeidos.repeat : 'off',
      };
    } catch { return alternativa; }
  }

  private persistPreferences(): void {
    try {
      globalThis.localStorage?.setItem(CLAVE_PREFERENCIAS, JSON.stringify({
        volume: this.volume(), muted: this.muted(), shuffle: this.shuffle(), repeat: this.repeat(),
      }));
    } catch { /* Preferences remain available for this session. */ }
  }
}
