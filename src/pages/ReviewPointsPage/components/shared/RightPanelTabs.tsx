import { Image as ImageIcon } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/Button';
import type { PredefinedRPDKey } from '@/constants/rpdKeys';
import type { RPDTestHistory } from '@/types/rpdTest';

import { AppellationPreview } from './AppellationFileUploadArea';
import { ChatbotInterface } from './ChatbotInterface';
import { RPD_KEY_INFO } from './constants';
import type { AppellationFileInfo, ChatMessage, ImageInfo, NGSubcategoryType, SpecialRule } from './types';

// 右侧面板Tab组件
interface RightPanelTabsProps {
  selectedKey: PredefinedRPDKey | null;
  title: string;
  tags: string[];
  detailContent: string;
  currentStep: 1 | 2;
  onSubmit: () => void;
  projectId: string;
  uploadedImages?: ImageInfo[];
  appellationFile?: AppellationFileInfo | null;
  specialRules?: SpecialRule[];
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
  isSubmitting?: boolean;
  // general_ng_review专用props
  ngSubcategory?: NGSubcategoryType;
}

export function RightPanelTabs({
  selectedKey,
  title,
  tags,
  detailContent,
  currentStep,
  onSubmit,
  projectId,
  uploadedImages = [],
  chatMessages,
  setChatMessages,
  chatInputText,
  setChatInputText,
  chatIsDragOver,
  setChatIsDragOver,
  chatIsProcessing,
  setChatIsProcessing,
  showHistory,
  setShowHistory,
  testHistory,
  setTestHistory,
  isLoadingHistory,
  setIsLoadingHistory,
  isSubmitting = false,
  appellationFile = null,
  specialRules = [],
  ngSubcategory = null,
}: RightPanelTabsProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'test'>('preview');

  return (
    <div className="flex-1 bg-gradient-to-br from-slate-50 to-gray-100 p-4 overflow-hidden flex flex-col">
      {/* Tab Headers */}
      <div className="flex-shrink-0 mb-0">
        <div className="flex">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 border-t border-l border-r text-center ${
              activeTab === 'preview'
                ? 'bg-white text-gray-900 border-gray-200 border-b-white relative z-10'
                : 'bg-gray-100 text-gray-600 border-gray-200 border-b-gray-200 hover:bg-gray-50'
            } rounded-tl-lg`}
            style={activeTab === 'preview' ? { marginBottom: '-1px' } : {}}
          >
            プレビュー
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 border-t border-l border-r text-center ${
              activeTab === 'test'
                ? 'bg-white text-gray-900 border-gray-200 border-b-white relative z-10'
                : 'bg-gray-100 text-gray-600 border-gray-200 border-b-gray-200 hover:bg-gray-50'
            } rounded-tr-lg`}
            style={activeTab === 'test' ? { marginBottom: '-1px' } : {}}
          >
            テスト
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-white rounded-b-xl rounded-tr-xl shadow-lg border border-gray-200 overflow-hidden min-h-0">
        {activeTab === 'preview' ? (
          <RPDPreviewTab
            selectedKey={selectedKey}
            title={title}
            tags={tags}
            detailContent={detailContent}
            currentStep={currentStep}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            appellationFile={appellationFile}
            specialRules={specialRules}
            ngSubcategory={ngSubcategory}
          />
        ) : (
          <RPDTestTab
            selectedKey={selectedKey}
            title={title}
            detailContent={detailContent}
            projectId={projectId}
            uploadedImages={uploadedImages}
            tags={tags}
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            chatInputText={chatInputText}
            setChatInputText={setChatInputText}
            chatIsDragOver={chatIsDragOver}
            setChatIsDragOver={setChatIsDragOver}
            chatIsProcessing={chatIsProcessing}
            setChatIsProcessing={setChatIsProcessing}
            showHistory={showHistory}
            setShowHistory={setShowHistory}
            testHistory={testHistory}
            setTestHistory={setTestHistory}
            isLoadingHistory={isLoadingHistory}
            setIsLoadingHistory={setIsLoadingHistory}
            appellationFile={appellationFile}
            specialRules={specialRules}
          />
        )}
      </div>
    </div>
  );
}

// Preview Tab Component
interface RPDPreviewTabProps {
  selectedKey: PredefinedRPDKey | null;
  title: string;
  tags: string[];
  detailContent: string;
  currentStep: 1 | 2;
  onSubmit: () => void;
  isSubmitting?: boolean;
  appellationFile?: AppellationFileInfo | null;
  specialRules?: SpecialRule[];
  ngSubcategory?: NGSubcategoryType;
}

function RPDPreviewTab({
  selectedKey,
  title,
  tags,
  detailContent,
  currentStep,
  onSubmit,
  isSubmitting = false,
  appellationFile = null,
  specialRules = [],
  ngSubcategory = null,
}: RPDPreviewTabProps) {
  return (
    <div className="p-4 h-full flex flex-col min-h-0">
      {/* プレビュー内容 - スクロール可能 */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
        {/* Type表示 */}
        <div>
          {selectedKey ? (
            <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm">
              {RPD_KEY_INFO[selectedKey].name}
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-500">
              監修タイプ
            </span>
          )}
        </div>

        {/* Title表示 */}
        <div>
          <h4 className="text-xl font-bold text-gray-900 leading-tight">
            {title || 'RPDタイトルがここに表示されます'}
          </h4>
        </div>

        {/* タグ表示 */}
        {tags.length > 0 && (
          <div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* NG子分类显示 */}
        {selectedKey === 'general_ng_review' && ngSubcategory && (
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">NGカテゴリー</h5>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
              <span className="text-sm text-gray-800">
                {ngSubcategory === 'concrete_shape' ? '具体的な形状' : '抽象的なタイプ'}
              </span>
            </div>
          </div>
        )}

        {/* text_review专用信息显示 */}
        {selectedKey === 'text_review' && (
          <>
            {/* 称呼表文件信息和预览 */}
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">称呼表ファイル</h5>
              {appellationFile ? (
                <AppellationPreview appellationFile={appellationFile} />
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                  <span className="text-sm text-gray-500">称呼表ファイルがアップロードされていません</span>
                </div>
              )}
            </div>

            {/* 特殊规则显示 */}
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">特殊ルール</h5>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                {specialRules.length === 0 ? (
                  <p className="text-sm text-gray-500">特殊ルールが設定されていません</p>
                ) : (
                  <div className="space-y-2">
                    {specialRules.map((rule, index) => (
                      <div key={index} className="bg-white rounded p-2 border border-gray-200 text-sm">
                        <div className="font-medium text-gray-800 mb-1">
                          {rule.speaker} → {rule.target}: &quot;{rule.alias}&quot;
                        </div>
                        {rule.conditions.length > 0 && rule.conditions[0].trim() && (
                          <div className="text-gray-600 text-xs">条件: {rule.conditions.join(', ')}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* 内容表示 - text_review以外のみ表示 */}
        {selectedKey !== 'text_review' && (
          <div className="flex-1 min-h-0">
            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">詳細内容</h5>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 min-h-[300px] border border-gray-200">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                {detailContent ||
                  '詳細な説明がここに表示されます。AIが理解できる明確で具体的な指示を記入してください。'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 確認ボタン - 第2ステップでのみ表示 */}
      {currentStep === 2 && (
        <div className="pt-3 border-t border-gray-200 flex-shrink-0 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={onSubmit}
              disabled={!detailContent.trim() || isSubmitting}
              className="h-10 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
            >
              {isSubmitting ? 'RPDを作成中...' : 'RPDを作成'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Test Tab Component
interface RPDTestTabProps {
  selectedKey: PredefinedRPDKey | null;
  title: string;
  detailContent: string;
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

function RPDTestTab({
  selectedKey,
  title,
  detailContent,
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
  showHistory,
  setShowHistory,
  testHistory,
  setTestHistory,
  isLoadingHistory,
  setIsLoadingHistory,
  appellationFile = null,
  specialRules = [],
}: RPDTestTabProps) {
  // 检查RPD是否准备好进行测试
  const isRPDReadyForTest = () => {
    if (!selectedKey || !title.trim()) {
      return false;
    }

    if (selectedKey === 'text_review') {
      // text_review类型不需要详细内容，但需要称呼表文件
      return appellationFile && appellationFile.status === 'completed';
    } else {
      // 其他类型需要详细内容
      return detailContent.trim().length > 0;
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Chatbot Interface */}
      {isRPDReadyForTest() ? (
        <ChatbotInterface
          rpdKey={selectedKey!}
          rpdTitle={title}
          rpdContent={detailContent}
          projectId={projectId}
          uploadedImages={uploadedImages}
          tags={tags}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          chatInputText={chatInputText}
          setChatInputText={setChatInputText}
          chatIsDragOver={chatIsDragOver}
          setChatIsDragOver={setChatIsDragOver}
          chatIsProcessing={chatIsProcessing}
          setChatIsProcessing={setChatIsProcessing}
          showHistory={showHistory}
          setShowHistory={setShowHistory}
          testHistory={testHistory}
          setTestHistory={setTestHistory}
          isLoadingHistory={isLoadingHistory}
          setIsLoadingHistory={setIsLoadingHistory}
          appellationFile={appellationFile}
          specialRules={specialRules}
        />
      ) : (
        /* Empty State - RPD not ready */
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-700 mb-2">RPDの設定を完了してください</h4>
            <p className="text-sm text-gray-500 leading-relaxed">
              RPDのタイプ、タイトル、詳細内容を設定すると
              <br />
              ここでテストができるようになります
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
