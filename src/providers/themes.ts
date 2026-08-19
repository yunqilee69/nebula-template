import { theme, type ThemeConfig } from 'antd';

export const defaultLightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 8,
    fontSize: 14,
    colorBgLayout: '#f5f7fb',
  },
};

export const defaultDarkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#3c89ff',
    borderRadius: 8,
    fontSize: 14,
  },
};
