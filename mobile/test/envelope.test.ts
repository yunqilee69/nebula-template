import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unwrapEnvelope } from '../src/request/envelope.ts';
import { isBusinessError } from '../src/request/errors.ts';

test('EnvelopeTest.testUnwrapSuccess', () => {
  const data = unwrapEnvelope<{ id: string }>({ code: '0', message: 'success', data: { id: '1' } });
  assert.deepEqual(data, { id: '1' });
});

test('EnvelopeTest.testBusinessErrorRejects', () => {
  assert.throws(
    () => unwrapEnvelope({ code: '18001', message: '无权限', data: null }),
    (error: unknown) => {
      assert.equal(isBusinessError(error), true);
      assert.equal((error as { code: string }).code, '18001');
      assert.equal((error as Error).message, '无权限');
      return true;
    },
  );
});

test('EnvelopeTest.testBusinessErrorWithoutMessageFallsBack', () => {
  assert.throws(
    () => unwrapEnvelope({ code: '99999', message: '', data: null }),
    (error: unknown) => (error as Error).message === '接口请求出错，请稍后重试',
  );
});

test('EnvelopeTest.testBlobBypass', () => {
  const blob = { size: 12, type: 'image/png' };
  assert.equal(unwrapEnvelope(blob, { binary: true }), blob);
  // 即使是信封形状，binary 也不解包
  const envelopeLike = { code: '0', message: 'ok', data: 'x' };
  assert.equal(unwrapEnvelope(envelopeLike, { binary: true }), envelopeLike);
});
