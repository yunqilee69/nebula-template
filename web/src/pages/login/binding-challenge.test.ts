import { afterEach, describe, expect, it } from 'vitest';
import { isBindingChallenge, readBindingChallenge, saveBindingChallenge } from './binding-challenge';

describe('binding challenge storage', () => {
  afterEach(() => sessionStorage.clear());

  it('treats a pending approval response as a challenge without a ticket', () => {
    const result = {
      bindingRequired: true,
      bindingReason: 'LINK_PENDING' as const,
      pendingApproval: true,
      tenantCode: 'acme',
    };

    expect(isBindingChallenge(result)).toBe(true);
    saveBindingChallenge(result);
    expect(readBindingChallenge()).toMatchObject({
      bindingReason: 'LINK_PENDING',
      pendingApproval: true,
      tenantCode: 'acme',
    });
  });

  it('persists the one-time ticket and prefill fields', () => {
    saveBindingChallenge({
      bindingRequired: true,
      bindingReason: 'NO_LINK',
      bindingTicket: 'ticket-1',
      tenantCode: 'acme',
      proposedUsername: 'alice',
    });

    expect(readBindingChallenge()).toMatchObject({
      bindingTicket: 'ticket-1',
      proposedUsername: 'alice',
    });
  });
});
