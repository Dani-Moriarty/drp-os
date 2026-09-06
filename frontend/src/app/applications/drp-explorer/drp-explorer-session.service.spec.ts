import { SesionExplorador } from './drp-explorer-session.service';

describe('DrpExplorerSessionService', () => {
  let servicio: SesionExplorador;

  beforeEach(() => servicio = new SesionExplorador());

  it('keeps a session history with back, forward, home and reload', () => {
    servicio.navigate('example.com');
    servicio.navigate('example.org');
    expect(servicio.current().address).toBe('https://example.org/');

    servicio.back();
    expect(servicio.current().address).toBe('https://example.com/');
    expect(servicio.canGoForward()).toBe(true);

    const id = servicio.current().id;
    servicio.reload();
    expect(servicio.current().id).not.toBe(id);
    servicio.home();
    expect(servicio.current().kind).toBe('home');
  });

  it('rejects executable schemes, credentials and private network targets', () => {
    servicio.navigate('javascript:alert(1)');
    expect(servicio.current().reason).toBe('invalid-address');
    servicio.navigate('https://person:secret@example.com');
    expect(servicio.current().reason).toBe('invalid-address');
    servicio.navigate('http://192.168.1.1/admin');
    expect(servicio.current().reason).toBe('private-address');
    servicio.navigate('https://router.home.arpa/admin');
    expect(servicio.current().reason).toBe('private-address');
    servicio.navigate('https://[::ffff:7f00:1]/admin');
    expect(servicio.current().reason).toBe('private-address');
    servicio.navigate('https://100.64.0.1/admin');
    expect(servicio.current().reason).toBe('private-address');
  });

  it('uses the official privacy-enhanced YouTube embed URL', () => {
    servicio.navigate('https://www.youtube.com/watch?v=dQw4w9WgXcQ');

    expect(servicio.current()).toMatchObject({
      kind: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
    });
  });

  it('routes Google searches and known frame-blocking sites to compatibility mode', () => {
    servicio.search('Angular signals');
    expect(servicio.current()).toMatchObject({ kind: 'compatibility' });
    expect(servicio.current().externalUrl).toContain('google.com/search?q=Angular%20signals');

    servicio.navigate('https://github.com/Dani-Moriarty/portfolio');
    expect(servicio.current().kind).toBe('compatibility');
  });
});
