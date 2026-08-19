import { Avatar, Button, Drawer, Dropdown, Radio, Space, Typography, theme as antdTheme } from 'antd';
import type { MenuProps } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStyles } from 'antd-style';
import type { NebulaLocale } from '@/i18n/types';
import { useNebulaLoginBadge } from '@/providers/login-badge-provider';
import { clearAuthTokens } from '@/utils/auth/token-session';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useStoragePreviewUrl } from '@/hooks/use-storage-preview-url';
import { useNebulaTheme } from '@/hooks/use-nebula-theme';
import { useAuthStore } from '@/stores/auth-store';
import type { NebulaThemeMode } from '@/stores/theme-store';

interface HeaderUserMenuProps {
  readonly compact?: boolean;
  onOpenProfile: () => void;
}

const useStyles = createStyles(({ token }) => ({
  trigger: {
    height: 40,
    paddingInline: token.paddingXS,
    borderRadius: token.borderRadiusLG,
  },
  avatar: {
    background: token.colorPrimary,
  },
  displayName: {
    maxWidth: 128,
    verticalAlign: 'middle',
  },
}));

function getAvatarFallback(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? '?';
}

export function HeaderUserMenu({ compact = false, onOpenProfile }: HeaderUserMenuProps) {
  const navigate = useNavigate();
  const { token } = antdTheme.useToken();
  const { styles } = useStyles();
  const loginBadge = useNebulaLoginBadge();
  const { locale, setLocale, t } = useNebulaI18n();
  const mode = useNebulaTheme((state) => state.mode);
  const setMode = useNebulaTheme((state) => state.setMode);
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const displayName = user?.name || user?.username || t('layout.headerUser.anonymous');
  const avatarPreviewUrl = useStoragePreviewUrl(user?.avatarPreview ?? user?.avatar);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<NebulaThemeMode>(mode);
  const [draftLocale, setDraftLocale] = useState<NebulaLocale>(locale);

  function openPreferences() {
    setDraftMode(mode);
    setDraftLocale(locale);
    setPreferencesOpen(true);
  }

  function closePreferences() {
    setPreferencesOpen(false);
  }

  function savePreferences() {
    setMode(draftMode);
    setLocale(draftLocale);
    setPreferencesOpen(false);
  }

  async function handleLogout() {
    try {
      await loginBadge.authService?.logout();
    } catch (error) {
      console.error('Nebula logout request failed', error);
      return;
    }

    clearAuthTokens();
    try {
      await loginBadge.onLogoutSuccess?.();
    } catch (error) {
      console.error('Nebula logout cleanup failed', error);
    }
    clearUser();
    if (loginBadge.authService) {
      navigate(loginBadge.loginPath, { replace: true });
    }
  }

  const menuItems: MenuProps['items'] = [
    { key: 'profile', label: t('layout.headerUser.profile') },
    { key: 'preferences', label: t('layout.headerUser.preferences') },
    { type: 'divider' },
    { key: 'logout', label: t('layout.headerUser.logout'), danger: true },
  ];

  return (
    <>
      <Dropdown
        trigger={['click']}
        menu={{
          items: menuItems,
          selectable: false,
          'aria-label': t('layout.headerUser.menuAriaLabel'),
          onClick: ({ key }) => {
            if (key === 'profile') {
              onOpenProfile();
            } else if (key === 'preferences') {
              openPreferences();
            } else if (key === 'logout') {
              void handleLogout();
            }
          },
        }}
      >
        <Button
          type="text"
          aria-label={displayName}
          className={styles.trigger}
        >
          <Space size={token.marginXS} align="center">
            <Avatar src={avatarPreviewUrl} alt={displayName} size={32} className={styles.avatar}>
              {getAvatarFallback(displayName)}
            </Avatar>
            {!compact && (
              <Typography.Text strong ellipsis className={styles.displayName} style={{ verticalAlign: 'middle' }}>
                {displayName}
              </Typography.Text>
            )}
          </Space>
        </Button>
      </Dropdown>
      <Drawer
        title={t('layout.headerUser.preferencesTitle')}
        open={preferencesOpen}
        placement="right"
        onClose={closePreferences}
        extra={
          <Space>
            <Button onClick={closePreferences}>{t('layout.headerUser.cancel')}</Button>
            <Button type="primary" onClick={savePreferences}>
              {t('layout.headerUser.save')}
            </Button>
          </Space>
        }
      >
        <Space orientation="vertical" size={token.marginLG} className="w-full">
          <Space orientation="vertical" size={token.marginXS} className="w-full">
            <Typography.Text strong>{t('layout.headerUser.themeLabel')}</Typography.Text>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={draftMode}
              onChange={(event) => setDraftMode(event.target.value as NebulaThemeMode)}
              options={[
                { label: t('layout.headerUser.light'), value: 'light' },
                { label: t('layout.headerUser.dark'), value: 'dark' },
              ]}
            />
          </Space>
          <Space orientation="vertical" size={token.marginXS} className="w-full">
            <Typography.Text strong>{t('layout.headerUser.languageLabel')}</Typography.Text>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={draftLocale}
              onChange={(event) => setDraftLocale(event.target.value as NebulaLocale)}
              options={[
                { label: t('layout.headerUser.zhCN'), value: 'zh-CN' },
                { label: t('layout.headerUser.enUS'), value: 'en-US' },
              ]}
            />
          </Space>
        </Space>
      </Drawer>
    </>
  );
}
