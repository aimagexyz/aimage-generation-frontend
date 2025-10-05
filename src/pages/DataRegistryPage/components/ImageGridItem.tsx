import { FileImage, FileText } from 'lucide-react';

import { LazyImage } from '@/components/ui/LazyImage';

interface ProjectItem {
  id: string;
  filename: string;
  image_url: string;
  content_type: string;
  source_type?: string;
}

interface ImageGridItemProps {
  item: ProjectItem;
  index: number;
  onOpenPreview: (index: number) => void;
  isTiffFile: (filename: string, contentType?: string) => boolean;
}

export function ImageGridItem({ item, index, onOpenPreview, isTiffFile }: ImageGridItemProps) {
  return (
    <div key={item.id} className="group break-inside-avoid mb-6">
      <div
        className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-slate-700 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenPreview(index);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpenPreview(index);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`画像を拡大表示: ${item.filename}`}
      >
        {/* PDF来源标记 */}
        {item.source_type === 'pdf_extracted' && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <div className="flex items-center justify-center w-6 h-6 bg-gray-600/95 text-white rounded-full backdrop-blur-sm shadow-sm border-2 border-white/50 group-hover:scale-110 transition-transform duration-200">
              <FileText className="h-3 w-3" />
            </div>
          </div>
        )}
        {isTiffFile(item.image_url, item.content_type) ? (
          <div className="w-full aspect-square flex flex-col items-center justify-center bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-8">
            <div className="relative">
              <FileImage className="h-16 w-16 mb-4" />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                <span className="text-xs font-bold text-white">T</span>
              </div>
            </div>
            <span className="text-sm font-bold tracking-wider">TIFF FILE</span>
            <span className="text-xs opacity-75 mt-1">高品質画像形式</span>
          </div>
        ) : (
          <LazyImage
            src={item.image_url}
            alt={item.filename}
            className="w-full aspect-square"
            imageClassName="object-contain group-hover:scale-105 pointer-events-none"
            skeletonClassName="animate-pulse"
          />
        )}
      </div>
    </div>
  );
}
