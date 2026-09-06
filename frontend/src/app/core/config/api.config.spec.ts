import { afterEach, describe, expect, it } from 'vitest';
import { normalizarOrigenApi, resolverUrlApi } from './api.config';

describe('resolveApiUrl', () => {
  afterEach(() => {
    delete window.__PORTFOLIO_CONFIG__;
  });

  it('keeps localhost on the Angular proxy when a public origin is configured', () => {
    window.__PORTFOLIO_CONFIG__ = {
      apiBaseUrl: 'https://api.danielramonperez.com',
    };

    expect(resolverUrlApi('/api/job-offers')).toBe('/api/job-offers');
  });

  it('accepts only credential-free HTTPS origins for the public API', () => {
    expect(normalizarOrigenApi('https://api.danielramonperez.com/')).toBe(
      'https://api.danielramonperez.com',
    );
    expect(normalizarOrigenApi('http://api.example.com')).toBeNull();
    expect(normalizarOrigenApi('https://user:secret@api.example.com')).toBeNull();
    expect(normalizarOrigenApi('https://api.example.com/proxy')).toBeNull();
    expect(normalizarOrigenApi('javascript:alert(1)')).toBeNull();
  });
});
