import * as AntDesignIcons from '@ant-design/icons';
import { useMemo, useState } from 'react';
import { Button, Empty, Input, Modal, Pagination, Space } from 'antd';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';

const ICON_NAMES = Object.keys(AntDesignIcons).filter((name) => {
  const component = (AntDesignIcons as Record<string, unknown>)[name];
  return (
    component !== undefined
    && (name.endsWith('Outlined') || name.endsWith('Filled') || name.endsWith('TwoTone'))
  );
});

const PAGE_SIZE = 60;

function resolveIconComponent(iconName: string | undefined) {
  if (!iconName) return undefined;
  const component = (AntDesignIcons as Record<string, unknown>)[iconName];
  if (typeof component === 'function' || (typeof component === 'object' && component !== null)) {
    return component as React.ComponentType<{ className?: string }>;
  }
  return undefined;
}

export interface NebulaIconPickerModalProps {
  open: boolean;
  value?: string;
  onConfirm: (iconName: string) => void;
  onCancel: () => void;
}

export function NebulaIconPickerModal({ open, value, onConfirm, onCancel }: NebulaIconPickerModalProps) {
  const { t } = useNebulaI18n();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  const filteredNames = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return ICON_NAMES;
    return ICON_NAMES.filter((name) => name.toLowerCase().includes(normalized));
  }, [keyword]);

  const pagedNames = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredNames.slice(start, start + PAGE_SIZE);
  }, [filteredNames, page]);

  function handleSearch(nextKeyword: string) {
    setKeyword(nextKeyword);
    setPage(1);
  }

  return (
    <Modal
      title={t('common.iconPicker.title')}
      open={open}
      width={720}
      footer={null}
      onCancel={onCancel}
    >
      <Input.Search
        allowClear
        value={keyword}
        placeholder={t('common.iconPicker.searchPlaceholder')}
        onChange={(event) => handleSearch(event.target.value)}
        style={{ marginBottom: 16 }}
      />
      {pagedNames.length === 0 ? (
        <Empty description={t('common.iconPicker.empty')} />
      ) : (
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
          {pagedNames.map((name) => {
            const IconComponent = resolveIconComponent(name);
            const selected = name === value;
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => onConfirm(name)}
                className={
                  'flex h-11 w-full cursor-pointer items-center justify-center rounded border transition-colors '
                  + (selected
                    ? 'border-[var(--nebula-color-primary)] bg-[var(--nebula-color-primary-bg)] text-[var(--nebula-color-primary)]'
                    : 'border-[var(--nebula-color-border)] text-[var(--nebula-color-text)] hover:border-[var(--nebula-color-primary)] hover:text-[var(--nebula-color-primary)]')
                }
              >
                {IconComponent && <IconComponent className="text-[20px]" />}
              </button>
            );
          })}
        </div>
      )}
      {filteredNames.length > PAGE_SIZE && (
        <div className="mt-4 flex justify-end">
          <Pagination
            size="small"
            current={page}
            pageSize={PAGE_SIZE}
            total={filteredNames.length}
            onChange={setPage}
            showSizeChanger={false}
            showTotal={(total) => t('common.pagination.total').replace('{total}', String(total))}
          />
        </div>
      )}
    </Modal>
  );
}

export interface NebulaIconPickerProps {
  value?: string;
  onChange?: (iconName: string | undefined) => void;
  placeholder?: string;
}

/**
 * 图标选择控件：可手动输入图标名（兼容 iconMap 自定义键），也可点击按钮
 * 在弹窗中可视化选择 antd 图标。作为 antd Form 受控组件使用。
 */
export function NebulaIconPicker({ value, onChange, placeholder }: NebulaIconPickerProps) {
  const { t } = useNebulaI18n();
  const [pickerOpen, setPickerOpen] = useState(false);

  function handleConfirm(iconName: string) {
    onChange?.(iconName);
    setPickerOpen(false);
  }

  const PreviewIcon = resolveIconComponent(value);

  return (
    <Space.Compact block>
      <Input
        value={value}
        placeholder={placeholder ?? t('common.iconPicker.inputPlaceholder')}
        onChange={(event) => onChange?.(event.target.value || undefined)}
      />
      <Button
        type="default"
        onClick={() => setPickerOpen(true)}
        aria-label={t('common.iconPicker.triggerAriaLabel')}
        title={t('common.iconPicker.triggerAriaLabel')}
        icon={PreviewIcon ? <PreviewIcon /> : undefined}
      />
      <NebulaIconPickerModal
        open={pickerOpen}
        value={value}
        onConfirm={handleConfirm}
        onCancel={() => setPickerOpen(false)}
      />
    </Space.Compact>
  );
}
