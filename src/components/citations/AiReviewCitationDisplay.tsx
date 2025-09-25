import { CitationImageThumbnail, type CitationImageThumbnailProps } from './CitationImageThumbnail';
import { CitationSourceDisplay } from './CitationSourceDisplay';

export interface AiReviewCitationDisplayProps {
  referenceImages?: string[]; // S3路径数组，不是直接的URL
  referenceSource?: string;
  onViewImageCitation: CitationImageThumbnailProps['onViewImageCitation']; // Re-use the type from thumbnail props
}

export function AiReviewCitationDisplay({
  referenceImages,
  referenceSource,
  onViewImageCitation,
}: AiReviewCitationDisplayProps) {
  const hasImages = referenceImages && referenceImages.length > 0;
  const hasSource = !!referenceSource;

  if (!hasImages && !hasSource) {
    return null;
  }

  return (
    <div className="w-full mt-2 pt-1.5 border-t border-border/60 border-dashed">
      <p className="text-xs font-medium text-muted-foreground mb-0.5">引用元:</p>
      {hasImages && (
        <div className="w-full mt-1 grid grid-cols-4 gap-2 py-1.5">
          {referenceImages?.map((s3Path, index) => (
            <CitationImageThumbnail
              key={`${s3Path}-${index}`}
              imageUrl={s3Path} // 传递S3路径，组件内部会转换为可访问的URL
              sourceText={referenceSource} // Pass referenceSource as sourceText
              index={index}
              onViewImageCitation={onViewImageCitation}
            />
          ))}
        </div>
      )}
      {referenceSource && <CitationSourceDisplay source={referenceSource} />}
    </div>
  );
}
