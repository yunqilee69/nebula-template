/**
 * 菜单页：把一个导航分组（底部 Tab）下的路由渲染成可点击入口。
 *
 * <p>依赖 React Native 运行时，不进入 `tsc` 编译图。
 * 每一条入口都用 `<Access>` 按 `MENU:{code}:Allow` 做权限守卫——
 * <b>无权限的菜单直接不渲染</b>，而不是渲染后禁用（与 web 端语义一致）。</p>
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NavRoute, NavTab } from '../navigation/menu-to-nav.ts';
import { Access } from '../auth/Access.tsx';

/** 菜单项对应的权限码（三段式，第三段大小写不敏感）。 */
export function menuPermissionCode(menuCode: string): string {
  return `MENU:${menuCode}:Allow`;
}

export interface TabRoutesScreenProps {
  tab: NavTab;
  onOpenRoute?: (route: NavRoute) => void;
}

export function TabRoutesScreen({ tab, onOpenRoute }: TabRoutesScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.tabTitle}>{tab.title}</Text>
      {tab.routes.map((route) => (
        <Access key={route.key} permission={menuPermissionCode(route.menu.code || route.key)}>
          <Pressable style={styles.item} onPress={() => onOpenRoute?.(route)}>
            <Text style={styles.itemTitle}>{route.title}</Text>
            <Text style={styles.itemMeta}>{route.path ?? route.component ?? route.key}</Text>
          </Pressable>
        </Access>
      ))}
      <Text style={styles.hint}>（业务页面待接入，此处为基座占位）</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  tabTitle: { fontSize: 20, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  item: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemTitle: { fontSize: 16, color: '#0f172a', fontWeight: '500' },
  itemMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
});
