/** 分页列表状态机：下拉刷新 / 上拉加载 / 空态 / 错误态 / 加载态。 */

export interface PageSnapshot<T> {
  data: T[];
  total: number;
}

export interface PageListState<T> {
  items: T[];
  pageNum: number;
  pageSize: number;
  total: number;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  empty: boolean;
}

export interface PageListStore<T> {
  getState(): PageListState<T>;
  /** 首次加载/下拉刷新开始。 */
  refresh(): void;
  refreshSuccess(snapshot: PageSnapshot<T>): void;
  refreshError(message: string): void;
  /** 上拉加载更多开始。 */
  loadMore(): void;
  loadMoreSuccess(snapshot: PageSnapshot<T>): void;
  loadMoreError(message: string): void;
  reset(): void;
}

export interface PageListOptions {
  pageSize?: number;
}

export const DEFAULT_PAGE_SIZE = 20;

export function createPageListStore<T>(options: PageListOptions = {}): PageListStore<T> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;

  const state: PageListState<T> = {
    items: [],
    pageNum: 0,
    pageSize,
    total: 0,
    loading: false,
    refreshing: false,
    loadingMore: false,
    error: null,
    hasMore: true,
    empty: true,
  };

  const syncEmpty = (): void => {
    state.empty = state.items.length === 0 && state.error === null;
  };

  return {
    getState() {
      return state;
    },
    refresh() {
      state.loading = state.pageNum === 0;
      state.refreshing = true;
      state.error = null;
      syncEmpty();
    },
    refreshSuccess(snapshot) {
      state.items = snapshot.data;
      state.total = snapshot.total;
      state.pageNum = 1;
      state.loading = false;
      state.refreshing = false;
      state.loadingMore = false;
      state.error = null;
      state.hasMore = state.items.length < snapshot.total;
      syncEmpty();
    },
    refreshError(message) {
      state.loading = false;
      state.refreshing = false;
      state.error = message;
      syncEmpty();
    },
    loadMore() {
      if (!state.hasMore || state.loadingMore || state.refreshing) return;
      state.loadingMore = true;
      state.error = null;
    },
    loadMoreSuccess(snapshot) {
      state.items = [...state.items, ...snapshot.data];
      state.total = snapshot.total;
      state.pageNum += 1;
      state.loadingMore = false;
      state.error = null;
      state.hasMore = state.items.length < snapshot.total;
      syncEmpty();
    },
    loadMoreError(message) {
      state.loadingMore = false;
      state.error = message;
      syncEmpty();
    },
    reset() {
      state.items = [];
      state.pageNum = 0;
      state.total = 0;
      state.loading = false;
      state.refreshing = false;
      state.loadingMore = false;
      state.error = null;
      state.hasMore = true;
      syncEmpty();
    },
  };
}
