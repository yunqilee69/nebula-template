import { Typography } from 'antd';
import { createStyles } from 'antd-style';
import { useEffect, useState, type ReactNode } from 'react';
import { TenantBrandLogo } from '@/components/tenant-brand-logo';
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
  // 默认渐变背景上的装饰网格；换成企业背景图后不渲染，避免在照片上叠加出格子。
  gridOverlay: {
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
  main: {
    position: 'relative' as const,
    zIndex: 1,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingBlock: token.paddingMD,
  },
  // 无卡片边框的玻璃面板：背景图透过来，同时保证表单文字可读。
  panel: {
    position: 'relative' as const,
    width: '100%',
    maxWidth: 420,
    padding: token.paddingXL,
    borderRadius: token.borderRadiusLG * 2,
    border: `1px solid color-mix(in srgb, ${token.colorBorderSecondary} 60%, transparent)`,
    background: `color-mix(in srgb, ${token.colorBgContainer} 68%, transparent)`,
    backdropFilter: 'blur(20px) saturate(120%)',
    boxShadow: token.boxShadowSecondary,
  },
  header: {
    marginBottom: token.marginLG,
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: token.marginSM,
    marginBottom: token.marginXS,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    color: token.colorTextHeading,
    fontSize: token.fontSizeHeading2,
    lineHeight: 1.2,
    textAlign: 'center' as const,
  },
  subtitle: {
    display: 'block',
    textAlign: 'center' as const,
  },
  footer: {
    position: 'relative' as const,
    zIndex: 1,
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: token.marginXS,
    paddingBlock: token.paddingSM,
    color: token.colorTextSecondary,
    fontSize: token.fontSizeSM,
    textAlign: 'center' as const,
  },
  footerLink: {
    color: token.colorTextSecondary,
    textDecoration: 'none',
    '&:hover': {
      color: token.colorPrimary,
      textDecoration: 'underline',
    },
  },
  footerSeparator: {
    color: token.colorTextTertiary,
  },
}));

function displayWebsite(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function AuthShell({ children }: AuthShellProps) {
  const brand = useNebulaBrand();
  const { styles, cx } = useStyles();
  // 登录页直接使用企业 Logo（未登录状态只能读公开槽位，不能再走带认证的存储解析）。
  const logo = brand.logoUrl
    ? <TenantBrandLogo src={brand.logoUrl} alt={brand.name} height={40} resolveStorage={false} />
    : brand.logo;
  const backgroundUrl = brand.loginBackground?.trim();
  const [loadedBackground, setLoadedBackground] = useState<string>();

  useEffect(() => {
    setLoadedBackground(undefined);
    if (!backgroundUrl) return;

    const image = new Image();
    image.onload = () => setLoadedBackground(backgroundUrl);
    image.onerror = () => setLoadedBackground(undefined);
    image.src = backgroundUrl;
    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [backgroundUrl]);

  const backgroundStyle = loadedBackground === backgroundUrl && backgroundUrl
    ? {
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url(${JSON.stringify(encodeURI(backgroundUrl))})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;
  const hasBackgroundImage = Boolean(backgroundStyle);

  const footerItems: ReactNode[] = [];
  const footer = brand.footer;
  const copyright = footer?.copyright || `© ${new Date().getFullYear()} ${brand.name}`;
  footerItems.push(<span key="copyright">{copyright}</span>);
  if (footer?.icp) {
    footerItems.push(
      <a
        key="icp"
        className={styles.footerLink}
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noreferrer"
      >
        {footer.icp}
      </a>,
    );
  }
  if (footer?.contactEmail) {
    footerItems.push(
      <a key="email" className={styles.footerLink} href={`mailto:${footer.contactEmail}`}>
        {footer.contactEmail}
      </a>,
    );
  }
  if (footer?.contactPhone) {
    footerItems.push(
      <a key="phone" className={styles.footerLink} href={`tel:${footer.contactPhone.replace(/[^\d+]/g, '')}`}>
        {footer.contactPhone}
      </a>,
    );
  }
  if (footer?.website) {
    footerItems.push(
      <a key="website" className={styles.footerLink} href={footer.website} target="_blank" rel="noreferrer">
        {displayWebsite(footer.website)}
      </a>,
    );
  }

  return (
    <div className={cx('flex min-h-dvh flex-col', styles.root)} style={backgroundStyle}>
      {hasBackgroundImage ? null : <div className={styles.gridOverlay} data-testid="auth-shell-grid" aria-hidden />}
      <main className={cx('flex items-center justify-center', styles.main)}>
        <div className={styles.panel} data-testid="auth-shell-panel">
          <div className={styles.header}>
            <div className={styles.brandRow}>
              {logo ? <div className={styles.logo}>{logo}</div> : null}
              <Typography.Title level={2} className={styles.title}>
                {brand.loginTitle}
              </Typography.Title>
            </div>
            {brand.loginSubtitle ? (
              <Typography.Text type="secondary" className={styles.subtitle}>
                {brand.loginSubtitle}
              </Typography.Text>
            ) : null}
          </div>
          {children}
        </div>
      </main>
      <footer className={styles.footer} data-testid="auth-shell-footer">
        {footerItems.map((item, index) => (
          <span key={index} className="inline-flex items-center gap-1">
            {index > 0 ? <span className={styles.footerSeparator} aria-hidden>·</span> : null}
            {item}
          </span>
        ))}
      </footer>
    </div>
  );
}
