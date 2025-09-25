import { useState } from 'react';
import { LuCheck, LuColumns2, LuEye, LuEyeOff, LuSettings } from 'react-icons/lu';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { ScrollArea } from '@/components/ui/ScrollArea';

export type ColumnKey =
  | 'select'
  | 'expand'
  | 'id'
  | 'tid'
  | 'thumbnail'
  | 'name'
  | 'status'
  | 'assignee'
  | 'priority'
  | 'created_at'
  | 'updated_at'
  | 'due_date'
  | 'progress'
  | 'tags'
  | 'category'
  | 'department'
  | 'client'
  | 'budget'
  | 'estimated_hours'
  | 'actual_hours'
  | 'completion_rate'
  | 'download';

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  width?: string;
  sortable?: boolean;
  required?: boolean;
  category: 'basic' | 'status' | 'time' | 'business' | 'metrics';
  description?: string;
}

export const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'select', label: '', width: 'w-12', sortable: false, required: true, category: 'basic' },
  { key: 'expand', label: '', width: 'w-[50px]', required: true, category: 'basic' },
  {
    key: 'id',
    label: 'ID',
    width: 'w-[40px]',
    sortable: false,
    required: true,
    category: 'basic',
    description: 'タスクの一意識別子',
  },
  {
    key: 'thumbnail',
    label: 'サムネイル',
    width: 'w-[160px]',
    sortable: false,
    category: 'basic',
    description: 'タスクの画像サムネイル（最大3枚）',
  },
  {
    key: 'name',
    label: 'タスク名',
    width: 'min-w-[250px] max-w-[400px]',
    sortable: false,
    required: true,
    category: 'basic',
    description: 'タスクの名前と説明',
  },
  { key: 'status', label: 'ステータス', width: 'w-[100px]', category: 'status', description: '現在の進行状況' },
  { key: 'assignee', label: '担当者', width: 'min-w-[150px]', category: 'basic', description: 'タスクの担当者' },
  {
    key: 'priority',
    label: '優先度',
    width: 'w-[100px]',
    sortable: false,
    category: 'status',
    description: 'タスクの重要度レベル',
  },
  {
    key: 'created_at',
    label: '作成日時',
    width: 'min-w-[110px]',
    sortable: true,
    category: 'time',
    description: 'タスクが作成された日時',
  },
  {
    key: 'updated_at',
    label: '更新日時',
    width: 'min-w-[125px]',
    sortable: false,
    category: 'time',
    description: '最後に更新された日時',
  },
  {
    key: 'due_date',
    label: '戻し予定日',
    width: 'w-[120px]',
    sortable: false,
    category: 'time',
    description: 'タスクの完了期限',
  },
  { key: 'progress', label: '進捗', width: 'w-[100px]', category: 'metrics', description: '完了までの進捗率' },
  { key: 'tags', label: 'タグ', width: 'min-w-[120px]', category: 'business', description: 'タスクに関連するタグ' },
  { key: 'category', label: 'カテゴリ', width: 'min-w-[130px]', category: 'business', description: 'タスクの分類' },
  { key: 'department', label: '部署', width: 'min-w-[130px]', category: 'business', description: '担当部署' },
  { key: 'client', label: 'クライアント', width: 'w-[150px]', category: 'business', description: 'クライアント名' },
  {
    key: 'budget',
    label: '予算',
    width: 'w-[100px]',
    sortable: false,
    category: 'business',
    description: 'プロジェクト予算',
  },
  {
    key: 'estimated_hours',
    label: '予定時間',
    width: 'w-[100px]',
    sortable: false,
    category: 'metrics',
    description: '見積もり作業時間',
  },
  {
    key: 'actual_hours',
    label: '実績時間',
    width: 'w-[100px]',
    sortable: false,
    category: 'metrics',
    description: '実際の作業時間',
  },
  {
    key: 'completion_rate',
    label: '完了率',
    width: 'w-[100px]',
    sortable: false,
    category: 'metrics',
    description: 'タスクの完了率',
  },
  {
    key: 'download',
    label: 'アクション',
    width: 'w-[120px]',
    category: 'basic',
    description: 'ファイルのダウンロードと削除',
  },
];

const CATEGORY_LABELS = {
  basic: '基本',
  status: 'ステータス',
  time: '時間',
  business: 'ビジネス',
  metrics: 'メトリクス',
};

const CATEGORY_COLORS = {
  basic: 'bg-blue-100 text-blue-800',
  status: 'bg-green-100 text-green-800',
  time: 'bg-purple-100 text-purple-800',
  business: 'bg-orange-100 text-orange-800',
  metrics: 'bg-pink-100 text-pink-800',
};

interface ColumnManagerProps {
  visibleColumns: ColumnKey[];
  onColumnsChange: (columns: ColumnKey[]) => void;
}

export function ColumnManager({ visibleColumns, onColumnsChange }: ColumnManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColumns, setTempColumns] = useState<ColumnKey[]>(visibleColumns);

  const handleColumnToggle = (columnKey: ColumnKey) => {
    const column = DEFAULT_COLUMNS.find((col) => col.key === columnKey);
    if (column?.required) {
      return;
    } // Don't allow toggling required columns

    setTempColumns((prev) =>
      prev.includes(columnKey) ? prev.filter((key) => key !== columnKey) : [...prev, columnKey],
    );
  };

  const handleApply = () => {
    onColumnsChange(tempColumns);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultVisible = DEFAULT_COLUMNS.filter(
      (col) => col.required || ['status', 'assignee', 'created_at', 'download'].includes(col.key),
    ).map((col) => col.key);
    setTempColumns(defaultVisible);
  };

  const groupedColumns = DEFAULT_COLUMNS.reduce(
    (acc, column) => {
      if (!acc[column.category]) {
        acc[column.category] = [];
      }
      acc[column.category].push(column);
      return acc;
    },
    {} as Record<string, ColumnConfig[]>,
  );

  const visibleCount = tempColumns.length;
  const totalCount = DEFAULT_COLUMNS.length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LuColumns2 className="size-4" />
          列設定
          <Badge variant="secondary" className="ml-1">
            {visibleCount}/{totalCount}
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LuSettings className="size-5" />
            列表示設定
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              表示する列を選択してください ({visibleCount}/{totalCount} 列選択中)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                デフォルトに戻す
              </Button>
              <Button size="sm" onClick={handleApply}>
                <LuCheck className="size-4 mr-1" />
                適用
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedColumns).map(([category, columns]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}>
                      {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({columns.filter((col) => tempColumns.includes(col.key)).length}/{columns.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {columns.map((column) => {
                      const isVisible = tempColumns.includes(column.key);
                      const isRequired = column.required;

                      return (
                        <div
                          key={column.key}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                            isVisible ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                          } ${isRequired ? 'opacity-60' : 'cursor-pointer hover:bg-muted/50'}`}
                          onClick={() => !isRequired && handleColumnToggle(column.key)}
                        >
                          <Checkbox
                            checked={isVisible}
                            disabled={isRequired}
                            onCheckedChange={() => !isRequired && handleColumnToggle(column.key)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {isVisible ? (
                                <LuEye className="size-3 text-green-600" />
                              ) : (
                                <LuEyeOff className="size-3 text-muted-foreground" />
                              )}
                              <span className={`text-sm font-medium ${isRequired ? 'text-muted-foreground' : ''}`}>
                                {column.label || 'アクション'}
                              </span>
                              {isRequired && (
                                <Badge variant="outline" className="text-xs">
                                  必須
                                </Badge>
                              )}
                            </div>
                            {column.description && (
                              <p className="text-xs text-muted-foreground mt-1">{column.description}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
