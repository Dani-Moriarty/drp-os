import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NombreIcono } from '../../models/desktop.models';

const IMAGENES_ICONOS: Partial<Record<NombreIcono, string>> = {
  browser: '/assets/desktop-icons/drp-explorer.png',
  computer: '/assets/desktop-icons/about-me.png',
  folder: '/assets/desktop-icons/work-experience.png',
  linkedin: '/assets/desktop-icons/linkedin.png',
  'text-file': '/assets/desktop-icons/education-txt.png',
  'pdf-file': '/assets/desktop-icons/cv-pdf.png',
  'source-code': '/assets/desktop-icons/source-code.png',
  terminal: '/assets/desktop-icons/terminal.png',
  'recycle-bin': '/assets/desktop-icons/recycle-bin.png',
  'recycle-bin-empty': '/assets/desktop-icons/recycle-bin-empty.png',
  'image-file': '/assets/desktop-icons/image-file.png',
  mail: '/assets/desktop-icons/hire.png',
  paint: '/assets/desktop-icons/paint-98.png',
  'playing-cards': '/assets/desktop-icons/solitaire.png',
  mine: '/assets/desktop-icons/minesweeper.png',
  'task-manager': '/assets/desktop-icons/task-manager.png',
  'audio-file': '/assets/desktop-icons/audio-file.png',
  'audio-player': '/assets/desktop-icons/audio-player.png',
  'league-client': '/assets/desktop-icons/league-client.png',
};

@Component({
  selector: 'app-pixel-icon',
  templateUrl: './pixel-icon.html',
  styleUrl: './pixel-icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconoPixel {
  readonly name = input.required<NombreIcono>();
  readonly size = input<'small' | 'large'>('large');
  readonly imageSource = computed(() => IMAGENES_ICONOS[this.name()] ?? null);
}
