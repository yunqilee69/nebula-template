import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyTenantCodeFromUrl,
  buildInvitationUrl,
  buildTenantUrl,
  clearTenantCode,
  getStoredTenantCode,
  getTenantCode,
  resolveTenantHost,
  saveTenantCode,
} from './tenant-host';

describe('resolveTenantHost', () => {
  it('resolves tenant code from a tenant subdomain', () => {
    expect(resolveTenantHost('acme.app.example.com')).toMatchObject({
      tenantCode: 'acme',
      baseDomain: 'app.example.com',
    });
  });

  it('supports local tenant hosts and plain localhost', () => {
    expect(resolveTenantHost('acme.localhost').tenantCode).toBe('acme');
    expect(resolveTenantHost('localhost').tenantCode).toBeUndefined();
  });
});

describe('stored tenant code', () => {
  afterEach(() => {
    clearTenantCode();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('persists a manually entered tenant code and uses it for anonymous requests', () => {
    saveTenantCode(' Acme ');

    expect(getStoredTenantCode()).toBe('acme');
    expect(getTenantCode()).toBe('acme');
  });

  it('prefers the tenant subdomain over a stale stored selection', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'acme.localhost' },
      localStorage: { getItem: () => 'delta' },
    });

    expect(getTenantCode()).toBe('acme');
  });

  it('applies tenantCode from an invitation URL on a bare host', () => {
    const applied = applyTenantCodeFromUrl('http://localhost:5173/invitations/accept?token=t&tenantCode=Delta');

    expect(applied).toBe('delta');
    expect(getStoredTenantCode()).toBe('delta');
  });
});

describe('buildInvitationUrl', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps tenantCode in the link for bare hosts', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'localhost', port: '5173', protocol: 'http:', origin: 'http://localhost:5173' },
    });

    const url = buildInvitationUrl('token-1', 'acme');

    expect(url).toBe('http://localhost:5173/invitations/accept?token=token-1&tenantCode=acme');
  });

  it('omits tenantCode when the host already identifies the tenant', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'acme.localhost', port: '5173', protocol: 'http:', origin: 'http://acme.localhost:5173' },
    });

    const url = buildInvitationUrl('token-1', 'acme');

    expect(url).toBe('http://acme.localhost:5173/invitations/accept?token=token-1');
  });
});

describe('buildTenantUrl', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('treats an already-qualified subdomain as the full host', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'acme.localhost', port: '5173', protocol: 'http:' },
    });
    expect(buildTenantUrl({ subdomain: 'delta.localhost' })).toBe('http://delta.localhost:5173');
  });

  it('qualifies a bare tenant code with the current base domain', () => {
    vi.stubGlobal('window', {
      location: { hostname: 'acme.localhost', port: '5173', protocol: 'http:' },
    });
    expect(buildTenantUrl({ code: 'delta' })).toBe('http://delta.localhost:5173');
  });
});
