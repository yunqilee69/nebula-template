import type { SelectProps } from 'antd';

/**
 * 字典选择器选项
 */
export interface DictSelectOption {
  readonly label: string;
  readonly value: string;
  readonly disabled: boolean;
  /** 标签颜色（从字典项 tagColor 字段映射） */
  readonly tagColor?: string;
}

/**
 * 字典选择器 Props
 */
export interface DictSelectProps extends Omit<SelectProps, 'options' | 'loading' | 'mode' | 'value' | 'onChange'> {
  /** 字典编码 - 必填，用于请求数据 */
  readonly dictCode: string;

  /** 选择模式: single(单选) | multiple(多选) */
  readonly mode?: 'single' | 'multiple';

  /** 当前值 - 受控模式 */
  readonly value?: string | string[];

  /** 值变化回调 */
  readonly onChange?: (value: string | string[] | undefined) => void;

  /** 是否显示禁用的选项，默认 true */
  readonly showDisabled?: boolean;

  /** 是否将父子字典项平铺显示，默认 true
   * - true: 扁平展示所有层级
   * - false: 仅展示顶级项
   */
  readonly flatten?: boolean;
}

/**
 * 字典标签显示组件 Props
 */
export interface DictLabelProps {
  /** 字典编码 - 必填 */
  readonly dictCode: string;

  /** 字典项值 - 必填 */
  readonly value: string;

  /** 值不存在时显示的文本，默认显示原值 */
  readonly fallback?: string;

  /** 是否显示为 Tag 标签，默认 true
   * - true: 显示为带颜色的 Tag
   * - false: 仅显示文本
   */
  readonly showTag?: boolean;

  /** 自定义类名 */
  readonly className?: string;
}

/**
 * useDictItems hook 返回值
 */
export interface UseDictItemsResult {
  /** 字典项选项列表（已转换为 Select 选项格式） */
  readonly options: DictSelectOption[];

  /** 原始字典项数据 */
  readonly items: readonly DictItemData[];

  /** 加载状态 */
  readonly loading: boolean;

  /** 根据值获取字典项信息 */
  readonly getItemByValue: (value: string) => DictItemData | undefined;

  /** 根据值获取显示名称 */
  readonly getLabelByValue: (value: string) => string | undefined;
}

/**
 * 字典项原始数据（简化版 DictItemTreeResp）
 */
export interface DictItemData {
  readonly id: string;
  readonly name: string;
  readonly itemValue: string;
  readonly enabled: boolean;
  readonly tagColor?: string;
  readonly children?: readonly DictItemData[];
}