import { MicrosoftOfficeViewer } from './MicrosoftOfficeViewer';

interface ExcelViewerProps {
  assetUrl: string;
  originalFileName?: string;
}

export function ExcelViewer({ assetUrl, originalFileName }: ExcelViewerProps) {
  return <MicrosoftOfficeViewer assetUrl={assetUrl} originalFileName={originalFileName} fileTypeForDownload="xlsx" />;
}
