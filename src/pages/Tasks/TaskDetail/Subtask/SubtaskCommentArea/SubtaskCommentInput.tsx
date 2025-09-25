import { forwardRef, useState } from 'react';
import { LuBot, LuLoader, LuSend } from 'react-icons/lu';
import { twMerge } from 'tailwind-merge';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';

type Props = {
  className?: string;
  comment: string;
  setComment: (v: string) => void;
  onCommentSubmit: (type: 'comment' | 'ai-comment') => void;
  isSubmitting?: boolean;
  isInModal?: boolean;
};

export const SubtaskCommentInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>((props, ref) => {
  const { className, comment, setComment, onCommentSubmit, isSubmitting, isInModal = false } = props;
  const [isCanSubmit, setIsCanSubmit] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!comment || !isCanSubmit || isSubmitting) {
      return;
    }

    if (isInModal) {
      // 在模态框中使用 Ctrl+Enter 或 Cmd+Enter 发送
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onCommentSubmit('comment');
      }
    } else {
      // 在普通模式下使用 Enter 发送
      if (e.key === 'Enter') {
        onCommentSubmit('comment');
      }
    }
  };

  if (isInModal) {
    return (
      <div className={twMerge('flex flex-col gap-3', className)}>
        <TextArea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          className="min-h-[120px] resize-none"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="コメントを入力してください... (Ctrl+Enter または Cmd+Enter で送信)"
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsCanSubmit(false)}
          onCompositionEnd={() => setIsCanSubmit(true)}
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onCommentSubmit('ai-comment')}
            disabled={!comment || isSubmitting}
            className="gap-1 px-3 py-2"
          >
            {isSubmitting ? <LuLoader className="size-4 animate-spin" /> : <LuBot className="size-4" />}
            <span className={isSubmitting ? 'ml-1.5' : ''}>AIに質問</span>
          </Button>
          <Button
            onClick={() => onCommentSubmit('comment')}
            disabled={!comment || isSubmitting}
            className="gap-1 px-3 py-2"
          >
            {isSubmitting ? <LuLoader className="size-4 animate-spin" /> : <LuSend className="size-4" />}
            <span className={isSubmitting ? 'ml-1.5' : ''}>送信</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={twMerge('flex items-center gap-2', className)}>
      <Input
        ref={ref as React.Ref<HTMLInputElement>}
        type="text"
        className="flex-1"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="コメントを入力"
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsCanSubmit(false)}
        onCompositionEnd={() => setIsCanSubmit(true)}
        disabled={isSubmitting}
      />
      <Button
        onClick={() => onCommentSubmit('comment')}
        disabled={!comment || isSubmitting}
        className="gap-1 px-3 py-2"
      >
        {isSubmitting ? <LuLoader className="size-4 animate-spin" /> : <LuSend className="size-4" />}
        <span className={isSubmitting ? 'ml-1.5' : ''}>送信</span>
      </Button>
      <Button
        variant="outline"
        onClick={() => onCommentSubmit('ai-comment')}
        disabled={!comment || isSubmitting}
        className="gap-1 px-3 py-2"
      >
        {isSubmitting ? <LuLoader className="size-4 animate-spin" /> : <LuBot className="size-4" />}
        <span className={isSubmitting ? 'ml-1.5' : ''}>AIに質問</span>
      </Button>
    </div>
  );
});

SubtaskCommentInput.displayName = 'SubtaskCommentInput';
