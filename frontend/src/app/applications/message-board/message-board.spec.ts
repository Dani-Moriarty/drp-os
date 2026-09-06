import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MensajeTablon, PaginaTablon, SolicitudPublicacion } from '../../core/models/message-board.model';
import { ServicioTablon } from '../../core/services/message-board.service';
import { AdministracionTablon } from '../../core/services/message-board-admin.service';
import { TablonMensajes } from './message-board';

const ADMIN: MensajeTablon = {
  id: 1,
  author: 'Daniel Ramón Pérez',
  createdAt: '2026-09-04T10:00:00Z',
  message: 'Mensaje almacenado por el backend.',
  administrator: true,
};

const PAGE: PaginaTablon = {
  messages: [ADMIN],
  page: 0,
  totalPages: 1,
  totalMessages: 1,
  hasOlder: false,
  hasNewer: false,
};

class MessageBoardServiceStub {
  readonly messages = vi.fn<() => Observable<PaginaTablon>>(() => of(PAGE));
  readonly publish = vi.fn<(solicitud: SolicitudPublicacion) => Observable<MensajeTablon>>(
    () => of({ ...ADMIN, id: 2, author: 'Nora', administrator: false }),
  );
}

class MessageBoardAdminServiceStub {
  readonly administrator = signal(false);
  readonly initialize = vi.fn();
  readonly deleteMessage = vi.fn(() => of(undefined));
}

describe('MessageBoard', () => {
  let montaje: ComponentFixture<TablonMensajes>;
  let componente: TablonMensajes;
  let servicio: MessageBoardServiceStub;
  let admin: MessageBoardAdminServiceStub;

  beforeEach(async () => {
    localStorage.clear();
    servicio = new MessageBoardServiceStub();
    admin = new MessageBoardAdminServiceStub();
    await TestBed.configureTestingModule({
      imports: [TablonMensajes],
      providers: [
        { provide: ServicioTablon, useValue: servicio },
        { provide: AdministracionTablon, useValue: admin },
      ],
    }).compileComponents();
    montaje = TestBed.createComponent(TablonMensajes);
    componente = montaje.componentInstance;
    montaje.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('loads the shared conversation and distinguishes the administrator', () => {
    expect(servicio.messages).toHaveBeenCalledOnce();
    expect(montaje.nativeElement.textContent).toContain('Daniel Ramón Pérez');
    expect(montaje.nativeElement.textContent).toContain('Administrador');
    expect(montaje.nativeElement.textContent).toContain('#1');
  });

  it('shows field errors without sending an empty message', () => {
    submit(montaje);
    montaje.detectChanges();

    expect(servicio.publish).not.toHaveBeenCalled();
    expect(montaje.nativeElement.querySelectorAll('.message-board__field-error')).toHaveLength(2);
  });

  it('posts trimmed content and remembers the editable visitor name locally', () => {
    componente.author.set('  Nora  ');
    componente.message.set('  Un portfolio estupendo.  ');
    submit(montaje);
    montaje.detectChanges();

    expect(servicio.publish).toHaveBeenCalledWith({
      author: 'Nora',
      message: 'Un portfolio estupendo.',
      website: '',
    });
    expect(localStorage.getItem('drp-os.message-board.author.v1')).toBe('Nora');
    expect(componente.message()).toBe('');
    expect(servicio.messages).toHaveBeenCalledTimes(2);
  });

  it('shows a safe error when the backend rejects a publication', () => {
    servicio.publish.mockReturnValue(throwError(() => new Error('internal detail')));
    componente.author.set('Alex');
    componente.message.set('Hola');
    submit(montaje);
    montaje.detectChanges();

    expect(montaje.nativeElement.textContent).toContain('No se pudo publicar.');
    expect(montaje.nativeElement.textContent).not.toContain('internal detail');
  });

  it('locks the administrator identity and publishes it without remembering it locally', () => {
    admin.administrator.set(true);
    componente.author.set('Impostor');
    componente.message.set('Mensaje del administrador');
    servicio.publish.mockReturnValue(of({ ...ADMIN, id: 2, message: 'Mensaje del administrador' }));
    montaje.detectChanges();

    submit(montaje);
    montaje.detectChanges();

    const autor = (montaje.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#message-board-author');
    expect(autor?.value).toBe('Daniel Ramón Pérez');
    expect(autor?.readOnly).toBe(true);
    expect(servicio.publish).toHaveBeenCalledWith({
      author: 'Daniel Ramón Pérez',
      message: 'Mensaje del administrador',
      website: '',
    });
    expect(localStorage.getItem('drp-os.message-board.author.v1')).toBeNull();
  });

  it('shows deletion only from an administrator right-click and reloads after confirmation', () => {
    const visitor = { ...ADMIN, id: 9, author: 'Nora', administrator: false };
    componente.page.set({ ...PAGE, messages: [ADMIN, visitor], totalMessages: 2 });
    admin.administrator.set(true);
    montaje.detectChanges();

    const raiz = montaje.nativeElement as HTMLElement;
    const filas = raiz.querySelectorAll<HTMLElement>('.message-board__row');
    filas[1].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 100 }));
    montaje.detectChanges();

    const deleteButton = raiz.querySelector<HTMLButtonElement>('.message-board__context-menu button');
    expect(deleteButton?.textContent).toContain('Eliminar mensaje');
    deleteButton?.click();
    montaje.detectChanges();
    expect(montaje.nativeElement.textContent).toContain('¿Quieres eliminar permanentemente el mensaje #9?');

    const confirm = Array.from(raiz.querySelectorAll<HTMLButtonElement>('.message-board__dialog button'))
      .find((boton) => boton.textContent?.trim() === 'Sí');
    confirm?.click();
    montaje.detectChanges();

    expect(admin.deleteMessage).toHaveBeenCalledWith(9);
    expect(servicio.messages).toHaveBeenCalledTimes(2);
  });

  it('never offers deletion for the permanent administrator message or to visitors', () => {
    const raiz = montaje.nativeElement as HTMLElement;
    const fila = raiz.querySelector<HTMLElement>('.message-board__row');
    fila?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    montaje.detectChanges();
    expect(montaje.nativeElement.querySelector('.message-board__context-menu')).toBeNull();

    admin.administrator.set(true);
    montaje.detectChanges();
    fila?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    montaje.detectChanges();
    expect(montaje.nativeElement.querySelector('.message-board__context-menu')).toBeNull();
  });
});

function submit(montaje: ComponentFixture<TablonMensajes>): void {
  montaje.nativeElement
    .querySelector('form')
    .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
}
