import { Calendar, Check, Copy, Download, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Separator } from '@/components/ui/Separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/use-toast';

import { GeneratedReferenceResponse } from '../hooks/useGeneratedImages';

interface ImageDetailModalProps {
  readonly image: GeneratedReferenceResponse | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function ImageDetailModal({
  image,
  open,
  onClose,
}: ImageDetailModalProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 2000);
        toast({
          title: 'コピーしました',
          description: `${label}をクリップボードにコピーしました`,
        });
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        toast({
          title: 'コピーに失敗しました',
          description: '手動でテキストをコピーしてください',
          variant: 'destructive',
        });
      });
  };

  const handleDownload = () => {
    if (!image) {
      return;
    }
    const link = document.createElement('a');
    link.href = image.image_url;
    link.download = `generated-image-${image.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: 'ダウンロード開始',
      description: '画像のダウンロードを開始しました',
    });
  };

  if (!image) {
    return null;
  }

  const formattedDate = new Date(image.created_at).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const tags = Object.entries(image.tags).filter(
    ([, value]) => typeof value === 'string'
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">生成画像の詳細</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                ダウンロード
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="preview">プレビュー</TabsTrigger>
              <TabsTrigger value="details">詳細</TabsTrigger>
              <TabsTrigger value="metadata">メタデータ</TabsTrigger>
            </TabsList>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4 mt-6">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-muted/50 to-muted">
                <img
                  src={image.image_url}
                  alt={image.base_prompt}
                  className="w-full object-contain max-h-[60vh]"
                />
              </div>

              {/* Quick Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formattedDate}
                </div>
                {tags.length > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 3).map(([key, value]) => (
                        <Badge key={key} variant="secondary" className="text-xs">
                          {String(value)}
                        </Badge>
                      ))}
                      {tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4 mt-6">
              {/* Base Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">基本プロンプト</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(image.base_prompt, '基本プロンプト')}
                    className="gap-2"
                  >
                    {copiedField === '基本プロンプト' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedField === '基本プロンプト' ? 'コピー済み' : 'コピー'}
                  </Button>
                </div>
                <div className="whitespace-pre-wrap rounded-lg border bg-muted/50 p-4 text-sm">
                  {image.base_prompt}
                </div>
              </div>

              <Separator />

              {/* Enhanced Prompt */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <h3 className="font-semibold">拡張プロンプト</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(image.enhanced_prompt, '拡張プロンプト')
                    }
                    className="gap-2"
                  >
                    {copiedField === '拡張プロンプト' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copiedField === '拡張プロンプト' ? 'コピー済み' : 'コピー'}
                  </Button>
                </div>
                <div className="whitespace-pre-wrap rounded-lg border bg-muted/50 p-4 text-sm">
                  {image.enhanced_prompt}
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-semibold">タグ</h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(([key, value]) => (
                        <Badge key={key} variant="outline" className="gap-2">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Metadata Tab */}
            <TabsContent value="metadata" className="space-y-4 mt-6">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <span className="text-sm font-medium">ID</span>
                    <code className="rounded bg-muted px-2 py-1 text-xs">
                      {image.id}
                    </code>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <span className="text-sm font-medium">生成日時</span>
                    <span className="text-sm">{formattedDate}</span>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <span className="text-sm font-medium">保存パス</span>
                    <code className="rounded bg-muted px-2 py-1 text-xs break-all">
                      {image.image_path}
                    </code>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <span className="text-sm font-medium">画像URL</span>
                    <code className="rounded bg-muted px-2 py-1 text-xs break-all">
                      {image.image_url}
                    </code>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

