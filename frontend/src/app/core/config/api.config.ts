interface ConfiguracionPublicaPortfolio {
  apiBaseUrl?: string;
}

declare global {
  interface Window {
    __PORTFOLIO_CONFIG__?: ConfiguracionPublicaPortfolio;
  }
}

const DOMINIOS_LOCALES = new Set(['localhost', '127.0.0.1', '::1']);

export function normalizarOrigenApi(valor: string | undefined): string | null {
  const candidato = valor?.trim();
  if (!candidato) return null;

  try {
    const url = new URL(candidato);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * En localhost se conserva el proxy de desarrollo de Angular.
 * En producción, el origen HTTPS viene de `public/runtime-config.js`.
 */
export function resolverUrlApi(ruta: `/api/${string}`): string | null {
  if (DOMINIOS_LOCALES.has(globalThis.location?.hostname ?? 'localhost')) {
    return ruta;
  }

  const configuredOrigin = normalizarOrigenApi(
    globalThis.window?.__PORTFOLIO_CONFIG__?.apiBaseUrl,
  );
  if (configuredOrigin) {
    return `${configuredOrigin}${ruta}`;
  }

  return null;
}
