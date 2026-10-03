import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapMenuToNavigation } from '../src/navigation/menu-to-nav.ts';
import {
  createScreenRegistry,
  isPlaceholderScreen,
} from '../src/navigation/component-registry.ts';
import type { MenuTreeResp } from '../../packages/client-sdk/index.ts';

const TREE: MenuTreeResp[] = [
  {
    id: '1',
    code: 'wms',
    name: '仓储',
    type: 'CATALOG',
    sort: 1,
    children: [
      { id: '2', code: 'wms-order', name: '订单', type: 'MENU', component: 'wms/order', sort: 20 },
      { id: '3', code: 'wms-stock', name: '库存', type: 'MENU', component: 'wms/stock', sort: 10, hidden: true },
      { id: '4', code: 'wms-inbound', name: '入库', type: 'MENU', component: 'wms/inbound', sort: 5 },
    ],
  },
];

test('MenuNavigationTest.testMapTreeToTabs', () => {
  const mapping = mapMenuToNavigation(TREE);
  assert.equal(mapping.tabs.length, 1);
  const tab = mapping.tabs[0]!;
  assert.equal(tab.key, 'wms');
  // 可见叶子按 sort 升序：inbound(5)、order(20)
  assert.deepEqual(
    tab.routes.map((route) => route.key),
    ['wms-inbound', 'wms-order'],
  );
});

test('MenuNavigationTest.testHiddenMenuExcludedFromNav', () => {
  const mapping = mapMenuToNavigation(TREE);
  const tabKeys = mapping.tabs[0]!.routes.map((route) => route.key);
  assert.equal(tabKeys.includes('wms-stock'), false);
  // hidden 菜单仍注册路由（业务可能从通知/扫码跳转）
  assert.equal(
    mapping.routes.some((route) => route.key === 'wms-stock' && route.hidden === true),
    true,
  );
});

test('MenuNavigationTest.testUnknownComponentFallback', () => {
  const registry = createScreenRegistry({ 'wms/order': { kind: 'screen', name: 'Order' } });
  assert.deepEqual(registry.resolve('wms/order'), { kind: 'screen', name: 'Order' });

  const fallback = registry.resolve('wms/not-registered');
  assert.equal(isPlaceholderScreen(fallback), true);
  assert.equal((fallback as { component?: string }).component, 'wms/not-registered');

  // 缺失 component 也走占位页，绝不返回 undefined（白屏）
  assert.equal(isPlaceholderScreen(registry.resolve(undefined)), true);
});

test('MenuNavigationTest.testExternalNotInTabsByDefault', () => {
  const tree: MenuTreeResp[] = [
    { id: '9', code: 'ext', name: '外部', type: 'EXTERNAL', externalUrl: 'https://example.com' },
  ];
  const mapping = mapMenuToNavigation(tree);
  assert.equal(mapping.tabs.length, 0);
  assert.equal(mapping.routes.length, 1);
  assert.equal(mapping.routes[0]!.external, true);
});
