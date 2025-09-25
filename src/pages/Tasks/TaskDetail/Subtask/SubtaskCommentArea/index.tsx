import { useEffect, useRef, useState } from 'react';
import { LuCoffee } from 'react-icons/lu';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Switch } from '@/components/ui/Switch';
import { useLayoutStore } from '@/hooks/useLayoutStore';

import { useSubtask } from '../useSubtask';
import { SubtaskComment } from './SubtaskComment';
import { SubtaskCommentInput } from './SubtaskCommentInput';

type Props = {
  subtaskId: string;
  selectedVersion?: number;
  isModalOpen: boolean;
  onModalOpenChange: (isOpen: boolean) => void;
  initialComment?: string;
  onInitialCommentUsed?: () => void;
};

export function SubtaskCommentArea(props: Props) {
  const { subtaskId, selectedVersion, isModalOpen, onModalOpenChange, initialComment, onInitialCommentUsed } = props;

  const [comment, setComment] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { annotations, createNewAnnotation, isCreatingAnnotation } = useSubtask(subtaskId, selectedVersion);
  const { isShowSolvedAnnotations, setIsShowSolvedAnnotations } = useLayoutStore();

  const handleCommentSubmit = (type: 'comment' | 'ai-comment') => {
    if (!comment.trim()) {
      return;
    }
    createNewAnnotation({
      id: crypto.randomUUID(),
      type,
      text: comment,
      timestamp: new Date().toLocaleString(),
    });

    setComment('');
  };

  useEffect(() => {
    if (isModalOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (isModalOpen && initialComment) {
      setComment(initialComment);
      onInitialCommentUsed?.();
    }
  }, [isModalOpen, initialComment, onInitialCommentUsed]);

  return (
    <div className="flex flex-col gap-y-2 h-full">
      {annotations?.length > 0 ? (
        <ScrollArea className="flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-x-2 pr-2 py-1">
            {annotations
              .filter((item) => (item.type === 'annotation' || item.type === 'ai-annotation') && !item.to)
              .map((annotation, i) => (
                <SubtaskComment
                  key={annotation.id}
                  subtaskId={subtaskId}
                  annotation={annotation}
                  order={i + 1}
                  subAnnotation={annotations
                    .filter((item) => item.to === annotation.id)
                    .map((item) => (
                      <SubtaskComment key={item.id} subtaskId={subtaskId} annotation={item} order={i + 1} />
                    ))}
                />
              ))}

            {annotations
              .filter((item) => (item.type === 'comment' || item.type === 'ai-comment') && !item.to)
              .map((annotation, i) => (
                <SubtaskComment
                  key={annotation.id}
                  subtaskId={subtaskId}
                  annotation={annotation}
                  order={i + 1}
                  subAnnotation={annotations
                    .filter((item) => item.to === annotation.id)
                    .map((item) => (
                      <SubtaskComment key={item.id} subtaskId={subtaskId} annotation={item} order={i + 1} />
                    ))}
                />
              ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex-1 min-h-0 text-muted-foreground text-xs flex items-center justify-center">
          <LuCoffee className="size-4 mr-2" />
          コメントがありません
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={onModalOpenChange}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-row items-center justify-between pr-6">
            <DialogTitle>All Comments</DialogTitle>
            <div className="flex items-center space-x-2">
              <Label htmlFor="hide-solved-marks-modal" className="text-xs whitespace-nowrap">
                解決済みのマークを非表示
              </Label>
              <Switch
                id="hide-solved-marks-modal"
                checked={!isShowSolvedAnnotations}
                onCheckedChange={() => setIsShowSolvedAnnotations(!isShowSolvedAnnotations)}
              />
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col gap-y-2 pt-2">
            {annotations?.length > 0 ? (
              <ScrollArea className="flex-1 min-h-0">
                <div className="grid grid-cols-2 gap-x-2 pr-4 py-2">
                  {annotations
                    .filter((item) => (item.type === 'annotation' || item.type === 'ai-annotation') && !item.to)
                    .map((annotation, i) => (
                      <SubtaskComment
                        key={`modal-${annotation.id}`}
                        subtaskId={subtaskId}
                        annotation={annotation}
                        order={i + 1}
                        subAnnotation={annotations
                          .filter((item) => item.to === annotation.id)
                          .map((item) => (
                            <SubtaskComment
                              key={`modal-sub-${item.id}`}
                              subtaskId={subtaskId}
                              annotation={item}
                              order={i + 1}
                            />
                          ))}
                      />
                    ))}

                  {annotations
                    .filter((item) => (item.type === 'comment' || item.type === 'ai-comment') && !item.to)
                    .map((annotation, i) => (
                      <SubtaskComment
                        key={`modal-${annotation.id}`}
                        subtaskId={subtaskId}
                        annotation={annotation}
                        order={i + 1}
                        subAnnotation={annotations
                          .filter((item) => item.to === annotation.id)
                          .map((item) => (
                            <SubtaskComment
                              key={`modal-sub-${item.id}`}
                              subtaskId={subtaskId}
                              annotation={item}
                              order={i + 1}
                            />
                          ))}
                      />
                    ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-muted-foreground text-sm flex-1 flex items-center justify-center">
                <LuCoffee className="size-4 mr-2" />
                コメントがありません
              </div>
            )}
            <div className="px-1 pb-1 pt-2 border-t">
              <SubtaskCommentInput
                ref={inputRef}
                comment={comment}
                setComment={setComment}
                onCommentSubmit={handleCommentSubmit}
                isSubmitting={isCreatingAnnotation}
                isInModal={true}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
