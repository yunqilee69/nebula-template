import { Spin, Tag, Typography } from 'antd';
import { useMemo } from 'react';
import type { DictLabelProps } from './dict-select.types';
import { useDictItems } from './use-dict-items';

/**
 * 字典标签显示组件
 *
 * 根据字典编码和值显示对应的字典项名称。
 * 支持显示为带颜色的 Tag 标签或纯文本。
 *
 * @example
 * ```tsx
 * // 显示为带颜色的 Tag
 * <DictLabel dictCode="status" value="active" />
 *
 * // 仅显示文本
 * <DictLabel dictCode="status" value="active" showTag={false} />
 *
 * // 自定义 fallback 文本
 * <DictLabel dictCode="status" value="unknown" fallback="未知" />
 * ```
 */
export function DictLabel({
  dictCode,
  value,
  fallback,
  showTag = true,
  className,
}: DictLabelProps) {
  const { loading, getItemByValue } = useDictItems(dictCode);

  const item = useMemo(() => {
    if (!value) return undefined;
    return getItemByValue(value);
  }, [value, getItemByValue]);

  // 加载中状态
  if (loading) {
    return <Spin size="small" />;
  }

  // 值不存在或字典项未找到
  if (!value) {
    return <Typography.Text type="secondary">-</Typography.Text>;
  }

  // 字典项未找到，显示 fallback 或原值
  if (!item) {
    const displayText = fallback ?? value;
    if (showTag) {
      return <Tag className={className}>{displayText}</Tag>;
    }
    return <Typography.Text className={className}>{displayText}</Typography.Text>;
  }

  // 正常显示
  const displayText = item.name;
  const tagColor = item.tagColor;

  if (showTag) {
    return (
      <Tag className={className} color={tagColor}>
        {displayText}
      </Tag>
    );
  }

  return <Typography.Text className={className}>{displayText}</Typography.Text>;
}

export type { DictLabelProps } from './dict-select.types';