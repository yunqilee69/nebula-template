/**
 * 登录页。
 *
 * <p>依赖 React Native 运行时，按基座约定不进入 `tsc` 编译图（见功能说明书交付边界）；
 * 表单校验、开关判定等纯逻辑在 `auth/login-service.ts` 并被单测覆盖。</p>
 *
 * <p>开关口径来自服务端 `get-auth-config`（缺失时回落到 `init.loginConfig`）：
 * 本页只负责用户名密码通道，`usernameEnabled=false` 时直接提示不可用，不发请求。</p>
 */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { FrontendLoginConfigResp } from '../../../packages/client-sdk/index.ts';
import { isUsernameLoginEnabled, validateLoginInput } from '../auth/login-service.ts';

export interface LoginScreenProps {
  /** 登录开关（get-auth-config 或 init 兜底）。 */
  loginConfig?: FrontendLoginConfigResp | null;
  /** 执行登录；抛错时页面展示 `error.message`（服务端已本地化）。 */
  onLogin: (username: string, password: string) => Promise<void>;
}

export function LoginScreen({ loginConfig, onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameEnabled = isUsernameLoginEnabled(loginConfig);

  const submit = useCallback(async () => {
    if (submitting || !usernameEnabled) return;

    const validation = validateLoginInput({ username, password });
    if (!validation.ok) {
      setError(validation.message ?? '请检查输入');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onLogin(username, password);
    } catch (e) {
      setError((e as Error).message || '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, usernameEnabled, username, password, onLogin]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>登录</Text>

        {!usernameEnabled ? (
          <Text style={styles.error}>该端未开放用户名密码登录</Text>
        ) : null}

        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="用户名"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!submitting && usernameEnabled}
          testID="login-username"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="密码"
          secureTextEntry
          autoCapitalize="none"
          editable={!submitting && usernameEnabled}
          onSubmitEditing={() => void submit()}
          testID="login-password"
        />

        {error ? (
          <Text style={styles.error} testID="login-error">
            {error}
          </Text>
        ) : null}

        <Pressable
          style={[styles.button, (!usernameEnabled || submitting) && styles.buttonDisabled]}
          onPress={() => void submit()}
          disabled={!usernameEnabled || submitting}
          testID="login-submit"
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>登录</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
  },
  button: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 14 },
});
