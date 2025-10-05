import { useMutation, useQuery } from '@tanstack/react-query';
import { formatDate } from 'date-fns';
import { useState } from 'react';
import { LuCircleCheck, LuCircleX, LuClock, LuLoader, LuPlus, LuRefreshCw } from 'react-icons/lu';
import { SiGoogledrive } from 'react-icons/si';

import { fetchApi } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ModalToaster } from '@/components/ui/ModalToaster';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { toast } from '@/components/ui/use-toast';
import { UserAvatarNameLabel } from '@/components/UserAvatarNameLabel';
import { GOOGLE_CLIENT_ID } from '@/constants/env';
import { useDrivePicker } from '@/hooks/useDrivePicker';
import { useModal } from '@/hooks/useModal';

type Props = {
  projectId: string;
};

// DriveFileの型定義
type DriveFile = {
  id: string;
  created_at: string;
  updated_at: string;
  drive_file_id: string;
  file_name: string;
  s3_path: string;
  mime_type?: string | null;
  status: 'uploading' | 'pending' | 'processing' | 'failed' | 'done' | null;
  project: { id: string };
  author_id: string;
};

// PPTXのMIMEタイプ定数
const PPTX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// ファイルサイズの制限 (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function UploadFromDriveModal(props: Props) {
  const { projectId } = props;

  const { openDrivePicker, uploadToS3Async } = useDrivePicker();
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<
    {
      file: google.picker.DocumentObject;
      status: 'pending' | 'success' | 'error';
    }[]
  >([]);

  const { showModal: originalShowModal, closeModal: originalCloseModal, Modal } = useModal();

  const showModal = () => {
    originalShowModal();
  };

  const closeModal = () => {
    originalCloseModal();
  };

  const { data: driveFiles, refetch: originalRefetchDriveFiles } = useQuery<{ items: DriveFile[] }, Error>({
    queryKey: ['driveFiles', projectId],
    queryFn: async () => {
      const response = await fetchApi({
        url: `/api/v1/projects/${projectId}/assets` as '/api/v1/projects/{project_id}/assets',
        method: 'get',
      });
      return response.data;
    },
  });

  const refetchDriveFiles = () => {
    return originalRefetchDriveFiles();
  };

  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const processPPTXMutation = useMutation({
    mutationFn: async (assetIds: string[]) =>
      fetchApi({
        url: `/api/v1/projects/${projectId}/assets/process-pptx` as '/api/v1/projects/{project_id}/assets/process-pptx',
        method: 'post',
        data: assetIds,
      }),
    onSuccess: () => {
      toast({
        description: 'PPTXを処理中です',
      });
      void refetchDriveFiles();
      setSelectedAssetIds([]);
    },
    onError: () => {
      toast({
        description: 'PPTXの処理に失敗しました',
        variant: 'destructive',
      });
    },
  });

  const isFileSelectable = (file: DriveFile): boolean => {
    const isPPTX = file.mime_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    const isPending = file.status === 'pending';
    return isPPTX && isPending;
  };

  const handleSelectFile = (file: DriveFile): void => {
    if (selectedAssetIds.length >= 10) {
      toast({
        description: '選択できるファイルは10個までです',
        variant: 'destructive',
      });
      return;
    }
    setSelectedAssetIds((prev: string[]) => [...prev, file.id]);
  };

  const handleUnselectFile = (file: DriveFile): void => {
    setSelectedAssetIds((prev: string[]) => prev.filter((id) => id !== file.id));
  };

  const handleUploadSuccess = (file: google.picker.DocumentObject, data: unknown): void => {
    console.log('uploaded', data);
    setSelectedFiles((prev) => prev.map((f) => (f.file.id === file.id ? { ...f, status: 'success' } : f)));
    toast({
      description: `${file.name}をアップロードしました`,
    });
    void refetchDriveFiles();
  };

  const handleUploadError = (file: google.picker.DocumentObject, error: unknown): void => {
    console.error('upload error', error);
    setSelectedFiles((prev) => prev.map((f) => (f.file.id === file.id ? { ...f, status: 'error' } : f)));
    toast({
      description: `${file.name}のアップロードに失敗しました`,
      variant: 'destructive',
    });
  };

  const handleClickUpload = async (): Promise<void> => {
    if (selectedFiles.length === 0) {
      return;
    }

    // ファイル形式の検証
    const invalidFiles = selectedFiles.filter(({ file }) => file.mimeType !== PPTX_MIME_TYPE);
    if (invalidFiles.length > 0) {
      toast({
        description: `以下のファイルはPPTX形式ではありません：${invalidFiles.map((f) => f.file.name).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // ファイルサイズの検証
    const oversizedFiles = selectedFiles.filter(({ file }) => file.sizeBytes && file.sizeBytes > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast({
        description: `以下のファイルは50MBを超えています：${oversizedFiles.map((f) => f.file.name).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // 並列アップロード処理
    const uploadPromises = selectedFiles
      .filter(({ status }) => status === 'pending')
      .map(async ({ file }) => {
        if (!projectId) {
          toast({
            description: 'プロジェクトIDが見つかりません',
            variant: 'destructive',
          });
          return;
        }

        try {
          const result = await uploadToS3Async(
            {
              projectId,
              driveFileId: file.id,
              fileName: file.name || 'file',
              mimeType: file.mimeType || PPTX_MIME_TYPE,
            },
            {
              onSuccess: (data) => handleUploadSuccess(file, data),
              onError: (error) => {
                console.error('アップロードエラーの詳細:', error);
                handleUploadError(file, error);
              },
            },
          );
          return { file, result };
        } catch (error) {
          console.error('アップロード失敗:', error);
          handleUploadError(file, error);
          const errorMessage = error instanceof Error ? error.message : '不明なエラー';
          toast({
            description: `${file.name}のアップロードに失敗しました: ${errorMessage}`,
            variant: 'destructive',
          });
          return { file, error };
        }
      });

    try {
      await Promise.all(uploadPromises);
      void refetchDriveFiles();
    } catch (error) {
      console.error('一括アップロード失敗:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      toast({
        description: `ファイルのアップロードに失敗しました: ${errorMessage}。もう一度お試しください。`,
        variant: 'destructive',
      });
    }
  };

  const handleProcessPPTX = async () => {
    if (selectedAssetIds.length === 0) {
      return;
    }

    try {
      await processPPTXMutation.mutateAsync(selectedAssetIds);
      toast({
        description: 'PPTXの処理を開始しました',
      });
      void refetchDriveFiles();
      setSelectedAssetIds([]);
    } catch (error) {
      console.error('PPTX processing failed:', error);
      toast({
        description: 'PPTXの処理に失敗しました。エラーの詳細はコンソールをご確認ください。',
        variant: 'destructive',
      });
    }
  };

  // ステータスアイコンのマッピング
  const statusIcons = {
    uploading: <LuLoader className="animate-spin" />,
    pending: <LuClock className="text-yellow-500" />,
    processing: <LuLoader className="animate-spin text-blue-500" />,
    failed: <LuCircleX className="text-red-500" />,
    done: <LuCircleCheck className="text-green-500" />,
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          showModal();
        }}
        className="hover:bg-primary/10 transition-colors"
        title="Google Driveと連携"
      >
        <SiGoogledrive className="h-4 w-4 mr-2" />
        <span>Drive連携</span>
      </Button>
      <Modal className="bg-background rounded-lg shadow-lg text-foreground max-w-4xl w-full">
        <div className="p-6 rounded-lg relative">
          <ModalToaster />
          <div className="flex gap-4 justify-between items-center mb-4 border-b pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">Google Driveファイル管理</h2>
              <Button
                size="sm"
                variant={showOnlyPending ? 'default' : 'outline'}
                onClick={() => setShowOnlyPending(!showOnlyPending)}
                className="hover:bg-primary/10 transition-colors"
              >
                {showOnlyPending ? '全てのファイルを表示' : '処理待ちのみ表示'}
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void refetchDriveFiles();
              }}
              className="hover:bg-primary/10"
            >
              <LuRefreshCw className="mr-2 h-4 w-4" />
              更新
            </Button>
          </div>

          <div className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-4">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[50px]">選択</TableHead>
                    <TableHead>ファイル名</TableHead>
                    <TableHead className="w-[120px]">ステータス</TableHead>
                    <TableHead>アップロード者</TableHead>
                    <TableHead className="w-[150px]">作成日時</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!driveFiles?.items?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        アップロードされたファイルはありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    driveFiles?.items
                      ?.filter((file) => !showOnlyPending || file.status === 'pending')
                      ?.map((file: DriveFile) => (
                        <TableRow key={file.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <Checkbox
                              checked={selectedAssetIds.includes(file.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleSelectFile(file);
                                } else {
                                  handleUnselectFile(file);
                                }
                              }}
                              disabled={processPPTXMutation.isPending || !isFileSelectable(file)}
                            />
                          </TableCell>
                          <TableCell>
                            <a
                              target="_blank"
                              rel="noreferrer noopener"
                              href={`https://drive.google.com/file/d/${file.drive_file_id}/view`}
                              className="hover:text-primary transition-colors flex items-center gap-2"
                            >
                              {file.file_name}
                              {/* <span className="text-muted-foreground text-xs">({file.drive_file_id})</span> */}
                            </a>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {statusIcons[file.status as keyof typeof statusIcons]}
                              <span>
                                {file.status === 'uploading' && '受付中'}
                                {file.status === 'pending' && '処理待ち'}
                                {file.status === 'processing' && '処理中'}
                                {file.status === 'failed' && '失敗'}
                                {file.status === 'done' && '完了'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <UserAvatarNameLabel userId={file.author_id} className="flex items-center" />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(file.created_at, 'yyyy-MM-dd HH:mm')}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex gap-4 justify-between items-center mb-4">
                <h2 className="text-lg font-bold">新規アップロード</h2>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    closeModal();
                    openDrivePicker({
                      clientId: GOOGLE_CLIENT_ID,
                      showUploadFolders: true,
                      showUploadView: true,
                      multiSelect: true,
                      callback: (result) => {
                        showModal();
                        if (result.action === 'cancel') {
                          return;
                        }
                        if (result.docs) {
                          setSelectedFiles(result.docs.map((file) => ({ file, status: 'pending' })));
                        }
                      },
                    });
                  }}
                  className="hover:bg-primary/10"
                >
                  <LuPlus className="mr-2 h-4 w-4" />
                  ファイルを選択
                </Button>
              </div>

              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>ファイル名</TableHead>
                    <TableHead className="w-[120px]">ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selectedFiles?.length ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        選択されたファイルはありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedFiles?.map(({ file, status }) => (
                      <TableRow key={file.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <a
                            className="flex items-center gap-x-2 flex-1 hover:text-primary transition-colors"
                            target="_blank"
                            rel="noreferrer noopener"
                            href={file.url}
                          >
                            <img src={file.iconUrl} alt={file.name} className="h-8 w-8" />
                            {file.name || 'file'}
                            <span className="text-muted-foreground text-xs">({file.id})</span>
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {status === 'pending' && <LuClock className="text-yellow-500" />}
                            {status === 'success' && <LuCircleCheck className="text-green-500" />}
                            {status === 'error' && <LuCircleX className="text-red-500" />}
                            <span>
                              {status === 'pending' && 'アップロード待ち'}
                              {status === 'success' && 'アップロード成功'}
                              {status === 'error' && 'アップロード失敗'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex gap-4 justify-between items-center mt-6 pt-4 border-t">
            <div className="flex gap-2">
              {selectedAssetIds.length > 0 && (
                <Button
                  onClick={() => void handleProcessPPTX()}
                  disabled={processPPTXMutation.isPending}
                  variant="default"
                  className="relative"
                >
                  {processPPTXMutation.isPending ? (
                    <>
                      <LuLoader className="animate-spin mr-2" />
                      処理中...
                    </>
                  ) : (
                    <>PPTX処理 ({selectedAssetIds.length}件)</>
                  )}
                </Button>
              )}
              <Button
                onClick={() => {
                  void handleClickUpload();
                }}
                disabled={selectedFiles.length === 0}
                variant="default"
              >
                アップロード
              </Button>
              <Button
                onClick={() => {
                  setSelectedFiles([]);
                }}
                disabled={selectedFiles.length === 0}
                variant="outline"
              >
                クリア
              </Button>
            </div>
            <Button onClick={closeModal} variant="outline">
              閉じる
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
