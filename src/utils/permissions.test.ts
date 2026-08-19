import { describe, expect, it } from 'vitest';
import { createPermissionCode, hasPermission } from './permissions';

describe('hasPermission', () => {
  it('未声明权限要求时允许访问', () => {
    expect(hasPermission(['system:user:list'], undefined)).toBe(true);
  });

  it('用户拥有所需权限时允许访问', () => {
    expect(hasPermission(['system:user:list'], 'system:user:list')).toBe(true);
  });

  it('用户缺少所需权限时拒绝访问', () => {
    expect(hasPermission(['system:user:list'], 'system:user:delete')).toBe(false);
  });

  it('支持任一权限匹配', () => {
    expect(hasPermission(['system:user:list'], ['system:user:create', 'system:user:list'])).toBe(true);
  });

  it('支持全部权限匹配', () => {
    expect(hasPermission(['system:user:list'], ['system:user:list', 'system:user:delete'], { mode: 'all' })).toBe(false);
  });

  it('支持通配符权限', () => {
    expect(hasPermission(['system:user:*'], 'system:user:delete')).toBe(true);
  });

  it('支持 Nebula 资源权限码格式', () => {
    expect(hasPermission(['MENU:USER_MANAGEMENT:Allow'], 'USER_MANAGEMENT')).toBe(true);
  });

  it('生成 Nebula 资源权限码', () => {
    expect(createPermissionCode('MENU', 'USER_MANAGEMENT')).toBe('MENU:USER_MANAGEMENT:Allow');
  });

  it('支持超级角色', () => {
    expect(hasPermission([], 'system:user:delete', { roles: ['ADMIN'] })).toBe(true);
  });
});
