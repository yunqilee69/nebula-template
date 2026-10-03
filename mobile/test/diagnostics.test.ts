import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLogger, redactSensitive, redactToken, type LogRecord } from '../src/diagnostics/logger.ts';
import { buildClientHeaders, buildUserAgent } from '../src/diagnostics/client-info.ts';

test('DiagnosticsTest.testRedactTokenNeverKeepsFullValue', () => {
  assert.equal(redactToken('super-secret-push-token'), '***');
  assert.equal(redactToken(''), '');
  assert.equal(redactToken(null), '');
  assert.equal(redactToken(undefined), '');
});

test('DiagnosticsTest.testRedactSensitiveRecurses', () => {
  const redacted = redactSensitive({
    pushToken: 'abc',
    nested: { authorization: 'Bearer xyz', name: 'ok' },
    list: [{ refreshToken: 'r' }],
  }) as Record<string, unknown>;
  assert.equal(redacted.pushToken, '***');
  const nested = redacted.nested as Record<string, unknown>;
  assert.equal(nested.authorization, '***');
  assert.equal(nested.name, 'ok');
  const list = redacted.list as Array<Record<string, unknown>>;
  assert.equal(list[0]!.refreshToken, '***');
});

test('DiagnosticsTest.testLoggerRedactsBeforeSink', () => {
  const records: LogRecord[] = [];
  const logger = createLogger({ sink: { log: (record) => records.push(record) }, now: () => 123 });
  logger.error('failed', { pushToken: 'secret-token-123', reason: 'timeout' });

  assert.equal(records.length, 1);
  assert.equal(records[0]!.level, 'error');
  assert.equal(records[0]!.timestamp, 123);
  assert.equal((records[0]!.data as { pushToken: string }).pushToken, '***');
  assert.equal(JSON.stringify(records[0]!.data).includes('secret-token-123'), false);
});

test('DiagnosticsTest.testClientHeadersAndUserAgent', () => {
  assert.deepEqual(buildClientHeaders(), { 'X-Client-Type': 'APP' });
  assert.deepEqual(buildClientHeaders({ locale: 'zh-CN' }), {
    'X-Client-Type': 'APP',
    'Accept-Language': 'zh-CN',
  });
  assert.equal(
    buildUserAgent({ appName: 'Nebula', version: '1.0.0', build: 10, os: 'Android', osVersion: '14' }),
    'Nebula/1.0.0(10) Android/14',
  );
});
