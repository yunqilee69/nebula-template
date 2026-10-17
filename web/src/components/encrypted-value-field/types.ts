/**
 * 加密字段的编辑意图。密文永不进入前端，因此组件只能表达「不改 / 改成新明文 / 清空」三种语义，
 * 由表单层翻译为「省略字段 / 提交新明文 / 提交空串」。
 */
export type EncryptedValueChangeKind = 'keep' | 'set' | 'clear';

export interface EncryptedValueChange {
  readonly kind: EncryptedValueChangeKind;
  /** 仅 `kind === 'set'` 时携带新的明文值。 */
  readonly value?: string;
}

export interface EncryptedValueFieldProps {
  /** 后端只回传「是否已配置」，不回传密文与密文长度。 */
  readonly value?: Readonly<{ configured: boolean }>;
  /** 表单是否处于编辑态。为假时只读展示，不提供设置/修改/清除入口。 */
  readonly editing?: boolean;
  readonly disabled?: boolean;
  readonly onChange?: (e: EncryptedValueChange) => void;
}
