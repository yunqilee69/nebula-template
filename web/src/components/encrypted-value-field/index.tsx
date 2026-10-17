import { Button, Input, Popconfirm, Space, Typography } from 'antd';
import { useCallback, useState } from 'react';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import type { NebulaMessageKey } from '@/i18n/types';
import type { EncryptedValueChange, EncryptedValueFieldProps } from './types';

/**
 * 「已配置」的固定占位符。既不复述密文，也不暴露密文长度，
 * 因此永远是这四个字符，不随真实值长度变化。
 */
const ENCRYPTED_VALUE_MASK = '****';

/** 组件文案统一走参数中心的加密字段词条，中英文键由 `NebulaParamMessages` 强约束。 */
const encryptedI18n: Readonly<Record<
  'cancel' | 'clear' | 'clearConfirm' | 'configured' | 'keepHint' | 'modify' | 'set' | 'unconfigured' | 'value' | 'valuePlaceholder',
  NebulaMessageKey
>> = {
  configured: 'system.config.param.encrypted.configured',
  unconfigured: 'system.config.param.encrypted.unconfigured',
  keepHint: 'system.config.param.encrypted.keepHint',
  clearConfirm: 'system.config.param.encrypted.clearConfirm',
  set: 'system.config.param.encrypted.set',
  modify: 'system.config.param.encrypted.modify',
  clear: 'system.config.param.encrypted.clear',
  value: 'system.config.param.inputs.value',
  valuePlaceholder: 'system.config.param.placeholders.value',
  cancel: 'system.config.param.actions.cancel',
};

/**
 * 加密参数值字段：只呈现「是否已配置」，永远不接触密文。
 *
 * 四态：未配置（设置）→ 已配置只读（修改 / 清除）→ 编辑中（空密码框 + 留空则不修改）→ 已输入（密码框带显隐切换）。
 * 组件内部只持有用户新输入的明文，密文与已存值从不进入输入框。
 */
export function EncryptedValueField({
  value,
  editing = false,
  disabled = false,
  onChange,
}: EncryptedValueFieldProps) {
  const { t } = useNebulaI18n();
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState('');
  const [cleared, setCleared] = useState(false);

  // 清除是本地已确认的意图：后端 configured 要等保存后才会翻转，期间按未配置渲染。
  const configured = (value?.configured ?? false) && !cleared;

  const startDrafting = useCallback(() => {
    setDraft('');
    setDrafting(true);
  }, []);

  const cancelDrafting = useCallback(() => {
    setDraft('');
    setDrafting(false);
    // 取消只回退本次输入，保留此前已确认的清除意图。
    onChange?.({ kind: cleared ? 'clear' : 'keep' });
  }, [cleared, onChange]);

  const changeDraft = useCallback((next: string) => {
    setDraft(next);
    // 输入框清空即回到「不修改」，避免空串被下游误解为清除。
    onChange?.(next ? { kind: 'set', value: next } : { kind: 'keep' });
  }, [onChange]);

  const confirmClear = useCallback(() => {
    setDraft('');
    setDrafting(false);
    setCleared(true);
    onChange?.({ kind: 'clear' });
  }, [onChange]);

  const clearControl = (
    <Popconfirm
      title={t(encryptedI18n.clearConfirm)}
      okText={t(encryptedI18n.clear)}
      cancelText={t(encryptedI18n.cancel)}
      disabled={disabled}
      onConfirm={confirmClear}
    >
      <Button type="link" size="small" danger disabled={disabled}>
        {t(encryptedI18n.clear)}
      </Button>
    </Popconfirm>
  );

  if (drafting) {
    return (
      <Space orientation="vertical" size={4} className="w-full">
        <Input.Password
          aria-label={t(encryptedI18n.value)}
          autoComplete="new-password"
          disabled={disabled}
          placeholder={t(encryptedI18n.valuePlaceholder)}
          value={draft}
          onChange={(event) => changeDraft(event.target.value)}
        />
        {configured ? <Typography.Text type="secondary">{t(encryptedI18n.keepHint)}</Typography.Text> : null}
        <Space size="small">
          {configured ? clearControl : null}
          <Button type="link" size="small" disabled={disabled} onClick={cancelDrafting}>
            {t(encryptedI18n.cancel)}
          </Button>
        </Space>
      </Space>
    );
  }

  return (
    <Space size="small">
      <Typography.Text type={configured ? undefined : 'secondary'}>
        {t(configured ? encryptedI18n.configured : encryptedI18n.unconfigured)}
      </Typography.Text>
      {configured ? <Typography.Text code>{ENCRYPTED_VALUE_MASK}</Typography.Text> : null}
      {editing ? (
        <Button type="link" size="small" disabled={disabled} onClick={startDrafting}>
          {t(configured ? encryptedI18n.modify : encryptedI18n.set)}
        </Button>
      ) : null}
      {editing && configured ? clearControl : null}
    </Space>
  );
}

export type { EncryptedValueChange, EncryptedValueChangeKind, EncryptedValueFieldProps } from './types';
