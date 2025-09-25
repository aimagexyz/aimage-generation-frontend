import { LuBell, LuWand } from 'react-icons/lu';

type NavItem = {
  name: string;
  icon: React.ElementType;
  label: string;
  path: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    name: 'reference-generation',
    icon: LuWand,
    label: '参考図生成',
    path: '/projects/{:projectId}/reference-generation',
  },
];

export const NAV_ITEMS_BOTTOM: NavItem[] = [
  {
    name: 'notifications',
    icon: LuBell,
    label: '通知',
    path: '/#notifications',
  },
];
