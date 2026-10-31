import { request } from '@/lib/http';
import type { CurrentUser, LoginRequest, LoginResponse } from '@/types';

export const authApi = {
  login: (data: LoginRequest) =>
    request<LoginResponse>('/api/auth/platform-login', {
      method: 'POST',
      body: data,
      auth: false,
    }),

  currentUser: () => request<CurrentUser>('/api/auth/current-user'),

  logout: () =>
    request<void>('/api/auth/logout', {
      method: 'POST',
      retryOnUnauthorized: false,
    }),
};
