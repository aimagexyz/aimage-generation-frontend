import { MicrosoftOfficeViewer } from './MicrosoftOfficeViewer';

interface WordViewerProps {
  assetUrl: string;
  originalFileName?: string;
}

export function WordViewer({ assetUrl, originalFileName }: WordViewerProps) {
  return <MicrosoftOfficeViewer assetUrl={assetUrl} originalFileName={originalFileName} fileTypeForDownload="docx" />;
}
