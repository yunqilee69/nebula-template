import { Button, Card, Empty, Space, Tag, Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState } from 'react';
import type { CacheEntryResp, CacheResp } from '@/types/cache';

export type CacheEntryItem = {
  readonly cacheName: string;
  readonly entry: CacheEntryResp;
};

export interface CacheCascadeBrowserProps {
  readonly filteredCaches: readonly CacheResp[];
  readonly selectedCacheName?: string;
  readonly selectedCacheEntries: readonly CacheEntryItem[];
  readonly selectedEntry?: CacheEntryItem;
  readonly selectedEntryId?: string;
  readonly loading: boolean;
  readonly onSelectCache: (cacheName: string) => void;
  readonly onSelectEntry: (item: CacheEntryItem) => void;
}

const useStyles = createStyles(({ token }) => ({
  cascadeCard: {
    minHeight: 0,
    flex: 1,
  },
  cascadeBrowser: {
    display: 'grid',
    gridTemplateColumns: 'minmax(180px, 0.75fr) minmax(260px, 1fr) minmax(0, 1.8fr)',
    gap: token.marginMD,
    minHeight: 0,
    flex: 1,
    '@media (max-width: 768px)': {
      gridTemplateColumns: '1fr',
    },
  },
  cascadeColumn: {
    minWidth: 0,
    minHeight: 320,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
  },
  cascadeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: token.marginSM,
    padding: `${token.paddingSM}px ${token.padding}px`,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorFillQuaternary,
  },
  cascadeBody: {
    minHeight: 0,
    flex: 1,
    overflow: 'auto',
    padding: token.paddingXS,
  },
  cascadeStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginXXS,
  },
  cascadeItem: {
    width: '100%',
    height: 'auto',
    justifyContent: 'flex-start',
    border: '1px solid transparent',
    paddingBlock: token.paddingSM,
    textAlign: 'left',
  },
  selectedCascadeItem: {
    borderColor: token.colorPrimaryBorder,
    background: token.colorPrimaryBg,
    color: token.colorPrimary,
    '&:hover': { borderColor: token.colorPrimary, background: token.colorPrimaryBgHover, color: token.colorPrimary },
    '& .ant-typography': { color: token.colorPrimary },
  },
  cascadeItemText: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  valuePane: {
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: token.marginSM,
  },
  ttlMeta: { display: 'flex', flexWrap: 'wrap', gap: token.marginXS },
  valueBlock: {
    minHeight: 220,
    maxHeight: token.controlHeightLG * 10,
    margin: 0,
    padding: token.padding,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgLayout,
    color: token.colorText,
    fontFamily: token.fontFamilyCode,
    overflow: 'auto',
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },
}));

export function getCacheEntryId(item: CacheEntryItem): string {
  return `${item.cacheName}:${item.entry.cacheKey}`;
}

export function flattenCaches(caches: readonly CacheResp[]): readonly CacheEntryItem[] {
  return caches.flatMap((cache) => cache.entries.map((entry) => ({
    cacheName: cache.cacheName,
    entry,
  })));
}

function formatCacheValue(value: string | undefined): string {
  if (!value) return '-';
  try {
    const parsed: unknown = JSON.parse(value);
    return JSON.stringify(parsed, null, 2) ?? value;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return value;
    throw error;
  }
}

export function CacheCascadeBrowser({
  filteredCaches,
  selectedCacheName,
  selectedCacheEntries,
  selectedEntry,
  selectedEntryId,
  loading,
  onSelectCache,
  onSelectEntry,
}: CacheCascadeBrowserProps) {
  const { styles } = useStyles();
  const [remainingTtlSeconds, setRemainingTtlSeconds] = useState<number | undefined>();

  useEffect(() => {
    setRemainingTtlSeconds(selectedEntry?.entry.remainingTtlSeconds);
  }, [selectedEntry?.entry.remainingTtlSeconds, selectedEntryId]);

  useEffect(() => {
    if (selectedEntry?.entry.remainingTtlSeconds === undefined) return undefined;

    const timer = window.setInterval(() => {
      setRemainingTtlSeconds((current) => {
        if (current === undefined) return current;
        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [selectedEntry?.entry.remainingTtlSeconds, selectedEntryId]);

  return (
    <Card className={styles.cascadeCard} styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 } }}>
      <div className={styles.cascadeBrowser}>
        <section className={styles.cascadeColumn} aria-label="缓存名称列表">
          <div className={styles.cascadeHeader}>
            <Typography.Text strong>缓存名称</Typography.Text>
            <Tag>{filteredCaches.length}</Tag>
          </div>
          <div className={styles.cascadeBody}>
            {filteredCaches.length > 0 ? (
              <div className={styles.cascadeStack}>
                {filteredCaches.map((cache) => {
                  const isSelected = cache.cacheName === selectedCacheName;
                  return (
                    <Button
                      key={cache.cacheName}
                      aria-label={`选择缓存名称 ${cache.cacheName}`}
                      className={`${styles.cascadeItem} ${isSelected ? styles.selectedCascadeItem : ''}`}
                      type="text"
                      onClick={() => onSelectCache(cache.cacheName)}
                    >
                      <span className={styles.cascadeItemText}>
                        <Typography.Text ellipsis>{cache.cacheName}</Typography.Text>
                        <Typography.Text type="secondary">{cache.entries.length} 个 Key</Typography.Text>
                      </span>
                    </Button>
                  );
                })}
              </div>
            ) : (
              <Empty description={loading ? '加载中' : '未找到匹配缓存项'} />
            )}
          </div>
        </section>

        <section className={styles.cascadeColumn} aria-label="缓存 Key 列表">
          <div className={styles.cascadeHeader}>
            <Typography.Text strong>缓存 Key</Typography.Text>
            <Tag>{selectedCacheEntries.length}</Tag>
          </div>
          <div className={styles.cascadeBody}>
            {selectedCacheName ? (
              selectedCacheEntries.length > 0 ? (
                <div className={styles.cascadeStack}>
                  {selectedCacheEntries.map((item) => {
                    const itemId = getCacheEntryId(item);
                    return (
                      <Button
                        key={itemId}
                        aria-label={`选择缓存 Key ${item.cacheName} ${item.entry.cacheKey}`}
                        className={`${styles.cascadeItem} ${itemId === selectedEntryId ? styles.selectedCascadeItem : ''}`}
                        type="text"
                        onClick={() => onSelectEntry(item)}
                      >
                        <Typography.Text code ellipsis>{item.entry.cacheKey}</Typography.Text>
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <Empty description="当前缓存名称下暂无 Key" />
              )
            ) : (
              <Empty description="请选择缓存名称" />
            )}
          </div>
        </section>

        <section className={styles.cascadeColumn} aria-label="缓存值预览">
          <div className={styles.cascadeHeader}>
            <Typography.Text strong>缓存值</Typography.Text>
            {selectedEntry?.entry.cacheValueType ? <Tag>{selectedEntry.entry.cacheValueType}</Tag> : null}
          </div>
          <div className={styles.cascadeBody}>
            {selectedEntry ? (
              <div className={styles.valuePane}>
                <Space orientation="vertical" size={2}>
                  <Typography.Text type="secondary">{selectedEntry.cacheName}</Typography.Text>
                  <Typography.Text code>{selectedEntry.entry.cacheKey}</Typography.Text>
                </Space>
                {(selectedEntry.entry.ttlSeconds !== undefined || remainingTtlSeconds !== undefined) ? (
                  <div className={styles.ttlMeta}>
                    {selectedEntry.entry.ttlSeconds !== undefined ? <Tag>过期时间 {selectedEntry.entry.ttlSeconds}s</Tag> : null}
                    {remainingTtlSeconds !== undefined ? <Tag color="blue">剩余 {remainingTtlSeconds}s</Tag> : null}
                  </div>
                ) : null}
                <pre className={styles.valueBlock}>{formatCacheValue(selectedEntry.entry.cacheValueJson)}</pre>
              </div>
            ) : (
              <Empty description="请选择缓存 Key" />
            )}
          </div>
        </section>
      </div>
    </Card>
  );
}
