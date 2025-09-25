import { motion } from 'framer-motion';
import { LuUser } from 'react-icons/lu';

import type { CharacterDetail } from '@/api/charactersService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

import type { useFileManagement } from '../hooks/useFileManagement';
import { MergedImageManagement } from './CharacterGallery';
import { RPDAssociationTab } from './RPDAssociationTab';

interface CharacterDetailPanelProps {
  selectedCharacter: CharacterDetail | null;
  characters: CharacterDetail[];
  projectId: string;
  selectedCharacterImageUrl: string;
  hasImage: (character: CharacterDetail) => boolean;
  fileManagement: ReturnType<typeof useFileManagement>;
  getStatusVariant: (hasImg: boolean) => 'default' | 'secondary';
  getStatusText: (hasImg: boolean) => string;
  handleSelectCharacter: (character: CharacterDetail) => void;
}

export function CharacterDetailPanel({
  selectedCharacter,
  characters,
  projectId,
  selectedCharacterImageUrl,
  hasImage,
  fileManagement,
  getStatusVariant,
  getStatusText,
  handleSelectCharacter,
}: CharacterDetailPanelProps) {
  if (!selectedCharacter) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center flex-1 h-full p-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-md space-y-6 text-center">
          <div className="flex items-center justify-center w-20 h-20 mx-auto border rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10">
            <LuUser className="w-10 h-10 text-primary/60" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-semibold text-foreground">詳細を表示するキャラクターを選択</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              左側のリストからキャラクターを選択すると、完全な情報の表示、画像管理、プロパティの編集などが行えます。
            </p>
          </div>
          {characters.length > 0 && (
            <Button variant="outline" onClick={() => handleSelectCharacter(characters[0])} className="mt-4">
              最初のキャラクターを表示
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex-1 bg-muted/30"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="flex flex-col h-full p-6 space-y-6">
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="flex-1 h-full shadow-sm">
            <Tabs defaultValue="images" className="flex flex-col h-full">
              <CardHeader className="pb-0">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">詳細情報</TabsTrigger>
                  <TabsTrigger value="images">画像管理</TabsTrigger>
                  <TabsTrigger value="rpd">RPD連携</TabsTrigger>
                  <TabsTrigger value="metadata">メタデータ</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="flex-1 pt-6">
                <TabsContent value="details" className="mt-0 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">名前</Label>
                      <p className="text-lg font-medium">{selectedCharacter.name}</p>
                    </div>

                    {selectedCharacter.alias && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">別名</Label>
                        <p className="text-sm">{selectedCharacter.alias}</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">説明</Label>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedCharacter.description || '説明なし'}
                      </p>
                    </div>

                    {selectedCharacter.features && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">特徴</Label>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedCharacter.features}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="images" className="mt-0">
                  <MergedImageManagement
                    character={selectedCharacter}
                    projectId={projectId}
                    selectedCharacterImageUrl={selectedCharacterImageUrl}
                    hasImage={hasImage}
                    fileManagement={fileManagement}
                  />
                </TabsContent>

                <TabsContent value="rpd" className="mt-0">
                  <RPDAssociationTab characterId={selectedCharacter.id} projectId={projectId} />
                </TabsContent>

                <TabsContent value="metadata" className="mt-0">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">キャラクターID</Label>
                      <p className="p-3 font-mono text-sm rounded-md bg-muted">{selectedCharacter.id}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">ステータス</Label>
                      <div>
                        <Badge variant={getStatusVariant(hasImage(selectedCharacter))}>
                          {getStatusText(hasImage(selectedCharacter))}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">作成日時</Label>
                      <p className="text-sm">{new Date(selectedCharacter.created_at).toLocaleString('ja-JP')}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">最終更新</Label>
                      <p className="text-sm">{new Date(selectedCharacter.updated_at).toLocaleString('ja-JP')}</p>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
