/**
 * 登录页（手机号优先，方案 C）。
 *
 * <p>首屏只放手机号验证码登录；账号密码与邮箱登录收进「更多登录方式」底部弹层。
 * 服务端 `phoneEnabled=false` 时自动回落到下一个可用方式，避免出现空白页。</p>
 *
 * <p>注册小字的口径：
 * <ul>
 *   <li>手机号 / 邮箱验证码首次登录会自动建号时（`phoneRegisterAllowed` / `emailRegisterAllowed`），
 *       显示「未注册…验证通过后将自动创建账号」的提示，不再显示独立注册入口；</li>
 *   <li>当前通道不允许自动建号、但用户名注册开放时，显示「没有账号？注册」。</li>
 * </ul>
 * 这样不会把用户引到一个与当前登录方式不一致的注册表单。</p>
 *
 * <p>依赖 React Native 运行时，按基座约定不进入 `tsc` 编译图；
 * 表单校验、开关判定等纯逻辑在 `auth/login-service.ts` 并被单测覆盖。</p>
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { FrontendLoginConfigResp } from '../../../packages/client-sdk/index.ts';
import {
  getEnabledFormLoginMethods,
  isEmailRegisterAllowed,
  isPhoneRegisterAllowed,
  isUsernameRegisterAllowed,
  validateEmailLoginInput,
  validateLoginInput,
  validatePhoneLoginInput,
  validateSendEmailCodeInput,
  validateSendPhoneCodeInput,
  type FormLoginMethod,
} from '../auth/login-service.ts';

export interface LoginScreenProps {
  /** 登录开关（get-auth-config 或 init 兜底）。 */
  loginConfig?: FrontendLoginConfigResp | null;
  /** 用户名密码登录。 */
  onLogin: (username: string, password: string) => Promise<void>;
  /** 手机号验证码登录。 */
  onPhoneLogin: (phone: string, code: string) => Promise<void>;
  /** 邮箱验证码登录。 */
  onEmailLogin: (email: string, code: string) => Promise<void>;
  /** 发送手机验证码。 */
  onSendPhoneCode: (phone: string) => Promise<void>;
  /** 发送邮箱验证码。 */
  onSendEmailCode: (email: string) => Promise<void>;
  /** 打开注册页；未提供时隐藏注册入口。 */
  onRegister?: () => void;
}

const METHOD_META: Record<FormLoginMethod, { label: string; hint: string; icon: string }> = {
  phone: { label: '手机号登录', hint: '验证码快速登录', icon: '📱' },
  username: { label: '账号密码登录', hint: '用户名 + 密码', icon: '🔑' },
  email: { label: '邮箱登录', hint: '邮箱验证码登录', icon: '✉️' },
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function LoginScreen({
  loginConfig,
  onLogin,
  onPhoneLogin,
  onEmailLogin,
  onSendPhoneCode,
  onSendEmailCode,
  onRegister,
}: LoginScreenProps) {
  const enabledMethods = useMemo(() => getEnabledFormLoginMethods(loginConfig), [loginConfig]);
  const [activeMethod, setActiveMethod] = useState<FormLoginMethod>(
    () => enabledMethods[0] ?? 'username',
  );

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // 配置变化后确保当前方式仍然可用；优先回落到配置里的第一个可用方式。
  useEffect(() => {
    if (enabledMethods.length > 0 && !enabledMethods.includes(activeMethod)) {
      setActiveMethod(enabledMethods[0] ?? 'username');
    }
  }, [enabledMethods, activeMethod]);

  // 手机号 / 邮箱分别倒计时：切到另一种方式时，原来的倒计时继续走，不互相阻塞。
  useEffect(() => {
    if (phoneCountdown <= 0 && emailCountdown <= 0) return;
    const timer = setTimeout(() => {
      setPhoneCountdown((value) => Math.max(0, value - 1));
      setEmailCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [phoneCountdown, emailCountdown]);

  const activeCountdown = activeMethod === 'phone' ? phoneCountdown : activeMethod === 'email' ? emailCountdown : 0;

  const handleSendCode = useCallback(async () => {
    if (sendingCode || activeCountdown > 0) return;
    setError(null);

    if (activeMethod === 'phone') {
      const validation = validateSendPhoneCodeInput(phone);
      if (!validation.ok) {
        setError(validation.message ?? '请输入手机号');
        return;
      }

      setSendingCode(true);
      try {
        await onSendPhoneCode(phone.trim());
        setPhoneCountdown(loginConfig?.phoneSendIntervalSeconds ?? 60);
      } catch (caught) {
        setError(errorMessage(caught, '验证码发送失败，请稍后重试'));
      } finally {
        setSendingCode(false);
      }
      return;
    }

    if (activeMethod === 'email') {
      const validation = validateSendEmailCodeInput(email);
      if (!validation.ok) {
        setError(validation.message ?? '请输入邮箱');
        return;
      }

      setSendingCode(true);
      try {
        await onSendEmailCode(email.trim());
        setEmailCountdown(loginConfig?.emailSendIntervalSeconds ?? 60);
      } catch (caught) {
        setError(errorMessage(caught, '验证码发送失败，请稍后重试'));
      } finally {
        setSendingCode(false);
      }
    }
  }, [
    activeCountdown,
    activeMethod,
    email,
    loginConfig?.emailSendIntervalSeconds,
    loginConfig?.phoneSendIntervalSeconds,
    onSendEmailCode,
    onSendPhoneCode,
    phone,
    sendingCode,
  ]);

  const handleSubmit = useCallback(async () => {
    if (submitting || enabledMethods.length === 0) return;
    setError(null);

    if (activeMethod === 'phone') {
      const validation = validatePhoneLoginInput({ phone, code: phoneCode });
      if (!validation.ok) {
        setError(validation.message ?? '请检查输入');
        return;
      }

      setSubmitting(true);
      try {
        await onPhoneLogin(phone.trim(), phoneCode.trim());
      } catch (caught) {
        setError(errorMessage(caught, '登录失败，请稍后重试'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (activeMethod === 'email') {
      const validation = validateEmailLoginInput({ email, code: emailCode });
      if (!validation.ok) {
        setError(validation.message ?? '请检查输入');
        return;
      }

      setSubmitting(true);
      try {
        await onEmailLogin(email.trim(), emailCode.trim());
      } catch (caught) {
        setError(errorMessage(caught, '登录失败，请稍后重试'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const validation = validateLoginInput({ username, password });
    if (!validation.ok) {
      setError(validation.message ?? '请检查输入');
      return;
    }

    setSubmitting(true);
    try {
      await onLogin(username, password);
    } catch (caught) {
      setError(errorMessage(caught, '登录失败，请稍后重试'));
    } finally {
      setSubmitting(false);
    }
  }, [
    activeMethod,
    email,
    emailCode,
    enabledMethods.length,
    onEmailLogin,
    onLogin,
    onPhoneLogin,
    password,
    phone,
    phoneCode,
    submitting,
    username,
  ]);

  const selectMethod = (method: FormLoginMethod) => {
    setActiveMethod(method);
    setError(null);
    setSheetVisible(false);
  };

  const openMethodSheet = () => {
    Keyboard.dismiss();
    setSheetVisible(true);
  };

  const renderRegisterLink = () => {
    if (!isUsernameRegisterAllowed(loginConfig) || !onRegister) return null;
    return (
      <View style={styles.registerRow}>
        <Text style={styles.hint}>没有账号？</Text>
        <Pressable onPress={onRegister} hitSlop={8} testID="login-register">
          <Text style={styles.link}>注册</Text>
        </Pressable>
      </View>
    );
  };

  const renderRegistrationHint = () => {
    if (activeMethod === 'phone') {
      if (isPhoneRegisterAllowed(loginConfig)) {
        return <Text style={styles.hint}>未注册手机号验证通过后将自动创建账号</Text>;
      }
      return renderRegisterLink();
    }

    if (activeMethod === 'email') {
      if (isEmailRegisterAllowed(loginConfig)) {
        return <Text style={styles.hint}>未注册邮箱验证通过后将自动创建账号</Text>;
      }
      return renderRegisterLink();
    }

    return renderRegisterLink();
  };

  const renderMethodFields = () => {
    if (enabledMethods.length === 0) {
      return <Text style={styles.error}>暂无可用登录方式，请联系管理员</Text>;
    }

    if (activeMethod === 'phone') {
      return (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>手机号</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="请输入手机号"
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              testID="login-phone"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>验证码</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={phoneCode}
                onChangeText={setPhoneCode}
                placeholder="请输入验证码"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                onSubmitEditing={() => void handleSubmit()}
                testID="login-phone-code"
              />
              <Pressable
                style={[
                  styles.sendButton,
                  (sendingCode || activeCountdown > 0) && styles.sendButtonDisabled,
                ]}
                disabled={sendingCode || activeCountdown > 0}
                onPress={() => void handleSendCode()}
                testID="login-send-phone-code"
              >
                {sendingCode ? (
                  <ActivityIndicator color="#1f6feb" size="small" />
                ) : (
                  <Text style={styles.sendText}>
                    {activeCountdown > 0 ? `${activeCountdown}s 后重发` : '获取验证码'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </>
      );
    }

    if (activeMethod === 'email') {
      return (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>邮箱</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="请输入邮箱"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              testID="login-email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>验证码</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={emailCode}
                onChangeText={setEmailCode}
                placeholder="请输入验证码"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                onSubmitEditing={() => void handleSubmit()}
                testID="login-email-code"
              />
              <Pressable
                style={[
                  styles.sendButton,
                  (sendingCode || activeCountdown > 0) && styles.sendButtonDisabled,
                ]}
                disabled={sendingCode || activeCountdown > 0}
                onPress={() => void handleSendCode()}
                testID="login-send-email-code"
              >
                {sendingCode ? (
                  <ActivityIndicator color="#1f6feb" size="small" />
                ) : (
                  <Text style={styles.sendText}>
                    {activeCountdown > 0 ? `${activeCountdown}s 后重发` : '获取验证码'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </>
      );
    }

    return (
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
            testID="login-username"
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
            onSubmitEditing={() => void handleSubmit()}
            testID="login-password"
          />
        </View>
      </>
    );
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>登录</Text>

            {renderMethodFields()}

            {error ? (
              <Text style={styles.error} testID="login-error">
                {error}
              </Text>
            ) : null}

            {enabledMethods.length > 0 ? (
              <Pressable
                style={[styles.button, submitting && styles.buttonDisabled]}
                disabled={submitting}
                onPress={() => void handleSubmit()}
                testID="login-submit"
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>登 录</Text>
                )}
              </Pressable>
            ) : null}

            {renderRegistrationHint()}

            {enabledMethods.length > 1 ? (
              <Pressable
                style={styles.moreButton}
                onPress={openMethodSheet}
                testID="login-more-methods"
              >
                <Text style={styles.moreText}>更多登录方式</Text>
                <Text style={styles.moreChevron}>⌄</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetVisible(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setSheetVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>更多登录方式</Text>

            {enabledMethods.map((method) => {
              const meta = METHOD_META[method];
              const active = method === activeMethod;
              return (
                <Pressable
                  key={method}
                  style={[styles.sheetItem, active && styles.sheetItemActive]}
                  onPress={() => selectMethod(method)}
                  testID={`login-method-${method}`}
                >
                  <Text style={styles.sheetIcon}>{meta.icon}</Text>
                  <View style={styles.sheetLabelWrap}>
                    <Text style={styles.sheetLabel}>{meta.label}</Text>
                    <Text style={styles.sheetHintText}>{meta.hint}</Text>
                  </View>
                  {active ? <Text style={styles.sheetCurrent}>当前</Text> : null}
                </Pressable>
              );
            })}

            <Pressable style={styles.sheetCancel} onPress={() => setSheetVisible(false)}>
              <Text style={styles.sheetCancelText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  row: { flexDirection: 'row', gap: 8 },
  codeInput: { flex: 1 },
  sendButton: {
    minWidth: 104,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.55 },
  sendText: { color: '#1f6feb', fontSize: 13, fontWeight: '600' },
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
  hint: { color: '#64748b', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  link: { color: '#1f6feb', fontSize: 12, fontWeight: '600' },
  moreButton: { alignItems: 'center', paddingTop: 2, paddingBottom: 4 },
  moreText: { color: '#1f6feb', fontSize: 13, fontWeight: '600' },
  moreChevron: { color: '#1f6feb', fontSize: 12, marginTop: 1 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.38)' },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 10 },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  sheetItemActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sheetIcon: { fontSize: 18 },
  sheetLabelWrap: { flex: 1 },
  sheetLabel: { fontSize: 14, color: '#0f172a', fontWeight: '500' },
  sheetHintText: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  sheetCurrent: { fontSize: 11, color: '#1f6feb', fontWeight: '600' },
  sheetCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 2 },
  sheetCancelText: { color: '#64748b', fontSize: 14 },
});
