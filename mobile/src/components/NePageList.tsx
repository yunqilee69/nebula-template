/**
 * 分页列表组件。
 *
 * <p>依赖 React Native 运行时，未在无 RN 工具链的环境编译（见功能说明书交付边界）。
 * 分页状态机由 `components/page-list-state.ts` 承担并被单测覆盖，本组件只负责渲染。</p>
 */
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import type { ReactElement } from 'react';

export interface NePageListProps<T> {
  items: T[];
  refreshing: boolean;
  loadingMore: boolean;
  empty: boolean;
  error: string | null;
  hasMore: boolean;
  renderItem: (item: T) => ReactElement;
  keyExtractor: (item: T, index: number) => string;
  onRefresh: () => void;
  onLoadMore: () => void;
  emptyText?: string;
}

export function NePageList<T>(props: NePageListProps<T>) {
  const {
    items,
    refreshing,
    loadingMore,
    empty,
    error,
    hasMore,
    renderItem,
    keyExtractor,
    onRefresh,
    onLoadMore,
    emptyText = '暂无数据',
  } = props;

  if (empty && error) {
    return (
      <View>
        <Text>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={({ item }) => renderItem(item)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReachedThreshold={0.3}
      onEndReached={() => {
        if (hasMore && !loadingMore) onLoadMore();
      }}
      ListEmptyComponent={empty ? <Text>{emptyText}</Text> : null}
      ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
    />
  );
}
