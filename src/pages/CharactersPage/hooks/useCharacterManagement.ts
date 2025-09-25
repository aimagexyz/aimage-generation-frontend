import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type CharacterCreate,
  type CharacterDetail,
  charactersService,
  type CharacterUpdate,
} from '@/api/charactersService';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreateCharacter,
  useListCharacters,
  useUpdateCharacter,
  useUploadCharacterImage,
} from '@/hooks/useCharacters';

// Types for component state
export interface NewCharacterData {
  name: string;
  description: string;
  alias: string;
  features: string;
}

export interface EditCharacterData {
  name?: string;
  description?: string;
  alias?: string;
  features?: string;
}

export function useCharacterManagement(projectId: string) {
  // State management
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<'all' | 'with-image' | 'without-image'>('all');
  const [editCharacter, setEditCharacter] = useState<CharacterUpdate>({});
  const [newCharacter, setNewCharacter] = useState<Partial<CharacterCreate>>({
    name: '',
    description: '',
    alias: '',
    features: '',
  });

  const { toast } = useToast();

  // Data fetching
  const { data: characters = [], isLoading } = useListCharacters(projectId);
  const { mutate: uploadImage, isPending: isUploading } = useUploadCharacterImage();
  const { mutate: createCharacter, isPending: isCreating } = useCreateCharacter();
  const { mutate: updateCharacter, isPending: isUpdating } = useUpdateCharacter();

  // Helper functions
  const hasImage = useCallback((character: CharacterDetail) => {
    // Check if character has a valid image URL or image path
    return !!(
      (character.image_url && character.image_url.trim() !== '') ||
      (character.image_path && character.image_path.trim() !== '')
    );
  }, []);

  const getStatusText = useCallback((status: string) => {
    return status === 'processed' ? '処理済み' : '未処理';
  }, []);

  // Computed values
  const characterImageUrls = useMemo(() => {
    const urls: Record<string, string> = {};
    characters.forEach((character) => {
      if (!character.id) {
        return;
      }

      // Prefer backend-provided image_url, fallback to API URL if needed
      if (character.image_url) {
        urls[character.id] = character.image_url;
      } else if (character.image_path) {
        // Only construct URL if we have an image_path but no image_url
        urls[character.id] = charactersService.getCharacterImageUrl(character.id, projectId);
      } else {
        urls[character.id] = '';
      }
    });
    return urls;
  }, [characters, projectId]);

  const selectedCharacterImageUrl = useMemo(() => {
    if (!selectedCharacter?.id) {
      return '';
    }

    // Prefer backend-provided image_url, fallback to API URL if needed
    if (selectedCharacter.image_url) {
      return selectedCharacter.image_url;
    } else if (selectedCharacter.image_path) {
      // Only construct URL if we have an image_path but no image_url
      return charactersService.getCharacterImageUrl(selectedCharacter.id, projectId);
    }

    return '';
  }, [selectedCharacter, projectId]);

  // Filtered and searched characters
  const filteredCharacters = useMemo(() => {
    let filtered = characters;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (character) =>
          character.name.toLowerCase().includes(query) ||
          character.description?.toLowerCase().includes(query) ||
          character.alias?.toLowerCase().includes(query) ||
          character.features?.toLowerCase().includes(query),
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((character) => {
        const hasImg = hasImage(character);
        return filterStatus === 'with-image' ? hasImg : !hasImg;
      });
    }

    return filtered;
  }, [characters, searchQuery, filterStatus, hasImage]);

  // Auto-select first character when data loads
  useEffect(() => {
    const isSelectedInList = selectedCharacter && filteredCharacters.some((c) => c.id === selectedCharacter.id);

    if (filteredCharacters.length > 0 && !isSelectedInList) {
      setSelectedCharacter(filteredCharacters[0]);
    } else if (filteredCharacters.length === 0) {
      setSelectedCharacter(null);
    }
  }, [filteredCharacters, selectedCharacter]);

  // Update selected character when the character data changes (e.g., after image upload)
  useEffect(() => {
    if (selectedCharacter && characters.length > 0) {
      const updatedCharacter = characters.find((c) => c.id === selectedCharacter.id);
      if (updatedCharacter && JSON.stringify(updatedCharacter) !== JSON.stringify(selectedCharacter)) {
        setSelectedCharacter(updatedCharacter);
      }
    }
  }, [characters, selectedCharacter]);

  // Character actions
  const handleSelectCharacter = useCallback((character: CharacterDetail) => {
    setSelectedCharacter(character);
  }, []);

  const handleNewCharacterInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCharacter((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleEditCharacterInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditCharacter((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const resetNewCharacter = useCallback(() => {
    setNewCharacter({
      name: '',
      description: '',
      alias: '',
      features: '',
    });
  }, []);

  const resetEditCharacter = useCallback(() => {
    setEditCharacter({});
  }, []);

  const prepareEditCharacter = useCallback((character: CharacterDetail) => {
    setEditCharacter({
      name: character.name,
      alias: character.alias || undefined,
      description: character.description || undefined,
      features: character.features || undefined,
    });
  }, []);

  const handleCreateCharacter = useCallback(
    (onSuccess?: () => void, onError?: (error: Error) => void) => {
      if (!newCharacter.name?.trim()) {
        toast({
          title: 'キャラクター名は必須です',
          variant: 'destructive',
        });
        return;
      }

      createCharacter(
        {
          projectId,
          data: {
            name: newCharacter.name,
            description: newCharacter.description || undefined,
            alias: newCharacter.alias || undefined,
            features: newCharacter.features || undefined,
            image_path: undefined,
            ip_id: undefined,
            project_id: projectId,
          },
        },
        {
          onSuccess: (data) => {
            toast({
              title: 'キャラクターが作成されました',
              description: `${data.name} が正常に作成されました`,
            });
            resetNewCharacter();
            setSelectedCharacter(data);
            onSuccess?.();
          },
          onError: (error) => {
            toast({
              title: 'キャラクターの作成に失敗しました',
              description: error.message,
              variant: 'destructive',
            });
            onError?.(error);
          },
        },
      );
    },
    [newCharacter, projectId, createCharacter, toast, resetNewCharacter],
  );

  const handleUpdateCharacter = useCallback(
    (onSuccess?: () => void, onError?: (error: Error) => void) => {
      if (!selectedCharacter) {
        return;
      }

      if (!editCharacter.name?.trim()) {
        toast({
          title: 'キャラクター名は必須です',
          variant: 'destructive',
        });
        return;
      }

      updateCharacter(
        {
          characterId: selectedCharacter.id,
          projectId,
          data: editCharacter,
        },
        {
          onSuccess: (data) => {
            toast({
              title: 'キャラクターが更新されました',
              description: `${data.name} が正常に更新されました`,
            });
            resetEditCharacter();
            setSelectedCharacter(data);
            onSuccess?.();
          },
          onError: (error) => {
            toast({
              title: 'キャラクターの更新に失敗しました',
              description: error.message,
              variant: 'destructive',
            });
            onError?.(error);
          },
        },
      );
    },
    [selectedCharacter, editCharacter, projectId, updateCharacter, toast, resetEditCharacter],
  );

  const handleDownloadImage = useCallback(() => {
    if (!selectedCharacter || !hasImage(selectedCharacter)) {
      toast({
        title: '画像のダウンロードに失敗しました',
        description: 'ダウンロード可能な画像がありません',
        variant: 'destructive',
      });
      return;
    }

    try {
      const imageUrl = selectedCharacter.image_url || selectedCharacterImageUrl;
      if (!imageUrl) {
        toast({
          title: '画像のダウンロードに失敗しました',
          description: '画像URLが見つかりません',
          variant: 'destructive',
        });
        return;
      }

      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${selectedCharacter.name}_character_image`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: '画像のダウンロードを開始しました',
        description: `${selectedCharacter.name}の画像をダウンロード中です`,
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: '画像のダウンロードに失敗しました',
        description: 'ダウンロード中にエラーが発生しました',
        variant: 'destructive',
      });
    }
  }, [selectedCharacter, hasImage, selectedCharacterImageUrl, toast]);

  return {
    // State
    selectedCharacter,
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    filterStatus,
    setFilterStatus,
    editCharacter,
    newCharacter,

    // Data
    characters,
    isLoading,
    filteredCharacters,
    characterImageUrls,
    selectedCharacterImageUrl,

    // Mutations
    uploadImage,
    isUploading,
    isCreating,
    isUpdating,

    // Helper functions
    hasImage,
    getStatusText,

    // Actions
    handleSelectCharacter,
    handleNewCharacterInputChange,
    handleEditCharacterInputChange,
    resetNewCharacter,
    resetEditCharacter,
    prepareEditCharacter,
    handleCreateCharacter,
    handleUpdateCharacter,
    handleDownloadImage,
  };
}
