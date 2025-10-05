import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import { formatDate } from 'date-fns';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LuBot,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuMessageSquare,
  LuPen,
  LuPin,
  LuPinOff,
  LuTrash2,
  LuX,
} from 'react-icons/lu';

import { fetchApi } from '@/api/client';
import { type components } from '@/api/schemas';
import { Button } from '@/components/ui/Button';
import { CitationIcon, CitationPopover } from '@/components/ui/CitationPopover';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/Dialog';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { UserAvatarNameLabel } from '@/components/UserAvatarNameLabel';
import { useAsset } from '@/hooks/useAsset';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import { blinkElement } from '@/utils/blinkElement';

import { useSubtask } from '../useSubtask';
import { ColorCommentRenderer, isColorComment, parseColorComment } from './ColorCommentRenderer';
import { SubtaskCommentInput } from './SubtaskCommentInput';

type SubtaskAnnotation = components['schemas']['SubtaskAnnotation'] & {
  citations?: import('@/components/ui/CitationPopover').CitationData[];
};

type Props = {
  readonly subtaskId: string;
  readonly annotation: SubtaskAnnotation;
  readonly subAnnotation?: React.ReactNode;
  readonly order: number;
};

function CommentText({ text }: { readonly text: string | null | undefined }) {
  const [isTextExpanded, setIsTextExpanded] = useState(false);

  if (!text) {
    return null;
  }

  const isTooLong = text.length > 100;

  if (!isTooLong) {
    return <>{text}</>;
  }

  if (!isTextExpanded) {
    return (
      <>
        {`${text.substring(0, 100)}...`}
        <Button
          variant="link"
          size="xs"
          className="h-auto p-0 ml-1 text-blue-500 align-baseline"
          onClick={() => setIsTextExpanded(true)}
        >
          Show more <LuChevronDown className="inline w-3 h-3 ml-1" />
        </Button>
      </>
    );
  }

  return (
    <>
      {text}
      <Button
        variant="link"
        size="xs"
        className="h-auto p-0 ml-1 text-blue-500 align-baseline"
        onClick={() => setIsTextExpanded(false)}
      >
        Show less <LuChevronUp className="inline w-3 h-3 ml-1" />
      </Button>
    </>
  );
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export function SubtaskComment(props: Props) {
  const { subtaskId, annotation, order, subAnnotation } = props;

  const {
    refetchAnnotations,
    createNewAnnotation,
    updateAnnotation,
    deleteAnnotation,
    isUpdatingAnnotation,
    isDeletingAnnotation,
  } = useSubtask(subtaskId);

  const { assetUrl } = useAsset(annotation.attachment_image_url || '');

  const { isShowSolvedAnnotations } = useLayoutStore();

  const [comment, setComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // 编辑相关状态
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(() => {
    // For color comments, only show the user text part for editing
    if (isColorComment(annotation.text)) {
      const parsed = parseColorComment(annotation.text || '');
      return parsed?.userText || '';
    }
    return annotation.text || '';
  });

  const { mutate: markAnnotationAsSolved } = useMutation({
    mutationFn: async ({ annotationId, solved = true }: { annotationId: string; solved?: boolean }) => {
      await fetchApi({
        url: `/api/v1/subtasks/${subtaskId}/annotations/${annotationId}/solved` as '/api/v1/subtasks/{subtask_id}/annotations/{annotation_id}/solved',
        method: 'patch',
        params: { solved },
      });
    },
    onSuccess: async () => {
      await refetchAnnotations();
    },
  });

  const handleCommentSubmit = () => {
    if (!comment.trim()) {
      return;
    }
    createNewAnnotation({
      id: crypto.randomUUID(),
      type: 'comment',
      text: comment,
      timestamp: new Date().toLocaleString(),
      to: annotation.id,
    });

    setComment('');
    setShowCommentInput(false);
  };

  // 处理编辑保存
  const handleEditSave = () => {
    const trimmedText = editText.trim();

    // For color comments, we need to reconstruct the full comment text
    if (isColorComment(annotation.text)) {
      const parsed = parseColorComment(annotation.text || '');
      if (parsed) {
        // Check if the user text actually changed
        if (trimmedText === (parsed.userText || '')) {
          setIsEditing(false);
          return;
        }

        // Reconstruct the color comment without userText in JSON
        const { userText, ...updatedColorData } = parsed.colorData;

        const commentText = [`[COLOR_COMPARISON:${JSON.stringify(updatedColorData)}]`, trimmedText]
          .filter(Boolean)
          .join('\n\n');

        updateAnnotation({
          annotationId: annotation.id,
          text: commentText,
        });
      }
    } else {
      // Regular comment handling
      if (!trimmedText || trimmedText === annotation.text) {
        setIsEditing(false);
        return;
      }

      updateAnnotation({
        annotationId: annotation.id,
        text: trimmedText,
      });
    }

    setIsEditing(false);
  };

  // 处理编辑取消
  const handleEditCancel = () => {
    // For color comments, restore only the user text part
    if (isColorComment(annotation.text)) {
      const parsed = parseColorComment(annotation.text || '');
      setEditText(parsed?.userText || '');
    } else {
      setEditText(annotation.text || '');
    }
    setIsEditing(false);
  };

  // 处理删除
  const handleDelete = () => {
    if (confirm('このコメントを削除しますか？この操作は取り消せません。')) {
      deleteAnnotation(annotation.id);
    }
  };

  // 检查用户是否可以编辑/删除此注释
  const canEditDelete = annotation.author && annotation.type !== 'ai-annotation' && annotation.type !== 'ai-comment';

  if (!isShowSolvedAnnotations && annotation.solved) {
    return null;
  }

  const isAnnotationType = annotation.type === 'annotation' || annotation.type === 'ai-annotation';

  return (
    <TooltipProvider delayDuration={300}>
      <div
        key={annotation.id}
        id={'annotation-' + annotation.id}
        className={clsx(
          'p-1.5 rounded mb-1 relative text-xs',
          isAnnotationType ? 'bg-green-100/30 border border-green-500' : 'border bg-primary-foreground',
        )}
      >
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 头像和用户名 */}
            {annotation.author ? (
              <UserAvatarNameLabel size="small" userId={annotation.author} className="flex-shrink-0" />
            ) : (
              <div className="flex items-center flex-shrink-0 gap-1 text-muted-foreground">
                <LuBot className="size-4" />
                <span className="text-sm">AI</span>
                {annotation.citations && annotation.citations.length > 0 && (
                  <CitationPopover citation={annotation.citations[0]}>
                    <CitationIcon />
                  </CitationPopover>
                )}
              </div>
            )}

            {/* 标记信息（仅对标记类型显示） */}
            {isAnnotationType && (
              <button
                type="button"
                className="flex items-center flex-shrink-0 gap-1 text-xs text-left text-green-500 transition-opacity cursor-pointer hover:opacity-80 active:opacity-60"
                onClick={(e) => {
                  e.preventDefault();

                  if (
                    annotation.start_at !== undefined &&
                    annotation.start_at !== null &&
                    annotation.end_at !== undefined &&
                    annotation.end_at !== null
                  ) {
                    // is video annotation
                    const videoElement = document.getElementById('annotation-video-player') as HTMLVideoElement;
                    if (videoElement) {
                      // seek to the start of the annotation
                      videoElement.currentTime = annotation.start_at;
                    }

                    const audioElement = document.getElementById('annotation-audio-player') as HTMLAudioElement;
                    if (audioElement) {
                      // seek to the start of the annotation
                      audioElement.currentTime = annotation.start_at;
                    }
                  }

                  const element = document.getElementById('annotation-mark-' + annotation.id);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    element.focus();
                    blinkElement(element);
                  }
                }}
              >
                {annotation.solved ? <LuPinOff className="size-3" /> : <LuPin className="size-3" />}
                <span className={clsx('font-bold', !!annotation.solved && 'line-through')}>マーク{order}</span>
                {annotation.start_at !== undefined && annotation.start_at !== null && (
                  <span>（{annotation.start_at.toFixed(2)}秒）</span>
                )}
              </button>
            )}

            {/* 时间戳 */}
            {!!annotation.timestamp && (
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDate(annotation.timestamp, 'yyyy-MM-dd HH:mm')}
              </span>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex">
            {!!subAnnotation && (
              <Button
                type="button"
                title="コメント"
                size="xs"
                variant="ghost"
                className="rounded-full p-1.5 h-auto"
                onClick={() => setShowCommentInput((prev) => !prev)}
              >
                <LuMessageSquare className="size-3.5" />
              </Button>
            )}

            {/* 编辑和删除按钮 - 只有注释作者且非AI注释可以使用 */}
            {canEditDelete && !isEditing && (
              <>
                <Button
                  type="button"
                  title="編集"
                  size="xs"
                  variant="ghost"
                  className="rounded-full p-1.5 h-auto text-blue-600"
                  onClick={() => setIsEditing(true)}
                  disabled={isDeletingAnnotation}
                >
                  <LuPen className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  title="削除"
                  size="xs"
                  variant="ghost"
                  className="rounded-full p-1.5 h-auto text-red-600"
                  onClick={handleDelete}
                  disabled={isDeletingAnnotation || isUpdatingAnnotation}
                >
                  <LuTrash2 className="size-3.5" />
                </Button>
              </>
            )}

            {canEditDelete && isEditing && (
              <>
                <Button
                  type="button"
                  title="保存"
                  size="xs"
                  variant="ghost"
                  className="rounded-full p-1.5 h-auto text-green-500 hover:text-green-600"
                  onClick={handleEditSave}
                  disabled={isUpdatingAnnotation}
                >
                  <LuCheck className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  title="キャンセル"
                  size="xs"
                  variant="ghost"
                  className="rounded-full p-1.5 h-auto"
                  onClick={handleEditCancel}
                >
                  <LuX className="size-3.5" />
                </Button>
              </>
            )}

            {/* 解决标记按钮 */}
            {isAnnotationType && annotation.type !== 'ai-annotation' && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    title={annotation.solved ? '未解決に戻す' : '解決済みにする'}
                    size="xs"
                    variant="ghost"
                    className="rounded-full p-1.5 h-auto"
                  >
                    {annotation.solved ? (
                      <LuPinOff className="size-3.5 text-red-500" />
                    ) : (
                      <LuPin className="size-3.5 text-green-500" />
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <h3 className="text-lg font-bold">
                    {annotation.solved ? 'このマークを未解決に戻しますか？' : 'このマークを解決済みにしますか？'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {annotation.solved
                      ? 'この操作により、マークは再び「未解決」として表示されます。'
                      : 'この操作により、マークは「解決済み」として扱われます。解決済みのマークは、フィルター設定で非表示にすることができます。'}
                  </p>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const closeButton = document.querySelector('.dialog-close');
                        if (closeButton instanceof HTMLElement) {
                          closeButton.click();
                        }
                      }}
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={() => {
                        markAnnotationAsSolved({ annotationId: annotation.id, solved: !annotation.solved });
                        const closeButton = document.querySelector('.dialog-close');
                        if (closeButton instanceof HTMLElement) {
                          closeButton.click();
                        }
                      }}
                    >
                      {annotation.solved ? '未解決に戻す' : '解決済みにする'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* 评论内容 */}
        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 text-sm border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              maxLength={5000}
              placeholder="コメント内容を入力..."
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">{editText.length}/5000</span>
              <div className="flex gap-2">
                <Button size="xs" variant="outline" onClick={handleEditCancel} disabled={isUpdatingAnnotation}>
                  <LuX className="size-3 mr-1" />
                  キャンセル
                </Button>
                <Button
                  size="xs"
                  onClick={handleEditSave}
                  disabled={
                    !editText.trim() ||
                    (isColorComment(annotation.text)
                      ? editText === (parseColorComment(annotation.text || '')?.userText || '')
                      : editText === annotation.text) ||
                    isUpdatingAnnotation
                  }
                >
                  {isUpdatingAnnotation ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm break-words">
            {/* Check if this is a color comment */}
            {isColorComment(annotation.text) ? (
              (() => {
                const parsed = parseColorComment(annotation.text || '');
                if (parsed) {
                  return <ColorCommentRenderer colorData={parsed.colorData} userText={parsed.userText} />;
                }
                return <CommentText text={annotation.text} />;
              })()
            ) : (
              <CommentText text={annotation.text} />
            )}
          </div>
        )}

        {/* 附件图片 */}
        {annotation.attachment_image_url && (
          <div className="mt-2">
            <img
              src={assetUrl}
              alt="attachment"
              className="object-cover rounded border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ width: '80px', height: '60px' }}
              onClick={() => setIsImageModalOpen(true)}
            />
          </div>
        )}

        {/* 回复输入框 */}
        {showCommentInput && (
          <SubtaskCommentInput comment={comment} setComment={setComment} onCommentSubmit={handleCommentSubmit} />
        )}

        {!!subAnnotation && <div className="mt-1.5">{subAnnotation}</div>}
      </div>

      {/* 图片放大模态框 - 使用 createPortal */}
      {isImageModalOpen &&
        assetUrl &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="comment-image-preview-title"
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <div
              className="relative flex flex-col max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="comment-image-preview-title" className="sr-only">
                Comment Image Preview
              </h3>
              <div className="relative flex items-center justify-center flex-grow min-h-0">
                <img
                  src={assetUrl}
                  alt="Comment Image Preview"
                  className="max-w-full max-h-full object-contain"
                  style={{ maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100vh - 8rem)' }}
                />
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  onClick={() => setIsImageModalOpen(false)}
                  aria-label="Close image preview"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </TooltipProvider>
  );
}
