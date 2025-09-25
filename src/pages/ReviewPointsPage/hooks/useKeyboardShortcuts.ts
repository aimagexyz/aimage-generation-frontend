import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  searchInputRef: React.RefObject<HTMLInputElement>;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function useKeyboardShortcuts({ searchInputRef, onSelectAll, onDeselectAll }: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Focus search on Ctrl/Cmd + F
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      // Select all on Ctrl/Cmd + A
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault();
        onSelectAll();
      }

      // Clear selection on Escape
      if (event.key === 'Escape') {
        onDeselectAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchInputRef, onSelectAll, onDeselectAll]);
}
