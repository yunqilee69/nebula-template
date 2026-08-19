import { afterEach, describe, expect, it } from 'vitest';
import { getCurrentAuthReturnPath, normalizeAuthReturnPath } from './auth-return-path';

function setBrowserPath(path: string): void {
  window.history.pushState(null, '', path);
}

describe('normalizeAuthReturnPath', () => {
  it.each([
    [undefined, '/'],
    ['', '/'],
    ['https://evil.example/dashboard', '/'],
    ['javascript:alert(1)', '/'],
    ['//evil.example/dashboard', '/'],
    ['/login?redirect=/dashboard', '/'],
    ['/login#expired', '/'],
    ['/register', '/'],
    ['/forgot-password', '/'],
    ['/login/github-callback?loginId=callback-login', '/'],
    ['/login/github-callback?loginId=callback-login', '/'],
    ['/dashboard?tab=home#section', '/dashboard?tab=home#section'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeAuthReturnPath(input)).toBe(expected);
  });
});

describe('getCurrentAuthReturnPath', () => {
  afterEach(() => {
    setBrowserPath('/');
  });

  it('keeps the current path, search, and hash for non-auth pages', () => {
    setBrowserPath('/dashboard?tab=home#section');

    expect(getCurrentAuthReturnPath()).toBe('/dashboard?tab=home#section');
  });

  it('normalizes auth pages to the workspace root', () => {
    setBrowserPath('/login?redirect=/dashboard#expired');

    expect(getCurrentAuthReturnPath()).toBe('/');
  });
});
