import { useCallback, useState } from 'react';

export function useModalManagement() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const openEditModal = useCallback(() => {
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  return {
    // State
    isCreateModalOpen,
    isEditModalOpen,

    // Actions
    openCreateModal,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    setIsCreateModalOpen,
    setIsEditModalOpen,
  };
}
