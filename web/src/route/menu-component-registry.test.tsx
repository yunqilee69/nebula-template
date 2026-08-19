import { describe, expect, it } from 'vitest';
import { builtInMenuComponentRegistry } from './menu-component-registry';

describe('builtInMenuComponentRegistry', () => {
  it('keeps built-in route component defaults in the routing module', async () => {
    expect(builtInMenuComponentRegistry.UserManagementPage).toMatchObject({
      component: 'UserManagementPage',
      defaultName: '用户管理',
      defaultCode: 'USER_MANAGEMENT',
      defaultPath: '/system/operation/user',
      defaultIcon: 'UserOutlined',
    });
    expect(builtInMenuComponentRegistry.MenuManagementPage).toMatchObject({
      component: 'MenuManagementPage',
      defaultName: '菜单管理',
      defaultCode: 'MENU_MANAGEMENT',
      defaultPath: '/system/operation/menu',
    });
    expect(builtInMenuComponentRegistry.CacheManagementPage).toMatchObject({
      component: 'CacheManagementPage',
      defaultName: '缓存管理',
      defaultCode: 'CACHE_MANAGEMENT',
      defaultPath: '/system/monitor/cache-management',
    });
    expect(builtInMenuComponentRegistry.OnlineUserPage).toMatchObject({
      component: 'OnlineUserPage',
      defaultName: '在线用户',
      defaultCode: 'ONLINE_USER',
      defaultPath: '/system/monitor/online-user',
    });

    await expect(builtInMenuComponentRegistry.UserManagementPage.loader()).resolves.toHaveProperty('default');
    await expect(builtInMenuComponentRegistry.CacheManagementPage.loader()).resolves.toHaveProperty('default');
    await expect(builtInMenuComponentRegistry.OnlineUserPage.loader()).resolves.toHaveProperty('default');
  });
});
