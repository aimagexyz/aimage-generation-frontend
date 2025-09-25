import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { fetchApi } from '@/api/client';
import { useToast } from '@/components/ui/use-toast';

type ExportPptxVariables = {
  taskId: string;
  fileName: string;
};

export function useExportPptx() {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async ({ taskId }: ExportPptxVariables) => {
      const response = await fetchApi({
        url: `/api/v1/tasks/${taskId}/export-pptx` as '/api/v1/tasks/{task_id}/export-pptx',
        method: 'get',
        responseType: 'blob',
      });
      return response;
    },
    onSuccess: (response, variables) => {
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', variables.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();

      // 成功メッセージ
      toast({
        title: 'エクスポート完了',
        description: 'PPTXファイルのダウンロードが開始されました。',
      });
    },
    onError: async (error) => {
      console.error('Failed to download PPTX:', error);

      let errorMessage = 'PPTXファイルのエクスポートに失敗しました。';

      // Axiosエラーの場合、バックエンドからのエラーメッセージを取得
      if (error instanceof AxiosError) {
        console.log('AxiosError details:', {
          status: error.response?.status,
          data: error.response?.data as unknown,
          headers: error.response?.headers,
        });

        const responseData = error.response?.data as unknown;

        // responseType: 'blob' の場合、エラーレスポンスもBlobとして返される可能性がある
        if (responseData instanceof Blob) {
          try {
            // Blobを文字列に変換してJSONパース
            const text = await responseData.text();
            const parsedData = JSON.parse(text) as { detail?: string };
            if (parsedData?.detail && typeof parsedData.detail === 'string') {
              console.log('Parsed error from blob:', parsedData.detail);
              errorMessage = parsedData.detail;
            }
          } catch (parseError) {
            console.error('Failed to parse blob error:', parseError);
          }
        } else {
          // 通常のJSONレスポンスの場合
          const typedData = responseData as { detail?: string } | undefined;
          if (typedData?.detail && typeof typedData.detail === 'string') {
            errorMessage = typedData.detail;
          }
        }
      }

      toast({
        title: 'PPTXエクスポートエラー',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  return {
    ...mutation,
    exportingTaskId: mutation.isPending ? mutation.variables?.taskId : undefined,
  };
}
