import { AnimatePresence, motion } from 'framer-motion';
import { useCallback } from 'react';
import { LuPlus } from 'react-icons/lu';
import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useAuth } from '@/hooks/useAuth';

import { BatchUploadModal } from './components/BatchUploadModal';
import { CharacterDetailPanel } from './components/CharacterDetailPanel';
import { CharacterListPanel } from './components/CharacterListPanel';
import { CreateCharacterModal } from './components/CreateCharacterModal';
import { EditCharacterModal } from './components/EditCharacterModal';
import { UploadImageModal } from './components/UploadImageModal';
import { ViewImageModal } from './components/ViewImageModal';
import { useCharacterManagement } from './hooks/useCharacterManagement';
import { useFileManagement } from './hooks/useFileManagement';
import { useModalManagement } from './hooks/useModalManagement';

type Params = {
  projectId: string;
};

type Document = {
  id: string;
  file_name: string;
  created_at: string;
};

type Project = {
  id: string;
  created_at: string;
  name: string;
  owner_org: {
    name: string;
  };
  documents?: Document[];
};

function CharactersPage() {
  const { projectId } = useParams<Params>();
  const { projects } = useAuth();
  const project = projects?.items?.find((p) => p.id === projectId) as Project | undefined;
  // Initialize hooks
  const characterManagement = useCharacterManagement(projectId || '');
  const modalManagement = useModalManagement();
  const fileManagement = useFileManagement(characterManagement.selectedCharacter, projectId || '');

  // Helper functions
  const getStatusText = useCallback((hasImg: boolean) => {
    if (hasImg) {
      return '処理済み';
    }
    return '未処理';
  }, []);

  const getStatusVariant = useCallback((hasImg: boolean) => {
    if (hasImg) {
      return 'default';
    }
    return 'secondary';
  }, []);

  // Event handlers
  const handleCreateCharacterClick = useCallback(() => {
    modalManagement.openCreateModal();
  }, [modalManagement]);

  const closeCreateModal = useCallback(() => {
    modalManagement.closeCreateModal();
    characterManagement.resetNewCharacter();
  }, [modalManagement, characterManagement]);

  const closeEditModal = useCallback(() => {
    modalManagement.closeEditModal();
    characterManagement.resetEditCharacter();
  }, [modalManagement, characterManagement]);

  const handleCreateCharacter = useCallback(() => {
    characterManagement.handleCreateCharacter(closeCreateModal);
  }, [characterManagement, closeCreateModal]);

  const handleUpdateCharacter = useCallback(() => {
    characterManagement.handleUpdateCharacter(closeEditModal);
  }, [characterManagement, closeEditModal]);

  if (!project || !projectId) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <p className="pt-4 text-center text-muted-foreground">プロジェクトが見つかりません</p>
        <p className="pt-2 text-center text-muted-foreground">
          選択中のプロジェクトが存在しないか、アクセス権がないか、URLが正しくありません。
        </p>
        <div className="flex justify-center mt-4">
          <Link to="/">
            <Button variant="outline">ホームページへ戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <TooltipProvider>
        <div
          className="flex flex-col h-full bg-gradient-to-br from-background to-muted/20"
          role="main"
          aria-label="キャラクター管理"
        >
          <motion.div
            className="px-6 py-4 border-b bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">キャラクター管理</h1>
                <p className="text-sm text-muted-foreground">
                  キャラクター情報の管理と画像の一元管理
                  <span className="ml-2 font-medium text-primary">
                    {characterManagement.filteredCharacters.length} / {characterManagement.characters.length} 件
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCreateCharacterClick}
                  size="sm"
                  className="shadow-sm"
                  aria-label="新しいキャラクターを作成"
                >
                  <LuPlus className="w-4 h-4 mr-2" />
                  キャラクター追加
                </Button>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-1 overflow-hidden">
            <CharacterListPanel
              isLoading={characterManagement.isLoading}
              filteredCharacters={characterManagement.filteredCharacters}
              selectedCharacter={characterManagement.selectedCharacter}
              characterImageUrls={characterManagement.characterImageUrls}
              searchQuery={characterManagement.searchQuery}
              setSearchQuery={characterManagement.setSearchQuery}
              filterStatus={characterManagement.filterStatus}
              setFilterStatus={characterManagement.setFilterStatus}
              handleSelectCharacter={characterManagement.handleSelectCharacter}
              handleCreateCharacterClick={handleCreateCharacterClick}
              hasImage={characterManagement.hasImage}
              getStatusText={getStatusText}
              getStatusVariant={getStatusVariant}
            />
            <CharacterDetailPanel
              selectedCharacter={characterManagement.selectedCharacter}
              characters={characterManagement.characters}
              projectId={projectId}
              selectedCharacterImageUrl={characterManagement.selectedCharacterImageUrl}
              hasImage={characterManagement.hasImage}
              fileManagement={fileManagement}
              getStatusVariant={getStatusVariant}
              getStatusText={getStatusText}
              handleSelectCharacter={characterManagement.handleSelectCharacter}
            />
          </div>

          {/* Hidden file inputs and Modals here */}
          <input
            ref={fileManagement.fileInputRef}
            type="file"
            accept="image/*,.ai"
            onChange={fileManagement.handleFileSelect}
            className="hidden"
            id="character-image-upload"
          />
          <input
            ref={fileManagement.batchFileInputRef}
            type="file"
            accept="image/*,.ai"
            multiple
            onChange={fileManagement.handleBatchFileSelect}
            className="hidden"
            id="character-batch-image-upload"
          />
          <input
            type="file"
            accept=".pdf"
            onChange={fileManagement.handlePdfFileSelect}
            className="hidden"
            id="character-pdf-upload"
          />

          <AnimatePresence>
            {fileManagement.isImageModalOpen && (
              <ViewImageModal
                isOpen={fileManagement.isImageModalOpen}
                onOpenChange={fileManagement.setIsImageModalOpen}
                selectedCharacter={characterManagement.selectedCharacter}
                selectedCharacterImageUrl={characterManagement.selectedCharacterImageUrl}
                imageZoom={fileManagement.imageZoom}
                setImageZoom={fileManagement.setImageZoom}
                imageRotation={fileManagement.imageRotation}
                setImageRotation={fileManagement.setImageRotation}
                handleDownloadImage={characterManagement.handleDownloadImage}
                hasImage={characterManagement.hasImage}
              />
            )}

            {modalManagement.isCreateModalOpen && (
              <CreateCharacterModal
                isOpen={modalManagement.isCreateModalOpen}
                onOpenChange={closeCreateModal}
                newCharacter={characterManagement.newCharacter}
                onNewCharacterChange={characterManagement.handleNewCharacterInputChange}
                handleCreateCharacter={handleCreateCharacter}
                isCreating={characterManagement.isCreating}
              />
            )}

            {modalManagement.isEditModalOpen && (
              <EditCharacterModal
                isOpen={modalManagement.isEditModalOpen}
                onOpenChange={closeEditModal}
                editCharacter={characterManagement.editCharacter}
                onEditCharacterChange={characterManagement.handleEditCharacterInputChange}
                handleUpdateCharacter={handleUpdateCharacter}
                isUpdating={characterManagement.isUpdating}
              />
            )}

            {fileManagement.isUploadModalOpen && (
              <UploadImageModal
                isOpen={fileManagement.isUploadModalOpen}
                onOpenChange={fileManagement.closeUploadModal}
                selectedFile={fileManagement.selectedFile}
                setSelectedFile={fileManagement.setSelectedFile}
                selectedCharacter={characterManagement.selectedCharacter}
                handleUploadImage={fileManagement.handleUploadImage}
                isUploading={fileManagement.isUploading}
                dragActive={fileManagement.dragActive}
                handleDrag={fileManagement.handleDrag}
                handleDrop={fileManagement.handleDrop}
                handleFileButtonClick={fileManagement.handleFileButtonClick}
              />
            )}

            {fileManagement.isBatchUploadModalOpen && (
              <BatchUploadModal
                isOpen={fileManagement.isBatchUploadModalOpen}
                onOpenChange={fileManagement.closeBatchUploadModal}
                selectedFiles={fileManagement.selectedFiles}
                onFilesChange={fileManagement.setSelectedFiles}
                onUpload={fileManagement.handleBatchUploadImages}
                onRemoveFile={fileManagement.removeFileFromBatch}
                isUploading={fileManagement.isBatchUploading}
                uploadProgress={fileManagement.uploadProgress}
                uploadStatus={fileManagement.uploadStatus}
                characterName={characterManagement.selectedCharacter?.name}
              />
            )}
          </AnimatePresence>
        </div>
      </TooltipProvider>
    </div>
  );
}

export default CharactersPage;
