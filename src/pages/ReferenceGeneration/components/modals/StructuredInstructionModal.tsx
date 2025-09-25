import { ArrowRight, Camera, Scissors, Search, Shirt, Smile, Sparkles, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';

// Simplified character creation structure
const characterStructure = {
  basic: {
    title: 'キャラクター基本情報',
    icon: User,
    color: 'bg-blue-100 text-blue-600',
    sections: {
      gender: {
        title: '性別',
        options: ['男性', '女性', 'その他', '中性的'],
      },
      age: {
        title: '年齢',
        options: ['子供', '10代', '20代', '30代', '40代', '50代以上', '不明'],
      },
      bodyType: {
        title: '身長・体型',
        options: ['小柄', '平均的', '高身長', 'スリム', 'ぽっちゃり', 'マッチョ', '小太り'],
      },
      skinColor: {
        title: '肌の色',
        options: ['白い肌', '薄い肌', '普通の肌', '褐色の肌', '黒い肌', '青白い肌'],
      },
      ethnicity: {
        title: '人種・民族的特徴',
        options: ['日本人', '東アジア系', '白人系', '黒人系', 'ヒスパニック系', '中東系', '混血', 'ファンタジー種族'],
      },
    },
  },
  hair: {
    title: '髪型・髪色',
    icon: Scissors,
    color: 'bg-purple-100 text-purple-600',
    sections: {
      style: {
        title: '髪型',
        options: [
          'ショート',
          'ミディアム',
          'ロング',
          'ポニーテール',
          'ツインテール',
          'お団子',
          '編み込み',
          'パーマ',
          'ストレート',
          'カーリー',
          '坊主',
          'ツーブロック',
        ],
      },
      bangs: {
        title: '前髪',
        options: ['ぱっつん', '流し前髪', 'センター分け', '斜め前髪', 'シースルー', '前髪なし', 'オン眉', 'うざバング'],
      },
      color: {
        title: '髪の色',
        options: [
          '黒髪',
          '茶髪',
          '金髪',
          '銀髪',
          '白髪',
          '赤髪',
          '青髪',
          '緑髪',
          '紫髪',
          'ピンク髪',
          'マルチカラー',
          'グラデーション',
        ],
      },
    },
  },
  expression: {
    title: '表情',
    icon: Smile,
    color: 'bg-green-100 text-green-600',
    sections: {
      face: {
        title: '表情',
        options: [
          '笑顔',
          '微笑み',
          '無表情',
          '困り顔',
          '怒り顔',
          '悲しい顔',
          '驚き顔',
          '照れ顔',
          'ウィンク',
          '泣き顔',
          '眠そう',
          'あくび',
        ],
      },
    },
  },
  clothing: {
    title: '服装・装飾品',
    icon: Shirt,
    color: 'bg-orange-100 text-orange-600',
    sections: {
      theme: {
        title: 'テーマ',
        options: [
          '現代風',
          '和風',
          'ファンタジー',
          'SF',
          '制服',
          'カジュアル',
          'フォーマル',
          'ゴシック',
          'ロリータ',
          '魔法少女',
          '戦闘服',
        ],
      },
      tops: {
        title: 'トップス',
        options: [
          'Tシャツ',
          'シャツ',
          'ブラウス',
          'セーター',
          'パーカー',
          'ジャケット',
          'コート',
          'ドレス',
          '着物',
          '制服',
          '甲冑',
          'ローブ',
        ],
      },
      bottoms: {
        title: 'ボトムス',
        options: [
          'ジーンズ',
          'スカート',
          'ミニスカート',
          'ロングスカート',
          'ショートパンツ',
          'レギンス',
          '袴',
          'ズボン',
          'チノパン',
        ],
      },
      accessories: {
        title: 'アクセサリー・小物',
        options: [
          '帽子',
          'キャップ',
          '眼鏡',
          'サングラス',
          'ピアス',
          'ネックレス',
          'ブレスレット',
          '指輪',
          'バッグ',
          'リュック',
          'ぬいぐるみ',
          '本',
          '剣',
          '杖',
        ],
      },
    },
  },
  pose: {
    title: 'ポーズ・構図',
    icon: Camera,
    color: 'bg-pink-100 text-pink-600',
    sections: {
      pose: {
        title: 'ポーズ',
        options: [
          '立ちポーズ',
          '座りポーズ',
          '寝そべり',
          'ジャンプ',
          '走る',
          '歩く',
          '踊る',
          '戦闘ポーズ',
          'リラックス',
        ],
      },
      gaze: {
        title: '視線の方向',
        options: ['正面', '横向き', '斜め', '上を見る', '下を見る', '目を閉じる', 'こちらを見る', '遠くを見る'],
      },
      composition: {
        title: '構図のタイプ',
        options: ['顔アップ', 'バストアップ', '膝上', '全身', '後ろ姿', '横顔', '俯瞰', '仰角'],
      },
      hands: {
        title: '手の動き',
        options: [
          'ピース',
          '手を振る',
          'ポケットに入れる',
          '腰に手を当てる',
          '頬杖',
          '胸に手を当てる',
          '指差し',
          '拍手',
          '握手',
          '祈り',
        ],
      },
    },
  },
};

// Single selection type - each category can only have one selection
export type StructuredSelections = Record<string, string>;

type StructuredInstructionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selections: StructuredSelections) => void;
  initialSelections: StructuredSelections;
};

type SearchResult = {
  tabKey: string;
  tabTitle: string;
  tabIcon: React.ComponentType<{ className?: string }>;
  tabColor: string;
  sectionKey: string;
  sectionTitle: string;
  categoryKey: string;
  option: string;
  isSelected: boolean;
};

type TabConfig = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sections: Record<string, { title: string; options: string[] }>;
};

export function StructuredInstructionModal({
  isOpen,
  onClose,
  onConfirm,
  initialSelections,
}: StructuredInstructionModalProps) {
  const [selections, setSelections] = useState<StructuredSelections>(initialSelections);
  const [activeTab, setActiveTab] = useState('basic');
  const [globalSearch, setGlobalSearch] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelections(initialSelections);
    }
  }, [isOpen, initialSelections]);

  // Global search across all categories
  const getSearchResults = (): SearchResult[] => {
    if (!globalSearch.trim()) {
      return [];
    }

    const results: SearchResult[] = [];
    const query = globalSearch.toLowerCase();

    // Flatten the nested loops to reduce nesting
    for (const [tabKey, tabConfig] of Object.entries(characterStructure)) {
      for (const [sectionKey, sectionConfig] of Object.entries(tabConfig.sections)) {
        const categoryKey = `${tabKey}-${sectionKey}`;
        const currentSelection = selections[categoryKey];

        for (const option of sectionConfig.options) {
          if (option.toLowerCase().includes(query)) {
            results.push({
              tabKey,
              tabTitle: tabConfig.title,
              tabIcon: tabConfig.icon,
              tabColor: tabConfig.color,
              sectionKey,
              sectionTitle: sectionConfig.title,
              categoryKey,
              option,
              isSelected: currentSelection === option,
            });
          }
        }
      }
    }

    return results;
  };

  const searchResults = getSearchResults();

  useEffect(() => {
    setIsSearchMode(globalSearch.trim().length > 0);
  }, [globalSearch]);

  // Single selection logic - radio button behavior
  const handleSelectionToggle = (category: string, option: string) => {
    setSelections((prev) => {
      const currentSelection = prev[category];

      if (currentSelection === option) {
        // Deselect if clicking the same option
        const newSelections = { ...prev };
        delete newSelections[category];
        return newSelections;
      } else {
        // Select new option (replaces any existing selection)
        return {
          ...prev,
          [category]: option,
        };
      }
    });
  };

  const handleClear = () => {
    setSelections({});
  };

  const handleConfirm = () => {
    onConfirm(selections);
    onClose();
  };

  const getTotalSelections = () => {
    return Object.keys(selections).length;
  };

  const getTabSelections = (tabKey: string) => {
    const tabStructure = characterStructure[tabKey as keyof typeof characterStructure];
    return Object.keys(tabStructure.sections).reduce((acc, sectionKey) => {
      const categoryKey = `${tabKey}-${sectionKey}`;
      return acc + (selections[categoryKey] ? 1 : 0);
    }, 0);
  };

  const handleGoToTab = (tabKey: string) => {
    setActiveTab(tabKey);
    setGlobalSearch('');
  };

  // Extract search results grouping to reduce nesting
  const groupSearchResults = (results: SearchResult[]) => {
    return results.reduce(
      (groups, result) => {
        const key = `${result.tabKey}-${result.sectionKey}`;
        if (!groups[key]) {
          groups[key] = {
            ...result,
            options: [] as SearchResult[],
          };
        }
        groups[key].options.push(result);
        return groups;
      },
      {} as Record<string, SearchResult & { options: SearchResult[] }>,
    );
  };

  // Extract tab section component to reduce nesting
  const renderTabSection = (
    sectionKey: string,
    sectionConfig: { title: string; options: string[] },
    tabConfig: TabConfig,
    tabKey: string,
  ) => {
    const categoryKey = `${tabKey}-${sectionKey}`;
    const currentSelection = selections[categoryKey];

    return (
      <div key={sectionKey} className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${tabConfig.color}`}>
              <tabConfig.icon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-medium text-lg">{sectionConfig.title}</h3>
            </div>
          </div>
        </div>

        {/* Options grid - no individual scrolling */}
        <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {sectionConfig.options.map((option: string) => {
              const isSelected = currentSelection === option;
              return (
                <button
                  key={option}
                  onClick={() => handleSelectionToggle(categoryKey, option)}
                  className={`p-3 text-sm rounded-lg border transition-all text-left ${
                    isSelected
                      ? 'bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-900/50 dark:border-purple-400 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600'
                  }`}
                >
                  {option}
                  {isSelected && <span className="ml-2 text-xs text-purple-500">●</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                キャラクター特徴一覧
              </DialogTitle>
              <DialogDescription>
                {isSearchMode
                  ? '検索結果から選択してください（各カテゴリ1つまで）'
                  : 'カテゴリから選択して詳細なキャラクター設定を行います（各カテゴリ1つまで）'}
              </DialogDescription>
            </div>
            {getTotalSelections() > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <span>{getTotalSelections()}カテゴリ選択中</span>
              </Badge>
            )}
          </div>

          {/* Global search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="すべてのカテゴリから検索... (例: 笑顔、ドレス、ポニーテール)"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="pl-9"
            />
            {globalSearch && (
              <button
                onClick={() => setGlobalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </DialogHeader>

        {isSearchMode ? (
          <div className="flex-1 overflow-y-auto space-y-4 p-4 min-h-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-lg">
            <div className="text-center text-gray-600 dark:text-gray-400 mb-4">
              <Search className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
              <p className="text-lg font-medium">「{globalSearch}」の検索結果</p>
              <p className="text-sm text-gray-500">{searchResults.length}件の項目が見つかりました</p>
            </div>

            {Object.values(groupSearchResults(searchResults)).map((group) => {
              const TabIcon = group.tabIcon;
              return (
                <div
                  key={`${group.tabKey}-${group.sectionKey}`}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Section header */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${group.tabColor}`}>
                          <TabIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium">{group.sectionTitle}</h3>
                          <p className="text-sm text-gray-500">{group.tabTitle}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGoToTab(group.tabKey)}
                        className="text-purple-600 hover:text-purple-700 font-semibold"
                      >
                        カテゴリへ移動
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Search result options */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {group.options.map((result) => (
                        <button
                          key={result.option}
                          onClick={() => handleSelectionToggle(result.categoryKey, result.option)}
                          className={`p-3 text-sm rounded-lg border transition-all text-left ${
                            result.isSelected
                              ? 'bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-900/50 dark:border-purple-400 shadow-sm'
                              : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-600'
                          }`}
                        >
                          {result.option}
                          {result.isSelected && <span className="ml-2 text-xs text-purple-500">●</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {searchResults.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <Search className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                <p>「{globalSearch}」に一致する項目がありません</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setGlobalSearch('')}>
                  検索をクリア
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5 mb-4 flex-shrink-0">
                {Object.entries(characterStructure).map(([key, config]) => {
                  const Icon = config.icon;
                  const selectionCount = getTabSelections(key);
                  return (
                    <TabsTrigger key={key} value={key} className="flex items-center gap-2 relative">
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{config.title}</span>
                      {selectionCount > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs rounded-full">
                          {selectionCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {Object.entries(characterStructure).map(([tabKey, tabConfig]) => (
                <TabsContent key={tabKey} value={tabKey} className="flex-1 overflow-hidden min-h-0">
                  <div className="h-full overflow-y-auto space-y-6 p-1">
                    {Object.entries(tabConfig.sections).map(
                      ([sectionKey, sectionConfig]: [string, { title: string; options: string[] }]) => {
                        return renderTabSection(sectionKey, sectionConfig, tabConfig, tabKey);
                      },
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="ghost" onClick={handleClear} disabled={getTotalSelections() === 0}>
            すべてクリア
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleConfirm} disabled={getTotalSelections() === 0}>
              確定 ({getTotalSelections()}カテゴリ)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
