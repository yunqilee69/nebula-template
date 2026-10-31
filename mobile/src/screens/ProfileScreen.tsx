/**
 * 「我的」页：展示当前登录态、角色与权限码，并提供账号安全入口与登出。
 *
 * <p>多租户模式下顶部提供「租户信息 / 平台信息」切换：租户信息是当前企业内的账号，
 * 平台信息是跨企业的平台账号与已关联企业。平台账号复用当前租户令牌，不再独立登录。</p>
 *
 * <p>依赖 React Native 运行时，不进入 `tsc` 编译图。
 * 页面内的「管理员入口」用 `<Access>` 做超管/权限码守卫，作为权限控制的可见验证。</p>
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CurrentUserResp, FrontendTenantResp } from '../../../packages/client-sdk/index.ts';
import { Access } from '../auth/Access.tsx';
import { usePermission } from '../auth/usePermission.tsx';
import type { RequestClient } from '../request/types.ts';
import { PersonAccountPanel } from './PersonAccountScreen.tsx';

type ProfileTabKey = 'tenant' | 'platform';

export interface ProfileScreenProps {
  user: CurrentUserResp;
  /** 启动 init 下发的当前企业只读资料；缺失时不展示企业信息卡片。 */
  tenant?: FrontendTenantResp;
  permissionCodes: readonly string[];
  roleCodes: readonly string[];
  request: RequestClient;
  onLogout: () => Promise<void>;
  onSwitchTenant: (tenantCode: string) => Promise<void>;
  /** 打开账号安全页；未提供时隐藏入口。 */
  onOpenAccountSecurity?: () => void;
  /** 打开切换企业页；未提供时隐藏入口。 */
  onOpenTenantSwitch?: () => void;
}

export function ProfileScreen({
  user,
  tenant,
  permissionCodes,
  roleCodes,
  request,
  onLogout,
  onSwitchTenant,
  onOpenAccountSecurity,
  onOpenTenantSwitch,
}: ProfileScreenProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('tenant');
  const can = usePermission();
  const multiTenant = Boolean(user.tenantId);

  const tenantContent = (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{user.nickname || user.username}</Text>
        <Text style={styles.meta}>账号：{user.username}</Text>
        {user.tenantName ? <Text style={styles.meta}>企业：{user.tenantName}</Text> : null}
        <Text style={styles.meta}>角色：{roleCodes.length > 0 ? roleCodes.join('、') : '（无）'}</Text>
        <Text style={styles.meta}>权限码：{permissionCodes.length} 条</Text>
      </View>

      {tenant ? (
        <View style={styles.card} testID="profile-enterprise-info">
          <Text style={styles.sectionTitle}>企业信息</Text>
          <Text style={styles.meta}>企业名称：{tenant.name || user.tenantName || '-'}</Text>
          {tenant.shortName ? <Text style={styles.meta}>企业简称：{tenant.shortName}</Text> : null}
          {tenant.code ? <Text style={styles.meta}>企业代码：{tenant.code}</Text> : null}
          {tenant.contactEmail ? <Text style={styles.meta}>联系邮箱：{tenant.contactEmail}</Text> : null}
          {tenant.contactPhone ? <Text style={styles.meta}>联系电话：{tenant.contactPhone}</Text> : null}
          {tenant.website ? <Text style={styles.meta}>官网地址：{tenant.website}</Text> : null}
          {tenant.address ? <Text style={styles.meta}>联系地址：{tenant.address}</Text> : null}
          {tenant.industry ? <Text style={styles.meta}>所属行业：{tenant.industry}</Text> : null}
          {tenant.description ? <Text style={styles.meta}>{tenant.description}</Text> : null}
        </View>
      ) : null}

      {onOpenTenantSwitch ? (
        <Pressable style={styles.menuItem} onPress={onOpenTenantSwitch} testID="profile-tenant-switch">
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>切换企业</Text>
            <Text style={styles.menuDesc}>输入企业代码并重新登录目标企业</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}

      {onOpenAccountSecurity ? (
        <Pressable
          style={styles.menuItem}
          onPress={onOpenAccountSecurity}
          testID="profile-account-security"
        >
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>账号安全</Text>
            <Text style={styles.menuDesc}>账号信息、其他登录方式、登录记录</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>权限验证</Text>
        <Access permission="MENU:system-management:Allow">
          <Text style={styles.allowed}>✓ 可见：系统管理（MENU:system-management:Allow）</Text>
        </Access>
        <Access permission="MENU:not-exist:Allow">
          <Text style={styles.allowed}>不该出现的项</Text>
        </Access>
        <Access
          permission="MENU:not-exist:Allow"
          fallback={<Text style={styles.denied}>✗ 已隐藏：MENU:not-exist:Allow（无权限不渲染）</Text>}
        >
          <Text style={styles.allowed}>不该出现的项</Text>
        </Access>
        <Text style={styles.meta}>
          hook 判定 hasPermission(MENU:system-management:Allow) = {String(can('MENU:system-management:Allow'))}
        </Text>
      </View>

      <Pressable
        style={[styles.logout, loggingOut && styles.logoutDisabled]}
        disabled={loggingOut}
        testID="profile-logout"
        onPress={() => {
          setLoggingOut(true);
          void onLogout().finally(() => setLoggingOut(false));
        }}
      >
        {loggingOut ? <ActivityIndicator color="#dc2626" /> : <Text style={styles.logoutText}>退出登录</Text>}
      </Pressable>
    </ScrollView>
  );

  if (!multiTenant) {
    return tenantContent;
  }

  return (
    <View style={styles.page}>
      <View style={styles.tabBar}>
        {([
          { key: 'tenant', label: '租户信息' },
          { key: 'platform', label: '平台信息' },
        ] as const).map((item) => (
          <Pressable
            key={item.key}
            style={[styles.tabItem, activeTab === item.key && styles.tabItemActive]}
            onPress={() => setActiveTab(item.key)}
            testID={`profile-tab-${item.key}`}
          >
            <Text style={[styles.tabText, activeTab === item.key && styles.tabTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {activeTab === 'tenant' ? tenantContent : (
        <PersonAccountPanel
          request={request}
          currentTenantCode={user.tenantCode}
          onSwitchTenant={onSwitchTenant}
          onLoggedOut={onLogout}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#f8fafc',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  tabItemActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  tabText: { fontSize: 14, color: '#475569' },
  tabTextActive: { color: '#ffffff', fontWeight: '600' },
  container: { padding: 16, gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  name: { fontSize: 20, fontWeight: '600', color: '#0f172a' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  meta: { fontSize: 13, color: '#475569' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  menuText: { flex: 1, gap: 3 },
  menuTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  menuDesc: { fontSize: 12, color: '#64748b' },
  chevron: { fontSize: 22, color: '#94a3b8', lineHeight: 24 },
  allowed: { fontSize: 14, color: '#16a34a' },
  denied: { fontSize: 14, color: '#94a3b8' },
  logout: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutDisabled: { opacity: 0.6 },
  logoutText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
});
