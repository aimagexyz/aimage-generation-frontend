import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface SpecialRule {
  speaker: string;
  target: string;
  alias: string;
  conditions: string[];
}

interface SpecialRulesEditorProps {
  rules: SpecialRule[];
  onRulesChange: (rules: SpecialRule[]) => void;
}

export function SpecialRulesEditor({ rules, onRulesChange }: SpecialRulesEditorProps) {
  // 添加新规则
  const handleAddRule = () => {
    const newRule: SpecialRule = {
      speaker: '',
      target: '',
      alias: '',
      conditions: [''],
    };
    onRulesChange([...rules, newRule]);
  };

  // 删除规则
  const handleRemoveRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    onRulesChange(newRules);
  };

  // 更新规则
  const handleUpdateRule = (index: number, field: keyof Omit<SpecialRule, 'conditions'>, value: string) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], [field]: value };
    onRulesChange(newRules);
  };

  // 添加条件
  const handleAddCondition = (ruleIndex: number) => {
    const newRules = [...rules];
    newRules[ruleIndex].conditions.push('');
    onRulesChange(newRules);
  };

  // 删除条件
  const handleRemoveCondition = (ruleIndex: number, conditionIndex: number) => {
    const newRules = [...rules];
    newRules[ruleIndex].conditions = newRules[ruleIndex].conditions.filter((_, i) => i !== conditionIndex);
    onRulesChange(newRules);
  };

  // 更新条件
  const handleUpdateCondition = (ruleIndex: number, conditionIndex: number, value: string) => {
    const newRules = [...rules];
    newRules[ruleIndex].conditions[conditionIndex] = value;
    onRulesChange(newRules);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">特殊ルール設定</h4>
        <Button type="button" variant="outline" size="sm" onClick={handleAddRule} className="flex items-center gap-1">
          <Plus className="w-3 h-3" />
          ルール追加
        </Button>
      </div>

      {rules.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
          特殊ルールが設定されていません。「ルール追加」ボタンをクリックして追加してください。
        </div>
      )}

      {rules.map((rule, ruleIndex) => (
        <div key={ruleIndex} className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">ルール {ruleIndex + 1}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveRule(ruleIndex)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                話し手 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={rule.speaker}
                onChange={(e) => handleUpdateRule(ruleIndex, 'speaker', e.target.value)}
                placeholder="例：ことも"
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                対象 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={rule.target}
                onChange={(e) => handleUpdateRule(ruleIndex, 'target', e.target.value)}
                placeholder="例：お父さん"
                className="text-sm"
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              特殊称呼 <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={rule.alias}
              onChange={(e) => handleUpdateRule(ruleIndex, 'alias', e.target.value)}
              placeholder="例：パパ"
              className="text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-600">適用条件</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleAddCondition(ruleIndex)}
                className="text-xs px-2 py-1 h-6"
              >
                <Plus className="w-3 h-3 mr-1" />
                条件追加
              </Button>
            </div>

            <div className="space-y-2">
              {rule.conditions.map((condition, conditionIndex) => (
                <div key={conditionIndex} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={condition}
                    onChange={(e) => handleUpdateCondition(ruleIndex, conditionIndex, e.target.value)}
                    placeholder="例：小学生のとき"
                    className="text-sm flex-1"
                  />
                  {rule.conditions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveCondition(ruleIndex, conditionIndex)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
