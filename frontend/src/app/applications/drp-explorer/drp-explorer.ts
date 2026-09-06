import {
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
import { DomSanitizer } from '@angular/platform-browser';
import { DatosPortfolio } from '../../core/models/portfolio.model';
import { Localizacion } from '../../core/services/localization.service';
import { ActividadSistema } from '../../core/system-activity/system-activity.service';
import { URL_CODIGO_FUENTE } from '../../desktop/config/source-code.config';
import { SesionExplorador } from './drp-explorer-session.service';

type MenuExplorador = 'file' | 'edit' | 'view' | 'favorites' | 'tools' | 'help';

@Component({
  selector: 'app-drp-explorer',
  templateUrl: './drp-explorer.html',
  styleUrl: './drp-explorer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrpExplorer {
  readonly portfolio = input.required<DatosPortfolio>();
  readonly closeRequested = output<void>();

  readonly i18n = inject(Localizacion);
  readonly session = inject(SesionExplorador);
  private readonly activity = inject(ActividadSistema);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('addressInput') private addressInput?: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>;

  readonly address = signal(this.session.current().address);
  readonly query = signal('');
  readonly loading = signal(false);
  readonly slowLoad = signal(false);
  readonly activeMenu = signal<MenuExplorador | null>(null);
  readonly aboutOpen = signal(false);
  readonly safeFrameUrl = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      this.session.current().embedUrl ?? 'about:blank',
    ),
  );
  private loadTimer?: number;

  constructor() {
    this.destroyRef.onDestroy(() => globalThis.clearTimeout(this.loadTimer));
  }

  text(es: string, en: string): string {
    return this.i18n.language() === 'es' ? es : en;
  }

  updateAddress(evento: Event): void {
    this.address.set((evento.target as HTMLInputElement).value);
  }

  updateQuery(evento: Event): void {
    this.query.set((evento.target as HTMLInputElement).value);
  }

  submitAddress(evento: Event): void {
    evento.preventDefault();
    this.navigate(this.address());
  }

  submitSearch(evento: Event): void {
    evento.preventDefault();
    const consulta = this.query().trim();
    if (!consulta) return;
    this.openExternally(`https://www.google.com/search?q=${encodeURIComponent(consulta)}`);
  }

  navigate(url: string): void {
    this.session.navigate(url);
    this.afterNavigation();
  }

  back(): void {
    this.session.back();
    this.afterNavigation();
  }

  forward(): void {
    this.session.forward();
    this.afterNavigation();
  }

  home(): void {
    this.session.home();
    this.afterNavigation();
  }

  refresh(): void {
    this.session.reload();
    this.afterNavigation();
  }

  onFrameLoad(): void {
    globalThis.clearTimeout(this.loadTimer);
    this.loading.set(false);
    this.slowLoad.set(false);
    this.activity.pulse('drp-explorer', 'navigate');
  }

  openCurrentExternally(): void {
    const url = this.session.current().externalUrl;
    if (!url) return;
    this.openExternally(url);
  }

  openExternalShortcut(url: string): void {
    this.closeMenu();
    this.openExternally(url);
  }

  toggleMenu(menu: MenuExplorador, evento: Event): void {
    evento.stopPropagation();
    this.activeMenu.update((activo) => activo === menu ? null : menu);
  }

  closeMenu(): void {
    this.activeMenu.set(null);
  }

  dismissMenus(evento: PointerEvent): void {
    if (!(evento.target as HTMLElement).closest('.drp-explorer__menu')) this.closeMenu();
  }

  focusAddress(): void {
    this.closeMenu();
    this.addressInput?.nativeElement.focus();
    this.addressInput?.nativeElement.select();
  }

  focusSearch(): void {
    this.closeMenu();
    if (this.session.current().kind !== 'home') this.home();
    globalThis.setTimeout(() => this.searchInput?.nativeElement.focus());
  }

  async copyAddress(): Promise<void> {
    this.closeMenu();
    try {
      await globalThis.navigator?.clipboard?.writeText(this.session.current().address);
    } catch {
      // La navegación debe seguir funcionando si se deniega el portapapeles.
    }
  }

  showAbout(): void {
    this.closeMenu();
    this.aboutOpen.set(true);
  }

  exit(): void {
    this.closeMenu();
    this.closeRequested.emit();
  }

  portfolioUrl(): string {
    return globalThis.location?.origin && /^https?:/u.test(globalThis.location.origin)
      ? globalThis.location.origin
      : 'https://danielramonperez.com';
  }

  sourceCodeUrl(): string {
    return URL_CODIGO_FUENTE;
  }

  linkedInUrl(): string {
    return this.portfolio().profile.linkedInUrl;
  }

  compatibilityMessage(): string {
    switch (this.session.current().reason) {
      case 'mixed-content':
        return this.text(
          'La página usa HTTP y un sitio HTTPS no puede incrustarla de forma segura.',
          'This page uses HTTP and cannot be safely embedded by an HTTPS site.',
        );
      case 'private-address':
        return this.text(
          'Las direcciones locales o privadas están bloqueadas por seguridad.',
          'Local and private addresses are blocked for security.',
        );
      case 'invalid-address':
        return this.text(
          'La dirección no es válida. Utiliza una URL HTTP o HTTPS.',
          'The address is not valid. Use an HTTP or HTTPS URL.',
        );
      default:
        return this.text(
          'Esta página no permite mostrarse dentro de DRP Explorer.',
          'This page does not allow itself to be displayed inside DRP Explorer.',
        );
    }
  }

  private afterNavigation(): void {
    this.closeMenu();
    const pagina = this.session.current();
    this.address.set(pagina.address);
    this.activity.pulse('drp-explorer', 'navigate');
    globalThis.clearTimeout(this.loadTimer);
    const framePage = pagina.kind === 'web' || pagina.kind === 'youtube';
    this.loading.set(framePage);
    this.slowLoad.set(false);
    if (framePage) {
      this.loadTimer = globalThis.setTimeout(() => {
        if (this.loading()) this.slowLoad.set(true);
      }, 8000);
    }
  }

  private openExternally(url: string): void {
    const abierto = globalThis.open?.(url, '_blank', 'noopener,noreferrer');
    if (abierto) abierto.opener = null;
    this.activity.pulse('drp-explorer', 'navigate');
  }
}
