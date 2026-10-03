/**
 * 「我的」页：展示当前登录态、角色与权限码，并提供登出。
 *
 * <p>依赖 React Native 运行时，不进入 `tsc` 编译图。
 * 页面内的「管理员入口」用 `<Access>` 做超管/权限码守卫，作为权限控制的可见验证。</p>
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CurrentUserResp } from '../../../packages/client-sdk/index.ts';
import { Access } from '../auth/Access.tsx';
import { usePermission } from '../auth/usePermission.tsx';

export interface ProfileScreenProps {
  user: CurrentUserResp;
  permissionCodes: readonly string[];
  roleCodes: readonly string[];
  onLogout: () => Promise<void>;
}

export function ProfileScreen({ user, permissionCodes, roleCodes, onLogout }: ProfileScreenProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const can = usePermission();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{user.nickname || user.username}</Text>
        <Text style={styles.meta}>账号：{user.username}</Text>
        <Text style={styles.meta}>角色：{roleCodes.length > 0 ? roleCodes.join('、') : '（无）'}</Text>
        <Text style={styles.meta}>权限码：{permissionCodes.length} 条</Text>
      </View>

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
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', gap: 6 },
  name: { fontSize: 20, fontWeight: '600', color: '#0f172a' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  meta: { fontSize: 13, color: '#475569' },
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
