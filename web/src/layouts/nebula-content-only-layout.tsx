import { Layout } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

const { Content } = Layout;

const useStyles = createStyles(({ token }) => ({
  root: {
    minHeight: '100dvh',
    background: token.colorBgLayout,
  },
  content: {
    minHeight: 0,
    padding: token.paddingLG,
    background: token.colorBgLayout,
  },
}));

interface NebulaContentOnlyLayoutProps {
  children?: ReactNode;
}

export function NebulaContentOnlyLayout({ children }: NebulaContentOnlyLayoutProps) {
  const { styles } = useStyles();

  return (
    <Layout className={styles.root}>
      <Content
        role="main"
        className={styles.content}
      >
        {children ?? <Outlet />}
      </Content>
    </Layout>
  );
}
