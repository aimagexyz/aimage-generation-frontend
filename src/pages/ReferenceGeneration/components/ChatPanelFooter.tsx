import { useImageGenContext } from '../contexts/ImageGenContext';
import { PromptInput } from './PromptInput';

interface ChatPanelFooterProps {
  onOpenStructuredModal: () => void;
}

export function ChatPanelFooter({ onOpenStructuredModal }: ChatPanelFooterProps) {
  const {
    isLoading,
    prompt,
    setPrompt,
    detailedSettings,
    setDetailedSettings,
    structuredSelections,
    handleGenerate,
    handleRemoveSelection,
    promptImages,
    addPromptImages,
    removePromptImage,
    clearPromptImages,
  } = useImageGenContext();
  return (
    <div className="flex-shrink-0 p-4 border-t border-black/5 dark:border-white/5 bg-gray-50/50 dark:bg-gray-900/20">
      <PromptInput
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={(p) => {
          void handleGenerate(p);
        }}
        isLoading={isLoading}
        onOpenStructuredModal={onOpenStructuredModal}
        structuredSelections={structuredSelections}
        onSelectionRemove={handleRemoveSelection}
        detailedSettings={detailedSettings}
        onSettingsChange={setDetailedSettings}
        promptImages={promptImages}
        onAddImages={addPromptImages}
        onRemoveImage={removePromptImage}
        onClearImages={clearPromptImages}
      />
    </div>
  );
}
