import { Select } from 'antd';
import { useMemo } from 'react';
import type { DictSelectProps } from './dict-select.types';
import { useDictItems } from './use-dict-items';

/**
 * 字典选择器组件
 *
 * 根据字典编码自动加载字典项数据并渲染为下拉选择器。
 * 支持单选/多选模式，支持父子字典项扁平化显示。
 *
 * @example
 * ```tsx
 * // 基础用法
 * <DictSelect dictCode="param_module" placeholder="请选择模块" />
 *
 * // 多选模式
 * <DictSelect dictCode="status" mode="multiple" placeholder="请选择状态" />
 *
 * // 受控模式
 * <DictSelect dictCode="param_module" value={value} onChange={setValue} />
 * ```
 */
export function DictSelect({
  dictCode,
  mode = 'single',
  value,
  onChange,
  showDisabled = true,
  flatten = true,
  placeholder,
  disabled,
  allowClear = true,
  ...restProps
}: DictSelectProps) {
  const { options, loading } = useDictItems(dictCode, flatten);

  // 根据 showDisabled 过滤选项
  const filteredOptions = useMemo(() => {
    if (showDisabled) return options;
    return options.filter((option) => !option.disabled);
  }, [options, showDisabled]);

  const optionsWithValue = useMemo(() => {
    if (value === undefined || value === null) return filteredOptions;

    const currentValue = mode === 'multiple' && Array.isArray(value) ? value : [value];
    const values = currentValue.filter((v): v is string => typeof v === 'string' && v !== '');
    const existingValues = new Set(filteredOptions.map((o) => o.value));
    const missingOptions = values
      .filter((v) => !existingValues.has(v))
      .map((v) => ({ label: v, value: v, disabled: false }));

    return [...missingOptions, ...filteredOptions];
  }, [filteredOptions, value, mode]);

  // 处理值变化
  const handleChange = (newValue: unknown) => {
    if (!onChange) return;

    if (mode === 'multiple') {
      onChange(Array.isArray(newValue) ? newValue.filter((v) => typeof v === 'string') : []);
    } else {
      onChange(newValue === undefined || newValue === null ? undefined : String(newValue));
    }
  };

  return (
    <Select
      {...restProps}
      allowClear={allowClear}
      disabled={disabled}
      loading={loading}
      mode={mode === 'multiple' ? 'multiple' : undefined}
      options={optionsWithValue}
      placeholder={placeholder}
      showSearch
      optionFilterProp="label"
      value={value}
      onChange={handleChange}
    />
  );
}

export type { DictSelectProps } from './dict-select.types';