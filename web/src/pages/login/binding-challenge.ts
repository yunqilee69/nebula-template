import type { LoginResp } from '@/types/auth';

const storageKey = 'nebula-web.binding-challenge';

export type BindingChallenge = Required<Pick<LoginResp, 'bindingReason'>> &
  Pick<LoginResp, 'bindingTicket' | 'tenantCode' | 'proposedUsername' | 'proposedDisplayName'
    | 'pendingApproval' | 'linkStatus'>;

export function isBindingChallenge(result: LoginResp): result is LoginResp & BindingChallenge {
  return Boolean(result.bindingRequired && result.bindingReason);
}

export function saveBindingChallenge(result: LoginResp): void {
  if (!isBindingChallenge(result)) return;
  sessionStorage.setItem(storageKey, JSON.stringify({
    bindingTicket: result.bindingTicket,
    bindingReason: result.bindingReason,
    tenantCode: result.tenantCode,
    proposedUsername: result.proposedUsername,
    proposedDisplayName: result.proposedDisplayName,
    pendingApproval: result.pendingApproval,
    linkStatus: result.linkStatus,
  }));
}

export function readBindingChallenge(): BindingChallenge | null {
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<BindingChallenge>;
    if (!value.bindingReason) return null;
    return value as BindingChallenge;
  } catch {
    return null;
  }
}

export function clearBindingChallenge(): void {
  sessionStorage.removeItem(storageKey);
}
