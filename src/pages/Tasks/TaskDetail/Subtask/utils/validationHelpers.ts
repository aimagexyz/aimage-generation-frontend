import type { BoundingBox } from '@/hooks/useBoundingBoxEditor';

import type { ImageDisplayMetrics } from '../ImageAnnotation';

/**
 * 验证渲染前提条件
 */
export function isValidForRendering(
  area: BoundingBox | null | undefined,
  imageNaturalDimensions: { width: number; height: number },
  imageDisplayMetrics: ImageDisplayMetrics,
): area is BoundingBox {
  return !!(
    area &&
    imageNaturalDimensions.width > 0 &&
    imageNaturalDimensions.height > 0 &&
    imageDisplayMetrics &&
    imageDisplayMetrics.scale > 0
  );
}
