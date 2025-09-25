import { useCallback, useEffect, useRef, useState } from 'react';

import { aiReviewsService } from '@/api/aiReviewsService';
import type { ItemSearchByImageResponse } from '@/api/itemsService';
import { type components } from '@/api/schemas';
import { useAsset } from '@/hooks/useAsset';
import { type BoundingBox, useBoundingBoxEditor } from '@/hooks/useBoundingBoxEditor';
import type { AiReviewResult } from '@/types/aiReview';
import type { SubtaskUpdateStatusValue } from '@/types/tasks';

import { AudioAnnotation } from './AudioAnnotation';
import { EditableAiAnnotationBox } from './EditableAiAnnotationBox';
import { ExcelViewer } from './ExcelViewer';
import { AnnotationToolbar } from './FrameAnnotation/AnnotationToolbar';
import { type Annotation, useFrameAnnotation } from './FrameAnnotation/useFrameAnnotation';
import { ImageAnnotation, type ImageDisplayMetrics } from './ImageAnnotation';
import { ItemDetectionBox } from './ItemDetectionBox';
import { SubtaskCommentArea } from './SubtaskCommentArea';
import { TextFileViewer } from './TextFileViewer';
import { useSubtask } from './useSubtask';
import { VideoAnnotation } from './VideoAnnotation';
import { WordViewer } from './WordViewer';

interface AiReviewFindingArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface AiReviewCitation {
  reference_image?: string;
  reference_source?: string;
}
interface AiReviewFinding {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'risk' | 'alert' | 'safe';
  suggestion?: string;
  area?: AiReviewFindingArea;
  citation?: AiReviewCitation;
}
interface AiReviewSection {
  title: string;
  findings: AiReviewFinding[];
}

interface StructuredAiReviewResult {
  reviewSections: AiReviewSection[];
}

type Props = {
  subtaskId: string;
  description: string;
  content: components['schemas']['SubtaskContent'];
  history?: components['schemas']['SubtaskContent'][];
  version: number;
  onVersionChange: (version: number) => void;
  aiReviewResult?: AiReviewResult | null;
  activeFindingId?: string | null;
  onFindingInteraction?: (action: 'enter' | 'leave' | 'click', findingId: string) => void;
  canUpdateAsset?: boolean;
  isAiReviewing?: boolean;
  onAssetFileUpdate?: (file: File) => Promise<void>;
  isUpdatingAsset?: boolean;
  onUpdateSubtaskStatus?: (newStatus: SubtaskUpdateStatusValue) => void;
  isUpdatingStatus?: boolean;
  onNavigateToSubtask?: (direction: 'next' | 'prev') => void;
  projectId: string;
  onSearchResults?: (
    results: ItemSearchByImageResponse,
    cropInfo: { x: number; y: number; width: number; height: number },
  ) => void;
  onSwitchToSearchPanel?: () => void;
  initialComment?: string;
  onInitialCommentUsed?: () => void;
  // 物品边界框相关
  selectedItemBbox?: [number, number, number, number] | null;
  selectedItemLabel?: string | null;
};

export function SubtaskContent(props: Props) {
  const {
    subtaskId,
    content,
    history = [],
    version,
    onVersionChange,
    aiReviewResult,
    activeFindingId,
    onFindingInteraction,
    canUpdateAsset,
    isAiReviewing,
    onAssetFileUpdate,
    isUpdatingAsset,
    projectId,
    onSearchResults,
    onSwitchToSearchPanel,
    initialComment,
    onInitialCommentUsed,
    selectedItemBbox,
    selectedItemLabel,
  } = props;

  // 获取当前工具状态
  const { currentTool, showAiBoundingBoxes } = useFrameAnnotation();
  const { task_type: taskType, s3_path: s3Path, title: contentTitle } = content;

  const { assetUrl, isAssetLoading } = useAsset(s3Path);
  const [selectedVersion, setSelectedVersion] = useState<number>(version);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [imageNaturalDimensions, setImageNaturalDimensions] = useState({ width: 0, height: 0 });
  const [imageDisplayMetrics, setImageDisplayMetrics] = useState<ImageDisplayMetrics | null>(null);

  // Bounding box editor
  const handleBoundingBoxSave = useCallback(async (findingId: string, newArea: BoundingBox) => {
    try {
      await aiReviewsService.updateFindingBoundingBox(findingId, { area: newArea });
    } catch (error) {
      console.error('Failed to save bounding box:', error);
      throw error; // Re-throw to trigger error state in the editor
    }
  }, []);

  const boundingBoxEditor = useBoundingBoxEditor({
    onSave: handleBoundingBoxSave,
  });

  // All hooks must be called before any conditional returns
  const { annotations, createNewAnnotation, isCreatingAnnotation } = useSubtask(subtaskId, selectedVersion);

  const selectedContent =
    selectedVersion === version ? content : history.find((_, index) => index === selectedVersion - 1);

  const { assetUrl: selectedAssetUrl } = useAsset(selectedContent?.s3_path || '');

  useEffect(() => {
    setSelectedVersion(version);
    setImageDisplayMetrics(null);
  }, [subtaskId, version]);

  useEffect(() => {
    onVersionChange(selectedVersion);
  }, [selectedVersion, onVersionChange]);

  useEffect(() => {
    if (taskType === 'picture' && assetUrl) {
      const img = new Image();
      img.onload = () => {
        setImageNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = assetUrl;
      return () => {
        img.onload = null;
      };
    }
  }, [taskType, assetUrl]);

  // Open modal when initialComment is provided
  useEffect(() => {
    if (initialComment && !isCommentModalOpen) {
      setIsCommentModalOpen(true);
    }
  }, [initialComment, isCommentModalOpen]);

  // Initialize bounding box editor with all findings that have areas
  useEffect(() => {
    if (aiReviewResult && typeof aiReviewResult === 'object' && 'reviewSections' in aiReviewResult) {
      const structuredResult = aiReviewResult as StructuredAiReviewResult;
      structuredResult.reviewSections.forEach((section) => {
        if (section && Array.isArray(section.findings)) {
          section.findings.forEach((finding) => {
            if (finding.area) {
              boundingBoxEditor.initializeFinding(finding.id, finding.area);
            }
          });
        }
      });
    }
  }, [aiReviewResult, subtaskId, boundingBoxEditor.initializeFinding]);

  const currentFileName = selectedContent?.title || contentTitle || 'file';

  const handleAnnotationCreate = (annotation: Annotation) => {
    createNewAnnotation(annotation);
  };

  const handleRequestOpenCommentInput = () => {
    setIsCommentModalOpen(true);
  };

  const handleSearchResults = (
    results: ItemSearchByImageResponse,
    cropInfo?: { x: number; y: number; width: number; height: number },
  ) => {
    console.log('设置搜索结果:', results);

    // 如果有父组件的搜索结果回调，调用它
    if (onSearchResults && cropInfo) {
      onSearchResults(results, cropInfo);
    }
  };

  if (!!s3Path && !isAssetLoading && !assetUrl) {
    return <div>エラー：アセットが見つかりません</div>;
  }

  if (!['text', 'picture', 'video', 'audio', 'word', 'excel'].includes(taskType)) {
    return <div>エラー：サポートされていないタスクタイプです。</div>;
  }

  const requiresAssetUrl = ['text', 'picture', 'video', 'audio', 'word', 'excel'].includes(taskType);

  if (requiresAssetUrl && !assetUrl && isAssetLoading) {
    return <div>読み込み中...</div>;
  }
  if (requiresAssetUrl && !assetUrl && !isAssetLoading) {
    return <div>エラー：アセットの読み込みに失敗しました。 (URL: {s3Path || 'N/A'})</div>;
  }

  let allAiFindings: AiReviewFinding[] = [];
  if (
    aiReviewResult &&
    typeof aiReviewResult === 'object' &&
    'reviewSections' in aiReviewResult &&
    Array.isArray((aiReviewResult as StructuredAiReviewResult).reviewSections)
  ) {
    allAiFindings = (aiReviewResult as StructuredAiReviewResult).reviewSections.reduce(
      (acc: AiReviewFinding[], section: AiReviewSection) => {
        if (section && Array.isArray(section.findings)) {
          return acc.concat(section.findings);
        }
        return acc;
      },
      [],
    );
  }

  return (
    <>
      {taskType === 'text' && assetUrl && (
        <div className="flex flex-col flex-1 gap-2 min-h-0">
          <TextFileViewer assetUrl={assetUrl} fileName={currentFileName || 'textfile.txt'} />
          {subtaskId && (
            <div className="border-t bg-background max-h-48 overflow-y-auto">
              <SubtaskCommentArea
                subtaskId={subtaskId}
                selectedVersion={selectedVersion}
                isModalOpen={isCommentModalOpen}
                onModalOpenChange={setIsCommentModalOpen}
                initialComment={initialComment}
                onInitialCommentUsed={onInitialCommentUsed}
              />
            </div>
          )}
        </div>
      )}
      {taskType === 'text' && !assetUrl && !isAssetLoading && (
        <div>エラー：テキストファイルのコンテンツを読み込めませんでした。</div>
      )}
      {taskType === 'picture' && assetUrl && (
        <div className="flex flex-row flex-1 gap-2 min-h-0">
          <AnnotationToolbar
            disabled={isAiReviewing || isUpdatingAsset}
            subtaskId={subtaskId}
            selectedVersion={selectedVersion}
          />
          <div className="flex flex-col flex-1 gap-2 min-h-0">
            <div ref={imageContainerRef} className="relative bg-muted/30 rounded-md overflow-y-auto flex-1 min-h-0">
              <ImageAnnotation
                imageUrl={selectedVersion === version ? assetUrl : selectedAssetUrl}
                imageAlt={selectedContent?.description || currentFileName || ''}
                annotations={annotations || []}
                onAnnotationCreate={handleAnnotationCreate}
                isSubmitting={isCreatingAnnotation}
                history={history}
                version={version}
                selectedVersion={selectedVersion}
                onVersionChange={setSelectedVersion}
                onAssetFileUpdate={onAssetFileUpdate}
                isUpdatingAsset={isUpdatingAsset}
                canUpdateAsset={canUpdateAsset}
                isAiReviewing={isAiReviewing}
                onImageDisplayMetricsChange={setImageDisplayMetrics}
                onRequestOpenCommentInput={handleRequestOpenCommentInput}
                projectId={projectId}
                onSearchResults={handleSearchResults}
                onSwitchToSearchPanel={onSwitchToSearchPanel}
                subtaskId={subtaskId}
              />
              {currentTool !== 'search' &&
                showAiBoundingBoxes &&
                assetUrl &&
                imageNaturalDimensions.width > 0 &&
                imageDisplayMetrics &&
                allAiFindings.length > 0 &&
                allAiFindings.map((finding: AiReviewFinding) =>
                  finding.area ? (
                    <EditableAiAnnotationBox
                      key={`ai-${finding.id}`}
                      finding={finding}
                      imageNaturalDimensions={imageNaturalDimensions}
                      imageDisplayMetrics={imageDisplayMetrics}
                      isActive={activeFindingId === finding.id}
                      isEditable={true}
                      currentArea={boundingBoxEditor.getCurrentArea(finding.id)}
                      isEditing={boundingBoxEditor.isEditing(finding.id)}
                      isDirty={boundingBoxEditor.isDirty(finding.id)}
                      saveStatus={boundingBoxEditor.getSaveStatus(finding.id)}
                      onMouseEnter={onFindingInteraction ? () => onFindingInteraction('enter', finding.id) : undefined}
                      onMouseLeave={onFindingInteraction ? () => onFindingInteraction('leave', finding.id) : undefined}
                      onClick={onFindingInteraction ? () => onFindingInteraction('click', finding.id) : undefined}
                      onStartEditing={boundingBoxEditor.startEditing}
                      onUpdateWhileEditing={boundingBoxEditor.updateWhileEditing}
                      onFinishEditing={() => boundingBoxEditor.finishEditing(finding.id)}
                      onCancelEditing={boundingBoxEditor.cancelEditing}
                    />
                  ) : null,
                )}

              {/* 物品检测边界框 */}
              {currentTool !== 'search' &&
                selectedItemBbox &&
                selectedItemLabel &&
                assetUrl &&
                imageNaturalDimensions.width > 0 &&
                imageDisplayMetrics && (
                  <ItemDetectionBox
                    key={`item-${selectedItemLabel}`}
                    label={selectedItemLabel}
                    bbox={selectedItemBbox}
                    imageNaturalDimensions={imageNaturalDimensions}
                    imageDisplayMetrics={imageDisplayMetrics}
                    isActive={true}
                  />
                )}
            </div>

            {subtaskId && (
              <div className="border-t bg-background max-h-48 overflow-y-auto">
                <SubtaskCommentArea
                  subtaskId={subtaskId}
                  selectedVersion={selectedVersion}
                  isModalOpen={isCommentModalOpen}
                  onModalOpenChange={setIsCommentModalOpen}
                  initialComment={initialComment}
                  onInitialCommentUsed={onInitialCommentUsed}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {taskType === 'video' && assetUrl && (
        <div className="flex flex-row flex-1 gap-2 min-h-0">
          <AnnotationToolbar
            disabled={isAiReviewing || isUpdatingAsset}
            subtaskId={subtaskId}
            selectedVersion={selectedVersion}
          />
          <div className="flex flex-col flex-1 gap-2 min-h-0">
            <div className="relative bg-muted/30 rounded-md overflow-y-auto flex-1 min-h-0">
              <VideoAnnotation
                videoUrl={assetUrl}
                annotations={annotations || []}
                onAnnotationCreate={handleAnnotationCreate}
                isSubmitting={isCreatingAnnotation}
              />
            </div>
            {subtaskId && (
              <div className="border-t bg-background max-h-48 overflow-y-auto">
                <SubtaskCommentArea
                  subtaskId={subtaskId}
                  selectedVersion={selectedVersion}
                  isModalOpen={isCommentModalOpen}
                  onModalOpenChange={setIsCommentModalOpen}
                  initialComment={initialComment}
                  onInitialCommentUsed={onInitialCommentUsed}
                />
              </div>
            )}
          </div>
        </div>
      )}
      {taskType === 'audio' && assetUrl && (
        <div className="flex flex-col flex-1 gap-2 min-h-0">
          <AudioAnnotation audioUrl={assetUrl} onAnnotationCreate={handleAnnotationCreate} />
          {subtaskId && (
            <div className="border-t bg-background max-h-48 overflow-y-auto">
              <SubtaskCommentArea
                subtaskId={subtaskId}
                selectedVersion={selectedVersion}
                isModalOpen={isCommentModalOpen}
                onModalOpenChange={setIsCommentModalOpen}
                initialComment={initialComment}
                onInitialCommentUsed={onInitialCommentUsed}
              />
            </div>
          )}
        </div>
      )}
      {taskType === 'word' && assetUrl && (
        <div className="flex flex-col flex-1 gap-2 min-h-0">
          <WordViewer assetUrl={assetUrl} originalFileName={currentFileName || 'document.docx'} />
          {subtaskId && (
            <div className="border-t bg-background max-h-48 overflow-y-auto">
              <SubtaskCommentArea
                subtaskId={subtaskId}
                selectedVersion={selectedVersion}
                isModalOpen={isCommentModalOpen}
                onModalOpenChange={setIsCommentModalOpen}
                initialComment={initialComment}
                onInitialCommentUsed={onInitialCommentUsed}
              />
            </div>
          )}
        </div>
      )}
      {taskType === 'excel' && assetUrl && (
        <div className="flex flex-col flex-1 gap-2 min-h-0">
          <ExcelViewer assetUrl={assetUrl} originalFileName={currentFileName || 'spreadsheet.xlsx'} />
          {subtaskId && (
            <div className="border-t bg-background max-h-48 overflow-y-auto">
              <SubtaskCommentArea
                subtaskId={subtaskId}
                selectedVersion={selectedVersion}
                isModalOpen={isCommentModalOpen}
                onModalOpenChange={setIsCommentModalOpen}
                initialComment={initialComment}
                onInitialCommentUsed={onInitialCommentUsed}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}
