import { theme as antdTheme } from 'antd';
import type { PermissionDraftEffect } from '@/types/permission';

export interface PermissionEffectCheckboxProps {
  /** 资源名称，用于无障碍标签 */
  name: string;
  /** 当前权限效果 */
  effect: PermissionDraftEffect;
  /** 已翻译的权限效果文案 */
  effectLabel: string;
  /** 切换权限效果 */
  onToggle: () => void;
}

/**
 * 权限授权树的三态勾选框：未设置 → 授权 → 拒绝 → 未设置 循环。
 *
 * 用 button + role="checkbox" 而非 antd Checkbox，是因为需要表达 mixed（拒绝）这一语义，
 * 并让读屏能读出「资源名 + 当前效果」。
 */
export function PermissionEffectCheckbox({
  name,
  effect,
  effectLabel,
  onToggle,
}: PermissionEffectCheckboxProps) {
  const { token } = antdTheme.useToken();
  const isAllowed = effect === 'Allow';
  const isDenied = effect === 'Deny';

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isAllowed ? 'true' : isDenied ? 'mixed' : 'false'}
      aria-label={`${name} ${effectLabel}`}
      data-permission-effect={effect}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      style={{
        width: 16,
        height: 16,
        padding: 0,
        borderRadius: token.borderRadiusSM,
        border: `1px solid ${isAllowed ? token.colorPrimary : isDenied ? token.colorError : token.colorBorder}`,
        background: isAllowed ? token.colorPrimary : isDenied ? token.colorError : token.colorBgContainer,
        color: token.colorTextLightSolid,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        lineHeight: 1,
      }}
    >
      {isAllowed ? '✓' : isDenied ? '×' : ''}
    </button>
  );
}
