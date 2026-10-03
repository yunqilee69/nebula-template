import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateUpgrade, evaluateUpgradeFromInit } from '../src/upgrade/upgrade.ts';

test('UpgradeTest.testForceWhenBelowMinSupported', () => {
  const decision = evaluateUpgrade({
    currentVersionCode: 140,
    check: { minSupportedVersionCode: 141, latestVersionCode: 145, forceUpgrade: true },
  });
  assert.equal(decision.kind, 'FORCE');
  assert.equal(decision.minSupportedVersionCode, 141);
  assert.equal(decision.latestVersionCode, 145);
});

test('UpgradeTest.testForceFlagAlone', () => {
  const decision = evaluateUpgrade({
    currentVersionCode: 200,
    check: { forceUpgrade: true, latestVersionCode: 200 },
  });
  assert.equal(decision.kind, 'FORCE');
});

test('UpgradeTest.testOptionalWhenNewerButAboveMinimum', () => {
  const decision = evaluateUpgrade({
    currentVersionCode: 140,
    check: { minSupportedVersionCode: 138, latestVersionCode: 141, upgradeAvailable: true },
  });
  assert.equal(decision.kind, 'OPTIONAL');
});

test('UpgradeTest.testNoneWhenUpToDate', () => {
  const decision = evaluateUpgrade({
    currentVersionCode: 141,
    check: { minSupportedVersionCode: 138, latestVersionCode: 141, upgradeAvailable: false },
  });
  assert.equal(decision.kind, 'NONE');
  assert.equal(evaluateUpgrade({ currentVersionCode: 1, check: null }).kind, 'NONE');
});

test('UpgradeTest.testInitDrivenDecision', () => {
  assert.equal(
    evaluateUpgradeFromInit({ currentVersionCode: 140, frontendConfig: {} }).kind,
    'NONE',
  );
  assert.equal(
    evaluateUpgradeFromInit({
      currentVersionCode: 140,
      frontendConfig: { minSupportedVersionCode: 141 },
    }).kind,
    'FORCE',
  );
  assert.equal(
    evaluateUpgradeFromInit({
      currentVersionCode: 140,
      frontendConfig: { latestVersionCode: 141, minSupportedVersionCode: 138 },
    }).kind,
    'OPTIONAL',
  );
});
