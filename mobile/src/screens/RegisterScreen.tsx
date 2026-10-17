/**
 * 用户名密码注册页。
 *
 * <p>只在服务端 `usernameRegisterAllowed=true` 时由登录页进入；手机号 / 邮箱验证码
 * 首次登录的自动建号不走这里（由服务端在登录接口内完成）。</p>
 *
 * <p>依赖 React Native 运行时，不进入 `tsc` 编译图；校验逻辑在 `auth/login-service.ts`。</p>
 */
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { FrontendLoginConfigResp } from '../../../packages/client-sdk/index.ts';
import { validateRegisterInput } from '../auth/login-service.ts';

export interface RegisterScreenProps {
  loginConfig?: FrontendLoginConfigResp | null;
  /** 提交注册；失败时抛错，页面展示 `error.message`。 */
  onRegister: (username: string, password: string) => Promise<void>;
  /** 返回登录页。 */
  onBack: () => void;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RegisterScreen({ loginConfig, onRegister, onBack }: RegisterScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const minLength = loginConfig?.usernamePasswordMinLength;
  const maxLength = loginConfig?.usernamePasswordMaxLength;

  const submit = useCallback(async () => {
    if (submitting || success) return;

    const validation = validateRegisterInput(
      { username, password, confirmPassword },
      loginConfig,
    );
    if (!validation.ok) {
      setError(validation.message ?? '请检查输入');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onRegister(username.trim(), password);
      setSuccess(true);
    } catch (caught) {
      setError(errorMessage(caught, '注册失败，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  }, [confirmPassword, loginConfig, onRegister, password, submitting, success, username]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>注册</Text>

          {success ? (
            <>
              <Text style={styles.success} testID="register-success">
                注册成功，请使用新账号登录。
              </Text>
              <Pressable style={styles.button} onPress={onBack} testID="register-back">
                <Text style={styles.buttonText}>返回登录</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>用户名</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="请输入用户名"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!submitting}
                  testID="register-username"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>密码</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="请输入密码"
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!submitting}
                  testID="register-password"
                />
                {typeof minLength === 'number' || typeof maxLength === 'number' ? (
                  <Text style={styles.help}>
                    {typeof minLength === 'number' && typeof maxLength === 'number'
                      ? `密码长度 ${minLength}-${maxLength} 位`
                      : typeof minLength === 'number'
                        ? `密码至少 ${minLength} 位`
                        : `密码最多 ${maxLength} 位`}
                  </Text>
                ) : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>确认密码</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="请再次输入密码"
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!submitting}
                  onSubmitEditing={() => void submit()}
                  testID="register-confirm-password"
                />
              </View>

              {error ? (
                <Text style={styles.error} testID="register-error">
                  {error}
                </Text>
              ) : null}

              <Pressable
                style={[styles.button, submitting && styles.buttonDisabled]}
                disabled={submitting}
                onPress={() => void submit()}
                testID="register-submit"
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>注 册</Text>
                )}
              </Pressable>

              <Pressable style={styles.backLink} onPress={onBack} testID="register-back">
                <Text style={styles.backText}>已有账号？返回登录</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '600', color: '#0f172a' },
  field: { gap: 6 },
  label: { fontSize: 13, color: '#475569' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0f172a',
  },
  help: { color: '#94a3b8', fontSize: 11 },
  button: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  error: { color: '#dc2626', fontSize: 13, lineHeight: 18 },
  success: { color: '#16a34a', fontSize: 14, lineHeight: 20 },
  backLink: { alignItems: 'center', paddingVertical: 4 },
  backText: { color: '#1f6feb', fontSize: 13 },
});
