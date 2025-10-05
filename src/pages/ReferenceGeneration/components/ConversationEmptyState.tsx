import { Lightbulb, Sparkles } from 'lucide-react';
import { memo } from 'react';

import { useImageGenContext } from '../contexts/ImageGenContext';

/**
 * ConversationEmptyState Component
 *
 * Responsible for:
 * - Displaying an inviting and helpful empty state.
 * - Providing example prompts to guide the user.
 * - Showing current project context.
 *
 * Following SOLID principles:
 * - Single Responsibility: Only handles empty state presentation.
 */

interface ConversationEmptyStateProps {
  title?: string;
  icon?: React.ComponentType<{ className?: string; }>;
  className?: string;
}

const EXAMPLE_PROMPTS = [
  {
    title: '剣を構えるファンタジー少女',
    prompt: 'ファンタジー風の少女キャラクター、ロングソードを構えるポーズ、白背景、全身、立ち姿、斜め前向き',
    icon: '🗡️',
  },
  {
    title: '元気な現代風男子キャラ（動きのあるポーズ）',
    prompt: '現代カジュアルな男子高校生キャラ、ジャンプしながら手を振るポーズ、白背景、アニメ風、全身',
    icon: '🧑‍🎓',
  },
  {
    title: 'アイドル風キャラの決めポーズ',
    prompt: 'アイドル衣装の女性キャラクター、ウィンクしながらピースサイン、斜め向き、白背景、元気な雰囲気',
    icon: '🎤',
  },
  {
    title: '座って本を読むキャラクター（デザイン検討用）',
    prompt: 'ロングコートを着た中性的なキャラ、椅子に座って本を読む、斜め上からの視点、白背景、デザインラフ風',
    icon: '📖',
  },
  {
    title: 'スポーツユニフォームのアクションポーズ',
    prompt: 'サッカー選手のようなキャラクター、ボールを蹴る瞬間の全身ポーズ、筋肉の動きがわかる構図、白背景',
    icon: '⚽',
  },
  {
    title: '武道ポーズの着物キャラクター',
    prompt: '着物姿のキャラクター、空手の構えポーズ、白背景、正面と斜めの2パターン',
    icon: '🥋',
  },
];

/**
 * ConversationEmptyState Component
 *
 * Pure presentation component that displays an empty state
 * with project context information.
 */
function ConversationEmptyStateComponent({
  title = '参考図の要件を教えてください',
  icon: Icon = Sparkles,
  className = '',
}: ConversationEmptyStateProps) {
  const { setPrompt } = useImageGenContext();

  const handleExampleClick = (prompt: string) => {
    setPrompt(prompt);
  };

  return (
    <div className={`flex flex-col items-center justify-center px-8 py-12 text-center ${className}`}>
      <div className="flex flex-col items-center gap-6 max-w-2xl">
        {/* Main Icon and Title */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 flex items-center justify-center">
            <Icon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              プロジェクトを選択してから、具体的な要件を入力してください。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXAMPLE_PROMPTS.map((example) => (
            <button
              key={example.title}
              onClick={() => handleExampleClick(example.prompt)}
              className="p-4 text-left bg-white dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-700/60 rounded-xl hover:bg-gray-50 hover:border-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-600 transition-all duration-200 hover:scale-[1.02] shadow-sm hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 text-xl bg-gray-100 dark:bg-gray-700/80 rounded-lg">{example.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{example.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{example.prompt}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
          <Lightbulb className="w-4 h-4" />
          <span>プロンプト入力欄でTabキーを押すと、キーワード候補が表示されます。</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Memoized export for performance optimization
 * Following React best practices
 */
export const ConversationEmptyState = memo(ConversationEmptyStateComponent);
ConversationEmptyState.displayName = 'ConversationEmptyState';

/**
 * Type exports for external usage
 */
export type { ConversationEmptyStateProps };
