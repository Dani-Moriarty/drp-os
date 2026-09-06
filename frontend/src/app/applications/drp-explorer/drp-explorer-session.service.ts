import { Injectable, computed, signal } from '@angular/core';

export type TipoPaginaExplorador = 'home' | 'web' | 'youtube' | 'compatibility' | 'error';

export interface PaginaExplorador {
  id: number;
  kind: TipoPaginaExplorador;
  address: string;
  externalUrl?: string;
  embedUrl?: string;
  reason?: 'blocked-host' | 'mixed-content' | 'private-address' | 'invalid-address';
}

const PAGINA_INICIO: PaginaExplorador = { id: 0, kind: 'home', address: 'drp://home' };
const DOMINIOS_SIN_EMBED = ['google.com', 'github.com', 'linkedin.com'];

@Injectable({ providedIn: 'root' })
export class SesionExplorador {
  private readonly historyState = signal<PaginaExplorador[]>([PAGINA_INICIO]);
  private readonly indexState = signal(0);
  private sequence = 0;

  readonly history = this.historyState.asReadonly();
  readonly index = this.indexState.asReadonly();
  readonly current = computed(() => this.historyState()[this.indexState()] ?? PAGINA_INICIO);
  readonly canGoBack = computed(() => this.indexState() > 0);
  readonly canGoForward = computed(() => this.indexState() < this.historyState().length - 1);

  navigate(valor: string): void {
    this.push(this.pageFor(valor));
  }

  search(consulta: string): void {
    const trimmed = consulta.trim();
    if (!trimmed) return;
    const url = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    this.push(this.compatibilityPage(url, 'blocked-host'));
  }

  home(): void {
    this.push(this.newPage({ kind: 'home', address: 'drp://home' }));
  }

  back(): void {
    if (this.canGoBack()) this.indexState.update((indice) => indice - 1);
  }

  forward(): void {
    if (this.canGoForward()) this.indexState.update((indice) => indice + 1);
  }

  reload(): void {
    const indice = this.indexState();
    this.historyState.update((historial) =>
      historial.map((entrada, entryIndex) =>
        entryIndex === indice ? { ...entrada, id: ++this.sequence } : entrada,
      ),
    );
  }

  reset(): void {
    this.historyState.set([PAGINA_INICIO]);
    this.indexState.set(0);
    this.sequence = 0;
  }

  private push(pagina: PaginaExplorador): void {
    const retained = this.historyState().slice(0, this.indexState() + 1);
    this.historyState.set([...retained, pagina]);
    this.indexState.set(retained.length);
  }

  private pageFor(rawValue: string): PaginaExplorador {
    const valor = rawValue.trim();
    if (!valor || valor.toLowerCase() === 'drp://home') {
      return this.newPage({ kind: 'home', address: 'drp://home' });
    }

    if (!this.looksLikeAddress(valor)) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(valor)}`;
      return this.compatibilityPage(url, 'blocked-host');
    }

    const candidato = /^[a-z][a-z\d+.-]*:/iu.test(valor) ? valor : `https://${valor}`;
    let url: URL;
    try {
      url = new URL(candidato);
    } catch {
      return this.errorPage(valor, 'invalid-address');
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return this.errorPage(valor, 'invalid-address');
    }

    const normalizado = url.toString();
    if (this.isPrivateHost(url.hostname) && url.hostname !== globalThis.location?.hostname) {
      return this.errorPage(normalizado, 'private-address');
    }

    const videoId = this.youtubeVideoId(url);
    if (videoId) {
      return this.newPage({
        kind: 'youtube',
        address: normalizado,
        externalUrl: normalizado,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
      });
    }

    if (globalThis.location?.protocol === 'https:' && url.protocol === 'http:') {
      return this.compatibilityPage(normalizado, 'mixed-content');
    }

    const currentOrigin = globalThis.location?.origin;
    if (
      (currentOrigin && url.origin === currentOrigin) ||
      DOMINIOS_SIN_EMBED.some((anfitrion) => url.hostname === anfitrion || url.hostname.endsWith(`.${anfitrion}`))
    ) {
      return this.compatibilityPage(normalizado, 'blocked-host');
    }

    return this.newPage({
      kind: 'web',
      address: normalizado,
      externalUrl: normalizado,
      embedUrl: normalizado,
    });
  }

  private looksLikeAddress(valor: string): boolean {
    return /^[a-z][a-z\d+.-]*:/iu.test(valor) ||
      /^localhost(?::\d+)?(?:\/|$)/iu.test(valor) ||
      /^(?:www\.)?[^\s.]+\.[^\s]+/u.test(valor) ||
      /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:\/|$)/u.test(valor);
  }

  private isPrivateHost(hostname: string): boolean {
    const anfitrion = hostname.toLowerCase().replace(/^\[|\]$/gu, '');
    if (
      anfitrion === 'localhost' ||
      anfitrion.endsWith('.localhost') ||
      anfitrion.endsWith('.local') ||
      anfitrion.endsWith('.lan') ||
      anfitrion.endsWith('.internal') ||
      anfitrion.endsWith('.localdomain') ||
      anfitrion === 'home.arpa' ||
      anfitrion.endsWith('.home.arpa')
    ) {
      return true;
    }
    if (anfitrion.includes(':')) {
      if (anfitrion === '::' || anfitrion === '::1' || anfitrion.startsWith('::ffff:')) return true;
      const firstHextet = Number.parseInt(anfitrion.split(':')[0] || '0', 16);
      return !Number.isInteger(firstHextet) || firstHextet < 0x2000 || firstHextet > 0x3fff;
    }
    const octets = anfitrion.split('.').map(Number);
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
      return false;
    }
    return octets[0] === 0 || octets[0] === 10 || octets[0] === 127 ||
      (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 0 && octets[2] === 0) ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 198 && (octets[1] === 18 || octets[1] === 19)) ||
      octets[0] >= 224;
  }

  private youtubeVideoId(url: URL): string | null {
    const anfitrion = url.hostname.toLowerCase().replace(/^www\./u, '');
    let id: string | null = null;
    if (anfitrion === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? null;
    if (anfitrion === 'youtube.com' || anfitrion === 'm.youtube.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (/^\/(embed|shorts)\//u.test(url.pathname)) id = url.pathname.split('/')[2] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/u.test(id) ? id : null;
  }

  private compatibilityPage(
    url: string,
    motivo: PaginaExplorador['reason'],
  ): PaginaExplorador {
    return this.newPage({ kind: 'compatibility', address: url, externalUrl: url, reason: motivo });
  }

  private errorPage(direccion: string, motivo: PaginaExplorador['reason']): PaginaExplorador {
    return this.newPage({ kind: 'error', address: direccion, reason: motivo });
  }

  private newPage(pagina: Omit<PaginaExplorador, 'id'>): PaginaExplorador {
    return { ...pagina, id: ++this.sequence };
  }
}
