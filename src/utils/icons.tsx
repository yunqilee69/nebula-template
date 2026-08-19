import Icon from '@ant-design/icons';
import * as AntDesignIcons from '@ant-design/icons';
import { createElement } from 'react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import DefaultSvg from '@/assets/icons/svg/default.svg?react';
import UserSvg from '@/assets/icons/svg/user.svg?react';

type NebulaSvgIcon = ComponentType<SVGProps<SVGSVGElement>>;

export function createNebulaIcon(component: NebulaSvgIcon): ReactNode {
  return <Icon component={component} />;
}

export const nebulaIconMap = {
  UserOutlined: createNebulaIcon(UserSvg),
  user: createNebulaIcon(UserSvg),
} satisfies Record<string, ReactNode>;

export const defaultNebulaIcon = createNebulaIcon(DefaultSvg);

export type NebulaIconName = keyof typeof nebulaIconMap;

const antDesignIconMap: Record<string, unknown> = AntDesignIcons;

function resolveAntDesignIcon(icon: string): ReactNode | undefined {
  const iconComponent = antDesignIconMap[icon];
  if (typeof iconComponent === 'function' || (typeof iconComponent === 'object' && iconComponent !== null)) {
    return createElement(iconComponent as ComponentType);
  }
  return undefined;
}

export function resolveNebulaIcon(icon?: string | ReactNode, iconMap?: Record<string, ReactNode>): ReactNode | undefined {
  if (!icon) return undefined;
  if (typeof icon !== 'string') return icon;

  return nebulaIconMap[icon as NebulaIconName]
    ?? iconMap?.[icon]
    ?? resolveAntDesignIcon(icon)
    ?? defaultNebulaIcon;
}
