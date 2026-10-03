import type {
  AppReleaseCheckResp,
  FrontendConfigResp,
} from '../../../packages/client-sdk/index.ts';

/**
 * 版本检查与升级判定（对接「应用版本与升级检查」能力 #4）。
 *
 * <p>判定依据是<b>整数构建号</b>的比较，不用字符串版本号。
 * 服务端通过 `POST /api/frontend/app-release/check` 或 `init`（带 platform/channel）下发策略。</p>
 */

export type UpgradeKind = 'NONE' | 'OPTIONAL' | 'FORCE';

export interface UpgradeDecision {
  kind: UpgradeKind;
  latestVersionCode?: number | null;
  minSupportedVersionCode?: number | null;
  downloadUrl?: string;
  releaseNotes?: string;
}

const NONE: UpgradeDecision = { kind: 'NONE' };

export interface EvaluateUpgradeInput {
  currentVersionCode: number;
  check: AppReleaseCheckResp | null | undefined;
}

/** 依据版本检查接口响应判定。 */
export function evaluateUpgrade({ currentVersionCode, check }: EvaluateUpgradeInput): UpgradeDecision {
  if (!check) return NONE;

  const minSupportedVersionCode = check.minSupportedVersionCode ?? null;
  const latestVersionCode = check.latestVersionCode ?? null;

  const belowMinimum =
    typeof minSupportedVersionCode === 'number' && currentVersionCode < minSupportedVersionCode;

  if (check.forceUpgrade === true || belowMinimum) {
    return {
      kind: 'FORCE',
      latestVersionCode,
      minSupportedVersionCode,
      ...(check.downloadUrl !== undefined ? { downloadUrl: check.downloadUrl } : {}),
      ...(check.releaseNotes !== undefined ? { releaseNotes: check.releaseNotes } : {}),
    };
  }

  const hasNewer =
    check.upgradeAvailable === true ||
    (typeof latestVersionCode === 'number' && currentVersionCode < latestVersionCode);

  if (hasNewer) {
    return {
      kind: 'OPTIONAL',
      latestVersionCode,
      minSupportedVersionCode,
      ...(check.downloadUrl !== undefined ? { downloadUrl: check.downloadUrl } : {}),
      ...(check.releaseNotes !== undefined ? { releaseNotes: check.releaseNotes } : {}),
    };
  }

  return { kind: 'NONE', latestVersionCode, minSupportedVersionCode };
}

export interface EvaluateUpgradeFromInitInput {
  currentVersionCode: number;
  frontendConfig: FrontendConfigResp | null | undefined;
}

/**
 * 依据 `init` 下发的版本字段判定（减少一次请求）。
 * 未携带 platform 时两个字段为 null，判定为 NONE（不做任何升级提示）。
 */
export function evaluateUpgradeFromInit({
  currentVersionCode,
  frontendConfig,
}: EvaluateUpgradeFromInitInput): UpgradeDecision {
  if (!frontendConfig) return NONE;

  const minSupportedVersionCode = frontendConfig.minSupportedVersionCode ?? null;
  const latestVersionCode = frontendConfig.latestVersionCode ?? null;

  if (typeof minSupportedVersionCode === 'number' && currentVersionCode < minSupportedVersionCode) {
    return { kind: 'FORCE', latestVersionCode, minSupportedVersionCode };
  }
  if (typeof latestVersionCode === 'number' && currentVersionCode < latestVersionCode) {
    return { kind: 'OPTIONAL', latestVersionCode, minSupportedVersionCode };
  }
  return { kind: 'NONE', latestVersionCode, minSupportedVersionCode };
}
