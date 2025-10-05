import { create } from 'zustand';

import { type components } from '@/api/schemas';

export type AnnotationTool = 'cursor' | 'rect' | 'circle' | 'arrow' | 'text' | 'search' | 'pen' | 'color-picker';

export type Pos = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

export type Rect = components['schemas']['Rect'];

export type Annotation = components['schemas']['SubtaskAnnotation'];

export type SearchContext = {
  source: 'annotation' | 'tool';
  annotationRect?: Rect; // 如果来自注释，保存框位置
};

type FrameAnnotationStore = {
  startPos?: Pos;
  setStartPos: React.Dispatch<React.SetStateAction<Pos | undefined>>;
  currentRect?: Rect;
  setCurrentRect: React.Dispatch<React.SetStateAction<Rect | undefined>>;
  currentTool: AnnotationTool;
  setCurrentTool: React.Dispatch<React.SetStateAction<AnnotationTool>>;
  currentColor: string;
  setCurrentColor: React.Dispatch<React.SetStateAction<string>>;
  currentText: string;
  setCurrentText: React.Dispatch<React.SetStateAction<string>>;
  isShowingAnnotationInput: boolean;
  setIsShowingAnnotationInput: React.Dispatch<React.SetStateAction<boolean>>;
  currentSubmitType?: 'annotation' | 'ai-annotation' | null;
  setCurrentSubmitType: React.Dispatch<React.SetStateAction<'annotation' | 'ai-annotation' | null | undefined>>;
  // 搜索相关状态
  isSearchMode: boolean;
  setIsSearchMode: React.Dispatch<React.SetStateAction<boolean>>;
  searchRect?: Rect;
  setSearchRect: React.Dispatch<React.SetStateAction<Rect | undefined>>;
  // AI边界框显示控制
  showAiBoundingBoxes: boolean;
  setShowAiBoundingBoxes: React.Dispatch<React.SetStateAction<boolean>>;
  // 搜索上下文
  searchContext?: SearchContext;
  setSearchContext: React.Dispatch<React.SetStateAction<SearchContext | undefined>>;
  // 绘图相关状态
  brushSize: number;
  setBrushSize: React.Dispatch<React.SetStateAction<number>>;
  drawingData?: string;
  setDrawingData: React.Dispatch<React.SetStateAction<string | undefined>>;
  isDrawingMode: boolean;
  setIsDrawingMode: React.Dispatch<React.SetStateAction<boolean>>;
  // Color picker related states
  isColorPickerMode: boolean;
  setIsColorPickerMode: React.Dispatch<React.SetStateAction<boolean>>;
  pickedColors: string[];
  setPickedColors: React.Dispatch<React.SetStateAction<string[]>>;
  showColorDialog: boolean;
  setShowColorDialog: React.Dispatch<React.SetStateAction<boolean>>;
  // 引用图片添加
  addReferenceImage: (imageData: { s3Path: string; filename: string }) => void;
  // 基于参考图创建注释
  createAnnotationWithReference: (imageData: { s3Path: string; filename: string }) => void;
  resetImageAnnotation: () => void;
  // 新增：完全重置到初始状态的方法
  resetToInitialState: () => void;
};

function getStateValue<T>(value: React.SetStateAction<T>, prevValue: T): T {
  if (typeof value === 'function') {
    const fn = value as (prev: T) => T;
    return fn(prevValue);
  }
  return value;
}

export const useFrameAnnotation = create<FrameAnnotationStore>((set, get) => ({
  startPos: undefined,
  setStartPos: (v) => set((prev) => ({ startPos: getStateValue(v, prev.startPos) })),
  currentRect: undefined,
  setCurrentRect: (v) => set((prev) => ({ currentRect: getStateValue(v, prev.currentRect) })),
  currentTool: 'cursor',
  setCurrentTool: (v) => set((prev) => ({ currentTool: getStateValue(v, prev.currentTool) })),
  currentColor: '#ff0000',
  setCurrentColor: (v) => set((prev) => ({ currentColor: getStateValue(v, prev.currentColor) })),
  currentText: '',
  setCurrentText: (v) =>
    set((prev) => ({
      currentText: getStateValue(v, prev.currentText),
    })),
  isShowingAnnotationInput: false,
  setIsShowingAnnotationInput: (v) =>
    set((prev) => ({
      isShowingAnnotationInput: getStateValue(v, prev.isShowingAnnotationInput),
    })),
  currentSubmitType: null,
  setCurrentSubmitType: (v) => set((prev) => ({ currentSubmitType: getStateValue(v, prev.currentSubmitType) })),
  // 搜索相关状态
  isSearchMode: false,
  setIsSearchMode: (v) => set((prev) => ({ isSearchMode: getStateValue(v, prev.isSearchMode) })),
  searchRect: undefined,
  setSearchRect: (v) => set((prev) => ({ searchRect: getStateValue(v, prev.searchRect) })),
  // AI边界框显示控制
  showAiBoundingBoxes: false,
  setShowAiBoundingBoxes: (v) => set((prev) => ({ showAiBoundingBoxes: getStateValue(v, prev.showAiBoundingBoxes) })),
  // 搜索上下文
  searchContext: undefined,
  setSearchContext: (v) => set((prev) => ({ searchContext: getStateValue(v, prev.searchContext) })),
  // 绘图相关状态
  brushSize: 5,
  setBrushSize: (v) => set((prev) => ({ brushSize: getStateValue(v, prev.brushSize) })),
  drawingData: undefined,
  setDrawingData: (v) => set((prev) => ({ drawingData: getStateValue(v, prev.drawingData) })),
  isDrawingMode: false,
  setIsDrawingMode: (v) => set((prev) => ({ isDrawingMode: getStateValue(v, prev.isDrawingMode) })),
  // Color picker related states
  isColorPickerMode: false,
  setIsColorPickerMode: (v) => set((prev) => ({ isColorPickerMode: getStateValue(v, prev.isColorPickerMode) })),
  pickedColors: [],
  setPickedColors: (v) => set((prev) => ({ pickedColors: getStateValue(v, prev.pickedColors) })),
  showColorDialog: false,
  setShowColorDialog: (v) => set((prev) => ({ showColorDialog: getStateValue(v, prev.showColorDialog) })),
  // 引用图片添加
  addReferenceImage: (imageData) => {
    // 触发自定义事件，让 AnnotationInput 组件监听
    const event = new CustomEvent('addReferenceImage', { detail: imageData });
    window.dispatchEvent(event);
  },
  // 基于参考图创建注释
  createAnnotationWithReference: (imageData) => {
    const state = get();
    if (state.searchContext?.annotationRect) {
      // 使用搜索时的框位置创建注释
      set(() => ({
        currentRect: state.searchContext?.annotationRect,
        isShowingAnnotationInput: true,
        currentText: '', // 清空文本，让用户输入
        currentTool: 'rect', // 切换到矩形工具
      }));

      // 触发添加引用图片事件
      const event = new CustomEvent('addReferenceImage', { detail: imageData });
      window.dispatchEvent(event);
    }
  },
  resetImageAnnotation: () =>
    set(() => ({
      startPos: undefined,
      currentRect: undefined,
      isShowingAnnotationInput: false,
      currentText: '',
      currentSubmitType: null,
      // 搜索状态不重置，让用户可以继续看到搜索区域
    })),
  // 新增：完全重置到初始状态的方法
  resetToInitialState: () =>
    set(() => ({
      startPos: undefined,
      currentRect: undefined,
      currentTool: 'cursor', //
      currentColor: '#ff0000',
      currentText: '',
      isShowingAnnotationInput: false,
      currentSubmitType: null,
      isSearchMode: false,
      searchRect: undefined, // 清除搜索区域
      showAiBoundingBoxes: false, // 重置AI边界框显示状态
      searchContext: undefined, // 清除搜索上下文
      brushSize: 5,
      drawingData: undefined,
      isDrawingMode: false,
      isColorPickerMode: false,
      pickedColors: [],
      showColorDialog: false,
    })),
}));
