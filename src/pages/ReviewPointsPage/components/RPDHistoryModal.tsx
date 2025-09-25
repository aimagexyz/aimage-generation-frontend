import { Calendar, Clock, Eye, FileText, Sparkles, Tags } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { cn } from '@/utils/utils';

import type {
  ReviewPointDefinitionSchema,
  ReviewPointDefinitionVersionInDB,
} from '../../../types/ReviewPointDefinition';

interface RPDHistoryModalProps {
  rpd: ReviewPointDefinitionSchema | null;
  isOpen: boolean;
  onClose: () => void;
}

interface VersionItemProps {
  version: ReviewPointDefinitionVersionInDB;
  isActive: boolean;
  isLatest: boolean;
  rpdKey?: string;
}

/**
 * Individual version item component
 */
function VersionItem({ version, isActive, isLatest, rpdKey }: VersionItemProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border transition-all duration-200',
        isActive
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-sm'
          : 'bg-gray-50 border-gray-200 hover:bg-gray-100',
      )}
    >
      {/* Version Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold',
              isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-white',
            )}
          >
            v{version.version}
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 text-sm">{version.title}</h4>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              {formatDate(version.created_at)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isActive && (
            <Badge variant="default" className="bg-green-600 text-white text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              Active
            </Badge>
          )}

          {isLatest && !isActive && (
            <Badge variant="outline" className="text-xs">
              Latest
            </Badge>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Reference Images */}
      {version.reference_images && version.reference_images.length > 0 && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
          <FileText className="w-3 h-3" />
          {version.reference_images.length} reference image{version.reference_images.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Expandable Description */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-gray-700">AI Description:</span>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{version.description_for_ai}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tag List */}
      {rpdKey === 'general_ng_review' && version.tag_list && version.tag_list.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <Tags className="w-3 h-3" />
                タグリスト:
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {version.tag_list.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * RPD History Modal Component
 */
export default function RPDHistoryModal({ rpd, isOpen, onClose }: RPDHistoryModalProps): JSX.Element | null {
  if (!isOpen || !rpd) {
    return null;
  }

  // Sort versions by version number (highest first)
  const sortedVersions = [...rpd.versions].sort((a, b) => b.version - a.version);
  const latestVersion = sortedVersions[0];

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Clock className="w-5 h-5 text-purple-600" />
              Version History
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Track changes and evolution of &quot;{rpd.current_version?.title || 'Untitled RPD'}&quot; over time
            </DialogDescription>
          </DialogHeader>

          <Separator />

          {/* RPD Basic Info */}
          <div className="px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{rpd.current_version?.title || 'Untitled RPD'}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {rpd.key.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <span>•</span>
                  <span>
                    {sortedVersions.length} version{sortedVersions.length !== 1 ? 's' : ''}
                  </span>
                  <span>•</span>
                  <span className={rpd.is_active ? 'text-green-600' : 'text-gray-500'}>
                    {rpd.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Version List */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {sortedVersions.map((version) => (
                <VersionItem
                  key={version.version}
                  version={version}
                  isActive={rpd.current_version_num === version.version}
                  isLatest={version.version === latestVersion?.version}
                  rpdKey={rpd.key}
                />
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-6 pt-4 border-t bg-gray-50/50">
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
