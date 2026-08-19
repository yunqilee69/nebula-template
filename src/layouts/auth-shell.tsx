import { Card, Typography } from 'antd';
import { createStyles } from 'antd-style';
import type { ReactNode } from 'react';
import { useNebulaBrand } from '@/providers/brand-context';

interface AuthShellProps {
  children: ReactNode;
}

const useStyles = createStyles(({ token }) => ({
  root: {
    position: 'relative' as const,
    overflow: 'hidden',
    background: `
      radial-gradient(circle at 16% 82%, color-mix(in srgb, ${token.colorPrimary} 16%, transparent) 0, transparent 34%),
      radial-gradient(circle at 84% 18%, color-mix(in srgb, ${token.colorInfo} 12%, transparent) 0, transparent 32%),
      linear-gradient(135deg, ${token.colorBgLayout} 0%, ${token.colorFillQuaternary} 100%)
    `,
    padding: token.paddingLG,

    '&::before': {
      content: '""',
      position: 'absolute' as const,
      inset: 0,
      backgroundImage: `
        linear-gradient(${token.colorBorderSecondary} 1px, transparent 1px),
        linear-gradient(90deg, ${token.colorBorderSecondary} 1px, transparent 1px)
      `,
      backgroundSize: `${token.sizeXL}px ${token.sizeXL}px`,
      maskImage: 'linear-gradient(135deg, transparent 0%, black 24%, black 68%, transparent 100%)',
      opacity: 0.36,
      pointerEvents: 'none' as const,
    },

    '&::after': {
      content: '""',
      position: 'absolute' as const,
      width: 'min(48vw, 420px)',
      height: 'min(48vw, 420px)',
      right: '8%',
      bottom: '10%',
      borderRadius: token.borderRadiusLG * 6,
      background: `radial-gradient(circle, color-mix(in srgb, ${token.colorPrimary} 18%, transparent) 0, transparent 68%)`,
      filter: 'blur(28px)',
      opacity: 0.52,
      pointerEvents: 'none' as const,
      transform: 'rotate(18deg)',
    },
  },
  card: {
    position: 'relative' as const,
    zIndex: 1,
    width: '100%',
    maxWidth: 420,
    borderRadius: token.borderRadiusLG,
    borderColor: token.colorBorderSecondary,
    background: `color-mix(in srgb, ${token.colorBgContainer} 94%, transparent)`,
    boxShadow: token.boxShadowTertiary,
    backdropFilter: 'blur(14px)',
  },
  header: {
    marginBottom: token.marginLG,
  },
  title: {
    margin: 0,
    color: token.colorTextHeading,
    textAlign: 'center' as const,
  },
}));

export function AuthShell({ children }: AuthShellProps) {
  const brand = useNebulaBrand();
  const { styles, cx } = useStyles();

  return (
    <div className={cx('flex min-h-dvh items-center justify-center', styles.root)}>
      <Card className={styles.card}>
        <div className={cx('flex items-center justify-center', styles.header)}>
          <Typography.Title level={3} className={styles.title}>
            {brand.name}
          </Typography.Title>
        </div>
        {children}
      </Card>
    </div>
  );
}
