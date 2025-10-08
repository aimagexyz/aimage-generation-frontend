import { useState } from 'react';

import { ChatPanel } from './components/ChatPanel';
import { StructuredInstructionModal } from './components/modals/StructuredInstructionModal';
import { ImageGenProvider } from './contexts/ImageGenContext';
import { useImageGen } from './hooks/useImageGen';

export default function ReferenceGenerationPage() {
  const [isStructuredModalOpen, setIsStructuredModalOpen] = useState(false);

  const imageGen = useImageGen();

  return (
    <ImageGenProvider value={imageGen}>
      <div className="flex h-full flex-row p-4 md:p-6 lg:p-8 gap-4 overflow-hidden bg-gray-50 dark:bg-gray-950">
        <div className="flex-1 flex flex-col min-w-0">
          <ChatPanel onOpenStructuredModal={() => setIsStructuredModalOpen(true)} />
        </div>

      </div>

      <StructuredInstructionModal
        isOpen={isStructuredModalOpen}
        onClose={() => setIsStructuredModalOpen(false)}
        onConfirm={imageGen.setStructuredSelections}
        initialSelections={imageGen.structuredSelections}
      />
    </ImageGenProvider>
  );
}
