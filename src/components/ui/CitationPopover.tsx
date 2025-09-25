import React from 'react';

// 定义引用数据的基本结构
// 后续我们可以根据实际 AI 接口返回的数据结构来调整
export interface CitationData {
  id: string; // 唯一标识
  type: 'text_snippet' | 'image_region' | 'document_reference' | 'rule_id' | 'data_point'; // 引用类型
  content: string; // 主要内容，如文本片段、规则ID、数据值
  sourceName?: string; // 来源名称，如文档名、字段名
  sourceDetails?: string; // 来源详情，如页码、章节、URL
  // 对于图像区域
  imageUrl?: string; // 如果是图片区域引用，相关图片的URL
  coordinates?: { x: number; y: number; width: number; height: number }; // 图片区域的坐标
  // 其他可能的字段
  confidence?: number; // AI 对此引用的置信度
  [key: string]: unknown; // 允许其他自定义字段 (changed from any to unknown)
}

interface CitationPopoverProps {
  citation: CitationData;
  children: React.ReactNode; // 触发 Popover 的元素，例如一个图标或一段文字
}

export function CitationPopover({ citation, children }: CitationPopoverProps): JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);

  // 简单的 Popover 内容渲染逻辑
  const renderContent = () => {
    return (
      <div
        style={{
          // 基础样式，后续可以使用 Tailwind CSS 或 UI 库的样式
          position: 'absolute',
          border: '1px solid #e2e8f0', // slate-300
          backgroundColor: 'white',
          padding: '12px', // p-3
          borderRadius: '0.375rem', // rounded-md
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)', // shadow-lg
          zIndex: 50, // z-50
          minWidth: '250px',
          // 简单的位置处理，实际中可以用UI库处理
          // 以下是注释掉的位置代码，可以在未来实现
          // top: '100%',
          // marginTop: '4px',
        }}
      >
        <h4 style={{ fontWeight: 'bold', marginBottom: '8px' }}>引用来源</h4>
        <p style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
          <strong>ID:</strong> {citation.id}
        </p>
        <p style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
          <strong>类型:</strong> {citation.type}
        </p>
        <p style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
          <strong>内容:</strong> {citation.content}
        </p>
        {citation.sourceName && (
          <p style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
            <strong>来源名称:</strong> {citation.sourceName}
          </p>
        )}
        {citation.sourceDetails && (
          <p style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
            <strong>来源详情:</strong> {citation.sourceDetails}
          </p>
        )}
        {citation.imageUrl && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ fontSize: '0.875rem', marginBottom: '4px' }}>
              <strong>相关图像:</strong>
            </p>
            <img
              src={citation.imageUrl}
              alt={`引用 ${citation.id}`}
              style={{ maxWidth: '100%', maxHeight: '150px', border: '1px solid #cbd5e1' }} // slate-200
            />
            {citation.coordinates && (
              <p style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                区域: x:{citation.coordinates.x}, y:{citation.coordinates.y}, w:
                {citation.coordinates.width}, h:{citation.coordinates.height}
              </p>
            )}
          </div>
        )}
        {citation.confidence !== undefined && (
          <p style={{ fontSize: '0.875rem', marginTop: '4px' }}>
            <strong>置信度:</strong> {(citation.confidence * 100).toFixed(2)}%
          </p>
        )}
      </div>
    );
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {children} {/* 这是触发器，例如一个图标 */}
      {isOpen && renderContent()}
    </div>
  );
}

export default CitationPopover;

// 简单的图标组件作为触发器的示例
export function CitationIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ cursor: 'pointer', color: '#64748b' /* slate-500 */ }}
    >
      {/* <path d="M20 6 9 17l-5-5"></path> 这是原先的勾号，替换为Info图标 */}
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
