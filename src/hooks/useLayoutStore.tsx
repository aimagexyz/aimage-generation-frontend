import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const localStorageKey = 'aimage-supervision-layout';

type LayoutStore = {
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  isSubtaskInfoPanelCollapsed: boolean;
  setSubtaskInfoPanelCollapsed: (collapsed: boolean) => void;
  isShowSolvedAnnotations: boolean;
  setIsShowSolvedAnnotations: (v: boolean) => void;
};

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      isSubtaskInfoPanelCollapsed: false,
      setSubtaskInfoPanelCollapsed: (collapsed) => set({ isSubtaskInfoPanelCollapsed: collapsed }),
      isShowSolvedAnnotations: false,
      setIsShowSolvedAnnotations: (v) => set({ isShowSolvedAnnotations: v }),
    }),
    { name: localStorageKey },
  ),
);
