import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import type { ReactNode } from 'react';

interface HelpIconProps {
  readonly title: ReactNode;
  readonly ariaLabel: string;
  readonly placement?: 'top' | 'bottom';
}

/**
 * 参数说明图标：悬停/聚焦展示解释文案。
 *
 * 表单字段优先用 antd `Form.Item` 的 `tooltip` 属性；本组件用于表格列头等
 * 无法使用该属性的位置。
 */
export function HelpIcon({ title, ariaLabel, placement = 'bottom' }: HelpIconProps) {
  return (
    <Tooltip placement={placement} title={title}>
      <Button
        type="text"
        size="small"
        icon={<QuestionCircleOutlined />}
        aria-label={ariaLabel}
        className="text-[var(--nebula-color-text-secondary)]"
      />
    </Tooltip>
  );
}
