import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { ControlApp } from './app';
import { AuthProvider } from './auth/auth-context';
import './styles.css';

dayjs.locale('zh-cn');

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

createRoot(container).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 8,
          colorBgLayout: '#f4f6fb',
        },
      }}
    >
      <AntdApp>
        <AuthProvider>
          <ControlApp />
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
);
