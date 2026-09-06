import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  output,
  signal,
} from '@angular/core';
import { Localizacion, ClaveTraduccion } from '../../core/services/localization.service';
import { DocumentosPaint } from './paint-document.service';
import { SesionPaint } from './paint-session.service';

type HerramientaPaint = 'pencil' | 'brush' | 'eraser' | 'fill' | 'line' | 'rectangle' | 'ellipse';
type MenuPaint = 'file' | 'edit' | 'view' | 'image' | 'colors' | 'help';
type AccionPaint =
  | 'new'
  | 'open'
  | 'save'
  | 'save-as'
  | 'export-png'
  | 'close'
  | 'undo'
  | 'redo'
  | 'clear'
  | 'toggle-tools'
  | 'toggle-palette'
  | 'toggle-status'
  | 'invert'
  | 'reset-colors'
  | 'about';

interface OpcionPaint {
  action: AccionPaint;
  label: ClaveTraduccion;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
  checked?: boolean;
}

const ANCHO_LIENZO = 800;
const ALTO_LIENZO = 500;
const BLANCO = '#ffffff';

const COLORES_INICIALES = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080',
  '#808040', '#004040', '#0080ff', '#004080', '#4000ff', '#804000', '#ffffff', '#c0c0c0',
  '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80',
  '#80ffff', '#8080ff', '#ff0080', '#ff8040',
] as const;

@Component({
  selector: 'app-paint',
  templateUrl: './paint.html',
  styleUrl: './paint.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AplicacionPaint implements AfterViewInit {
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput', { static: true }) private fileInputRef!: ElementRef<HTMLInputElement>;

  readonly closeRequested = output<void>();
  readonly i18n = inject(Localizacion);
  readonly session = inject(SesionPaint);
  private readonly documents = inject(DocumentosPaint);

  readonly tools: readonly { id: HerramientaPaint; symbol: string; label: ClaveTraduccion }[] = [
    { id: 'pencil', symbol: '✎', label: 'paint.tool.pencil' },
    { id: 'brush', symbol: '▰', label: 'paint.tool.brush' },
    { id: 'eraser', symbol: '▱', label: 'paint.tool.eraser' },
    { id: 'fill', symbol: '◩', label: 'paint.tool.fill' },
    { id: 'line', symbol: '╱', label: 'paint.tool.line' },
    { id: 'rectangle', symbol: '□', label: 'paint.tool.rectangle' },
    { id: 'ellipse', symbol: '○', label: 'paint.tool.ellipse' },
  ];
  readonly menuNames: readonly { id: MenuPaint; label: ClaveTraduccion }[] = [
    { id: 'file', label: 'paint.menu.file' },
    { id: 'edit', label: 'paint.menu.edit' },
    { id: 'view', label: 'paint.menu.view' },
    { id: 'image', label: 'paint.menu.image' },
    { id: 'colors', label: 'paint.menu.colors' },
    { id: 'help', label: 'paint.menu.help' },
  ];
  readonly colors = COLORES_INICIALES;
  readonly widths = [1, 3, 5, 8, 12] as const;
  readonly activeMenu = signal<MenuPaint | null>(null);
  readonly selectedTool = signal<HerramientaPaint>('pencil');
  readonly selectedColor = signal('#000000');
  readonly strokeWidth = signal(3);
  readonly showTools = signal(true);
  readonly showPalette = signal(true);
  readonly showStatus = signal(true);
  readonly pointerPosition = signal({ x: 0, y: 0 });
  readonly dialog = signal<'save-as' | 'new-confirm' | 'about' | 'error' | null>(null);
  readonly dialogMessage = signal('');
  readonly fileNameDraft = signal('drawing.png');

  private context: CanvasRenderingContext2D | null = null;
  private drawingStart: { x: number; y: number } | null = null;
  private lastPoint: { x: number; y: number } | null = null;
  private drawingBase: ImageData | null = null;
  private activePointerId: number | null = null;

  ngAfterViewInit(): void {
    const lienzo = this.canvasRef.nativeElement;
    this.context = lienzo.getContext('2d', { willReadFrequently: true });
    if (!this.context) {
      this.showError(this.i18n.t('paint.error.canvas'));
      return;
    }

    this.context.imageSmoothingEnabled = false;
    const restaurado = this.session.snapshot();
    if (restaurado?.width === lienzo.width && restaurado.height === lienzo.height) {
      this.context.putImageData(restaurado, 0, 0);
    } else {
      this.paintWhite();
      this.session.replace(this.capture(), 'drawing.png', false);
    }
  }

  menuItems(menu: MenuPaint): readonly OpcionPaint[] {
    switch (menu) {
      case 'file':
        return [
          { action: 'new', label: 'paint.file.new', shortcut: 'Ctrl+N' },
          { action: 'open', label: 'paint.file.open', shortcut: 'Ctrl+O' },
          { action: 'save', label: 'paint.file.save', shortcut: 'Ctrl+S', separator: true },
          { action: 'save-as', label: 'paint.file.saveAs' },
          { action: 'export-png', label: 'paint.file.exportPng' },
          { action: 'close', label: 'paint.file.exit', separator: true },
        ];
      case 'edit':
        return [
          { action: 'undo', label: 'paint.edit.undo', shortcut: 'Ctrl+Z', disabled: !this.session.canUndo() },
          { action: 'redo', label: 'paint.edit.redo', shortcut: 'Ctrl+Y', disabled: !this.session.canRedo() },
          { action: 'clear', label: 'paint.edit.clear', separator: true },
        ];
      case 'view':
        return [
          { action: 'toggle-tools', label: 'paint.view.toolbox', checked: this.showTools() },
          { action: 'toggle-palette', label: 'paint.view.palette', checked: this.showPalette() },
          { action: 'toggle-status', label: 'paint.view.status', checked: this.showStatus() },
        ];
      case 'image':
        return [
          { action: 'clear', label: 'paint.image.clear' },
          { action: 'invert', label: 'paint.image.invert' },
        ];
      case 'colors':
        return [{ action: 'reset-colors', label: 'paint.colors.reset' }];
      case 'help':
        return [{ action: 'about', label: 'paint.help.about' }];
    }
  }

  toggleMenu(menu: MenuPaint, evento: Event): void {
    evento.stopPropagation();
    this.activeMenu.update((activo) => (activo === menu ? null : menu));
  }

  execute(accion: AccionPaint): void {
    this.activeMenu.set(null);
    switch (accion) {
      case 'new':
        this.requestNew();
        break;
      case 'open':
        this.fileInputRef.nativeElement.click();
        break;
      case 'save':
        void this.saveVirtualImage(this.session.documentName(), false);
        break;
      case 'save-as':
        this.fileNameDraft.set(this.session.documentName());
        this.dialog.set('save-as');
        break;
      case 'export-png':
        void this.exportPng();
        break;
      case 'close':
        this.closeRequested.emit();
        break;
      case 'undo':
        this.applySnapshot(this.session.undo());
        break;
      case 'redo':
        this.applySnapshot(this.session.redo());
        break;
      case 'clear':
        this.clearCanvas();
        break;
      case 'toggle-tools':
        this.showTools.update((mostrado) => !mostrado);
        break;
      case 'toggle-palette':
        this.showPalette.update((mostrado) => !mostrado);
        break;
      case 'toggle-status':
        this.showStatus.update((mostrado) => !mostrado);
        break;
      case 'invert':
        this.invertColors();
        break;
      case 'reset-colors':
        this.selectedColor.set('#000000');
        break;
      case 'about':
        this.dialog.set('about');
        break;
    }
  }

  selectTool(tool: HerramientaPaint): void {
    this.finishUnexpectedInteraction();
    this.selectedTool.set(tool);
  }

  selectedToolLabel(): string {
    return this.i18n.t(`paint.tool.${this.selectedTool()}` as ClaveTraduccion);
  }

  onPointerDown(evento: PointerEvent): void {
    if (!this.context || evento.button !== 0) {
      return;
    }
    evento.preventDefault();
    const punto = this.canvasPoint(evento);
    this.pointerPosition.set(punto);
    this.activePointerId = evento.pointerId;
    this.canvasRef.nativeElement.setPointerCapture(evento.pointerId);

    if (this.selectedTool() === 'fill') {
      if (this.floodFill(punto.x, punto.y, this.selectedColor())) {
        this.commitCanvas();
      }
      this.releasePointer(evento.pointerId);
      return;
    }

    this.drawingStart = punto;
    this.lastPoint = punto;
    this.drawingBase = this.capture();
    if (this.isFreehand()) {
      this.drawFreehandPoint(punto);
    }
  }

  onPointerMove(evento: PointerEvent): void {
    const punto = this.canvasPoint(evento);
    this.pointerPosition.set(punto);
    if (!this.context || this.activePointerId !== evento.pointerId || !this.drawingStart) {
      return;
    }

    if (this.isFreehand()) {
      this.drawFreehandSegment(this.lastPoint ?? this.drawingStart, punto);
      this.lastPoint = punto;
    } else {
      this.drawShapePreview(punto);
    }
  }

  onPointerUp(evento: PointerEvent): void {
    if (this.activePointerId !== evento.pointerId) {
      return;
    }
    const punto = this.canvasPoint(evento);
    if (this.drawingStart && !this.isFreehand()) {
      this.drawShapePreview(punto);
    }
    if (this.drawingStart) {
      this.commitCanvas();
    }
    this.resetInteraction();
    this.releasePointer(evento.pointerId);
  }

  onPointerCancel(evento: PointerEvent): void {
    if (this.activePointerId !== evento.pointerId) {
      return;
    }
    if (this.context && this.drawingBase) {
      this.context.putImageData(this.drawingBase, 0, 0);
    }
    this.resetInteraction();
    this.releasePointer(evento.pointerId);
  }

  onLostPointerCapture(evento: PointerEvent): void {
    if (this.activePointerId === evento.pointerId) {
      this.finishUnexpectedInteraction();
    }
  }

  async openImage(evento: Event): Promise<void> {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = '';
    if (!archivo || !this.context) {
      return;
    }

    try {
      const origen = await this.documents.decodeImage(archivo);
      this.paintWhite();
      const dimensions = this.imageDimensions(origen);
      const scale = Math.min(ANCHO_LIENZO / dimensions.width, ALTO_LIENZO / dimensions.height, 1);
      const ancho = Math.round(dimensions.width * scale);
      const alto = Math.round(dimensions.height * scale);
      const x = Math.round((ANCHO_LIENZO - ancho) / 2);
      const y = Math.round((ALTO_LIENZO - alto) / 2);
      this.context.drawImage(origen, x, y, ancho, alto);
      this.session.replace(this.capture(), this.documents.pngFileName(archivo.name), false);
      if ('close' in origen && typeof origen.close === 'function') {
        origen.close();
      }
    } catch {
      this.showError(this.i18n.t('paint.error.open'));
    }
  }

  confirmSaveAs(evento: Event): void {
    evento.preventDefault();
    void this.saveVirtualImage(this.fileNameDraft(), true);
    this.dialog.set(null);
  }

  confirmNew(): void {
    this.dialog.set(null);
    this.newDocument();
  }

  updateFileName(evento: Event): void {
    this.fileNameDraft.set((evento.target as HTMLInputElement).value);
  }

  closeDialog(): void {
    this.dialog.set(null);
  }

  dismissMenu(evento: PointerEvent): void {
    if (!(evento.target as HTMLElement).closest('.paint-app__menu')) {
      this.activeMenu.set(null);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      this.activeMenu.set(null);
      this.dialog.set(null);
      return;
    }
    if (!evento.ctrlKey && !evento.metaKey) {
      return;
    }
    const accion = ({ n: 'new', o: 'open', s: 'save', z: 'undo', y: 'redo' } as const)[
      evento.key.toLowerCase() as 'n' | 'o' | 's' | 'z' | 'y'
    ];
    if (accion) {
      evento.preventDefault();
      this.execute(accion);
    }
  }

  private requestNew(): void {
    if (this.session.dirty()) {
      this.dialog.set('new-confirm');
    } else {
      this.newDocument();
    }
  }

  private newDocument(): void {
    if (!this.context) {
      return;
    }
    this.paintWhite();
    this.session.replace(this.capture(), 'drawing.png', false);
  }

  private async saveVirtualImage(nombreSolicitado: string, saveAs: boolean): Promise<void> {
    if (!this.context) {
      return;
    }
    try {
      const resultado = await this.documents.saveVirtualPng(
        nombreSolicitado,
        this.canvasRef.nativeElement,
        saveAs ? null : this.session.fileId(),
      );
      if (!resultado) {
        throw new Error('Virtual file system is unavailable.');
      }
      this.session.markSaved(resultado.name, resultado.id);
    } catch {
      this.showError(this.i18n.t('paint.error.save'));
    }
  }

  private async exportPng(): Promise<void> {
    try {
      await this.documents.downloadPng(this.canvasRef.nativeElement, this.session.documentName());
    } catch {
      this.showError(this.i18n.t('paint.error.save'));
    }
  }

  private clearCanvas(): void {
    if (!this.context) {
      return;
    }
    this.paintWhite();
    this.commitCanvas();
  }

  private invertColors(): void {
    if (!this.context) {
      return;
    }
    const imagen = this.capture();
    for (let indice = 0; indice < imagen.data.length; indice += 4) {
      imagen.data[indice] = 255 - imagen.data[indice];
      imagen.data[indice + 1] = 255 - imagen.data[indice + 1];
      imagen.data[indice + 2] = 255 - imagen.data[indice + 2];
    }
    this.context.putImageData(imagen, 0, 0);
    this.commitCanvas();
  }

  private drawFreehandPoint(punto: { x: number; y: number }): void {
    if (!this.context) {
      return;
    }
    const ancho = this.toolWidth();
    this.context.fillStyle = this.toolColor();
    this.context.beginPath();
    this.context.arc(punto.x, punto.y, Math.max(0.5, ancho / 2), 0, Math.PI * 2);
    this.context.fill();
  }

  private drawFreehandSegment(from: { x: number; y: number }, to: { x: number; y: number }): void {
    if (!this.context) {
      return;
    }
    this.configureStroke();
    this.context.beginPath();
    this.context.moveTo(from.x, from.y);
    this.context.lineTo(to.x, to.y);
    this.context.stroke();
  }

  private drawShapePreview(punto: { x: number; y: number }): void {
    if (!this.context || !this.drawingBase || !this.drawingStart) {
      return;
    }
    this.context.putImageData(this.drawingBase, 0, 0);
    this.configureStroke();
    const inicio = this.drawingStart;
    const ancho = punto.x - inicio.x;
    const alto = punto.y - inicio.y;
    this.context.beginPath();
    if (this.selectedTool() === 'line') {
      this.context.moveTo(inicio.x, inicio.y);
      this.context.lineTo(punto.x, punto.y);
    } else if (this.selectedTool() === 'rectangle') {
      this.context.rect(inicio.x, inicio.y, ancho, alto);
    } else {
      this.context.ellipse(
        inicio.x + ancho / 2,
        inicio.y + alto / 2,
        Math.abs(ancho / 2),
        Math.abs(alto / 2),
        0,
        0,
        Math.PI * 2,
      );
    }
    this.context.stroke();
  }

  private configureStroke(): void {
    if (!this.context) {
      return;
    }
    this.context.strokeStyle = this.toolColor();
    this.context.lineWidth = this.toolWidth();
    this.context.lineCap = this.selectedTool() === 'pencil' ? 'butt' : 'round';
    this.context.lineJoin = 'round';
  }

  private toolColor(): string {
    return this.selectedTool() === 'eraser' ? BLANCO : this.selectedColor();
  }

  private toolWidth(): number {
    if (this.selectedTool() === 'pencil') {
      return 1;
    }
    if (this.selectedTool() === 'eraser') {
      return Math.max(8, this.strokeWidth() * 3);
    }
    return this.strokeWidth();
  }

  private isFreehand(): boolean {
    return ['pencil', 'brush', 'eraser'].includes(this.selectedTool());
  }

  private canvasPoint(evento: PointerEvent): { x: number; y: number } {
    const lienzo = this.canvasRef.nativeElement;
    const limites = lienzo.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(lienzo.width - 1, Math.round(((evento.clientX - limites.left) * lienzo.width) / limites.width))),
      y: Math.max(0, Math.min(lienzo.height - 1, Math.round(((evento.clientY - limites.top) * lienzo.height) / limites.height))),
    };
  }

  private capture(): ImageData {
    return this.context!.getImageData(0, 0, ANCHO_LIENZO, ALTO_LIENZO);
  }

  private commitCanvas(): void {
    this.session.commit(this.capture());
  }

  private applySnapshot(copiaEstado: ImageData | null): void {
    if (copiaEstado && this.context) {
      this.context.putImageData(copiaEstado, 0, 0);
    }
  }

  private paintWhite(): void {
    if (!this.context) {
      return;
    }
    this.context.save();
    this.context.fillStyle = BLANCO;
    this.context.fillRect(0, 0, ANCHO_LIENZO, ALTO_LIENZO);
    this.context.restore();
  }

  private floodFill(x: number, y: number, color: string): boolean {
    if (!this.context) {
      return false;
    }
    const imagen = this.capture();
    const indiceDestino = (y * imagen.width + x) * 4;
    const destino = Array.from(imagen.data.slice(indiceDestino, indiceDestino + 4));
    const replacement = this.hexColor(color);
    if (destino.every((canal, indice) => canal === replacement[indice])) {
      return false;
    }

    const matches = (pixelX: number, pixelY: number) => {
      const indice = (pixelY * imagen.width + pixelX) * 4;
      return destino.every((canal, desplazamiento) => imagen.data[indice + desplazamiento] === canal);
    };
    const paint = (pixelX: number, pixelY: number) => {
      const indice = (pixelY * imagen.width + pixelX) * 4;
      replacement.forEach((canal, desplazamiento) => (imagen.data[indice + desplazamiento] = canal));
    };

    const stack: { x: number; y: number }[] = [{ x, y }];
    while (stack.length) {
      const seed = stack.pop()!;
      let top = seed.y;
      while (top >= 0 && matches(seed.x, top)) {
        top -= 1;
      }
      top += 1;
      let spanLeft = false;
      let spanRight = false;
      for (let currentY = top; currentY < imagen.height && matches(seed.x, currentY); currentY += 1) {
        paint(seed.x, currentY);
        if (seed.x > 0) {
          if (matches(seed.x - 1, currentY) && !spanLeft) {
            stack.push({ x: seed.x - 1, y: currentY });
            spanLeft = true;
          } else if (!matches(seed.x - 1, currentY)) {
            spanLeft = false;
          }
        }
        if (seed.x < imagen.width - 1) {
          if (matches(seed.x + 1, currentY) && !spanRight) {
            stack.push({ x: seed.x + 1, y: currentY });
            spanRight = true;
          } else if (!matches(seed.x + 1, currentY)) {
            spanRight = false;
          }
        }
      }
    }
    this.context.putImageData(imagen, 0, 0);
    return true;
  }

  private hexColor(color: string): [number, number, number, number] {
    return [
      Number.parseInt(color.slice(1, 3), 16),
      Number.parseInt(color.slice(3, 5), 16),
      Number.parseInt(color.slice(5, 7), 16),
      255,
    ];
  }

  private imageDimensions(origen: ImageBitmap | HTMLImageElement): { width: number; height: number } {
    if (origen instanceof HTMLImageElement) {
      return { width: origen.naturalWidth, height: origen.naturalHeight };
    }
    return { width: origen.width, height: origen.height };
  }

  private finishUnexpectedInteraction(): void {
    if (this.drawingStart && this.context) {
      this.commitCanvas();
    }
    this.resetInteraction();
  }

  private resetInteraction(): void {
    this.drawingStart = null;
    this.lastPoint = null;
    this.drawingBase = null;
    this.activePointerId = null;
  }

  private releasePointer(idPuntero: number): void {
    const lienzo = this.canvasRef.nativeElement;
    if (lienzo.hasPointerCapture(idPuntero)) {
      lienzo.releasePointerCapture(idPuntero);
    }
  }

  private showError(mensaje: string): void {
    this.dialogMessage.set(mensaje);
    this.dialog.set('error');
  }
}
