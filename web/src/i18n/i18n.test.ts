import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { getMessages } from './messages';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useLocaleStore } from '@/stores/locale-store';

describe('i18n', () => {
  describe('getMessages', () => {
    it('returns Chinese messages for zh-CN locale', () => {
      const messages = getMessages('zh-CN');
      expect(messages.layout.sidebarCollapse).toBe('收起侧边栏');
      expect(messages.layout.sidebarExpand).toBe('展开侧边栏');
      expect(messages.layout.breadcrumbAriaLabel).toBe('面包屑');
      expect(messages.layout.sidebarAriaLabel).toBe('主导航');
      expect(messages.layout.tabContextMenu.ariaLabel).toBe('标签页菜单');
      expect(messages.layout.tabContextMenu.refresh).toBe('刷新');
      expect(messages.layout.tabContextMenu.closeCurrent).toBe('关闭');
      expect(messages.layout.tabContextMenu.closeLeft).toBe('关闭左侧');
      expect(messages.layout.tabContextMenu.closeRight).toBe('关闭右侧');
      expect(messages.layout.tabContextMenu.closeOthers).toBe('关闭其他');
      expect(messages.layout.tabContextMenu.openInNewWindow).toBe('新窗口打开');
      expect(messages.layout.headerUser.anonymous).toBe('未登录用户');
      expect(messages.layout.headerUser.menuAriaLabel).toBe('用户菜单');
      expect(messages.layout.headerUser.profile).toBe('个人信息');
      expect(messages.layout.headerUser.preferences).toBe('偏好设置');
      expect(messages.layout.headerUser.logout).toBe('退出登录');
      expect(messages.layout.headerUser.preferencesTitle).toBe('偏好设置');
      expect(messages.layout.headerUser.themeLabel).toBe('主题');
      expect(messages.layout.headerUser.languageLabel).toBe('语言');
      expect(messages.layout.headerUser.light).toBe('浅色');
      expect(messages.layout.headerUser.dark).toBe('深色');
      expect(messages.layout.headerUser.zhCN).toBe('中文');
      expect(messages.layout.headerUser.enUS).toBe('English');
      expect(messages.layout.headerUser.save).toBe('保存');
      expect(messages.layout.headerUser.cancel).toBe('取消');
      expect(messages.layout.headerUser.profilePlaceholder).toBe('个人信息内容暂未开放，后续将在这里展示账号资料。');
      expect(messages.layout.tabRenameAriaLabel).toBe('重命名标签页');
      expect(messages.layout.tabReorderHandleAriaLabel).toBe('拖拽标签页');
      expect(messages.common.languageZh).toBe('中文');
      expect(messages.common.languageEn).toBe('English');
      expect(messages.auth.roleManagement.title).toBe('角色管理');
      expect(messages.auth.roleManagement.actions.create).toBe('新增角色');
      expect(messages.auth.roleManagement.actions.moreActions).toBe('更多操作');
      expect(messages.auth.roleManagement.fields.name).toBe('角色名称');
      expect(messages.auth.roleManagement.status.enabled).toBe('启用');
      expect(messages.auth.assignment.validation.rolesRequired).toBe('请选择要追加的角色');
      expect(messages.auth.userManagement.title).toBe('用户管理');
      expect(messages.auth.orgManagement.title).toBe('组织管理');
      expect(messages.auth.permissionConfig.title).toBe('权限配置');
      expect(messages.system.config.dict.actions.createType).toBe('新增字典类型');
      expect(messages.system.config.dict.modal.createTypeTitle).toBe('新增字典类型');
      expect(messages.system.config.dict.columns.code).toBe('字典编码');
      expect(messages.system.config.dict.status.enabled).toBe('启用');
      expect(messages.system.config.param.actions.create).toBe('新增参数');
      expect(messages.system.config.param.modal.createTitle).toBe('新增参数');
      expect(messages.system.config.param.dataTypes.string).toBe('字符串');
      expect(messages.system.config.param.inputs.value).toBe('参数值');
      expect(messages.system.config.param.placeholders.value).toBe('请输入参数值');
      expect(messages.system.config.param.empty.options).toBe('暂无选项');
    });

    it('returns English messages for en-US locale', () => {
      const messages = getMessages('en-US');
      expect(messages.layout.sidebarCollapse).toBe('Collapse sidebar');
      expect(messages.layout.sidebarExpand).toBe('Expand sidebar');
      expect(messages.layout.breadcrumbAriaLabel).toBe('Breadcrumb');
      expect(messages.layout.sidebarAriaLabel).toBe('Main navigation');
      expect(messages.layout.tabContextMenu.ariaLabel).toBe('Tab menu');
      expect(messages.layout.tabContextMenu.refresh).toBe('Refresh');
      expect(messages.layout.tabContextMenu.closeCurrent).toBe('Close');
      expect(messages.layout.tabContextMenu.closeLeft).toBe('Close left');
      expect(messages.layout.tabContextMenu.closeRight).toBe('Close right');
      expect(messages.layout.tabContextMenu.closeOthers).toBe('Close others');
      expect(messages.layout.tabContextMenu.openInNewWindow).toBe('Open in new window');
      expect(messages.layout.headerUser.anonymous).toBe('Anonymous user');
      expect(messages.layout.headerUser.menuAriaLabel).toBe('User menu');
      expect(messages.layout.headerUser.profile).toBe('Profile');
      expect(messages.layout.headerUser.preferences).toBe('Preferences');
      expect(messages.layout.headerUser.logout).toBe('Sign out');
      expect(messages.layout.headerUser.preferencesTitle).toBe('Preferences');
      expect(messages.layout.headerUser.themeLabel).toBe('Theme');
      expect(messages.layout.headerUser.languageLabel).toBe('Language');
      expect(messages.layout.headerUser.light).toBe('Light');
      expect(messages.layout.headerUser.dark).toBe('Dark');
      expect(messages.layout.headerUser.zhCN).toBe('中文');
      expect(messages.layout.headerUser.enUS).toBe('English');
      expect(messages.layout.headerUser.save).toBe('Save');
      expect(messages.layout.headerUser.cancel).toBe('Cancel');
      expect(messages.layout.headerUser.profilePlaceholder).toBe('Profile content is reserved and will show account details here later.');
      expect(messages.layout.tabRenameAriaLabel).toBe('Rename tab');
      expect(messages.layout.tabReorderHandleAriaLabel).toBe('Move tab');
      expect(messages.common.languageZh).toBe('中文');
      expect(messages.common.languageEn).toBe('English');
      expect(messages.auth.roleManagement.title).toBe('Role Management');
      expect(messages.auth.roleManagement.actions.create).toBe('New Role');
      expect(messages.auth.roleManagement.actions.moreActions).toBe('More actions');
      expect(messages.auth.roleManagement.fields.name).toBe('Role Name');
      expect(messages.auth.roleManagement.status.enabled).toBe('Enabled');
      expect(messages.auth.assignment.validation.rolesRequired).toBe('Select roles to add');
      expect(messages.auth.userManagement.title).toBe('User Management');
      expect(messages.auth.orgManagement.title).toBe('Organization Management');
      expect(messages.auth.permissionConfig.title).toBe('Permission Configuration');
      expect(messages.system.config.param.inputs.value).toBe('Parameter Value');
      expect(messages.system.config.param.placeholders.value).toBe('Enter parameter value');
      expect(messages.system.config.param.empty.options).toBe('No options available');
    });
  });

  describe('useNebulaI18n', () => {
    beforeEach(() => {
      act(() => {
        useLocaleStore.getState().setLocale('zh-CN');
      });
    });

    afterEach(() => {
      act(() => {
        useLocaleStore.getState().setLocale('zh-CN');
      });
    });

    it('returns current locale', () => {
      const { result } = renderHook(() => useNebulaI18n());
      expect(result.current.locale).toBe('zh-CN');
    });

    it('setLocale changes the locale', async () => {
      const { result } = renderHook(() => useNebulaI18n());

      await act(async () => {
        result.current.setLocale('en-US');
      });

      await waitFor(() => {
        expect(result.current.locale).toBe('en-US');
      });
    });

    it('toggleLocale switches between zh-CN and en-US', () => {
      const { result } = renderHook(() => useNebulaI18n());

      expect(result.current.locale).toBe('zh-CN');

      act(() => {
        result.current.toggleLocale();
      });

      expect(result.current.locale).toBe('en-US');

      act(() => {
        result.current.toggleLocale();
      });

      expect(result.current.locale).toBe('zh-CN');
    });

    it('t returns localized message for current locale', async () => {
      const { result } = renderHook(() => useNebulaI18n());

      expect(result.current.t('layout.sidebarCollapse')).toBe('收起侧边栏');
      expect(result.current.t('layout.breadcrumbAriaLabel')).toBe('面包屑');
        expect(result.current.t('layout.tabContextMenu.refresh')).toBe('刷新');
        expect(result.current.t('layout.tabContextMenu.closeCurrent')).toBe('关闭');
        expect(result.current.t('layout.tabContextMenu.closeLeft')).toBe('关闭左侧');
        expect(result.current.t('layout.headerUser.profile')).toBe('个人信息');

      await act(async () => {
        result.current.setLocale('en-US');
      });

      await waitFor(() => {
        expect(result.current.t('layout.sidebarCollapse')).toBe('Collapse sidebar');
        expect(result.current.t('layout.breadcrumbAriaLabel')).toBe('Breadcrumb');
        expect(result.current.t('layout.tabContextMenu.refresh')).toBe('Refresh');
        expect(result.current.t('layout.tabContextMenu.closeCurrent')).toBe('Close');
        expect(result.current.t('layout.tabContextMenu.closeLeft')).toBe('Close left');
        expect(result.current.t('layout.headerUser.profile')).toBe('Profile');
        expect(result.current.t('auth.roleManagement.title')).toBe('Role Management');
        expect(result.current.t('auth.roleManagement.actions.create')).toBe('New Role');
        expect(result.current.t('auth.userManagement.title')).toBe('User Management');
        expect(result.current.t('auth.orgManagement.title')).toBe('Organization Management');
        expect(result.current.t('auth.permissionConfig.title')).toBe('Permission Configuration');
      });
    });
  });

  describe('useLocaleStore', () => {
    beforeEach(() => {
      act(() => {
        useLocaleStore.getState().setLocale('zh-CN');
      });
    });

    afterEach(() => {
      act(() => {
        useLocaleStore.getState().setLocale('zh-CN');
      });
    });

    it('has default locale zh-CN', () => {
      expect(useLocaleStore.getState().locale).toBe('zh-CN');
    });

    it('setLocale accepts valid NebulaLocale values', () => {
      useLocaleStore.getState().setLocale('en-US');
      expect(useLocaleStore.getState().locale).toBe('en-US');

      useLocaleStore.getState().setLocale('zh-CN');
      expect(useLocaleStore.getState().locale).toBe('zh-CN');
    });

    it('toggleLocale alternates locale', () => {
      useLocaleStore.getState().toggleLocale();
      expect(useLocaleStore.getState().locale).toBe('en-US');

      useLocaleStore.getState().toggleLocale();
      expect(useLocaleStore.getState().locale).toBe('zh-CN');
    });
  });
});
