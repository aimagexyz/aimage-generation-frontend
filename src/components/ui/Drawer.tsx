import { twMerge } from 'tailwind-merge';

interface DrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
}

export function Drawer({ children, isOpen, onClose, side = 'right' }: DrawerProps) {
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={onClose} />}
      <div
        className={twMerge(
          'fixed top-0 z-50 h-full w-80 bg-background p-4 shadow-lg transition-transform duration-300 ease-in-out',
          side === 'left' ? 'left-0' : 'right-0',
          isOpen && 'translate-x-0',
          !isOpen && (side === 'left' ? '-translate-x-full' : 'translate-x-full'),
        )}
      >
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
          &times;
        </button>
        {children}
      </div>
    </>
  );
}
