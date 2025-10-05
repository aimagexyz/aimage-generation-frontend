import { useImageGenContext } from '../contexts/ImageGenContext';
import { ChatPanelFooter } from './ChatPanelFooter';
import { ChatPanelHeader } from './ChatPanelHeader';
import { ConversationEmptyState } from './ConversationEmptyState';
import { ConversationLayout } from './ConversationLayout';

interface ChatPanelProps {
  onOpenStructuredModal: () => void;
}

export function ChatPanel({ onOpenStructuredModal }: ChatPanelProps) {
  const { isLoading, conversation } = useImageGenContext();

  return (
    <div className="flex flex-1 flex-col h-full min-w-0 bg-white dark:bg-gray-900 md:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <ChatPanelHeader />
      <ConversationLayout
        className="flex-1 min-h-0"
        isEmpty={conversation.length === 0 && !isLoading}
        emptyState={<ConversationEmptyState />}
        scrollDependencies={[conversation.length, isLoading]}
        conversation={conversation}
        isLoading={isLoading}
      />
      <ChatPanelFooter onOpenStructuredModal={onOpenStructuredModal} />
    </div>
  );
}
