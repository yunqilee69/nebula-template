import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Card, Flex, Input, Popconfirm, Space, Tag } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNotice } from '@/hooks/use-notice';
import { cacheService, type CacheService } from '@/services/cache';
import type { CacheResp } from '@/types/cache';
import { CacheCascadeBrowser, flattenCaches, getCacheEntryId } from './cache-cascade-browser';
import type { CacheEntryItem } from './cache-cascade-browser';

export interface CacheManagementPageProps {
  readonly service?: CacheService;
}

function includesText(value: string | undefined, keyword: string): boolean {
  return value?.toLowerCase().includes(keyword.toLowerCase()) ?? false;
}

export function CacheManagementPage({ service: serviceProp }: CacheManagementPageProps) {
  const service = serviceProp ?? cacheService;
  const notice = useNotice();

  const [caches, setCaches] = useState<readonly CacheResp[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cacheNameFilter, setCacheNameFilter] = useState('');
  const [cacheKeyFilter, setCacheKeyFilter] = useState('');
  const [selectedCacheName, setSelectedCacheName] = useState<string>();
  const [selectedId, setSelectedId] = useState<string>();

  const filteredCaches = useMemo(() => {
    const cacheNameKeyword = cacheNameFilter.trim();
    const cacheKeyKeyword = cacheKeyFilter.trim();

    return caches
      .filter((cache) => cacheNameKeyword === '' || includesText(cache.cacheName, cacheNameKeyword))
      .map((cache) => ({
        ...cache,
        entries: cache.entries.filter((entry) => cacheKeyKeyword === '' || includesText(entry.cacheKey, cacheKeyKeyword)),
      }))
      .filter((cache) => cache.entries.length > 0);
  }, [cacheKeyFilter, cacheNameFilter, caches]);
  const filteredEntries = useMemo(() => flattenCaches(filteredCaches), [filteredCaches]);
  const selectedCache = filteredCaches.find((cache) => cache.cacheName === selectedCacheName);
  const selectedCacheEntries = useMemo(() => (
    selectedCache ? flattenCaches([selectedCache]) : []
  ), [selectedCache]);
  const selectedEntry = selectedId ? filteredEntries.find((item) => getCacheEntryId(item) === selectedId) : undefined;
  const selectedEntryId = selectedEntry ? getCacheEntryId(selectedEntry) : undefined;

  const loadCaches = useCallback(async () => {
    setLoading(true);
    try {
      setCaches(await service.listCaches());
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('缓存列表加载失败');
        return;
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [notice, service]);

  useEffect(() => {
    void loadCaches();
  }, [loadCaches]);

  const deleteEntries = useCallback(async (entries: readonly CacheEntryItem[], successMessage: string) => {
    if (entries.length === 0) return;
    setDeleting(true);
    try {
      await Promise.all(entries.map((item) => service.deleteCacheEntry({
        cacheName: item.cacheName,
        cacheKey: item.entry.cacheKey,
      })));
      notice.success(successMessage);
      setSelectedId(undefined);
      await loadCaches();
    } catch (error: unknown) {
      if (error instanceof Error) {
        notice.error('删除缓存项失败');
        return;
      }
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [loadCaches, notice, service]);

  const deleteSelected = useCallback(() => {
    if (!selectedEntry) return Promise.resolve();
    return deleteEntries([selectedEntry], '缓存项已删除');
  }, [deleteEntries, selectedEntry]);

  const selectCache = useCallback((cacheName: string) => {
    setSelectedCacheName(cacheName);
    setSelectedId(undefined);
  }, []);

  const selectEntry = useCallback((item: CacheEntryItem) => {
    setSelectedCacheName(item.cacheName);
    setSelectedId(getCacheEntryId(item));
  }, []);

  return (
    <div className="h-full min-h-0 flex flex-col gap-4">
      <Card>
        <Flex wrap="wrap" gap="middle" align="end" justify="space-between">
          <Flex wrap="wrap" gap="middle" align="end">
            <Input
              aria-label="缓存名称"
              placeholder="缓存名称"
              value={cacheNameFilter}
              onChange={(event) => setCacheNameFilter(event.target.value)}
              allowClear
              style={{ width: 220 }}
            />
            <Input
              aria-label="缓存键"
              placeholder="缓存键"
              value={cacheKeyFilter}
              onChange={(event) => setCacheKeyFilter(event.target.value)}
              allowClear
              style={{ width: 260 }}
            />
            <Tag color="blue">共 {filteredEntries.length} 项</Tag>
          </Flex>
          <Space wrap>
            <Button aria-label="刷新" icon={<ReloadOutlined />} onClick={() => void loadCaches()} loading={loading}>刷新</Button>
            <Popconfirm title="确认删除当前缓存项？" okText="删除" cancelText="取消" onConfirm={() => void deleteSelected()}>
              <Button aria-label="删除当前 Key" danger icon={<DeleteOutlined />} disabled={!selectedEntry || deleting} loading={deleting}>删除当前 Key</Button>
            </Popconfirm>
            <Popconfirm
              title="确认删除当前筛选结果中的全部缓存项？"
              okText="删除"
              cancelText="取消"
              onConfirm={() => void deleteEntries(filteredEntries, '缓存项已批量删除')}
            >
              <Button danger disabled={filteredEntries.length === 0 || deleting} loading={deleting}>删除全部</Button>
            </Popconfirm>
          </Space>
        </Flex>
      </Card>

      <CacheCascadeBrowser
        filteredCaches={filteredCaches}
        selectedCacheName={selectedCacheName}
        selectedCacheEntries={selectedCacheEntries}
        selectedEntry={selectedEntry}
        selectedEntryId={selectedEntryId}
        loading={loading}
        onSelectCache={selectCache}
        onSelectEntry={selectEntry}
      />
    </div>
  );
}

export default CacheManagementPage;
