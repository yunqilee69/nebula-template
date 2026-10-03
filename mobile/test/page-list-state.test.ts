import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPageListStore } from '../src/components/page-list-state.ts';

test('PageListTest.testInitialEmpty', () => {
  const store = createPageListStore<string>();
  const state = store.getState();
  assert.equal(state.empty, true);
  assert.equal(state.hasMore, true);
  assert.equal(state.pageNum, 0);
});

test('PageListTest.testRefreshAndLoadMore', () => {
  const store = createPageListStore<string>({ pageSize: 2 });
  store.refresh();
  assert.equal(store.getState().refreshing, true);
  store.refreshSuccess({ data: ['a', 'b'], total: 3 });
  assert.equal(store.getState().pageNum, 1);
  assert.equal(store.getState().hasMore, true);
  assert.equal(store.getState().empty, false);

  store.loadMore();
  store.loadMoreSuccess({ data: ['c'], total: 3 });
  assert.deepEqual(store.getState().items, ['a', 'b', 'c']);
  assert.equal(store.getState().hasMore, false);
});

test('PageListTest.testErrorState', () => {
  const store = createPageListStore<string>();
  store.refresh();
  store.refreshError('网络异常，请重试');
  assert.equal(store.getState().error, '网络异常，请重试');
  assert.equal(store.getState().refreshing, false);
  // 有错误时展示错误态而不是空态
  assert.equal(store.getState().empty, false);
});

test('PageListTest.testLoadMoreIgnoredWhenNoMore', () => {
  const store = createPageListStore<string>();
  store.refreshSuccess({ data: ['a'], total: 1 });
  store.loadMore();
  assert.equal(store.getState().loadingMore, false);
});
