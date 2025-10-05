import { useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

import { type Annotation } from './FrameAnnotation/useFrameAnnotation';

type Props = {
  audioUrl: string;
  onAnnotationCreate: (annotation: Annotation) => void;
};

export function AudioAnnotation(props: Props) {
  const { audioUrl, onAnnotationCreate } = props;

  const audioRef = useRef<HTMLVideoElement>(null);

  const addAnnotation = (text: string) => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }
    const startAt = audioElement.currentTime || 0;
    // 持续时间为1秒
    const endAt = startAt + 1 > audioElement.duration ? audioElement.duration : startAt + 1;

    onAnnotationCreate({
      id: crypto.randomUUID(),
      text,
      start_at: startAt,
      end_at: endAt,
      type: 'annotation',
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <audio
        id="annotation-audio-player"
        ref={audioRef}
        src={audioUrl}
        draggable="false"
        onClick={(e) => {
          e.preventDefault();
        }}
        className="w-full"
        controls
      />
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const { text } = Object.fromEntries(formData.entries());
          if (typeof text !== 'string') {
            return;
          }
          addAnnotation(text);
          // clear input
          e.currentTarget.reset();
        }}
      >
        <Input name="text" placeholder="現在の再生時間にコメントを残す" required />
        <Button type="submit">コメント</Button>
      </form>
    </div>
  );
}
