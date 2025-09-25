import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { isValidUrl } from '@/utils/utils';

export interface CitationSourceDisplayProps {
  source?: string; // Made optional as source might not always exist
}

export function CitationSourceDisplay({ source }: CitationSourceDisplayProps) {
  if (!source) {
    return null;
  }

  return (
    <div className="text-xs text-muted-foreground/90 mt-1.5 flex items-start gap-1.5">
      <span className="font-medium shrink-0">ソース:</span>
      {isValidUrl(source) ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <a
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            className="underline break-all hover:text-primary"
            title={source}
            onClick={(e) => e.stopPropagation()}
          >
            {source}
          </a>
          <Button variant="ghost" size="icon" className="w-5 h-5 shrink-0" asChild onClick={(e) => e.stopPropagation()}>
            <a href={source} target="_blank" rel="noopener noreferrer" aria-label="Open source in new tab">
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        </div>
      ) : (
        <span className="break-words">{source}</span>
      )}
    </div>
  );
}
