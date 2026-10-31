import { describe, expect, it, vi } from 'vitest';

describe('tenant entry url', () => {
  it('returns null when no template is configured', async () => {
    vi.stubEnv('VITE_TENANT_ENTRY_URL_TEMPLATE', '');
    vi.resetModules();

    const { buildTenantEntryUrl } = await import('./tenant-entry');
    expect(buildTenantEntryUrl('acme')).toBeNull();
  });

  it('replaces the tenant code placeholder', async () => {
    vi.stubEnv('VITE_TENANT_ENTRY_URL_TEMPLATE', 'https://{code}.app.example.com');
    vi.resetModules();

    const { buildTenantEntryUrl, tenantHost } = await import('./tenant-entry');
    const url = buildTenantEntryUrl('acme');

    expect(url).toBe('https://acme.app.example.com');
    expect(tenantHost(url)).toBe('acme.app.example.com');
  });

  it('encodes the tenant code before substitution', async () => {
    vi.stubEnv('VITE_TENANT_ENTRY_URL_TEMPLATE', 'https://{code}.example.com');
    vi.resetModules();

    const { buildTenantEntryUrl } = await import('./tenant-entry');
    expect(buildTenantEntryUrl('a/b')).toBe('https://a%2Fb.example.com');
  });
});
