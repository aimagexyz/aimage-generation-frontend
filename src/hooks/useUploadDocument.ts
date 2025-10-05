import { useMutation } from '@tanstack/react-query';

import { fetchApi } from '@/api/client';

interface UploadDocumentParams {
  file: File;
  projectId: string;
}

export function useUploadDocument() {
  return useMutation({
    mutationFn: async ({ file, projectId }: UploadDocumentParams) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetchApi({
        url: `/api/v1/projects/${projectId}/documents` as '/api/v1/projects/{project_id}/documents',
        method: 'post',
        data: formData,
      });

      return response.data;
    },
  });
}
