/**
 * 应用入口（组合根）。
 *
 * <p>本文件是**应用壳**：把运行时配置、传输层、会话、请求客户端、登录服务、
 * 启动引导与导航组装起来。业务页面在 `src/screens/` 下按 `component` 字符串注册。</p>
 *
 * <p>状态机：`loading → anonymous(登录页) → ready(主界面) → error(可重试)`。
 * 权限码与角色码来自 `current-user`，通过 `PermissionProvider` 下发给
 * `<Access>` / `usePermission()`；菜单按 `MENU:{code}:Allow` 逐项守卫。</p>
 *
 * <p>依赖 React Native / React Navigation 运行时，未纳入 `tsc` 编译图
 * （见基座交付边界）；被它组装的纯逻辑模块均有单测覆盖。</p>
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Button, Platform, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  AUTH_ENDPOINTS,
  FRONTEND_ENDPOINTS,
  type CurrentUserResp,
  type FrontendInitResp,
  type FrontendLoginConfigResp,
  type LoginResp,
} from '../packages/client-sdk/index.ts';
import { runBootstrap, type BootstrapResult } from './src/bootstrap/index.ts';
import { createAppRuntimeConfig } from './src/config/app-config.ts';
import { createLoginService } from './src/auth/login-service.ts';
import { PermissionProvider } from './src/auth/usePermission.tsx';
import { mapMenuToNavigation } from './src/navigation/menu-to-nav.ts';
import { LoginScreen } from './src/screens/LoginScreen.tsx';
import { ProfileScreen } from './src/screens/ProfileScreen.tsx';
import { TabRoutesScreen } from './src/screens/TabRoutesScreen.tsx';
import { createRequestClient } from './src/request/client.ts';
import { createFetchTransport } from './src/request/transport.ts';
import { createNativeSecureTokenStorage } from './src/session/secure-storage-rn.ts';
import { createSessionManager } from './src/session/session-manager.ts';

/**
 * 运行时配置：baseURL 按平台推导（Android 模拟器走 10.0.2.2），
 * 真机/生产由构建时注入覆盖，禁止把凭据写死入库。
 */
const appConfig = createAppRuntimeConfig({ os: Platform.OS });

const sessionManager = createSessionManager(createNativeSecureTokenStorage());

const request = createRequestClient({
  transport: createFetchTransport({ baseURL: appConfig.baseURL }),
  clientType: appConfig.clientType,
  getAccessToken: () => sessionManager.getAccessToken(),
  onUnauthorized: () => {
    void sessionManager.clear();
  },
  refreshAccessToken: async () => {
    const refreshToken = sessionManager.getRefreshToken();
    if (!refreshToken) return null;
    try {
      const response = await request.request<LoginResp>({
        method: 'POST',
        url: AUTH_ENDPOINTS.refresh,
        data: { refreshToken },
        skipAuthRefresh: true,
      });
      await sessionManager.save(response);
      return response.accessToken;
    } catch {
      return null;
    }
  },
});

const loginService = createLoginService({ request: request.request, session: sessionManager });

type BootState =
  | { status: 'loading' }
  | { status: 'anonymous'; loginConfig: FrontendLoginConfigResp | null }
  | { status: 'ready'; bootstrap: BootstrapResult }
  | { status: 'error'; message: string };

const Tab = createBottomTabNavigator();

/** 主界面：权限上下文 + 菜单驱动的底部 Tab + 「我的」。 */
function MainApp({ bootstrap, onLogout }: { bootstrap: BootstrapResult; onLogout: () => Promise<void> }) {
  const mapping = useMemo(() => mapMenuToNavigation(bootstrap.menuTree), [bootstrap.menuTree]);
  const permissionProps = useMemo(
    () => ({ permissions: bootstrap.permissionCodes, roles: bootstrap.roleCodes }),
    [bootstrap.permissionCodes, bootstrap.roleCodes],
  );

  return (
    <PermissionProvider {...permissionProps}>
      <NavigationContainer>
        <Tab.Navigator>
          {mapping.tabs.map((tab) => (
            <Tab.Screen key={tab.key} name={tab.key} options={{ title: tab.title }}>
              {() => <TabRoutesScreen tab={tab} />}
            </Tab.Screen>
          ))}
          <Tab.Screen name="__profile" options={{ title: '我的' }}>
            {() => (
              <ProfileScreen
                user={bootstrap.currentUser}
                permissionCodes={bootstrap.permissionCodes}
                roleCodes={bootstrap.roleCodes}
                onLogout={onLogout}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
    </PermissionProvider>
  );
}

export default function App() {
  const [state, setState] = useState<BootState>({ status: 'loading' });

  /** 拉取匿名 init，用于登录页拿到权威登录开关。失败则回落 init 兜底默认值。 */
  const fetchLoginConfig = useCallback(async (): Promise<FrontendLoginConfigResp | null> => {
    try {
      const init = await request.request<FrontendInitResp>({
        method: 'GET',
        url: FRONTEND_ENDPOINTS.init,
        params: {
          platform: appConfig.platform,
          ...(appConfig.channel ? { channel: appConfig.channel } : {}),
        },
      });
      return init.loginConfig ?? null;
    } catch {
      return null;
    }
  }, []);

  /** 启动引导：恢复会话 → 有可用会话则拉 init + current-user，否则进入登录页。 */
  const boot = useCallback(async () => {
    setState({ status: 'loading' });
    await sessionManager.restore();

    if (!sessionManager.isUsable()) {
      const loginConfig = await fetchLoginConfig();
      setState({ status: 'anonymous', loginConfig });
      return;
    }

    try {
      const result = await runBootstrap({
        fetchInit: () =>
          request.request<FrontendInitResp>({
            method: 'GET',
            url: FRONTEND_ENDPOINTS.init,
            params: {
              platform: appConfig.platform,
              ...(appConfig.channel ? { channel: appConfig.channel } : {}),
            },
          }),
        fetchCurrentUser: () =>
          request.request<CurrentUserResp>({ method: 'GET', url: AUTH_ENDPOINTS.currentUser }),
      });
      setState({ status: 'ready', bootstrap: result });
    } catch (error) {
      // current-user 失败但 token 未过期：视为网络问题，允许重试而不是直接登出。
      setState({ status: 'error', message: (error as Error).message });
    }
  }, [fetchLoginConfig]);

  useEffect(() => {
    void boot();
  }, [boot]);

  const handleLogin = useCallback(
    async (username: string, password: string) => {
      // 登录失败（账号密码错/网络异常）向 LoginScreen 抛出，页面展示服务端文案。
      await loginService.login({ username, password });
      await boot();
    },
    [boot],
  );

  const handleLogout = useCallback(async () => {
    await loginService.logout();
    await boot();
  }, [boot]);

  return (
    <SafeAreaProvider>
      {state.status === 'loading' && (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      )}
      {state.status === 'anonymous' && (
        <LoginScreen loginConfig={state.loginConfig} onLogin={handleLogin} />
      )}
      {state.status === 'error' && (
        <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
          <Text>{state.message}</Text>
          <Button title="重试" onPress={() => void boot()} />
        </View>
      )}
      {state.status === 'ready' && <MainApp bootstrap={state.bootstrap} onLogout={handleLogout} />}
    </SafeAreaProvider>
  );
}
