import clsx from 'clsx';

import { Avatar, AvatarFallback, AvatarImage } from './ui/Avatar';

type Props = {
  userId?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  className?: string;
  size?: 'small' | 'medium' | 'large';
};

export function UserAvatarNameLabel(props: Props) {
  const { userName, userAvatar, className, size = 'medium' } = props;

  // If userName is not provided, don't render anything
  if (!userName) {
    return null;
  }

  return (
    <div className={className}>
      <Avatar
        className={clsx({
          'size-8 inline-block mr-1': size === 'medium',
          'size-6 inline-block mr-0.5': size === 'small',
          'size-12 inline-block mr-1.5': size === 'large',
        })}
        title={userName || 'Avatar'}
      >
        <AvatarImage alt={userName || 'User'} src={userAvatar || undefined} />
        <AvatarFallback>{userName?.charAt(0) || '?'}</AvatarFallback>
      </Avatar>
      <span
        className={clsx({
          'text-sm': size === 'medium' || size === 'small',
          'text-base': size === 'large',
        })}
      >
        {userName}
      </span>
    </div>
  );
}
