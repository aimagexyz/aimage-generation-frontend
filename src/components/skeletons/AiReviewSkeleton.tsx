import { Bot } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

const loadingMessages = [
  'コンテンツを分析中...',
  '特徴を抽出しています...',
  '詳細な分析を開始します...',
  '潜在的リスクを評価中...',
  'ルールと照合しています...',
  '複数のモデルで監修中...',
  '最終チェックを実行中...',
  'レポートを生成しています...',
  'まもなく結果を表示します...',
];

function AiReviewSkeletonProto() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0); // Progress state from 0 to 100

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 4000); // Change message every 4 seconds

    // Progress bar animation
    // Aim for ~95% progress over 90 seconds, updating every 100ms for smoothness
    const targetProgress = 95; // Let it aim for 95%
    const animationDuration = 90000; // 90 seconds in milliseconds
    const updateInterval = 100; // 100ms
    const steps = animationDuration / updateInterval;
    const increment = targetProgress / steps;

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += increment;
      if (currentProgress >= targetProgress) {
        setProgress(targetProgress);
        clearInterval(progressInterval);
      } else {
        setProgress(currentProgress);
      }
    }, updateInterval);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col h-full p-4">
      {/* Header: Title */}
      <div className="flex items-center justify-between pb-2">
        <div className="w-1/3 rounded h-7 bg-muted animate-pulse" /> {/* "AI監修結果" placeholder */}
      </div>

      {/* Summary Placeholders */}
      <div className="mb-3">
        {/* Risk Badges Placeholder */}
        <div className="flex flex-wrap items-center mb-2 text-xs gap-x-3 gap-y-1">
          <div className="w-20 h-5 rounded bg-muted animate-pulse" />
          <div className="w-20 h-5 rounded bg-muted animate-pulse" />
          <div className="w-20 h-5 rounded bg-muted animate-pulse" />
        </div>
        {/* Timestamp Placeholder */}
        <div className="w-1/2 h-4 mb-3 rounded bg-muted animate-pulse" />
      </div>

      {/* Informative Loading Message with Dynamic Text and Animated Bot */}
      <div className="flex items-center p-3 mb-1 text-blue-700 border border-blue-200 rounded-md bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300">
        <Bot className="w-8 h-8 mr-3 text-blue-500 shrink-0 animate-pulse" />
        <div className="flex flex-col w-full">
          <span className="text-sm font-medium transition-opacity duration-500 ease-in-out">
            {loadingMessages[currentMessageIndex]}
          </span>
          <span className="mt-1 text-xs">AI監修が進行中です。完了まで1〜2分程度かかる場合があります。</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2.5 mb-4 dark:bg-muted/70">
        <div
          className="bg-blue-500 h-2.5 rounded-full transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Detected Elements Collapsible Trigger Placeholder */}
      <div className="pt-3 mb-2">
        <div className="flex items-center justify-between w-full p-2 rounded-md bg-muted/60 animate-pulse">
          <div className="w-2/5 h-5 rounded bg-muted" /> {/* "AIが検出した要素 (X)" placeholder */}
          <div className="w-4 h-4 rounded bg-muted" /> {/* ChevronsUpDown icon placeholder */}
        </div>
      </div>

      {/* Sections Loop Placeholder (e.g., 2 sections) */}
      <div className="flex-1 overflow-y-auto">
        {[0, 1].map((sectionIndex) => (
          <div key={sectionIndex} className="p-3 mt-4 border rounded-md first:mt-0 bg-muted/30 animate-pulse">
            {/* Section Title Placeholder */}
            <div className="w-3/5 h-5 mb-3 rounded bg-muted/70" />
            {/* Findings Loop Placeholder (e.g., 1 finding per section for skeleton) */}
            {[0].map((findingIndex) => (
              <div key={findingIndex} className="p-3 mt-3 border rounded-md bg-muted/50 animate-pulse">
                {/* Description Placeholder (2 lines) */}
                <div className="h-4 bg-muted/70 rounded w-full mb-1.5" />
                <div className="w-5/6 h-4 mb-2 rounded bg-muted/70" />

                {/* Severity Badge Placeholder */}
                <div className="w-1/4 h-5 mt-1 mb-2 rounded bg-muted/70" />

                {/* Suggestion Placeholder (optional, so maybe a bit lighter) */}
                <div className="h-3.5 bg-muted/60 rounded w-4/5 mb-2" />

                {/* Citation Placeholder (simplified) */}
                <div className="mt-2 pt-1.5 border-t border-dashed border-border/50">
                  <div className="h-3 bg-muted/60 rounded w-1/3 mb-1.5" /> {/* "引用元:" placeholder */}
                  {/* No image placeholder in skeleton to keep it cleaner, source text is enough */}
                  <div className="w-3/4 h-3 rounded bg-muted/60" /> {/* Source placeholder */}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export const AiReviewSkeleton = memo(AiReviewSkeletonProto);
AiReviewSkeleton.displayName = 'AiReviewSkeleton';
