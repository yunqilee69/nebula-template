import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NebulaProvider } from '@/providers/nebula-provider';
import type { CacheService } from '@/services/cache';
import type { CacheResp } from '@/types/cache';
import { CacheManagementPage } from './index';

const CACHE_GROUPS: readonly CacheResp[] = [
  {
    cacheName: 'login-lock',
    cacheMode: 'redis',
    protectedCache: false,
    defaultTtlSeconds: 3600,
    entryCount: 1,
    entries: [
      {
        cacheKey: 'lock:alice',
        cacheValueJson: '{"locked":true}',
        cacheValueType: 'LockState',
        ttlSeconds: 3600,
        remainingTtlSeconds: 120,
      },
    ],
  },
  {
    cacheName: 'token-session',
    cacheMode: 'redis',
    protectedCache: false,
    defaultTtlSeconds: 7200,
    entryCount: 1,
    entries: [
      {
        cacheKey: 'session:bob',
        cacheValueJson: 'plain-token-value',
        cacheValueType: 'String',
        ttlSeconds: 7200,
        remainingTtlSeconds: 600,
      },
    ],
  },
  {
    cacheName: 'dictItemByType',
    cacheMode: 'redis',
    protectedCache: false,
    defaultTtlSeconds: 300,
    entryCount: 0,
    entries: [],
  },
  {
    cacheName: 'authSessionCache',
    cacheMode: 'redis',
    protectedCache: true,
    defaultTtlSeconds: 7200,
    entryCount: 7,
    entries: [],
  },
];

/** 去掉空命名空间与受保护命名空间后的基础数据集，用于条目级交互用例。 */
const ENTRY_GROUPS: readonly CacheResp[] = CACHE_GROUPS.filter((cache) => cache.entries.length > 0);

function createService(caches: readonly CacheResp[] = CACHE_GROUPS): CacheService {
  return {
    listCaches: vi.fn().mockResolvedValue(caches),
    deleteCacheEntry: vi.fn().mockResolvedValue(undefined),
    clearCache: vi.fn().mockResolvedValue(undefined),
  };
}

function renderPage(service = createService()): CacheService {
  render(
    <NebulaProvider>
      <CacheManagementPage service={service} />
    </NebulaProvider>,
  );

  return service;
}

async function renderEntryPage(): Promise<CacheService> {
  const service = createService(ENTRY_GROUPS);
  render(
    <NebulaProvider>
      <CacheManagementPage service={service} />
    </NebulaProvider>,
  );
  await findCacheNameButton('login-lock');
  return service;
}

async function confirmPopover(title: string, okButtonName: RegExp = /删\s*除/) {
  const popup = await screen.findByText(title);
  const popover = popup.closest('.ant-popover');
  if (!(popover instanceof HTMLElement)) throw new Error(`Unable to find popover: ${title}`);
  await userEvent.click(within(popover).getByRole('button', { name: okButtonName }));
}

function getCacheNameButton(cacheName: string): HTMLElement {
  return screen.getByRole('button', { name: `选择缓存名称 ${cacheName}` });
}

async function findCacheNameButton(cacheName: string): Promise<HTMLElement> {
  return screen.findByRole('button', { name: `选择缓存名称 ${cacheName}` });
}

function getCacheKeyButton(cacheName: string, cacheKey: string): HTMLElement {
  return screen.getByRole('button', { name: `选择缓存 Key ${cacheName} ${cacheKey}` });
}

describe('CacheManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('browses cache entries through cascading cache name, key, and value columns', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText('缓存名称')).toBeInTheDocument();
    expect(screen.getByText('缓存 Key')).toBeInTheDocument();
    expect(screen.getByText('缓存值')).toBeInTheDocument();
    expect(screen.queryByText('缓存浏览')).not.toBeInTheDocument();

    await user.click(await findCacheNameButton('login-lock'));

    expect(getCacheKeyButton('login-lock', 'lock:alice')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '选择缓存 Key token-session session:bob' })).not.toBeInTheDocument();
    expect(screen.getByText('请选择缓存 Key')).toBeInTheDocument();

    await user.click(getCacheKeyButton('login-lock', 'lock:alice'));

    expect(screen.getByText('LockState')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('"locked": true'))).toBeInTheDocument();
  });

  it('filters cascading cache columns from the top search fields', async () => {
    const user = userEvent.setup();
    renderPage();

    await findCacheNameButton('login-lock');
    expect(screen.getByText('共 2 项')).toBeInTheDocument();

    await user.type(screen.getByLabelText('缓存键'), 'session');

    expect(screen.queryByRole('button', { name: '选择缓存名称 login-lock' })).not.toBeInTheDocument();
    expect(getCacheNameButton('token-session')).toBeInTheDocument();
    expect(screen.getByText('共 1 项')).toBeInTheDocument();

    await user.click(getCacheNameButton('token-session'));
    expect(getCacheKeyButton('token-session', 'session:bob')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('缓存键'));
    await user.type(screen.getByLabelText('缓存名称'), 'missing');

    expect(screen.getByText('未找到匹配缓存项')).toBeInTheDocument();
    expect(screen.getByText('共 0 项')).toBeInTheDocument();
  });

  it('shows TTL metadata and decreases remaining TTL over time', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await findCacheNameButton('login-lock'));
    vi.useFakeTimers();
    fireEvent.click(getCacheKeyButton('login-lock', 'lock:alice'));

    expect(screen.getByText('过期时间 3600s')).toBeInTheDocument();
    expect(screen.getByText('剩余 120s')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByText('剩余 118s')).toBeInTheDocument();
  });

  it('deletes the selected cascading key and refreshes the list', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await user.click(await findCacheNameButton('token-session'));
    await user.click(getCacheKeyButton('token-session', 'session:bob'));
    await user.click(screen.getByRole('button', { name: '删除当前 Key' }));
    await confirmPopover('确认删除当前缓存项？');

    await waitFor(() => {
      expect(service.deleteCacheEntry).toHaveBeenCalledWith({ cacheName: 'token-session', cacheKey: 'session:bob' });
    });
    await waitFor(() => expect(service.listCaches).toHaveBeenCalledTimes(2));
  });

  it('deletes every visible key from the current filtered result', async () => {
    const user = userEvent.setup();
    const service = await renderEntryPage();

    await user.click(screen.getByRole('button', { name: '删除全部' }));
    await confirmPopover('确认删除当前筛选结果中的全部缓存项？');

    await waitFor(() => expect(service.deleteCacheEntry).toHaveBeenCalledTimes(2));
    expect(service.deleteCacheEntry).toHaveBeenCalledWith({ cacheName: 'login-lock', cacheKey: 'lock:alice' });
    expect(service.deleteCacheEntry).toHaveBeenCalledWith({ cacheName: 'token-session', cacheKey: 'session:bob' });
  });

  it('shows the cache mode and keeps namespaces without entries visible', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('缓存模式 Redis')).toBeInTheDocument();
    // 没有条目、只在启动期注册过的命名空间照样列出：否则「未注册」与「注册了但为空」看起来一样
    await user.click(await findCacheNameButton('dictItemByType'));

    expect(screen.getByText('0 个 Key')).toBeInTheDocument();
    expect(screen.getByText('当前缓存名称下暂无 Key')).toBeInTheDocument();
  });

  it('marks protected namespaces and hides their keys', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await findCacheNameButton('authSessionCache'));

    expect(screen.getByText('受保护')).toBeInTheDocument();
    expect(screen.getByText('7 个 Key')).toBeInTheDocument();
    expect(screen.getByText('受保护缓存不提供 Key 列表，可整组清空')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /选择缓存 Key authSessionCache/ })).not.toBeInTheDocument();
  });

  it('clears the selected cache group and refreshes the list', async () => {
    const user = userEvent.setup();
    const service = renderPage();

    await user.click(await findCacheNameButton('authSessionCache'));
    await user.click(screen.getByRole('button', { name: '清空当前分组' }));
    await confirmPopover('确认清空缓存「authSessionCache」下的全部缓存项？', /清\s*空/);

    await waitFor(() => expect(service.clearCache).toHaveBeenCalledWith({ cacheName: 'authSessionCache' }));
    await waitFor(() => expect(service.listCaches).toHaveBeenCalledTimes(2));
  });
});
