import { describe, expect, it } from 'vitest';
import { nebulaTokens } from './tokens';

describe('nebulaTokens', () => {
  it('defines the standard and collapsed sidebar widths', () => {
    expect(nebulaTokens.siderWidth).toBe(240);
    expect(nebulaTokens.siderCollapsedWidth).toBe(64);
  });
});
