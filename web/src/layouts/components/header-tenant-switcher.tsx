import { App, Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { ApartmentOutlined, DownOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState } from 'react';
import { createStyles } from 'antd-style';
import { personService } from '@/api/person';
import { useNebulaI18n } from '@/hooks/use-nebula-i18n';
import { useAuthStore } from '@/stores/auth-store';
import type { PersonTenant } from '@/types/auth';
import { buildTenantUrl } from '@/utils/tenant/tenant-host';

const useStyles = createStyles(({ token }) => ({
  trigger: {
    height: 40,
    paddingInline: token.paddingXS,
    borderRadius: token.borderRadiusLG,
    maxWidth: 220,
  },
  // Button 只承载行内内容：用 span 而非 Space，避免块级 div 在部分浏览器中把文本挤到下一行。
  content: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: token.marginXXS,
    minWidth: 0,
    lineHeight: 1,
  },
  icon: {
    flexShrink: 0,
  },
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 140,
  },
  arrow: {
    flexShrink: 0,
    fontSize: 10,
    color: token.colorTextTertiary,
  },
}));

/**
 * 顶栏企业切换器。
 *
 * <p>展示当前登录企业名称，下拉列出当前平台账号可切换的其他企业。仅当存在多个
 * 可用企业时渲染；单企业或未绑定平台账号时不占用顶栏空间。</p>
 */
export function HeaderTenantSwitcher() {
  const { message } = App.useApp();
  const { styles } = useStyles();
  const { t } = useNebulaI18n();
  const user = useAuthStore((state) => state.user);
  const [tenants, setTenants] = useState<PersonTenant[]>([]);
  const [loaded, setLoaded] = useState(false);
  const tenantId = user?.tenantId;
  const personId = user?.personId;

  useEffect(() => {
    if (!tenantId || !personId) {
      setTenants([]);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);
    personService
      .switchableTenants()
      .then((list) => {
        if (cancelled) return;
        setTenants(list.filter((tenant) => tenant.status === 'ACTIVE'));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Load switchable tenants failed', error);
        setTenants([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [personId, tenantId]);

  const currentTenant = useMemo(
    () => tenants.find((tenant) => tenant.tenantId === tenantId || tenant.code === user?.tenantCode),
    [tenantId, tenants, user?.tenantCode],
  );

  const switchableTenants = useMemo(
    () => tenants.filter((tenant) => tenant.tenantId !== currentTenant?.tenantId && tenant.code !== currentTenant?.code),
    [currentTenant?.code, currentTenant?.tenantId, tenants],
  );

  if (!loaded || tenants.length <= 1 || switchableTenants.length === 0) {
    return null;
  }

  const currentName = currentTenant?.name || user?.tenantName || user?.tenantCode || '';
  const items: MenuProps['items'] = switchableTenants.map((tenant) => ({
    key: tenant.tenantId || tenant.code,
    label: tenant.name,
  }));

  function switchTenant(key: string) {
    const tenant = switchableTenants.find((item) => (item.tenantId || item.code) === key);
    if (!tenant) return;
    const url = buildTenantUrl(tenant);
    if (!url) {
      message.warning(t('layout.headerTenant.noDomain'));
      return;
    }
    window.location.href = url;
  }

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items,
        selectable: false,
        'aria-label': t('layout.headerTenant.menuAriaLabel'),
        onClick: ({ key }) => switchTenant(String(key)),
      }}
    >
      <Button
        type="text"
        className={styles.trigger}
        aria-label={`${t('layout.headerTenant.switchAriaLabel')}: ${currentName}`}
      >
        <span className={styles.content}>
          <ApartmentOutlined className={styles.icon} />
          <span className={styles.name} title={currentName}>
            {currentName}
          </span>
          <DownOutlined className={styles.arrow} />
        </span>
      </Button>
    </Dropdown>
  );
}
