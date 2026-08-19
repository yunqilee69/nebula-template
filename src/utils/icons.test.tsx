import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from 'antd';
import { nebulaIconMap, resolveNebulaIcon } from './icons';

describe('nebula icon registry', () => {
  it('resolves locally defined Nebula icons before Ant Design icons with the same key', () => {
    render(<>{resolveNebulaIcon('UserOutlined')}</>);

    expect(screen.getByTestId('nebula-user-icon')).toBeInTheDocument();
  });

  it('falls back to Ant Design icons by component key when no local icon is defined', () => {
    render(<>{resolveNebulaIcon('SettingOutlined')}</>);

    expect(document.querySelector('.anticon-setting')).toBeInTheDocument();
  });

  it('uses consumer iconMap entries before Ant Design icons for non-local keys', () => {
    render(<>{resolveNebulaIcon('SettingOutlined', { SettingOutlined: <span data-testid="custom-setting-icon" /> })}</>);

    expect(screen.getByTestId('custom-setting-icon')).toBeInTheDocument();
    expect(document.querySelector('.anticon-setting')).not.toBeInTheDocument();
  });

  it('falls back to the default Nebula icon for unknown keys', () => {
    render(<>{resolveNebulaIcon('missing-icon-key')}</>);

    expect(screen.getByTestId('nebula-default-icon')).toBeInTheDocument();
  });

  it('creates icons that can be used directly in Ant Design component icon props', () => {
    render(<Button icon={nebulaIconMap.UserOutlined}>Nebula user</Button>);

    expect(screen.getByRole('button', { name: /Nebula user/i })).toBeInTheDocument();
    expect(screen.getByTestId('nebula-user-icon')).toBeInTheDocument();
    expect(document.querySelector('.anticon')).toBeInTheDocument();
  });
});
