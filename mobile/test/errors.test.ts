import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUTTON_PERMISSION_DENIED,
  CLIENT_SCOPE_DENIED,
  createBusinessError,
  createHttpError,
  isClientScopeDeniedError,
  isPermissionDeniedError,
  isUnauthorizedError,
} from '../src/request/errors.ts';

test('ErrorsTest.testPermissionDeniedCodeMatchesServer', () => {
  // 与服务端 AuthErrorInfo.BUTTON_PERMISSION_DENIED 对齐；18001 是「授权已存在」，不是权限不足
  assert.equal(BUTTON_PERMISSION_DENIED, '18002');
});

test('ErrorsTest.testIsPermissionDeniedError', () => {
  assert.equal(isPermissionDeniedError(createBusinessError(BUTTON_PERMISSION_DENIED, '无权限')), true);
  assert.equal(isPermissionDeniedError(createBusinessError('18001', '授权已存在')), false);
  assert.equal(isPermissionDeniedError(createBusinessError('1', '参数错误')), false);
  assert.equal(isPermissionDeniedError(new Error('plain')), false);
});

test('ErrorsTest.testIsClientScopeDeniedError', () => {
  assert.equal(isClientScopeDeniedError(createBusinessError(CLIENT_SCOPE_DENIED, '作用域受限')), true);
  assert.equal(isClientScopeDeniedError(createBusinessError(BUTTON_PERMISSION_DENIED, '无权限')), false);
});

test('ErrorsTest.testIsUnauthorizedError', () => {
  assert.equal(isUnauthorizedError(createHttpError(401, '未登录')), true);
  assert.equal(isUnauthorizedError(createHttpError(403, '禁止访问')), false);
  assert.equal(isUnauthorizedError(createBusinessError('401', '未登录')), false);
});
