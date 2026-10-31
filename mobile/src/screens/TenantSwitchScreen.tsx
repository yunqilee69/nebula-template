/**
 * 切换企业：输入企业代码后清除当前租户会话并回到登录页。
 *
 * <p>多租户模型下切换企业等同访问目标租户站点：没有本地会话就重新登录，
 * 不做跨租户令牌交换。</p>
 */
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

export interface TenantSwitchScreenProps {
  currentTenantCode?: string;
  onSwitch: (tenantCode: string) => Promise<void>;
}

export function TenantSwitchScreen({ currentTenantCode, onSwitch }: TenantSwitchScreenProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const value = code.trim().toLowerCase();
    if (!value) {
      setError('请输入企业代码');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSwitch(value);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>切换企业</Text>
      <Text style={styles.meta}>
        当前企业：{currentTenantCode || '未指定'}。切换后需要重新登录目标企业。
      </Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="企业代码"
        value={code}
        onChangeText={setCode}
        testID="tenant-switch-code"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={busy ? '切换中…' : '切换'} onPress={() => void submit()} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 13, color: '#475569', lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: { color: '#dc2626', fontSize: 13 },
});
