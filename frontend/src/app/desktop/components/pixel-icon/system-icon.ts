import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type NombreIconoSistema = 'shell' | 'api' | 'database' | 'assets' | 'session';
const ENCUADRES: Record<NombreIconoSistema, string> = {
  shell: '150 155 310 310',
  api: '625 140 240 325',
  database: '1025 170 285 295',
  assets: '330 600 315 275',
  session: '805 600 315 275',
};

/** Recortar el encuadre permite reutilizar el dibujo sin difuminar sus píxeles. */
@Component({
  selector: 'app-system-icon',
  template: `<svg [attr.viewBox]="viewBox()" aria-hidden="true">
    <image [attr.href]="source()" width="1448" height="1086" />
  </svg>`,
  styles: `:host { display: block; width: 100%; height: 100%; mix-blend-mode: multiply; }
    svg { display: block; width: 100%; height: 100%; overflow: hidden; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconoSistema {
  readonly name = input.required<NombreIconoSistema>();
  readonly viewBox = computed(() => ENCUADRES[this.name()]);
  readonly source = computed(() => '/assets/system-map/nodes.png');
}
