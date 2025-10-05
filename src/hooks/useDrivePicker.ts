import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import { fetchApi } from '@/api/client';
import { queryClient } from '@/queryClient';

type PickerConfiguration = {
  clientId: string;
  viewId?: google.picker.ViewId;
  viewMimeTypes?: string;
  setIncludeFolders?: boolean;
  setSelectFolderEnabled?: boolean;
  disableDefaultView?: boolean;
  token?: string;
  setOrigin?: string;
  multiSelect?: boolean;
  appId?: string;
  showUploadView?: boolean;
  showUploadFolders?: boolean;
  setParentFolder?: string;
  customViews?: (google.picker.DocsView | google.picker.DocsUploadView | google.picker.ViewId)[];
  locale?: google.picker.Locales;
  customScopes?: string[];
  callback: (result: google.picker.ResponseObject) => void;
};

const defaultScopes = ['https://www.googleapis.com/auth/drive.readonly'];

export function useDrivePicker() {
  const pickerRef = useRef<google.picker.Picker | null>(null);
  const [tokenResponse, setTokenResponse] = useState<google.accounts.oauth2.TokenResponse>();

  // load the Drive picker api
  const { data: loaded } = useQuery({
    queryKey: ['google-drive-picker'],
    queryFn: () => {
      window.gapi.load('auth', { callback: () => {} });
      window.gapi.load('picker', {
        callback: () => {
          queryClient.setQueryData(['google-drive-picker'], true);
        },
      });
      return false;
    },
    staleTime: Infinity,
  });

  const createPicker = useCallback(
    ({
      token = '',
      appId = '',
      viewId = google.picker.ViewId.DOCS,
      multiSelect: multiselect,
      setOrigin,
      showUploadView = false,
      showUploadFolders,
      setParentFolder = '',
      viewMimeTypes,
      customViews,
      locale = 'ja',
      setIncludeFolders,
      setSelectFolderEnabled,
      disableDefaultView = false,
      callback: callbackFunction,
    }: PickerConfiguration) => {
      const view = new google.picker.DocsView(viewId);
      if (viewMimeTypes) {
        view.setMimeTypes(viewMimeTypes);
      }
      if (setIncludeFolders) {
        view.setIncludeFolders(true);
      }
      if (setSelectFolderEnabled) {
        view.setSelectFolderEnabled(true);
      }

      const uploadView = new google.picker.DocsUploadView();

      if (showUploadFolders) {
        uploadView.setIncludeFolders(true);
      }
      if (setParentFolder) {
        uploadView.setParent(setParentFolder);
      }
      if (setParentFolder) {
        view.setParent(setParentFolder);
      }

      const pickerBuilder = new google.picker.PickerBuilder()
        .setAppId(appId)
        .setOAuthToken(token)
        .setLocale(locale)
        .setCallback(callbackFunction);

      if (setOrigin) {
        pickerBuilder.setOrigin(setOrigin);
      }

      if (!disableDefaultView) {
        pickerBuilder.addView(view);
      }

      if (customViews) {
        customViews.forEach((view) => pickerBuilder.addView(view));
      }

      if (multiselect) {
        pickerBuilder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
      }

      if (showUploadView) {
        pickerBuilder.addView(uploadView);
      }

      const newPicker = pickerBuilder.build();

      newPicker.setVisible(true);
      return newPicker;
    },
    [],
  );

  // open the picker
  const openDrivePicker = useCallback(
    (newConfig: PickerConfiguration) => {
      if (!loaded) {
        console.error('Google Drive Picker API not loaded');
        return false;
      }
      // if we didn't get token generate token.
      if (!newConfig.token && !tokenResponse?.access_token) {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: newConfig.clientId,
          scope: [...defaultScopes, ...[newConfig.customScopes || []]].join(' '),
          callback: (tokenResponse) => {
            setTokenResponse(tokenResponse);
            pickerRef.current = createPicker({ ...newConfig, token: tokenResponse.access_token });
          },
        });

        client.requestAccessToken();
      }
      pickerRef.current?.setVisible(true);
      return true;
    },
    [createPicker, loaded, tokenResponse?.access_token],
  );

  const { mutate: downloadFile } = useMutation({
    mutationFn: (data: { fileId: string; fileName: string }) =>
      fetch(`https://www.googleapis.com/drive/v3/files/${data.fileId}?alt=media`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenResponse?.access_token}`,
        },
      }).then((response) => response.blob()),
    onSuccess: (blob, data) => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = data.fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(link.href);
    },
  });

  const { mutate: uploadToS3, mutateAsync: uploadToS3Async } = useMutation({
    mutationFn: (data: { projectId: string; driveFileId: string; fileName: string; mimeType: string }) =>
      fetchApi({
        url: `/api/v1/projects/${data.projectId}/assets` as '/api/v1/projects/{project_id}/assets',
        method: 'post',
        data: {
          drive_file_id: data.driveFileId,
          file_name: data.fileName,
          mime_type: data.mimeType,
        },
        params: { google_access_token: tokenResponse?.access_token || '' },
      }).then((res) => res.data),
  });

  const value = useMemo(
    () => ({ openDrivePicker, downloadFile, uploadToS3, uploadToS3Async, tokenResponse }),
    [downloadFile, openDrivePicker, uploadToS3, uploadToS3Async, tokenResponse],
  );
  return value;
}
