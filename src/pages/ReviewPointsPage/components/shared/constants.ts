import type { PredefinedRPDKey } from '@/constants/rpdKeys';

// RPD Keyの日文名称和说明
export const RPD_KEY_INFO: Record<PredefinedRPDKey, { name: string; description: string }> = {
  general_ng_review: {
    name: 'NG監修',
    description: 'NG項目の有無を監修',
  },
  visual_review: {
    name: 'ビジュアル監修',
    description: '視覚的要素の監修',
  },
  settings_review: {
    name: '設定監修',
    description: '設定の監修',
  },
  design_review: {
    name: 'デザイン監修',
    description: 'デザインの監修',
  },
  text_review: {
    name: 'テキスト監修',
    description: '文字内容の監修',
  },
  copyright_review: {
    name: 'コピーライト監修',
    description: 'コピーライトマークの監修',
  },
};

// 生成安全ID的工具函数
export const generateSecureId = () => {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(36)).join('');
};
