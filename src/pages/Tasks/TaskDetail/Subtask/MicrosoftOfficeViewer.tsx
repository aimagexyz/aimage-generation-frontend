interface MicrosoftOfficeViewerProps {
  assetUrl: string;
  originalFileName?: string;
  fileTypeForDownload?: 'xlsx' | 'docx' | 'pptx' | 'document'; // Supports common Office types
}

export function MicrosoftOfficeViewer({
  assetUrl,
  originalFileName,
  fileTypeForDownload = 'document',
}: MicrosoftOfficeViewerProps) {
  if (!assetUrl) {
    return <p className="text-red-500">アセットURLが指定されていません。</p>;
  }

  // Microsoft Office Online Viewer URL
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(assetUrl)}`;

  let downloadName = originalFileName || 'file';
  if (originalFileName && !/\.(docx|xlsx|pptx|doc|xls|ppt|txt)$/i.exec(originalFileName)) {
    downloadName = `${originalFileName}.${fileTypeForDownload}`;
  } else if (!originalFileName) {
    downloadName = `download.${fileTypeForDownload}`;
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-shrink-0 mb-2">
        <a
          href={assetUrl} // Direct link to S3 for download
          download={downloadName}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          オリジナルファイルをダウンロード ({downloadName})
        </a>
      </div>
      <div className="flex-grow w-full h-full min-h-[60vh]">
        <iframe
          src={viewerUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          title={originalFileName || 'Office Document Viewer'}
          // onError for iframe is generally unreliable for content errors like 404s from the src
          // It might catch more fundamental issues like a completely malformed src URL.
        >
          <p>
            お使いのブラウザはiframeをサポートしていません。ドキュメントを表示できません。 Microsoft
            Officeドキュメントビューアを使用するには、ファイルが公開されており、URLが正しいことを確認してください。
          </p>
        </iframe>
      </div>
    </div>
  );
}
