import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractTenantCode } from '../src/auth/tenant-code.ts';

test('extractTenantCode reads explicit tenantCode query param', () => {
  assert.equal(extractTenantCode('nebula://open?tenantCode=ACME'), 'acme');
  assert.equal(extractTenantCode('https://app.example.com/login?foo=1&tenantCode=acme-2#x'), 'acme-2');
});

test('extractTenantCode ignores missing or malformed values', () => {
  assert.equal(extractTenantCode(null), undefined);
  assert.equal(extractTenantCode('https://app.example.com/login'), undefined);
  assert.equal(extractTenantCode('https://app.example.com/login?tenantCode='), undefined);
});
