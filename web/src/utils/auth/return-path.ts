const authPagePathnames = new Set(['/login', '/login/github-callback', '/profile/bind-callback', '/register', '/forgot-password']);

function getPathname(returnPath: string): string {
  const [pathname = returnPath] = returnPath.split(/[?#]/, 1);
  return pathname;
}

export function normalizeAuthReturnPath(returnPath: string | undefined): string {
  if (!returnPath || !returnPath.startsWith('/') || returnPath.startsWith('//')) return '/';
  return authPagePathnames.has(getPathname(returnPath)) ? '/' : returnPath;
}

export function getCurrentAuthReturnPath(): string {
  if (typeof window === 'undefined') return '/';
  return normalizeAuthReturnPath(`${window.location.pathname}${window.location.search}${window.location.hash}` || '/');
}

export function createLoginRedirectPath(loginPath: string, returnPath: string): string {
  const separator = loginPath.includes('?') ? '&' : '?';
  return `${loginPath}${separator}redirect=${encodeURIComponent(normalizeAuthReturnPath(returnPath))}`;
}
