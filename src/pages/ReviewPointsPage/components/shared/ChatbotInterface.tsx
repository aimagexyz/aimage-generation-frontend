import { Image as ImageIcon, RefreshCw, Upload, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { reviewPointDefinitionsService } from '@/api/reviewPointDefinitionsService';
import type { PredefinedRPDKey } from '@/constants/rpdKeys';
import type { RPDTestHistory } from '@/types/rpdTest';

import { RPD_KEY_INFO } from './constants';
import type { AppellationFileInfo, ChatMessage, ImageInfo, RPDTestResult, SpecialRule } from './types';

// Chatbot Interface Component
interface ChatbotInterfaceProps {
  rpdKey: PredefinedRPDKey;
  rpdTitle: string;
  rpdContent: string;
  projectId: string;
  uploadedImages?: ImageInfo[];
  tags?: string[];
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  chatInputText: string;
  setChatInputText: React.Dispatch<React.SetStateAction<string>>;
  chatIsDragOver: boolean;
  setChatIsDragOver: React.Dispatch<React.SetStateAction<boolean>>;
  chatIsProcessing: boolean;
  setChatIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  showHistory: boolean;
  setShowHistory: React.Dispatch<React.SetStateAction<boolean>>;
  testHistory: RPDTestHistory[] | unknown[];
  setTestHistory: React.Dispatch<React.SetStateAction<RPDTestHistory[] | unknown[]>>;
  isLoadingHistory: boolean;
  setIsLoadingHistory: React.Dispatch<React.SetStateAction<boolean>>;
  // text_review专用props
  appellationFile?: AppellationFileInfo | null;
  specialRules?: SpecialRule[];
}

export function ChatbotInterface({
  rpdKey,
  rpdTitle,
  rpdContent,
  projectId,
  uploadedImages = [],
  tags = [],
  chatMessages,
  setChatMessages,
  chatInputText,
  setChatInputText,
  chatIsDragOver,
  setChatIsDragOver,
  chatIsProcessing,
  setChatIsProcessing,
  appellationFile = null,
  specialRules = [],
}: ChatbotInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // 使用容器的 scrollTop 而不是 scrollIntoView 来避免影响 Modal 定位
      const messagesContainer = messagesEndRef.current.parentElement;
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    // 使用 setTimeout 确保 DOM 更新完成后再滚动
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 50);

    return () => clearTimeout(timer);
  }, [chatMessages]);

  // 处理text_review类型的测试
  const handleTextReviewTest = async (userMessage: ChatMessage): Promise<string> => {
    if (!appellationFile?.s3Url) {
      throw new Error('称呼表ファイルがアップロードされていません');
    }

    const testRequest = {
      dialogue_text: userMessage.content,
      rpd_title: rpdTitle,
      appellation_file_s3_url: appellationFile.s3Url,
      special_rules: specialRules.map((rule) => ({
        speaker: rule.speaker,
        target: rule.target,
        alias: rule.alias,
        conditions: rule.conditions,
      })),
      project_id: projectId,
    };

    const result = await reviewPointDefinitionsService.testRPDWithText(testRequest);

    let responseContent = `## ${RPD_KEY_INFO[rpdKey].name}テスト結果\n\n`;
    responseContent += `${result.analysis}\n\n`;

    if (result.detected_speaker) {
      responseContent += `**検出された話者:** ${result.detected_speaker}\n\n`;
    }

    if (result.detected_targets.length > 0) {
      responseContent += `**関連キャラクター:** ${result.detected_targets.join(', ')}\n\n`;
    }

    if (result.processing_time_seconds) {
      responseContent += `*処理時間: ${result.processing_time_seconds}秒*`;
    }

    return responseContent;
  };

  // 处理通用RPD测试
  const handleGeneralRPDTest = async (userMessage: ChatMessage): Promise<string> => {
    const testRequest = {
      rpd_key: rpdKey,
      rpd_title: rpdTitle,
      rpd_content: rpdContent,
      project_id: projectId,
      input_type: 'text' as const,
      input_content: userMessage.content,
      context: `Testing RPD: ${rpdTitle}`,
    };

    const result = await reviewPointDefinitionsService.testRPD(testRequest);

    let responseContent = `[${RPD_KEY_INFO[rpdKey].name}] テスト結果：\n\n`;
    responseContent += `分析結果：\n${result.results.analysis}\n\n`;

    if (result.results.findings.length > 0) {
      responseContent += '発見された問題：\n';
      result.results.findings.forEach((finding, index) => {
        responseContent += `${index + 1}. [${finding.type.toUpperCase()}] ${finding.title}\n`;
        responseContent += `   ${finding.description}\n`;
        if (finding.suggested_action) {
          responseContent += `   推奨アクション: ${finding.suggested_action}\n`;
        }
        responseContent += `   信頼度: ${(finding.confidence * 100).toFixed(1)}%\n\n`;
      });
    } else {
      responseContent += '問題は検出されませんでした。\n\n';
    }

    if (result.results.score !== undefined) {
      responseContent += `スコア: ${result.results.score}/100\n\n`;
    }

    if (result.results.suggestions && result.results.suggestions.length > 0) {
      responseContent += '改善提案：\n';
      result.results.suggestions.forEach((suggestion) => {
        responseContent += `• ${suggestion}\n`;
      });
      responseContent += '\n';
    }

    return responseContent;
  };

  const handleSendMessage = async () => {
    if (!chatInputText.trim() || chatIsProcessing) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      type: 'user',
      content: chatInputText.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInputText('');
    setChatIsProcessing(true);

    const loadingMessage: ChatMessage = {
      id: `ai-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setChatMessages((prev) => [...prev, loadingMessage]);

    try {
      const responseContent =
        rpdKey === 'text_review' ? await handleTextReviewTest(userMessage) : await handleGeneralRPDTest(userMessage);

      const aiResponse: ChatMessage = {
        ...loadingMessage,
        content: responseContent,
        isLoading: false,
      };

      setChatMessages((prev) => prev.map((msg) => (msg.id === loadingMessage.id ? aiResponse : msg)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'テストの実行に失敗しました';
      const aiResponse: ChatMessage = {
        ...loadingMessage,
        content: `[エラー] ${errorMessage}\n\n現在、この機能は開発中です。実装が完了するまでお待ちください。`,
        isLoading: false,
      };

      setChatMessages((prev) => prev.map((msg) => (msg.id === loadingMessage.id ? aiResponse : msg)));
    } finally {
      setChatIsProcessing(false);
    }
  };

  // 创建文件消息
  const createFileMessage = useCallback((file: File): ChatMessage => {
    const isImage = file.type.startsWith('image/');
    return {
      id: `file-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      type: 'user',
      content: isImage ? '画像をアップロードしました' : 'ドキュメントをアップロードしました',
      timestamp: new Date(),
      fileInfo: {
        name: file.name,
        type: isImage ? 'image' : 'document',
        preview: isImage ? URL.createObjectURL(file) : undefined,
        size: file.size,
      },
    };
  }, []);

  // 创建加载消息
  const createLoadingMessage = useCallback(
    (): ChatMessage => ({
      id: `ai-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }),
    [],
  );

  // 构建RPD配置数据
  const buildRPDData = useCallback(
    () => ({
      rpd_title: rpdTitle,
      rpd_parent_key: rpdKey,
      rpd_description_for_ai: rpdContent,
      ...(rpdKey === 'general_ng_review' && tags.length > 0 ? { rpd_tag_list: tags.join(',') } : {}),
      ...(rpdKey === 'visual_review' && uploadedImages.length > 0
        ? {
            rpd_reference_images: uploadedImages
              .filter((img) => img.s3Url && img.status === 'completed')
              .map((img) => img.s3Url!)
              .join(','),
          }
        : {}),
      mode: 'quality' as const,
      cr_check: rpdKey === 'copyright_review',
    }),
    [rpdKey, rpdTitle, rpdContent, tags, uploadedImages],
  );

  // 格式化测试结果
  const formatTestResult = useCallback(
    (result: RPDTestResult): string => {
      let responseContent = `## ${RPD_KEY_INFO[rpdKey].name}\n\n`;

      if (result.success) {
        responseContent += `**RPD**: ${result.rpd_title}  \n`;
        responseContent += `**タイプ**: ${result.rpd_type}\n\n`;

        if (result.findings_count && result.findings_count > 0) {
          result.findings?.forEach((finding, index) => {
            responseContent += `#### ${index + 1}. ${rpdTitle}\n\n`;
            responseContent += `**程度**: \`${finding.severity.toUpperCase()}\`\n\n`;
            responseContent += `${finding.description}\n\n`;

            if (finding.suggestion) {
              responseContent += `**推奨アクション**: ${finding.suggestion}\n\n`;
            }
            if (finding.tag) {
              responseContent += `**タグ**: ${finding.tag}\n\n`;
            }
            if (finding.area) {
              responseContent += `**位置**: (${finding.area.x}, ${finding.area.y}, ${finding.area.width}x${finding.area.height})\n\n`;
            }
            responseContent += '---\n\n';
          });
        } else {
          responseContent += '### ✅ 問題は検出されませんでした\n\n';
        }
      } else {
        responseContent += `### ❌ エラー\n\n${result.message}\n\n`;
      }

      return responseContent;
    },
    [rpdKey, rpdTitle],
  );

  // 处理单个文件
  const processSingleFile = useCallback(
    async (file: File) => {
      const isImage = file.type.startsWith('image/');
      const fileMessage = createFileMessage(file);
      const loadingMessage = createLoadingMessage();

      setChatMessages((prev) => [...prev, fileMessage, loadingMessage]);

      if (!isImage) {
        const aiResponse: ChatMessage = {
          ...loadingMessage,
          content: '[エラー] 現在はテスト機能は画像ファイルのみ対応しています。',
          isLoading: false,
        };
        setChatMessages((prev) => prev.map((msg) => (msg.id === loadingMessage.id ? aiResponse : msg)));
        return;
      }

      try {
        const rpdData = buildRPDData();
        const result = await reviewPointDefinitionsService.testRPDWithImage(file, rpdData);
        const responseContent = formatTestResult(result);

        const aiResponse: ChatMessage = {
          ...loadingMessage,
          content: responseContent,
          isLoading: false,
        };

        setChatMessages((prev) => prev.map((msg) => (msg.id === loadingMessage.id ? aiResponse : msg)));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'RPDテストの実行に失敗しました';
        const aiResponse: ChatMessage = {
          ...loadingMessage,
          content: `[エラー] ${errorMessage}\n\nRPDテスト機能でエラーが発生しました。設定を確認してから再試行してください。`,
          isLoading: false,
        };

        setChatMessages((prev) => prev.map((msg) => (msg.id === loadingMessage.id ? aiResponse : msg)));
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    },
    [createFileMessage, createLoadingMessage, buildRPDData, formatTestResult],
  );

  const handleFileUpload = async (files: FileList) => {
    if (!files.length || chatIsProcessing) {
      return;
    }

    setChatIsProcessing(true);

    try {
      for (const file of Array.from(files)) {
        await processSingleFile(file);
      }
    } finally {
      setChatIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setChatIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setChatIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setChatIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      void handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  // 渲染上传按钮区域
  const renderUploadArea = () => {
    if (chatMessages.length === 0) {
      return (
        <div className="flex items-center justify-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={chatIsProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            <Upload className="w-5 h-5" />
            {chatIsProcessing ? '処理中...' : '画像をアップロード'}
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={chatIsProcessing}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors border border-gray-300"
        >
          <Upload className="w-4 h-4" />
          {chatIsProcessing ? '処理中...' : '画像を追加'}
        </button>
      </div>
    );
  };

  return (
    <div
      className="h-full flex flex-col relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex-1 overflow-y-auto min-h-0">
        {chatMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">RPDテストを開始</h4>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                {rpdKey === 'text_review' ? (
                  <>
                    画像やドキュメントをアップロードするか、
                    <br />
                    テキストを入力してRPDの動作をテストできます
                  </>
                ) : (
                  <>
                    画像をアップロードして
                    <br />
                    RPDの動作をテストできます
                  </>
                )}
              </p>
              {rpdKey === 'text_review' && (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 text-xs bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
                  >
                    <Upload className="w-3 h-3 mr-1 inline" />
                    ファイル選択
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {chatMessages.map((message) => (
              <MessageBubble key={message.id} message={message} onImageClick={setPreviewImage} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
        {rpdKey === 'text_review' ? (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <textarea
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="メッセージを入力するか、ファイルをドラッグ&ドロップしてください..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-24 text-sm"
                rows={1}
                disabled={chatIsProcessing}
              />
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={chatIsProcessing}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              onClick={() => void handleSendMessage()}
              disabled={!chatInputText.trim() || chatIsProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              送信
            </button>
          </div>
        ) : (
          renderUploadArea()
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={rpdKey === 'text_review' ? 'image/*,.pdf,.doc,.docx,.txt' : 'image/*'}
        onChange={(e) => e.target.files && void handleFileUpload(e.target.files)}
        className="hidden"
      />

      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {chatIsDragOver && (
        <div className="absolute inset-0 bg-blue-50 bg-opacity-95 border-2 border-dashed border-blue-400 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-blue-500 mb-3" />
            <p className="text-lg text-blue-700 font-semibold">
              {rpdKey === 'text_review' ? 'ファイルをドロップしてテスト' : '画像をドロップしてテスト'}
            </p>
            <p className="text-sm text-blue-600 mt-1">
              {rpdKey === 'text_review'
                ? '画像やドキュメントに対してRPDテストを実行します'
                : '画像に対してRPDテストを実行します'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Message Bubble Component
interface MessageBubbleProps {
  message: ChatMessage;
  onImageClick: (imageUrl: string) => void;
}

function MessageBubble({ message, onImageClick }: MessageBubbleProps) {
  const isUser = message.type === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
            isUser ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          {message.isLoading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-gray-600">分析中...</span>
            </div>
          ) : (
            <>
              {message.fileInfo && (
                <div className="mb-2">
                  <FilePreview fileInfo={message.fileInfo} onImageClick={onImageClick} />
                </div>
              )}
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-strong:font-bold prose-strong:text-inherit">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="my-1">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
                    h4: ({ children }) => <h4 className="text-sm font-semibold mb-1 mt-2">{children}</h4>,
                    hr: () => <hr className="my-2 border-gray-300" />,
                    code: ({ children }) => (
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            </>
          )}
        </div>

        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 ${isUser ? 'order-1 ml-2' : 'order-2 mr-2'} ${isUser ? 'bg-blue-600' : 'bg-gray-300'} flex items-center justify-center`}
      >
        {isUser ? (
          <span className="text-white text-xs font-semibold">U</span>
        ) : (
          <span className="text-white text-xs font-semibold">AI</span>
        )}
      </div>
    </div>
  );
}

// File Preview Component
interface FilePreviewProps {
  fileInfo: NonNullable<ChatMessage['fileInfo']>;
  onImageClick: (imageUrl: string) => void;
}

function FilePreview({ fileInfo, onImageClick }: FilePreviewProps) {
  if (fileInfo.type === 'image' && fileInfo.preview) {
    return (
      <div className="inline-block">
        <img
          src={fileInfo.preview}
          alt={fileInfo.name}
          className="max-w-48 max-h-32 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onImageClick(fileInfo.preview!)}
        />
        <div className="text-xs text-gray-600 mt-1">{fileInfo.name}</div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-white bg-opacity-10 rounded-lg">
      <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
        <ImageIcon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{fileInfo.name}</div>
        <div className="text-xs opacity-75">{(fileInfo.size / 1024).toFixed(1)}KB</div>
      </div>
    </div>
  );
}
