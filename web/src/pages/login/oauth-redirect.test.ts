import { afterEach, describe, expect, it } from 'vitest';
import { getCurrentReturnPath } from './oauth-redirect';

function setBrowserPath(path: string): void {
  window.history.pushState(null, '', path);
}

describe('getCurrentReturnPath', () => {
  afterEach(() => {
    setBrowserPath('/');
  });

  it('keeps non-auth page paths as the post-login return path', () => {
    setBrowserPath('/dashboard?tab=home');

    expect(getCurrentReturnPath()).toBe('/dashboard?tab=home');
  });

  it.each([
    '/login',
    '/login?from=github',
    '/login/github-callback?loginId=callback-login',
    '/register',
    '/forgot-password',
  ])('normalizes auth page path %s to the workspace root', (path) => {
    setBrowserPath(path);

    expect(getCurrentReturnPath()).toBe('/');
  });
});
