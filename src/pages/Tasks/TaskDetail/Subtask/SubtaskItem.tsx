import {
  LuCheck,
  LuClock,
  LuFile,
  LuFileAudio2,
  LuFileImage,
  LuFileSpreadsheet,
  LuFileText,
  LuFileType2,
  LuFileVideo2,
  LuX,
} from 'react-icons/lu';
import { twMerge } from 'tailwind-merge';

import { type components } from '@/api/schemas';
import { useAsset } from '@/hooks/useAsset';

// Enhanced thumbnail display with better visual hierarchy
function ThumbnailDisplay({
  taskType,
  s3Path,
  altText,
}: {
  taskType: components['schemas']['SubtaskOut']['task_type'] | undefined;
  s3Path?: string | null;
  altText: string;
}) {
  const { assetUrl } = useAsset(s3Path || '');

  const icon = TaskTypeIcon[taskType || 'file'];

  // Enhanced image display for picture tasks
  if (taskType === 'picture' && assetUrl) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-muted/50 to-muted rounded-lg overflow-hidden group-hover:shadow-md transition-all duration-200">
        <img
          src={assetUrl}
          alt={altText}
          className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
      </div>
    );
  }

  // Enhanced video display for video tasks
  if (taskType === 'video' && assetUrl) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-muted/50 to-muted rounded-lg overflow-hidden group-hover:shadow-md transition-all duration-200">
        <video
          src={assetUrl}
          muted
          playsInline
          preload="metadata"
          className="object-cover w-full h-full transition-transform duration-200 group-hover:scale-105"
          onMouseEnter={(e) => {
            console.log('Video hover enter - attempting to play');
            e.currentTarget.play().catch((error) => {
              console.warn('Video play failed:', error);
            });
          }}
          onMouseLeave={(e) => {
            console.log('Video hover leave - pausing and resetting');
            e.currentTarget.pause();
            e.currentTarget.currentTime = 0; // Reset to beginning
          }}
          onLoadedMetadata={(e) => {
            console.log('Video metadata loaded');
            e.currentTarget.currentTime = 0; // Show first frame
          }}
          onError={(e) => {
            console.error('Video load error');
            e.currentTarget.style.display = 'none';
          }}
          onCanPlay={() => {
            console.log('Video can play');
          }}
        >
          ご利用のブラウザはビデオタグをサポートしていません。
        </video>
      </div>
    );
  }

  // Enhanced icon display with better styling
  return (
    <div className="w-full h-full bg-gradient-to-br from-muted/30 to-muted/60 rounded-lg flex items-center justify-center group-hover:from-muted/40 group-hover:to-muted/70 transition-all duration-200">
      <div className="transform scale-110 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
        {icon}
      </div>
    </div>
  );
}

// Enhanced status indicator component
function StatusIndicator({ status }: { status: components['schemas']['SubtaskOut']['status'] }) {
  const statusConfig = {
    accepted: {
      icon: LuCheck,
      className: 'bg-green-500 text-white',
      label: '承認済み',
    },
    denied: {
      icon: LuX,
      className: 'bg-red-500 text-white',
      label: '却下済み',
    },
    pending: {
      icon: LuClock,
      className: 'bg-yellow-500 text-white',
      label: '保留中',
    },
  };

  if (!status || status === 'pending') {
    return null;
  }

  const config = statusConfig[status];
  if (!config) {
    return null;
  }

  const Icon = config.icon;

  return (
    <div
      className={twMerge(
        'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2 border-background',
        config.className,
      )}
      title={config.label}
    >
      <Icon className="w-2.5 h-2.5" />
    </div>
  );
}

const TaskTypeIcon = {
  file: <LuFile size={20} className="w-5 h-5" />,
  text: <LuFileType2 size={20} className="w-5 h-5" />,
  picture: <LuFileImage size={20} className="w-5 h-5" />,
  video: <LuFileVideo2 size={20} className="w-5 h-5" />,
  audio: <LuFileAudio2 size={20} className="w-5 h-5" />,
  word: <LuFileText size={20} className="w-5 h-5" />,
  excel: <LuFileSpreadsheet size={20} className="w-5 h-5" />,
};

type Props = {
  subtask: components['schemas']['SubtaskOut'];
  isActive: boolean;
  onSelect: (subtaskId: string) => void;
};

export function SubtaskItem(props: Props) {
  const { subtask, isActive, onSelect } = props;

  return (
    <li
      className={twMerge(
        'group relative cursor-pointer rounded-xl border-2 flex flex-col items-center justify-center p-1.5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
        'w-16 h-16 flex-shrink-0',
        // Active state styling
        isActive
          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
          : 'border-border/40 hover:border-primary/50 hover:bg-accent/30',
        // Status-based border colors
        subtask.status === 'accepted' && !isActive && 'border-green-400 bg-green-50/50',
        subtask.status === 'denied' && !isActive && 'border-red-400 bg-red-50/50',
      )}
      onClick={() => onSelect(subtask.id)}
      title={subtask.name}
      data-active={isActive}
    >
      <div className="relative w-full h-full">
        <ThumbnailDisplay
          taskType={subtask.task_type}
          s3Path={subtask.content?.s3_path}
          altText={subtask.name || 'Subtask thumbnail'}
        />
        <StatusIndicator status={subtask.status} />
      </div>

      {/* Subtle task type indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </li>
  );
}
