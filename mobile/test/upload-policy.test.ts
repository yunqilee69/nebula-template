import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MB_BYTES,
  normalizeUploadPolicy,
  routeUpload,
  validateFile,
} from '../src/storage/upload-policy.ts';

const POLICY = normalizeUploadPolicy({
  maxFileSize: 100,
  chunkThreshold: 5,
  chunkSize: 2,
  allowedExtensions: 'jpg,png,.jpeg',
  tempRetentionDays: 14,
});

test('UploadPolicyTest.testRouteSimple', () => {
  assert.equal(routeUpload(1 * MB_BYTES, POLICY), 'SIMPLE');
  assert.equal(routeUpload(5 * MB_BYTES, POLICY), 'SIMPLE'); // 等于阈值走简单
});

test('UploadPolicyTest.testRouteChunked', () => {
  assert.equal(routeUpload(5 * MB_BYTES + 1, POLICY), 'CHUNKED');
  assert.equal(routeUpload(60 * MB_BYTES, POLICY), 'CHUNKED');
});

test('UploadPolicyTest.testExtensionRejected', () => {
  const rejected = validateFile({ name: 'payload.exe', size: 1024 }, POLICY);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, 'EXTENSION_NOT_ALLOWED');

  const accepted = validateFile({ name: 'photo.JPEG', size: 1024 }, POLICY);
  assert.equal(accepted.ok, true);
});

test('UploadPolicyTest.testFileTooLarge', () => {
  const rejected = validateFile({ name: 'big.jpg', size: 101 * MB_BYTES }, POLICY);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, 'FILE_TOO_LARGE');
});

test('UploadPolicyTest.testEmptyWhitelistAllowsAll', () => {
  const policy = normalizeUploadPolicy({ allowedExtensions: '' });
  assert.deepEqual(policy.allowedExtensions, []);
  assert.equal(validateFile({ name: 'anything.bin', size: 100 }, policy).ok, true);
});
