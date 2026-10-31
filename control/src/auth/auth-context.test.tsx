import { describe, expect, it } from 'vitest';
import { isSuperAdmin } from './auth-context';

describe('super admin check', () => {
  it('only accepts platform sessions with the platform admin flag', () => {
    expect(isSuperAdmin(null)).toBe(false);
    expect(isSuperAdmin({ id: 'p1', platformAdmin: false })).toBe(false);
    expect(isSuperAdmin({ id: 'p1', platformAdmin: true })).toBe(false);
    expect(isSuperAdmin({ personId: 'p1', sessionType: 'TENANT', platformAdmin: true })).toBe(false);
    expect(isSuperAdmin({ personId: 'p1', sessionType: 'PLATFORM', platformAdmin: true })).toBe(true);
  });
});
