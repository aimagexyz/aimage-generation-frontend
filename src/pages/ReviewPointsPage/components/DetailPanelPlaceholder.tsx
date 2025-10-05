import { FileText } from 'lucide-react';

interface DetailPanelPlaceholderProps {
  text?: string;
}

export function DetailPanelPlaceholder({ text = 'アイテムを選択してください' }: DetailPanelPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center bg-background">
      <div className="p-8 border-2 border-dashed rounded-full border-border">
        <FileText className="w-12 h-12 text-muted-foreground" />
      </div>
      <p className="mt-4 font-medium text-muted-foreground">{text}</p>
    </div>
  );
}
