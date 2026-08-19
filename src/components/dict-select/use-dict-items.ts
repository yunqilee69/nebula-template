import { useCallback, useEffect, useMemo } from 'react';
import type { DictItemData, DictSelectOption, UseDictItemsResult } from './dict-select.types';
import { useDictCacheStore } from '@/stores/dict-cache-store';

/**
 * 递归将字典项转换为 Select 选项（扁平化）
 */
function flattenDictItems(items: readonly DictItemData[]): DictSelectOption[] {
  return items.flatMap((item) => [
    {
      label: item.name,
      value: item.itemValue,
      disabled: !item.enabled,
      tagColor: item.tagColor,
    },
    ...flattenDictItems(item.children ?? []),
  ]);
}

/**
 * 仅提取顶级字典项为 Select 选项
 */
function topDictItems(items: readonly DictItemData[]): DictSelectOption[] {
  return items.map((item) => ({
    label: item.name,
    value: item.itemValue,
    disabled: !item.enabled,
    tagColor: item.tagColor,
  }));
}

/**
 * 构建值到字典项的映射表
 */
function buildItemMap(items: readonly DictItemData[]): Map<string, DictItemData> {
  const map = new Map<string, DictItemData>();
  for (const item of items) {
    map.set(item.itemValue, item);
    if (item.children) {
      const childMap = buildItemMap(item.children);
      for (const [key, value] of childMap) {
        map.set(key, value);
      }
    }
  }
  return map;
}

/**
 * 字典数据加载 Hook
 *
 * 使用全局缓存，同一 dictCode 只请求一次，多个组件共享数据。
 *
 * @param dictCode 字典编码
 * @param flatten 是否扁平化父子字典项，默认 true
 * @returns 字典项数据、选项列表、加载状态和辅助方法
 */
export function useDictItems(dictCode: string, flatten = true): UseDictItemsResult {
  const fetchDictItems = useDictCacheStore((state) => state.fetchDictItems);
  const cacheEntry = useDictCacheStore((state) => state.caches[dictCode]);

  const cachedItems = cacheEntry?.items ?? [];
  const loading = cacheEntry?.loading ?? false;

  useEffect(() => {
    if (dictCode) {
      fetchDictItems(dictCode).catch(() => {});
    }
  }, [dictCode, fetchDictItems]);

  const items = useMemo(() => cachedItems, [cachedItems]);

  const options = useMemo(() => {
    return flatten ? flattenDictItems(items) : topDictItems(items);
  }, [items, flatten]);

  const itemMap = useMemo(() => buildItemMap(items), [items]);

  const getItemByValue = useCallback(
    (value: string): DictItemData | undefined => {
      return itemMap.get(value);
    },
    [itemMap]
  );

  const getLabelByValue = useCallback(
    (value: string): string | undefined => {
      return itemMap.get(value)?.name;
    },
    [itemMap]
  );

  return {
    options,
    items,
    loading,
    getItemByValue,
    getLabelByValue,
  };
}