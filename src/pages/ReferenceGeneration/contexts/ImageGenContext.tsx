import { createContext, useContext } from 'react';

import { useImageGen } from '../hooks/useImageGen';

type ImageGenContextType = ReturnType<typeof useImageGen>;

const ImageGenContext = createContext<ImageGenContextType | null>(null);

export function useImageGenContext() {
  const context = useContext(ImageGenContext);
  if (!context) {
    throw new Error('useImageGenContext must be used within an ImageGenProvider');
  }
  return context;
}

export const ImageGenProvider = ImageGenContext.Provider;
