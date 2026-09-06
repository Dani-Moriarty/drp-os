import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDS_ARCHIVOS_AUDIO, PISTAS_AUDIO } from './audio-catalog';
import { ServicioReproductor } from './audio-player.service';

class FakeAudio extends EventTarget {
  static latest: FakeAudio;
  src = '';
  preload = '';
  crossOrigin: string | null = null;
  currentTime = 0;
  duration = 220;
  volume = 1;
  muted = false;
  paused = true;

  constructor() {
    super();
    FakeAudio.latest = this;
  }

  load(): void {
    this.dispatchEvent(new Event('loadstart'));
    this.dispatchEvent(new Event('loadedmetadata'));
  }

  async play(): Promise<void> {
    this.paused = false;
    this.dispatchEvent(new Event('play'));
  }

  pause(): void {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }

  removeAttribute(nombre: string): void {
    if (nombre === 'src') this.src = '';
  }
}

describe('AudioPlayerService', () => {
  let servicio: ServicioReproductor;

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('Audio', FakeAudio);
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(ServicioReproductor);
  });

  afterEach(() => {
    servicio.reset();
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  it('loads only the selected asset and builds a sibling playlist', async () => {
    await servicio.playFolderTrack(IDS_ARCHIVOS_AUDIO[1], IDS_ARCHIVOS_AUDIO.slice(0, 3));

    expect(servicio.playlist()).toEqual(PISTAS_AUDIO.slice(0, 3));
    expect(servicio.currentTrackId()).toBe(IDS_ARCHIVOS_AUDIO[1]);
    expect(FakeAudio.latest.src).toContain(PISTAS_AUDIO[1].assetUrl);
    expect(servicio.state()).toBe('playing');
  });

  it('implements pause, seeking, stop and track navigation', async () => {
    servicio.addTracks(IDS_ARCHIVOS_AUDIO.slice(0, 2));
    await servicio.play();
    servicio.seek(30);
    servicio.pause();

    expect(servicio.currentTime()).toBe(30);
    expect(servicio.state()).toBe('paused');

    await servicio.next();
    expect(servicio.currentTrackId()).toBe(IDS_ARCHIVOS_AUDIO[1]);

    servicio.stop();
    expect(servicio.currentTime()).toBe(0);
    expect(servicio.state()).toBe('stopped');
  });

  it('persists lightweight preferences without persisting playback state', () => {
    servicio.setVolume(0.35);
    servicio.setMuted(true);
    servicio.toggleShuffle();
    servicio.cycleRepeat();

    expect(servicio.volume()).toBe(0.35);
    expect(servicio.muted()).toBe(true);
    expect(servicio.shuffle()).toBe(true);
    expect(servicio.repeat()).toBe('all');
    expect(localStorage.getItem('drp-os.audio-player.preferences.v1')).toContain('0.35');
  });
});
