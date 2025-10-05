type ClipInfo = {
  startTime?: number;
  endTime?: number;
};

export function seekToStart<T extends HTMLVideoElement>(
  element: T | null | undefined,
  clip: ClipInfo,
  needPlay = false,
) {
  if (!element) {
    return;
  }
  if (element.readyState < HTMLMediaElement.HAVE_METADATA) {
    // Wait for metadata to be loaded
    element.currentTime = 0;
  }
  const { startTime = 0, endTime = 0 } = clip;
  if (endTime >= element.duration || startTime >= element.duration) {
    // Clip is longer than video
    element.currentTime = 0;
  } else if (endTime) {
    // Clip has end time
    element.currentTime = startTime;
  } else {
    // Clip has no end time
    element.currentTime = 0;
  }
  if (needPlay && element.paused) {
    element.play().catch(() => undefined);
  }
}
