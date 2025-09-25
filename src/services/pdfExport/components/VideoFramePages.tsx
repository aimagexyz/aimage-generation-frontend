import React from 'react';

import { type AnnotationDetail, type SubtaskDetail, type TaskDetail } from '../types';
import { VideoFrameService } from '../videoFrameService';
import { VideoFramePage } from './VideoFramePage';

interface VideoFramePagesProps {
  videoUrl: string;
  annotations: AnnotationDetail[];
  subtaskInfo: SubtaskDetail;
  taskInfo: TaskDetail;
}

/**
 * Video Frame Pages Component
 * KISS: Simple iteration over timestamps
 * DRY: Reuses VideoFramePage for each frame
 */
export function VideoFramePages({ videoUrl, annotations }: VideoFramePagesProps) {
  const [frameData, setFrameData] = React.useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadFrames = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Validate video format first
        if (!VideoFrameService.isVideoFormatSupported(videoUrl)) {
          throw new Error('Unsupported video format');
        }

        // Extract frames for annotations
        const frameResults = await VideoFrameService.extractAnnotationFrames(videoUrl, annotations);

        // Convert results to Map format
        const frameMap = new Map<number, string>();
        frameResults.forEach((result) => {
          frameMap.set(result.timestamp, result.frameData);
        });

        setFrameData(frameMap);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load video frames';
        console.error('Failed to load video frames:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    if (videoUrl && annotations.length > 0) {
      void loadFrames();
    } else {
      setIsLoading(false);
    }
  }, [videoUrl, annotations]);

  // Show loading state - PDF generation will wait
  if (isLoading) {
    return null;
  }

  // Show error state
  if (error) {
    console.error('VideoFramePages error:', error);
    return null; // Fail silently in PDF generation
  }

  // Group annotations by timestamp
  const annotationsByTimestamp = new Map<number, AnnotationDetail[]>();
  annotations.forEach((annotation) => {
    if (annotation.start_at !== undefined && annotation.start_at !== null) {
      const timestamp = annotation.start_at;
      if (!annotationsByTimestamp.has(timestamp)) {
        annotationsByTimestamp.set(timestamp, []);
      }
      annotationsByTimestamp.get(timestamp)!.push(annotation);
    }
  });

  // Generate pages for each timestamp that has both frame data and annotations
  const timestamps = Array.from(annotationsByTimestamp.keys())
    .filter((timestamp) => frameData.has(timestamp)) // Only include timestamps with successfully extracted frames
    .sort((a, b) => a - b);

  if (timestamps.length === 0) {
    console.warn('No video frames available for PDF generation');
    return null;
  }

  return (
    <>
      {timestamps.map((timestamp, index) => {
        const frame = frameData.get(timestamp);
        const timestampAnnotations = annotationsByTimestamp.get(timestamp) || [];

        // Skip if no frame data (safety check)
        if (!frame) {
          console.warn(`No frame data for timestamp ${timestamp}`);
          return null;
        }

        // For simplicity, just take the first annotation at this timestamp
        const primaryAnnotation = timestampAnnotations[0];

        return (
          <VideoFramePage
            key={timestamp}
            frameData={frame}
            annotation={primaryAnnotation}
            timestamp={timestamp}
            pageNumber={index + 2} // +2 because title page is 1, and we start from 2
          />
        );
      })}
    </>
  );
}
