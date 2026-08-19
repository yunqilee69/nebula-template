import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('useNotice', () => {
  it('returns the shared notice api for React components', async () => {
    const [{ useNotice }, { notice }] = await Promise.all([
      import('./use-notice'),
      import('../providers/notice'),
    ]);

    const { result } = renderHook(() => useNotice());

    expect(result.current).toBe(notice);
    expect(typeof result.current.error).toBe('function');
    expect(typeof result.current.warning).toBe('function');
    expect(typeof result.current.success).toBe('function');
  });
});
