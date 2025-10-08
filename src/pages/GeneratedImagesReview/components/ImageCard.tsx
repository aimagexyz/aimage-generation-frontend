import { Calendar, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

import { GeneratedReferenceResponse } from '../hooks/useGeneratedImages';

interface ImageCardProps {
  readonly image: GeneratedReferenceResponse;
  readonly onClick: () => void;
}

export function ImageCard({ image, onClick }: ImageCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const formattedDate = new Date(image.created_at).toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });

  const tags = Object.values(image.tags).filter(
    (tag): tag is string => typeof tag === 'string'
  );

  return (
    <Card
      className="group relative cursor-pointer overflow-hidden border-0 bg-muted/50 transition-all hover:shadow-2xl hover:scale-[1.02]"
      onClick={onClick}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted to-muted/50">
        {/* Image */}
        <img
          src={image.image_url}
          alt={image.base_prompt}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`h-full w-full object-cover transition-all duration-500 ${
            imageLoaded ? 'scale-100 blur-0' : 'scale-110 blur-sm'
          } group-hover:scale-110`}
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
            {/* Prompt preview */}
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
              <p className="line-clamp-2 text-sm text-white font-medium">
                {image.base_prompt}
              </p>
            </div>
            
            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 3).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs bg-white/20 text-white backdrop-blur-sm border-white/30"
                  >
                    {tag}
                  </Badge>
                ))}
                {tags.length > 3 && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-white/20 text-white backdrop-blur-sm border-white/30"
                  >
                    +{tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm px-2 py-1 text-xs text-white">
          <Calendar className="h-3 w-3" />
          {formattedDate}
        </div>
      </div>
    </Card>
  );
}

