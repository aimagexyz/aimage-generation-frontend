import { LuBell, LuImages, LuWand } from 'react-icons/lu';

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
  {
    name: 'generated-images',
    icon: LuImages,
    label: '生成画像',
    path: '/projects/{:projectId}/generated-images',
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
