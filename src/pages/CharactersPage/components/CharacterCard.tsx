import { motion } from 'framer-motion';
import { LuClock, LuImage } from 'react-icons/lu';

import type { CharacterDetail } from '@/api/charactersService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/utils/utils';

interface CharacterCardProps {
  character: CharacterDetail;
  isSelected: boolean;
  imageUrl: string;
  hasImage: boolean;
  onSelect: (character: CharacterDetail) => void;
  getStatusText: (hasImg: boolean) => string;
  getStatusVariant: (hasImg: boolean) => 'default' | 'secondary';
}

export function CharacterCard({
  character,
  isSelected,
  imageUrl,
  hasImage,
  onSelect,
  getStatusText,
  getStatusVariant,
}: CharacterCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Card
        className={cn(
          'group cursor-pointer transition-all duration-200 overflow-hidden',
          'backdrop-blur-sm shadow-sm hover:shadow-md',
          isSelected
            ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/50 shadow-lg ring-2 ring-primary/20'
            : 'bg-card/80 border-border/50 hover:bg-card hover:border-border hover:shadow-lg',
        )}
        onClick={() => onSelect(character)}
      >
        <CardContent className="p-3">
          <div className="flex items-start gap-3">
            <motion.div whileHover={{ scale: 1.1 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
              <Avatar className="flex-shrink-0 w-10 h-10 shadow-md">
                <AvatarImage src={character.image_url || imageUrl} alt={character.name} />
                <AvatarFallback className="text-sm font-medium bg-primary text-primary-foreground">
                  {character.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </motion.div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium truncate">{character.name}</h3>
                <Badge
                  variant={getStatusVariant(hasImage)}
                  className={cn(
                    'text-xs shadow-sm flex-shrink-0',
                    hasImage ? 'bg-green-50 text-green-700 border-green-200' : '',
                  )}
                >
                  {getStatusText(hasImage)}
                </Badge>
              </div>
              {character.alias && <p className="text-xs truncate text-muted-foreground">別名: {character.alias}</p>}
              <p className="text-xs text-muted-foreground line-clamp-1">{character.description || '説明なし'}</p>
              <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <LuClock className="w-3 h-3" />
                  {new Date(character.updated_at).toLocaleDateString('ja-JP')}
                </span>
                {hasImage && (
                  <span className="flex items-center gap-1">
                    <LuImage className="w-3 h-3 text-green-600" />
                    <span className="hidden sm:inline">画像</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
