interface GoogleDocViewerProps {
  assetUrl: string;
  originalFileName?: string;
  fileTypeForDownload?: 'docx' | 'xlsx' | 'document'; // Helps provide a generic extension if name is just a description
}

export function GoogleDocViewer({
  assetUrl,
  originalFileName,
  fileTypeForDownload = 'document',
}: GoogleDocViewerProps) {
  if (!assetUrl) {
    return <p className="text-red-500">アセットURLが指定されていません。</p>;
  }

  const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(assetUrl)}&embedded=true`;

  // Attempt to create a reasonable filename for download if originalFileName is not ideal
  let downloadName = originalFileName || 'file';
  if (originalFileName && !/\.(docx|xlsx|doc|xls|txt)$/i.exec(originalFileName)) {
    // If originalFileName doesn't look like it has an extension, append one
    downloadName = `${originalFileName}.${fileTypeForDownload}`;
  } else if (!originalFileName) {
    downloadName = `download.${fileTypeForDownload}`;
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-shrink-0 mb-2">
        <a
          href={assetUrl} // Direct link to S3 for download
          download={downloadName} // Suggests the filename to the browser
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          オリジナルファイルをダウンロード ({downloadName})
        </a>
      </div>
      <div className="flex-grow w-full h-full min-h-[60vh]">
        {' '}
        {/* Ensure iframe has space to grow */}
        <iframe
          src={viewerUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          title={originalFileName || 'Document Viewer'}
          onError={() => {
            // Note: iframe onError is not reliably triggered for all types of load errors (e.g. HTTP errors from the src URL)
            // It might catch issues like the src being totally malformed or network down before request.
            alert(
              'ドキュメントビューアの読み込みに失敗しました。ファイルが公開されているか、URLが正しいか確認してください。',
            );
          }}
        >
          <p>お使いのブラウザはiframeをサポートしていません。ドキュメントを表示できません。</p>
        </iframe>
      </div>
    </div>
  );
}
