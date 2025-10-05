import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';

import { Button } from '@/components/ui/Button';

import { UnifiedPDFPreviewModal } from './components/UnifiedPDFPreviewModal';
import { AnnotationInput } from './FrameAnnotation/AnnotationInput';
import { AnnotationLayer } from './FrameAnnotation/AnnotationLayer';
import { type Annotation, useFrameAnnotation } from './FrameAnnotation/useFrameAnnotation';

const TOOL_CURSOR_CLASSES: Record<string, string> = { cursor: 'cursor-auto', text: 'cursor-text' };

type Props = {
  videoUrl: string;
  annotations: Annotation[];
  onAnnotationCreate: (annotation: Annotation) => void;
  isSubmitting?: boolean;
};

export function VideoAnnotation(props: Props) {
  const { videoUrl, annotations, onAnnotationCreate, isSubmitting } = props;

  const [showControls, setShowControls] = useState(true);
  const [showFrameControls, setShowFrameControls] = useState(false);
  const [scale, setScale] = useState(1);
  const [padding, setPadding] = useState({ x: 0, y: 0 });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const frameRate = 30; // Default frame rate for frame stepping

  const {
    setStartPos,
    setCurrentRect,
    setIsShowingAnnotationInput,
    isShowingAnnotationInput,

    startPos,
    currentTool,
    currentRect,
    currentColor,
    currentText,
  } = useFrameAnnotation();

  const containerRef = useRef<HTMLDivElement>(null);

  const handleAnnotationStart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (startPos || currentTool === 'cursor' || isShowingAnnotationInput || !containerRef.current) {
      return;
    }
    videoRef.current?.pause();
    setShowControls(false);

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPos({ x, y });
    setCurrentRect({
      x,
      y,
      width: 0,
      height: 0,
    });

    if (currentTool === 'text') {
      setIsShowingAnnotationInput(true);
    }
  };

  const handleAnnotationMove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!startPos || currentTool === 'cursor' || isShowingAnnotationInput || !containerRef.current) {
      return;
    }

    setShowControls(false);

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentRect(
      currentTool === 'arrow'
        ? {
            x: startPos.x,
            y: startPos.y,
            width: x - startPos.x,
            height: y - startPos.y,
          }
        : {
            x: x < startPos.x ? x : startPos.x,
            y: y < startPos.y ? y : startPos.y,
            width: Math.abs(x - startPos.x),
            height: Math.abs(y - startPos.y),
          },
    );
  };

  const handleAnnotationEnd = () => {
    setIsShowingAnnotationInput(true);
    setShowControls(true);
  };

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFrameForward = useCallback(() => {
    if (videoRef.current && !videoRef.current.ended) {
      videoRef.current.pause();
      const frameTime = 1 / frameRate;
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + frameTime, videoRef.current.duration);
    }
  }, [frameRate]);

  const handleFrameBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      const frameTime = 1 / frameRate;
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - frameTime, 0);
    }
  }, [frameRate]);

  const handleSkipForward = useCallback(() => {
    if (videoRef.current && !videoRef.current.ended) {
      videoRef.current.pause();
      const frameTime = 5 / frameRate; // Skip 5 frames
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + frameTime, videoRef.current.duration);
    }
  }, [frameRate]);

  const handleSkipBackward = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      const frameTime = 5 / frameRate; // Skip 5 frames
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - frameTime, 0);
    }
  }, [frameRate]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if the target is the video or its container
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === '.') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSkipForward();
        } else {
          handleFrameForward();
        }
      } else if (e.key === 'ArrowLeft' || e.key === ',') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSkipBackward();
        } else {
          handleFrameBackward();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleFrameForward, handleFrameBackward, handleSkipForward, handleSkipBackward]);

  useEffect(() => {
    const videoElement = videoRef.current;
    const containerElement = containerRef.current;

    const onResize = () => {
      if (
        !videoElement ||
        videoElement.readyState < 1 ||
        !containerElement ||
        videoElement.videoWidth === 0 ||
        videoElement.videoHeight === 0
      ) {
        return;
      }

      const naturalW = videoElement.videoWidth;
      const naturalH = videoElement.videoHeight;

      const containerW = containerElement.offsetWidth;
      const containerH = containerElement.offsetHeight;

      const newScale = Math.min(containerW / naturalW, containerH / naturalH);
      setScale(newScale);

      const actualRenderedW = naturalW * newScale;
      const actualRenderedH = naturalH * newScale;
      setPadding({
        x: (containerW - actualRenderedW) / 2,
        y: (containerH - actualRenderedH) / 2,
      });
    };

    onResize();

    window.addEventListener('resize', onResize);
    videoElement?.addEventListener('loadedmetadata', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      videoElement?.removeEventListener('loadedmetadata', onResize);
    };
  }, [videoUrl]);

  const handlePDFPreview = () => {
    setIsGeneratingPDF(true);
    setIsPDFPreviewOpen(true);
  };

  const hasTimestampAnnotations = annotations.some((ann) => ann.start_at !== undefined && ann.start_at !== null);

  return (
    <div className="relative w-full h-full p-4">
      {/* PDF Preview Button */}
      {hasTimestampAnnotations && (
        <div className="absolute top-6 right-6 z-10">
          <Button
            onClick={handlePDFPreview}
            disabled={isGeneratingPDF}
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <FileText className="w-4 h-4 mr-2" />
            レポート作成
          </Button>
        </div>
      )}

      {/* Frame Control Overlay - Compact with Skip */}
      {showFrameControls && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1">
          {/* Skip 5 Frames Backward Button */}
          <Button
            onClick={handleSkipBackward}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 px-2 h-7 text-xs font-bold"
            title="Skip 5 Frames Back (Shift+←)"
          >
            «
          </Button>

          {/* Frame Backward Button */}
          <Button
            onClick={handleFrameBackward}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 p-1 h-7 w-7"
            title="Previous Frame (← or ,)"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          {/* Frame Forward Button */}
          <Button
            onClick={handleFrameForward}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 p-1 h-7 w-7"
            title="Next Frame (→ or .)"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Skip 5 Frames Forward Button */}
          <Button
            onClick={handleSkipForward}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 px-2 h-7 text-xs font-bold"
            title="Skip 5 Frames Forward (Shift+→)"
          >
            »
          </Button>
        </div>
      )}

      <div
        ref={containerRef}
        className="relative w-full h-full flex items-center justify-center bg-black/5 rounded-lg overflow-hidden"
        onMouseDown={handleAnnotationStart}
        onMouseUp={handleAnnotationEnd}
        onMouseMove={handleAnnotationMove}
      >
        <video
          id="annotation-video-player"
          ref={videoRef}
          src={videoUrl}
          controls={showControls}
          className={twMerge(
            'select-none w-full h-full object-contain',
            TOOL_CURSOR_CLASSES[currentTool] || 'cursor-crosshair',
          )}
          draggable="false"
          onClick={(e) => {
            e.preventDefault();
          }}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);
          }}
          onPlay={() => {
            setShowFrameControls(false);
          }}
          onPause={() => {
            setShowFrameControls(true);
          }}
          onLoadedMetadata={() => {
            setShowFrameControls(true);
          }}
        />
        {/* Annotation layers */}
        <AnnotationLayer
          id="current-drawing"
          scale={1}
          offset={{ x: 0, y: 0 }}
          text={currentText}
          rect={currentRect}
          color={currentColor}
          tool={(() => {
            if (currentTool === 'search') {
              return 'rect';
            }
            if (currentTool === 'color-picker') {
              return 'cursor';
            }
            return currentTool;
          })()}
          timestamp={new Date().toISOString()}
        />
        <AnnotationInput
          scale={scale}
          padding={padding}
          containerRef={containerRef}
          isSubmitting={isSubmitting}
          onAnnotationCreate={(annotation) => {
            const videoElement = videoRef.current;
            if (!videoElement) {
              return;
            }
            const startAt = videoElement.currentTime || 0;
            // 持续时间为1秒
            const endAt = startAt + 1 > videoElement.duration ? videoElement.duration : startAt + 1;

            const newAnnotation = { ...annotation, start_at: startAt, end_at: endAt };
            onAnnotationCreate(newAnnotation);
          }}
          onSearchRequest={(rect) => {
            // 视频注释暂时不支持搜索功能
            console.log('Video search not implemented yet', rect);
          }}
        />
        {/* Existing annotations */}
        {annotations
          .filter((item) => item.type === 'annotation' || item.type === 'ai-annotation')
          .map(({ id, text, rect, color, tool, timestamp, solved, start_at, end_at, attachment_image_url }, i) => (
            <AnnotationLayer
              key={id}
              order={i + 1}
              scale={scale}
              offset={padding}
              id={id}
              text={text}
              rect={rect}
              color={color}
              tool={tool}
              timestamp={timestamp}
              solved={solved}
              start_at={start_at}
              end_at={end_at}
              currentTime={currentTime}
              attachment_image_url={attachment_image_url}
            />
          ))}
      </div>

      {/* PDF Preview Modal */}
      <UnifiedPDFPreviewModal
        isOpen={isPDFPreviewOpen}
        onClose={() => {
          setIsPDFPreviewOpen(false);
          setIsGeneratingPDF(false);
        }}
        mediaUrl={videoUrl}
        mediaType="video"
        annotations={annotations}
        subtaskName="ビデオレビュー"
        onGenerationStart={() => setIsGeneratingPDF(true)}
        onGenerationComplete={() => setIsGeneratingPDF(false)}
      />
    </div>
  );
}
