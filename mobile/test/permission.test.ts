import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPermissionChecker,
  createPermissionCode,
  hasPermission,
} from '../src/auth/permission.ts';

test('PermissionTest.testExactMatch', () => {
  assert.equal(hasPermission(['WMS_X'], 'WMS_X'), true);
  assert.equal(hasPermission(['WMS_X'], 'WMS_Y'), false);
});

test('PermissionTest.testThreeSegmentMatch', () => {
  const owned = createPermissionCode('BUTTON', 'WMS_X_CREATE', 'Allow');
  assert.equal(owned, 'BUTTON:WMS_X_CREATE:Allow');
  assert.equal(hasPermission([owned], 'WMS_X_CREATE'), true);
  // 三段式的 required 也按精确匹配
  assert.equal(hasPermission([owned], 'BUTTON:WMS_X_CREATE:Allow'), true);
});

test('PermissionTest.testWildcardMatch', () => {
  assert.equal(hasPermission(['WMS_*'], 'WMS_ORDER_CREATE'), true);
  assert.equal(hasPermission(['*'], 'ANYTHING'), true);
});

test('PermissionTest.testModeAll', () => {
  assert.equal(hasPermission(['A'], ['A', 'B'], { mode: 'all' }), false);
  assert.equal(hasPermission(['A', 'B'], ['A', 'B'], { mode: 'all' }), true);
  assert.equal(hasPermission(['A'], ['A', 'B'], { mode: 'any' }), true);
});

test('PermissionTest.testSuperRoleBypass', () => {
  assert.equal(hasPermission([], 'WMS_X', { roles: ['ADMIN'] }), true);
  assert.equal(hasPermission([], 'WMS_X', { roles: ['SUPER_ADMIN'] }), true);
  assert.equal(hasPermission([], 'WMS_X', { roles: ['OPERATOR'] }), false);
});

test('PermissionTest.testDenied', () => {
  assert.equal(hasPermission([], 'WMS_X'), false);
  assert.equal(hasPermission(['OTHER'], ['WMS_X', 'WMS_Y']), false);
});

test('PermissionTest.testNoRequirementAllows', () => {
  assert.equal(hasPermission([], undefined), true);
  assert.equal(hasPermission([], []), true);
});

test('PermissionTest.testCheckerUsesBoundContext', () => {
  const can = createPermissionChecker(['BUTTON:WMS_X:Allow'], ['OPERATOR']);
  assert.equal(can('WMS_X'), true);
  assert.equal(can('WMS_Y'), false);
  assert.equal(can('WMS_Y', { roles: ['ADMIN'] }), true);
});
