import { leerAlmacenamiento } from '../../core/services/system-storage';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MensajeTablon } from '../../core/models/message-board.model';
import { Localizacion } from '../../core/services/localization.service';
import { AdministracionTablon } from '../../core/services/message-board-admin.service';
import { ServicioTablon } from '../../core/services/message-board.service';

type MenuTablon = 'file' | 'view' | 'help';
type CampoTablon = 'author' | 'message';

const CLAVE_AUTOR = 'drp-os.message-board.author.v1';
const NOMBRE_ADMINISTRADOR = 'Daniel Ramón Pérez';
const PAGINA_VACIA = {
  messages: [] as MensajeTablon[],
  page: 0,
  totalPages: 1,
  totalMessages: 0,
  hasOlder: false,
  hasNewer: false,
};

@Component({
  selector: 'app-message-board',
  templateUrl: './message-board.html',
  styleUrl: './message-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TablonMensajes implements OnInit {
  readonly closeRequested = output<void>();
  readonly i18n = inject(Localizacion);

  readonly page = signal(PAGINA_VACIA);
  readonly author = signal(this.readRememberedAuthor());
  readonly message = signal('');
  readonly website = signal('');
  readonly touched = signal<ReadonlySet<CampoTablon>>(new Set());
  readonly loading = signal(false);
  readonly posting = signal(false);
  readonly loadFailed = signal(false);
  readonly postFailed = signal(false);
  readonly activeMenu = signal<MenuTablon | null>(null);
  readonly aboutOpen = signal(false);
  readonly selectedMessageId = signal<number | null>(null);
  readonly messageContextMenu = signal<{ entry: MensajeTablon; x: number; y: number } | null>(null);
  readonly pendingDelete = signal<MensajeTablon | null>(null);
  readonly deleting = signal(false);
  readonly deleteFailed = signal(false);

  private readonly board = inject(ServicioTablon);
  readonly admin = inject(AdministracionTablon);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.admin.initialize();
    this.load(0);
  }

  toggleMenu(menu: MenuTablon, evento: MouseEvent): void {
    evento.stopPropagation();
    this.activeMenu.update((actual) => (actual === menu ? null : menu));
  }

  dismissMenu(evento: PointerEvent): void {
    if (!(evento.target as HTMLElement).closest('.message-board__menu')) {
      this.activeMenu.set(null);
    }
    if (!(evento.target as HTMLElement).closest('.message-board__context-menu')) {
      this.messageContextMenu.set(null);
    }
  }

  refresh(): void {
    this.activeMenu.set(null);
    this.load(this.page().page);
  }

  openAbout(): void {
    this.activeMenu.set(null);
    this.aboutOpen.set(true);
  }

  updateAuthor(evento: Event): void {
    if (this.admin.administrator()) {
      return;
    }
    this.author.set((evento.target as HTMLInputElement).value);
    this.postFailed.set(false);
  }

  updateMessage(evento: Event): void {
    this.message.set((evento.target as HTMLTextAreaElement).value);
    this.postFailed.set(false);
  }

  updateWebsite(evento: Event): void {
    this.website.set((evento.target as HTMLInputElement).value);
  }

  markTouched(campo: CampoTablon): void {
    this.touched.update((actual) => new Set([...actual, campo]));
  }

  error(campo: CampoTablon): string | null {
    if (!this.touched().has(campo)) {
      return null;
    }
    const valor = campo === 'author' ? this.displayAuthor() : this.message();
    if (!valor.trim()) {
      return this.i18n.t('messageBoard.validation.required');
    }
    const limite = campo === 'author' ? 60 : 1000;
    return valor.length > limite
      ? this.i18n.t('messageBoard.validation.maxLength', { count: limite })
      : null;
  }

  publish(evento: SubmitEvent): void {
    evento.preventDefault();
    this.touched.set(new Set<CampoTablon>(['author', 'message']));
    if (this.error('author') || this.error('message') || this.posting()) {
      return;
    }

    const autor = this.displayAuthor().trim();
    this.posting.set(true);
    this.postFailed.set(false);
    this.board
      .publish({ author: autor, message: this.message().trim(), website: this.website().trim() })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.posting.set(false)),
      )
      .subscribe({
        next: (published) => {
          if (!published.administrator) {
            this.rememberAuthor(autor);
            this.author.set(autor);
          }
          this.message.set('');
          this.website.set('');
          this.touched.set(new Set());
          this.load(0);
        },
        error: () => this.postFailed.set(true),
      });
  }

  older(): void {
    if (this.page().hasOlder) {
      this.load(this.page().page + 1);
    }
  }

  newer(): void {
    if (this.page().hasNewer) {
      this.load(this.page().page - 1);
    }
  }

  displayMessage(entrada: MensajeTablon): string {
    return entrada.id === 1 && entrada.administrator
      ? this.i18n.t('messageBoard.adminMessage')
      : entrada.message;
  }

  displayAuthor(): string {
    return this.admin.administrator() ? NOMBRE_ADMINISTRADOR : this.author();
  }

  selectMessage(entrada: MensajeTablon): void {
    if (this.admin.administrator()) {
      this.selectedMessageId.set(entrada.id);
    }
  }

  openMessageContext(evento: MouseEvent, entrada: MensajeTablon): void {
    if (!this.admin.administrator() || entrada.id === 1) {
      return;
    }
    evento.preventDefault();
    evento.stopPropagation();
    this.activeMenu.set(null);
    this.selectedMessageId.set(entrada.id);

    const tablero = (evento.currentTarget as HTMLElement).closest('.message-board');
    const limites = tablero?.getBoundingClientRect();
    const ancho = limites?.width ?? 0;
    const alto = limites?.height ?? 0;
    const x = Math.max(2, Math.min(evento.clientX - (limites?.left ?? 0), ancho - 190));
    const y = Math.max(2, Math.min(evento.clientY - (limites?.top ?? 0), alto - 48));
    this.messageContextMenu.set({ entry: entrada, x, y });
  }

  openMessageContextFromKeyboard(evento: KeyboardEvent, entrada: MensajeTablon): void {
    if (!this.admin.administrator() || entrada.id === 1) {
      return;
    }
    if (evento.key !== 'ContextMenu' && !(evento.shiftKey && evento.key === 'F10')) {
      return;
    }
    evento.preventDefault();
    evento.stopPropagation();
    const fila = evento.currentTarget as HTMLElement;
    const tablero = fila.closest('.message-board');
    const boardBounds = tablero?.getBoundingClientRect();
    const rowBounds = fila.getBoundingClientRect();
    const ancho = boardBounds?.width ?? 0;
    const alto = boardBounds?.height ?? 0;
    const x = Math.max(2, Math.min(rowBounds.left - (boardBounds?.left ?? 0) + 20, ancho - 190));
    const y = Math.max(2, Math.min(rowBounds.top - (boardBounds?.top ?? 0) + 35, alto - 48));
    this.activeMenu.set(null);
    this.selectedMessageId.set(entrada.id);
    this.messageContextMenu.set({ entry: entrada, x, y });
  }

  requestDelete(): void {
    const contexto = this.messageContextMenu();
    this.messageContextMenu.set(null);
    if (contexto && contexto.entry.id !== 1) {
      this.pendingDelete.set(contexto.entry);
      this.deleteFailed.set(false);
    }
  }

  cancelDelete(): void {
    if (!this.deleting()) {
      this.pendingDelete.set(null);
    }
  }

  confirmDelete(): void {
    const entrada = this.pendingDelete();
    if (!entrada || entrada.id === 1 || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.deleteFailed.set(false);
    this.admin
      .deleteMessage(entrada.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe((eliminado) => {
        if (eliminado === false) {
          this.pendingDelete.set(null);
          this.deleteFailed.set(true);
          return;
        }
        this.pendingDelete.set(null);
        this.selectedMessageId.set(null);
        this.load(this.page().page);
      });
  }

  formatDate(valor: string): string {
    return new Intl.DateTimeFormat(this.i18n.language() === 'en' ? 'en-GB' : 'es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(valor));
  }

  private load(pagina: number): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.board
      .messages(pagina)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (resultado) => this.page.set(resultado),
        error: () => this.loadFailed.set(true),
      });
  }

  private readRememberedAuthor(): string {
    try {
      return leerAlmacenamiento(CLAVE_AUTOR) ?? '';
    } catch {
      return '';
    }
  }

  private rememberAuthor(autor: string): void {
    try {
      globalThis.localStorage?.setItem(CLAVE_AUTOR, autor);
    } catch {
      // Recordar el nombre es opcional; publicar no debe depender de ello.
    }
  }
}
