/**
 * 平台账号绑定页。租户登录成功但未关联平台账号时进入；绑定完成后才签发租户会话。
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { BindingChallenge, CompleteBindingReq } from '../../../packages/client-sdk/index.ts';

export interface BindingScreenProps {
  challenge: BindingChallenge;
  onComplete: (payload: CompleteBindingReq) => Promise<void>;
  onCancel: () => void;
}

export function BindingScreen({ challenge, onComplete, onCancel }: BindingScreenProps) {
  const [action, setAction] = useState<'CREATE_NEW' | 'BIND_EXISTING'>('CREATE_NEW');
  const [username, setUsername] = useState(challenge.proposedUsername ?? '');
  const [displayName, setDisplayName] = useState(challenge.proposedDisplayName ?? '');
  const [password, setPassword] = useState('');
  const [account, setAccount] = useState('');
  const [credential, setCredential] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    if (!challenge.bindingTicket) return;
    if (action === 'CREATE_NEW') {
      if (!username.trim()) {
        setError('请输入平台用户名');
        return;
      }
      if (!password) {
        setError('请输入平台密码');
        return;
      }
    } else if (!account.trim() || !credential) {
      setError('请输入已有平台账号的用户名和密码');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onComplete(
        action === 'CREATE_NEW'
          ? {
              bindingTicket: challenge.bindingTicket,
              action,
              username: username.trim(),
              ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
              password,
            }
          : {
              bindingTicket: challenge.bindingTicket,
              action,
              account: account.trim(),
              credential,
            },
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '绑定失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }, [account, action, challenge.bindingTicket, credential, displayName, onComplete, password, username]);

  if (challenge.pendingApproval || !challenge.bindingTicket) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>等待管理员审批</Text>
        <Text style={styles.hint}>平台账号关联申请已提交，审批通过后即可登录。</Text>
        <Pressable style={styles.secondary} onPress={onCancel}><Text>返回登录</Text></Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>关联平台账号</Text>
      <Text style={styles.hint}>
        {challenge.bindingReason === 'LINK_REVOKED'
          ? '平台账号关联已解除，请重新建立关联。'
          : '首次进入当前企业需要关联平台账号。'}
        {challenge.tenantCode ? `（企业：${challenge.tenantCode}）` : ''}
      </Text>

      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentItem, action === 'CREATE_NEW' && styles.segmentActive]}
          onPress={() => setAction('CREATE_NEW')}
        >
          <Text style={action === 'CREATE_NEW' ? styles.segmentActiveText : undefined}>创建新平台账号</Text>
        </Pressable>
        <Pressable
          style={[styles.segmentItem, action === 'BIND_EXISTING' && styles.segmentActive]}
          onPress={() => setAction('BIND_EXISTING')}
        >
          <Text style={action === 'BIND_EXISTING' ? styles.segmentActiveText : undefined}>绑定已有账号</Text>
        </Pressable>
      </View>

      {action === 'CREATE_NEW' ? (
        <>
          <Field label="平台用户名" value={username} onChangeText={setUsername} testID="binding-username" />
          <Field label="显示名称" value={displayName} onChangeText={setDisplayName} testID="binding-display-name" />
          <Field
            label="平台密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="binding-password"
          />
        </>
      ) : (
        <>
          <Field label="已有平台用户名" value={account} onChangeText={setAccount} testID="binding-account" />
          <Field
            label="平台密码"
            value={credential}
            onChangeText={setCredential}
            secureTextEntry
            testID="binding-credential"
          />
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={[styles.button, submitting && styles.disabled]} onPress={() => void submit()} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>完成关联</Text>}
      </Pressable>
      <Pressable onPress={onCancel}><Text style={styles.link}>返回登录</Text></Pressable>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  testID: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        secureTextEntry={props.secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
        testID={props.testID}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  centered: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '600', color: '#0f172a' },
  hint: { fontSize: 13, color: '#64748b' },
  field: { gap: 6 },
  label: { fontSize: 13, color: '#334155', fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  segment: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#cbd5e1' },
  segmentItem: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segmentActive: { backgroundColor: '#1f6feb' },
  segmentActiveText: { color: '#fff' },
  button: { backgroundColor: '#1f6feb', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, alignItems: 'center' },
  link: { color: '#1f6feb', textAlign: 'center' },
  error: { color: '#dc2626' },
});
