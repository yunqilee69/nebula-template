import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { buildTenantBrand } from './main';

describe('buildTenantBrand', () => {
  it('maps nested public-init branding fields without inventing a different response shape', () => {
    const brand = buildTenantBrand({
      code: 'acme',
      name: 'Acme Corporation',
      logo: '/api/frontend/brand-assets/logo?v=1',
      branding: {
        loginTitle: 'Welcome to Acme',
        loginSubtitle: 'Sign in to continue',
        themeColor: '#1677ff',
        favicon: '/api/frontend/brand-assets/favicon?v=1',
        loginBackground: '/api/frontend/brand-assets/login-background?v=1',
      },
    });

    expect(brand).toMatchObject({
      name: 'Acme Corporation',
      title: 'Acme Corporation',
      loginTitle: 'Welcome to Acme',
      loginSubtitle: 'Sign in to continue',
      themeColor: '#1677ff',
      faviconHref: '/api/frontend/brand-assets/favicon?v=1',
      loginBackground: '/api/frontend/brand-assets/login-background?v=1',
    });
    expect((brand?.logo as ReactElement).props.src).toBe('/api/frontend/brand-assets/logo?v=1');
    // 登录页直接复用企业 Logo，不再有独立的登录页 Logo 资源位
    expect(brand?.logoUrl).toBe('/api/frontend/brand-assets/logo?v=1');
    expect(brand).not.toHaveProperty('loginLogo');
  });

  it('maps tenant login footer branding fields', () => {
    const brand = buildTenantBrand({
      code: 'acme',
      name: 'Acme Corporation',
      branding: {
        footerCopyright: ' © 2026 Acme ',
        footerIcp: '京ICP备12345678号',
        footerContactEmail: 'support@acme.com',
        footerContactPhone: '+86 138 0000 0000',
        footerWebsite: 'https://www.acme.com',
      },
    });

    expect(brand?.footer).toEqual({
      copyright: '© 2026 Acme',
      icp: '京ICP备12345678号',
      contactEmail: 'support@acme.com',
      contactPhone: '+86 138 0000 0000',
      website: 'https://www.acme.com',
    });
  });

  it('does not use the tenant logo as a favicon fallback', () => {
    const brand = buildTenantBrand({
      code: 'acme',
      name: 'Acme Corporation',
      logo: '/api/frontend/brand-assets/logo?v=1',
      branding: {},
    });

    expect(brand?.faviconHref).toBeUndefined();
  });
});
