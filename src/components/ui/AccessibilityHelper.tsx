import { useEffect, useState } from 'react';

interface AccessibilityHelperProps {
  isActive: boolean;
  onClose?: () => void;
}

export function AccessibilityHelper({ isActive, onClose: _onClose }: AccessibilityHelperProps) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && e.shiftKey && isActive) {
        e.preventDefault();
        setShowHelp(!showHelp);
      }
      if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, showHelp]);

  if (!showHelp || !isActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">キーボードショートカット</h3>
          <button
            onClick={() => setShowHelp(false)}
            className="text-gray-500 hover:text-gray-700"
            aria-label="ヘルプを閉じる"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">矢印キー</span>
            <span className="text-gray-600">画像間の移動</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Enter / Space</span>
            <span className="text-gray-600">画像を開く</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Home</span>
            <span className="text-gray-600">最初の画像</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">End</span>
            <span className="text-gray-600">最後の画像</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Escape</span>
            <span className="text-gray-600">モーダルを閉じる</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Shift + ?</span>
            <span className="text-gray-600">このヘルプ</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">画面読み上げソフトウェアと互換性があります</p>
        </div>
      </div>
    </div>
  );
}
