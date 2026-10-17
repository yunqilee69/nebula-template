/**
 * 账号安全页：账号信息、第三方登录绑定状态、登录记录。
 *
 * <p>数据全部来自服务端，进入页面时并发拉取；支持下拉刷新和登录记录分页加载。
 * 第三方绑定目前只读（绑定/解绑依赖浏览器 OAuth 回调，使用 Web 端个人中心），
 * 这样不会在移动端放一个点了没反应的按钮。</p>
 *
 * <p>依赖 React Native 运行时，不进入 `tsc` 编译图；格式化与服务调用在
 * `auth/profile-service.ts` 并被单测覆盖。</p>
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  LoginRecordResp,
  OAuth2BindingResp,
  ProfileResp,
} from '../../../packages/client-sdk/index.ts';
import {
  formatAccountStatus,
  formatBindingStatus,
  formatClientType,
  formatDateTime,
  formatLoginResult,
  formatLoginType,
  type ProfileService,
} from '../auth/profile-service.ts';

const PAGE_SIZE = 10;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  const text = value?.trim() ? value : '未填写';
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{text}</Text>
    </View>
  );
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.sectionError}>
      <Text style={styles.sectionErrorText}>{message}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>重试</Text>
      </Pressable>
    </View>
  );
}

function BindingRow({ binding }: { binding: OAuth2BindingResp }) {
  const account = binding.displayName || binding.providerUserId;
  const linkedAt = formatDateTime(binding.linkedAt);
  const meta = [account, linkedAt !== '-' ? linkedAt : undefined]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' · ');

  return (
    <View style={styles.bindingRow}>
      <View style={styles.bindingBody}>
        <Text style={styles.bindingName}>{binding.providerName || binding.providerId}</Text>
        <Text style={styles.bindingMeta}>{binding.bound ? meta || '已绑定' : '未绑定'}</Text>
      </View>
      <View style={[styles.badge, binding.bound ? styles.badgeSuccess : styles.badgeMuted]}>
        <Text style={[styles.badgeText, binding.bound ? styles.badgeTextSuccess : styles.badgeTextMuted]}>
          {formatBindingStatus(binding.bound)}
        </Text>
      </View>
    </View>
  );
}

function LoginRecordRow({ record }: { record: LoginRecordResp }) {
  const success = record.loginResult === 'SUCCESS';
  const meta = [formatClientType(record.clientType), record.loginIp]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' · ');

  return (
    <View style={styles.recordRow}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordType}>{formatLoginType(record.loginType)}</Text>
        <View style={[styles.badge, success ? styles.badgeSuccess : styles.badgeDanger]}>
          <Text style={[styles.badgeText, success ? styles.badgeTextSuccess : styles.badgeTextDanger]}>
            {formatLoginResult(record.loginResult)}
          </Text>
        </View>
        <Text style={styles.recordTime}>{formatDateTime(record.loginTime)}</Text>
      </View>
      <Text style={styles.recordMeta}>{meta || '—'}</Text>
      {record.deviceInfo?.trim() ? (
        <Text style={styles.recordMeta}>设备：{record.deviceInfo.trim()}</Text>
      ) : null}
      {!success && record.failReason ? (
        <Text style={styles.failReason}>失败原因：{record.failReason}</Text>
      ) : null}
    </View>
  );
}

export interface AccountSecurityScreenProps {
  profileService: ProfileService;
}

export function AccountSecurityScreen({ profileService }: AccountSecurityScreenProps) {
  const [profile, setProfile] = useState<ProfileResp | null>(null);
  const [bindings, setBindings] = useState<OAuth2BindingResp[]>([]);
  const [records, setRecords] = useState<LoginRecordResp[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [bindingsError, setBindingsError] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [recordsRetry, setRecordsRetry] = useState<{ page: number; append: boolean } | null>(null);

  const loadProfile = useCallback(async () => {
    setProfileError(null);
    try {
      setProfile(await profileService.getProfile());
    } catch (caught) {
      setProfileError(errorMessage(caught, '账号信息加载失败'));
    }
  }, [profileService]);

  const loadBindings = useCallback(async () => {
    setBindingsError(null);
    try {
      const result = await profileService.listOAuth2Bindings();
      setBindings(result.providers ?? []);
    } catch (caught) {
      setBindingsError(errorMessage(caught, '第三方绑定加载失败'));
    }
  }, [profileService]);

  const loadRecords = useCallback(
    async (page: number, append: boolean) => {
      if (append) setLoadingMore(true);
      setRecordsError(null);
      setRecordsRetry(null);
      try {
        const result = await profileService.pageLoginRecords(page, PAGE_SIZE);
        const list = result.data ?? [];
        setTotal(result.total ?? 0);
        setRecords((previous) => (append ? [...previous, ...list] : list));
        setPageNum(page);
      } catch (caught) {
        setRecordsError(errorMessage(caught, '登录记录加载失败'));
        setRecordsRetry({ page, append });
      } finally {
        if (append) setLoadingMore(false);
      }
    },
    [profileService],
  );

  const loadAll = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') setLoading(true);
      else setRefreshing(true);
      await Promise.allSettled([loadProfile(), loadBindings(), loadRecords(1, false)]);
      if (mode === 'initial') setLoading(false);
      else setRefreshing(false);
    },
    [loadBindings, loadProfile, loadRecords],
  );

  useEffect(() => {
    void loadAll('initial');
  }, [loadAll]);

  const hasMore = records.length < total;
  const displayName = profile?.nickname || profile?.username || '账号信息';
  const avatarText = (Array.from(profile?.nickname || profile?.username || '?')[0] ?? '?').toUpperCase();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1f6feb" />
        <Text style={styles.loadingText}>正在加载账号安全信息…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void loadAll('refresh')}
          tintColor="#1f6feb"
          colors={['#1f6feb']}
        />
      }
    >
      <View style={styles.topBar}>
        <Text style={styles.topHint}>账号信息、第三方绑定与登录记录</Text>
        <Pressable
          onPress={() => void loadAll('refresh')}
          disabled={refreshing}
          hitSlop={8}
          testID="security-refresh"
        >
          <Text style={styles.refreshText}>{refreshing ? '刷新中…' : '刷新'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarText}</Text>
          </View>
          <View style={styles.profileTitleWrap}>
            <Text style={styles.profileName}>{displayName}</Text>
            {profile?.username ? <Text style={styles.profileSub}>@{profile.username}</Text> : null}
          </View>
        </View>

        {profileError ? (
          <SectionError message={profileError} onRetry={() => void loadProfile()} />
        ) : (
          <View style={styles.infoList}>
            <InfoRow label="用户名" value={profile?.username} />
            <InfoRow label="昵称" value={profile?.nickname} />
            <InfoRow label="手机号" value={profile?.phone} />
            <InfoRow label="邮箱" value={profile?.email} />
            <InfoRow label="账号状态" value={formatAccountStatus(profile?.status)} />
            <InfoRow label="注册时间" value={formatDateTime(profile?.createTime)} />
          </View>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>其他登录方式</Text>
            <Text style={styles.cardSub}>第三方账号绑定状态</Text>
          </View>
        </View>

        {bindingsError ? (
          <SectionError message={bindingsError} onRetry={() => void loadBindings()} />
        ) : bindings.length === 0 ? (
          <Text style={styles.empty}>暂无可用第三方账号</Text>
        ) : (
          <View style={styles.bindingList}>
            {bindings.map((binding) => (
              <BindingRow key={binding.providerId} binding={binding} />
            ))}
          </View>
        )}

        {bindings.length > 0 ? (
          <Text style={styles.note}>绑定 / 解绑请使用 Web 端个人中心。</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>登录记录</Text>
            <Text style={styles.cardSub}>最近的登录成功与失败记录</Text>
          </View>
          {total > 0 ? <Text style={styles.count}>共 {total} 条</Text> : null}
        </View>

        {recordsError && records.length === 0 ? (
          <SectionError
            message={recordsError}
            onRetry={() => void loadRecords(recordsRetry?.page ?? 1, recordsRetry?.append ?? false)}
          />
        ) : (
          <>
            {recordsError ? (
              <SectionError
                message={recordsError}
                onRetry={() => void loadRecords(recordsRetry?.page ?? 1, recordsRetry?.append ?? false)}
              />
            ) : null}
            {records.length === 0 ? (
              <Text style={styles.empty}>暂无登录记录</Text>
            ) : (
              <View style={styles.recordList}>
                {records.map((record, index) => (
                  <LoginRecordRow
                    key={
                      record.id ??
                      `${record.loginTime ?? ''}-${record.loginType ?? ''}-${record.loginIp ?? ''}-${index}`
                    }
                    record={record}
                  />
                ))}
              </View>
            )}

            {!recordsError && records.length > 0 && hasMore ? (
              <Pressable
                style={styles.loadMore}
                disabled={loadingMore}
                onPress={() => void loadRecords(pageNum + 1, true)}
                testID="security-load-more"
              >
                {loadingMore ? (
                  <ActivityIndicator color="#1f6feb" size="small" />
                ) : (
                  <Text style={styles.loadMoreText}>加载更多</Text>
                )}
              </Pressable>
            ) : !recordsError && records.length > 0 ? (
              <Text style={styles.note}>已加载全部</Text>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
  },
  loadingText: { color: '#64748b', fontSize: 13 },
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flexGrow: 1, padding: 16, gap: 12, backgroundColor: '#f8fafc' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  topHint: { flex: 1, color: '#64748b', fontSize: 12, lineHeight: 17 },
  refreshText: { color: '#1f6feb', fontSize: 12.5, fontWeight: '600' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1f6feb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontSize: 22, fontWeight: '600' },
  profileTitleWrap: { flex: 1 },
  profileName: { fontSize: 19, fontWeight: '600', color: '#0f172a' },
  profileSub: { marginTop: 3, fontSize: 12, color: '#64748b' },
  infoList: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, gap: 8 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  infoLabel: { fontSize: 13, color: '#64748b' },
  infoValue: { flex: 1, textAlign: 'right', fontSize: 13, color: '#0f172a', lineHeight: 19 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  cardSub: { marginTop: 3, fontSize: 11.5, color: '#94a3b8' },
  count: { fontSize: 11.5, color: '#94a3b8' },
  empty: { paddingVertical: 12, textAlign: 'center', fontSize: 13, color: '#94a3b8' },
  note: { fontSize: 11.5, color: '#94a3b8', textAlign: 'center', lineHeight: 17 },
  bindingList: { gap: 0 },
  bindingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bindingBody: { flex: 1, gap: 3 },
  bindingName: { fontSize: 14, fontWeight: '500', color: '#0f172a' },
  bindingMeta: { fontSize: 12, color: '#64748b', lineHeight: 17 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeMuted: { backgroundColor: '#f1f5f9' },
  badgeDanger: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextSuccess: { color: '#15803d' },
  badgeTextMuted: { color: '#64748b' },
  badgeTextDanger: { color: '#b91c1c' },
  recordList: { gap: 0 },
  recordRow: {
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 4,
  },
  recordHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordType: { fontSize: 13.5, fontWeight: '600', color: '#0f172a' },
  recordTime: { marginLeft: 'auto', fontSize: 11.5, color: '#94a3b8' },
  recordMeta: { fontSize: 12, color: '#64748b', lineHeight: 17 },
  failReason: { fontSize: 12, color: '#b91c1c', lineHeight: 17 },
  loadMore: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  loadMoreText: { color: '#1f6feb', fontSize: 13, fontWeight: '600' },
  sectionError: { gap: 8, paddingVertical: 8 },
  sectionErrorText: { fontSize: 12.5, color: '#b91c1c', lineHeight: 18 },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
  },
  retryText: { color: '#1f6feb', fontSize: 12, fontWeight: '600' },
});
