import { useEffect, useState } from 'react';

interface TextFileViewerProps {
  assetUrl: string;
  fileName?: string; // For the download link
}

// 支持的字符编码选项
const ENCODING_OPTIONS = [
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'shift-jis', label: 'Shift-JIS (日本語)' },
];

export function TextFileViewer({ assetUrl, fileName = 'file.txt' }: TextFileViewerProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEncoding, setSelectedEncoding] = useState<string>('utf-8');
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);

  // ファイルをArrayBufferとして取得
  useEffect(() => {
    if (!assetUrl) {
      setError('アセットURLが指定されていません。');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setFileBuffer(null);

    fetch(assetUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error('ネットワーク応答が正しくありませんでした。');
        }
        return response.arrayBuffer();
      })
      .then((buffer) => {
        setFileBuffer(buffer);
        setIsLoading(false);
      })
      .catch((fetchError) => {
        console.error('ファイルの取得に失敗しました:', fetchError);
        setError('ファイルの読み込みに失敗しました。詳細についてはコンソールを確認してください。');
        setIsLoading(false);
      });
  }, [assetUrl]);

  // 選択された文字エンコーディングでテキストをデコード
  useEffect(() => {
    if (!fileBuffer) {
      setTextContent(null);
      return;
    }

    try {
      const decoder = new TextDecoder(selectedEncoding);
      const decodedText = decoder.decode(fileBuffer);
      setTextContent(decodedText);
    } catch (decodeError) {
      console.error('テキストのデコードに失敗しました:', decodeError);
      setError(`選択された文字エンコーディング (${selectedEncoding}) でのデコードに失敗しました。`);
    }
  }, [fileBuffer, selectedEncoding]);

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  if (error) {
    return (
      <div>
        <p className="text-red-500">{error}</p>
        <a
          href={assetUrl}
          download={fileName}
          className="mt-2 inline-block px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          オリジナルファイルをダウンロード
        </a>
      </div>
    );
  }

  if (textContent === null) {
    return <div>テキストコンテンツを読み込めませんでした。</div>; // Should not happen if no error
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <a
          href={assetUrl}
          download={fileName}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          オリジナルファイルをダウンロード
        </a>
        <div className="flex items-center gap-2">
          <label htmlFor="encoding-select" className="text-sm font-medium text-gray-700">
            文字エンコーディング:
          </label>
          <select
            id="encoding-select"
            value={selectedEncoding}
            onChange={(e) => setSelectedEncoding(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {ENCODING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <pre className="p-4 bg-gray-100 rounded-md overflow-y-auto max-h-96 text-sm whitespace-pre-wrap break-all">
        {textContent}
      </pre>
    </div>
  );
}
