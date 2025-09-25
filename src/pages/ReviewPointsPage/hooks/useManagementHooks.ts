import { useCallback, useEffect, useState } from 'react';

/**
 * Hook for managing modal state in management tabs
 */
export function useManagementModals() {
  const [modals, setModals] = useState<Record<string, boolean>>({});

  const openModal = useCallback((modalKey: string) => {
    setModals((prev) => ({ ...prev, [modalKey]: true }));
  }, []);

  const closeModal = useCallback((modalKey: string) => {
    setModals((prev) => ({ ...prev, [modalKey]: false }));
  }, []);

  const isModalOpen = useCallback(
    (modalKey: string) => {
      return modals[modalKey] || false;
    },
    [modals],
  );

  return {
    openModal,
    closeModal,
    isModalOpen,
  };
}

/**
 * Hook for managing item selection in management tabs
 */
export function useManagementSelection<T>(items: T[], getItemId: (item: T) => string, enableAutoSelection = true) {
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  // Auto-select first item when items change
  useEffect(() => {
    if (!enableAutoSelection) {
      return;
    }

    const currentlySelectedExists = selectedItem && items.some((item) => getItemId(item) === getItemId(selectedItem));

    if (items.length > 0 && !currentlySelectedExists) {
      setSelectedItem(items[0]);
    } else if (items.length === 0) {
      setSelectedItem(null);
    }
  }, [items, selectedItem, getItemId, enableAutoSelection]);

  return {
    selectedItem,
    setSelectedItem,
  };
}
