import { MoreOutlined } from '@ant-design/icons';
import { Button, Flex, theme as antdTheme } from 'antd';
import { useCallback, useState, type ReactNode } from 'react';

interface TreeNodeActionGroupProps {
  readonly ariaLabel: string;
  readonly children: (close: () => void) => ReactNode;
}

export function TreeNodeActionGroup({ ariaLabel, children }: TreeNodeActionGroupProps) {
  const { token } = antdTheme.useToken();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Button
        type="text"
        size="small"
        icon={<MoreOutlined />}
        aria-label={ariaLabel}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      />
      {open ? (
        <Flex
          vertical
          role="group"
          aria-label={ariaLabel}
          gap={token.marginXXS}
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 1000,
            minWidth: 96,
            padding: token.paddingXXS,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            background: token.colorBgElevated,
            boxShadow: token.boxShadowSecondary,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {children(close)}
        </Flex>
      ) : null}
    </span>
  );
}
