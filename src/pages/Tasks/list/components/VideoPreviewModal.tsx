import { Button } from '@/components/ui/Button';
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoName?: string;
}

export function VideoPreviewModal({
  isOpen,
  onClose,
  videoUrl,
  videoName = 'ビデオプレビュー',
}: Readonly<VideoPreviewModalProps>) {
  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] xl:max-w-[50vw] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{videoName}</DialogTitle>
        </DialogHeader>
        <div className="p-4 pt-0">
          {videoUrl ? (
            <video src={videoUrl} controls autoPlay className="w-full max-h-[70vh] rounded bg-black">
              お使いのブラウザはビデオ表示に対応していません。
            </video>
          ) : (
            <p className="text-center text-muted-foreground py-10">ビデオの読み込みに失敗しました。</p>
          )}
        </div>
        <DialogFooter className="p-4 pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              閉じる
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
