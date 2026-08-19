import type { AuthService } from '@/api/auth';
import { getCurrentAuthReturnPath } from './auth-return-path';

export type OAuthRedirectProvider = 'github';

export { getCurrentAuthReturnPath as getCurrentReturnPath };

function assertNever(value: never): never {
  throw new Error(`Unsupported OAuth redirect provider: ${value}`);
}

export async function prepareOAuthRedirect(provider: OAuthRedirectProvider, authService: AuthService): Promise<string> {
  const data = { redirectAfterLogin: getCurrentAuthReturnPath() };
  switch (provider) {
    case 'github':
      return (await authService.prepareGitHubRedirect(data)).authorizeUrl;
    default:
      return assertNever(provider);
  }
}
