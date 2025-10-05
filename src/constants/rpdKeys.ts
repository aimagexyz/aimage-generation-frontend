export const PREDEFINED_RPD_KEYS = [
  'general_ng_review',
  'visual_review',
  'settings_review',
  'design_review',
  'text_review',
  'copyright_review',
] as const;

export type PredefinedRPDKey = (typeof PREDEFINED_RPD_KEYS)[number];

// NG review subcategories
export const NG_SUBCATEGORIES = ['concrete_shape', 'abstract_type'] as const;

export type NGSubcategory = (typeof NG_SUBCATEGORIES)[number];

// NG subcategory display information
export const NG_SUBCATEGORY_INFO: Record<NGSubcategory, { name: string; description: string }> = {
  concrete_shape: {
    name: '具体形状',
    description: '具体的な形状や物理的な特徴のNG項目',
  },
  abstract_type: {
    name: '抽象類型',
    description: '抽象的な概念や分類のNG項目',
  },
};

// Helper to check if a string is a PredefinedRPDKey
export function isPredefinedRPDKey(key: string): key is PredefinedRPDKey {
  return PREDEFINED_RPD_KEYS.includes(key as PredefinedRPDKey);
}

// Helper to check if a string is a NGSubcategory
export function isNGSubcategory(subcategory: string): subcategory is NGSubcategory {
  return NG_SUBCATEGORIES.includes(subcategory as NGSubcategory);
}
