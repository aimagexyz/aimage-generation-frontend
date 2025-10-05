import { useMutation } from '@tanstack/react-query';

import { fetchApi } from '@/api/client';

type ExportPdfVariables = {
  taskId: string;
  fileName: string;
};

export function useExportPdf() {
  const mutation = useMutation({
    mutationFn: async ({ taskId }: ExportPdfVariables) => {
      const response = await fetchApi({
        url: `/api/v1/tasks/${taskId}/export-pdf` as '/api/v1/tasks/{task_id}/export-pdf',
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
    },
    onError: (error) => {
      console.error('Failed to download PDF:', error);
    },
  });

  return {
    ...mutation,
    exportingTaskId: mutation.isPending ? mutation.variables?.taskId : undefined,
  };
}
