/**
 * 平台账号面板。
 *
 * <p>平台账号不再独立登录，也不再持有第二套会话；这里的数据复用当前租户令牌，
 * 展示平台账号资料与已关联企业，并支持切换企业或退出所有企业。</p>
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AUTH_ENDPOINTS,
  type PersonSummary,
  type PersonTenant,
} from '../../../packages/client-sdk/index.ts';
import type { RequestClient } from '../request/types.ts';

export interface PersonAccountPanelProps {
  request: RequestClient;
  currentTenantCode?: string;
  onSwitchTenant: (tenantCode: string) => Promise<void>;
  onLoggedOut: () => Promise<void>;
}

export function PersonAccountPanel({
  request,
  currentTenantCode,
  onSwitchTenant,
  onLoggedOut,
}: PersonAccountPanelProps) {
  const [person, setPerson] = useState<PersonSummary | null>(null);
  const [tenants, setTenants] = useState<PersonTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const current = await request.request<PersonSummary>({
        method: 'GET',
        url: AUTH_ENDPOINTS.personCurrent,
      });
      setPerson(current);
      const list = await request.request<PersonTenant[]>({
        method: 'GET',
        url: AUTH_ENDPOINTS.personTenants,
      });
      setTenants(list ?? []);
    } catch (e) {
      setError((e as Error).message);
      setPerson(null);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const logoutAll = async () => {
    setBusy(true);
    try {
      await request.request<number>({ method: 'POST', url: AUTH_ENDPOINTS.personLogoutAll });
    } finally {
      await onLoggedOut();
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!person) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>平台账号</Text>
          <Text style={styles.meta}>
            {error || '当前登录用户尚未绑定平台账号，请先完成企业绑定。'}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{person.displayName || person.username}</Text>
        <Text style={styles.meta}>平台账号：{person.username}</Text>
        {person.platformAdmin ? <Text style={styles.badge}>平台管理员</Text> : null}
      </View>

      <Text style={styles.section}>我的企业</Text>
      {tenants.length === 0 ? <Text style={styles.meta}>暂无已关联企业</Text> : null}
      {tenants.map((tenant) => {
        const current = tenant.code === currentTenantCode;
        return (
          <Pressable
            key={tenant.tenantId}
            style={[styles.tenantItem, current && styles.tenantItemCurrent]}
            disabled={current || tenant.status !== 'ACTIVE'}
            onPress={() => void onSwitchTenant(tenant.code)}
            testID={`person-tenant-${tenant.code}`}
          >
            <View style={styles.tenantText}>
              <Text style={styles.tenantName}>{tenant.name}</Text>
              <Text style={styles.meta}>
                {tenant.code} · {tenant.status}{current ? ' · 当前企业' : ''}
              </Text>
            </View>
            <Text style={styles.chevron}>{current ? '' : '›'}</Text>
          </Pressable>
        );
      })}

      <Button
        title="退出所有企业"
        color="#dc2626"
        onPress={() => void logoutAll()}
        disabled={busy}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { padding: 32, alignItems: 'center' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  title: { fontSize: 20, fontWeight: '600', color: '#0f172a' },
  section: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginTop: 4 },
  meta: { fontSize: 13, color: '#475569' },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    fontSize: 12,
  },
  tenantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tenantItemCurrent: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  tenantText: { flex: 1, gap: 3 },
  tenantName: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  chevron: { fontSize: 22, color: '#94a3b8', lineHeight: 24 },
});
