import { Font } from '@react-pdf/renderer';

/**
 * PDF字体注册
 * 解决日语字符显示问题
 */

// Register BIZ UDPGothic font
Font.register({
  family: 'BIZUDPGothic',
  fonts: [
    {
      src: '/fonts/BIZUDPGothic-Regular.ttf',
      fontWeight: 'normal',
    },
    {
      src: '/fonts/BIZUDPGothic-Bold.ttf',
      fontWeight: 'bold',
    },
  ],
});

// Register NotoSansJP as fallback
Font.register({
  family: 'NotoSansJP',
  fonts: [
    {
      src: '/fonts/NotoSansJP-Regular.ttf',
      fontWeight: 'normal',
    },
    {
      src: '/fonts/NotoSansJP-Bold.ttf',
      fontWeight: 'bold',
    },
  ],
});

/**
 * Initialize fonts - kept for compatibility
 */
export const initializeFonts = (): void => {
  // Fonts are already registered at module load
};

/**
 * 获取推荐的日语字体
 * BIZ UDPGothic as primary, NotoSansJP as fallback
 */
export const getJapaneseFont = (): string => {
  // Return single font family for @react-pdf/renderer
  // It doesn't support CSS-style fallback syntax
  return 'BIZUDPGothic';
};

/**
 * Get font family for PDF documents
 * Returns Japanese fonts for better character support
 */
export const getJapaneseFontFamily = (): string => {
  // Return single font family for @react-pdf/renderer
  // We use BIZUDPGothic as primary font
  return 'BIZUDPGothic';
};

/**
 * Detect if text contains Japanese characters
 */
export const hasJapaneseText = (text: string): boolean => {
  const japaneseRegex = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japaneseRegex.test(text);
};

/**
 * 字体加载状态检查
 */
export const isFontLoaded = (fontFamily: string): boolean => {
  try {
    // 简单的字体加载检查
    const testElement = document.createElement('div');
    testElement.style.fontFamily = fontFamily;
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.textContent = 'テスト';
    document.body.appendChild(testElement);

    const loaded = testElement.offsetWidth > 0;
    document.body.removeChild(testElement);

    return loaded;
  } catch {
    return false;
  }
};
