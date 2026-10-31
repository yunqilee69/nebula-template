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
  logo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: token.marginSM,
  },
  title: {
    margin: 0,
    color: token.colorTextHeading,
    textAlign: 'center' as const,
  },
  subtitle: {
    display: 'block',
    marginTop: token.marginXS,
    textAlign: 'center' as const,
  },
}));

export function AuthShell({ children }: AuthShellProps) {
  const brand = useNebulaBrand();
  const { styles, cx } = useStyles();
  const loginLogo = brand.loginLogo ?? brand.logo;
  const backgroundStyle = brand.loginBackground
    ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url(${JSON.stringify(encodeURI(brand.loginBackground))})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  return (
    <div className={cx('flex min-h-dvh items-center justify-center', styles.root)} style={backgroundStyle}>
      <Card className={styles.card}>
        <div className={styles.header}>
          {loginLogo ? <div className={styles.logo}>{loginLogo}</div> : null}
          <Typography.Title level={3} className={styles.title}>
            {brand.loginTitle}
          </Typography.Title>
          {brand.loginSubtitle ? (
            <Typography.Text type="secondary" className={styles.subtitle}>
              {brand.loginSubtitle}
            </Typography.Text>
          ) : null}
        </div>
        {children}
      </Card>
    </div>
  );
}
