import { Canvas, PencilBrush } from 'fabric';
import * as React from 'react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { LuTrash2, LuUndo } from 'react-icons/lu';

import { Button } from '@/components/ui/Button';

export type DrawingTool = 'pen' | 'none';

interface DrawingCanvasProps {
  imageUrl: string;
  width: number;
  height: number;
  scale: number;
  paddingX: number;
  paddingY: number;
  isActive: boolean;
  currentTool: DrawingTool;
  currentColor: string;
  brushSize: number;
  onDrawingChange?: (drawingData: string) => void;
  initialDrawingData?: string;
  opacity?: number;
  showControls?: boolean;
  onDelete?: () => void;
}

export interface DrawingCanvasRef {
  clearDrawings: () => void;
  clearAllDrawings: () => void;
  undoLastDrawing: () => void;
  exportAsImage: () => string | null;
  exportCombinedImage: () => Promise<string>;
}

export const DrawingCanvas = React.forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  (
    {
      imageUrl,
      width,
      height,
      scale,
      paddingX,
      paddingY,
      isActive,
      currentTool,
      currentColor,
      brushSize,
      onDrawingChange,
      initialDrawingData,
      opacity = 0.8,
      showControls = true,
      onDelete,
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<Canvas | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    // Reset dataLoaded when initialDrawingData changes
    useEffect(() => {
      setDataLoaded(false);
    }, [initialDrawingData]);

    // Initialize fabric canvas
    useEffect(() => {
      if (!canvasRef.current || fabricCanvasRef.current) {
        return;
      }

      const fabricCanvas = new Canvas(canvasRef.current, {
        isDrawingMode: false,
        selection: false,
        renderOnAddRemove: true,
        skipTargetFind: false,
        stopContextMenu: true,
        fireRightClick: false,
      });

      fabricCanvasRef.current = fabricCanvas;

      // Load initial drawing data if provided
      if (initialDrawingData) {
        void fabricCanvas.loadFromJSON(initialDrawingData, () => {
          // Ensure all loaded objects are non-interactive
          fabricCanvas.getObjects().forEach((obj) => {
            obj.selectable = false;
            obj.evented = false;
          });
          fabricCanvas.renderAll();
          // Mark data as loaded
          setDataLoaded(true);
        });
      } else {
        // No initial data, mark as loaded immediately
        setDataLoaded(true);
      }

      return () => {
        void fabricCanvas.dispose();
        fabricCanvasRef.current = null;
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- Intentionally empty to prevent canvas recreation

    // Load drawing data separately - only when it changes (not during initial load)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        return;
      }

      // Skip if this is the initial mount - data is already loaded in canvas creation useEffect
      if (dataLoaded) {
        return;
      }

      // If no drawing data, mark as loaded and don't clear the canvas (preserve current drawings)
      if (!initialDrawingData) {
        setDataLoaded(true);
        return;
      }

      // Parse to check if it's different from current state
      try {
        const currentState = JSON.stringify(canvas.toJSON());
        if (currentState === initialDrawingData) {
          setDataLoaded(true); // Mark as loaded even if no change needed
          return;
        }
      } catch {
        // Continue with loading
      }

      void canvas.loadFromJSON(initialDrawingData, () => {
        // Ensure all loaded objects are non-interactive
        canvas.getObjects().forEach((obj) => {
          obj.selectable = false;
          obj.evented = false;
        });

        canvas.renderAll();

        // Mark data as loaded to trigger drawing mode setup
        setDataLoaded(true);
      });
    }, [initialDrawingData, dataLoaded]);

    // Update canvas size
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        return;
      }

      const scaledWidth = width * scale;
      const scaledHeight = height * scale;

      canvas.setDimensions({
        width: scaledWidth,
        height: scaledHeight,
      });

      // Apply scale to all objects
      canvas.setZoom(scale);
      canvas.renderAll();
    }, [width, height, scale]);

    // Helper functions for canvas state management
    const makeObjectsNonInteractive = useCallback((canvas: Canvas) => {
      canvas.getObjects().forEach((obj) => {
        obj.selectable = false;
        obj.evented = false;
      });
    }, []);

    const setCanvasPointerEvents = useCallback((canvas: Canvas, enabled: boolean) => {
      const pointerEvents = enabled ? 'auto' : 'none';
      if (canvas.upperCanvasEl) {
        canvas.upperCanvasEl.style.pointerEvents = pointerEvents;
        if (enabled) {
          canvas.upperCanvasEl.style.zIndex = '20';
        }
      }
      if (canvas.lowerCanvasEl) {
        canvas.lowerCanvasEl.style.pointerEvents = pointerEvents;
      }
    }, []);

    const setupPenMode = useCallback(
      (canvas: Canvas) => {
        if (!canvas.isDrawingMode) {
          canvas.isDrawingMode = true;
        }
        canvas.selection = false;
        canvas.skipTargetFind = false;

        // Update brush settings
        if (!canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush = new PencilBrush(canvas);
        }
        canvas.freeDrawingBrush.color = currentColor;
        canvas.freeDrawingBrush.width = brushSize;

        makeObjectsNonInteractive(canvas);
        canvas.renderAll();
        setCanvasPointerEvents(canvas, true);
      },
      [currentColor, brushSize, makeObjectsNonInteractive, setCanvasPointerEvents],
    );

    const setupNonPenMode = useCallback(
      (canvas: Canvas) => {
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.skipTargetFind = true;

        makeObjectsNonInteractive(canvas);
        canvas.renderAll();
        setCanvasPointerEvents(canvas, false);
      },
      [makeObjectsNonInteractive, setCanvasPointerEvents],
    );

    // Update drawing mode and settings - run after data is loaded
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        return;
      }

      // Wait for data to be loaded if we have initial data
      if (initialDrawingData && !dataLoaded) {
        return;
      }

      if (!isActive) {
        setupNonPenMode(canvas);
        return;
      }

      if (currentTool === 'pen') {
        setupPenMode(canvas);
      } else {
        setupNonPenMode(canvas);
      }
    }, [isActive, currentTool, dataLoaded, initialDrawingData, setupPenMode, setupNonPenMode]);

    // Handle drawing events
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        return;
      }

      const handlePathCreated = () => {
        setIsDrawing(false);

        // Ensure all objects on canvas are non-interactive
        canvas.getObjects().forEach((obj) => {
          obj.selectable = false;
          obj.evented = false;
        });

        if (onDrawingChange) {
          const json = JSON.stringify(canvas.toJSON());
          onDrawingChange(json);
        }
      };

      const handleMouseDown = () => {
        if (canvas.isDrawingMode) {
          setIsDrawing(true);
        }
      };

      const handleMouseUp = () => {
        setIsDrawing(false);
      };

      const handleObjectModified = () => {
        if (onDrawingChange) {
          const json = JSON.stringify(canvas.toJSON());
          onDrawingChange(json);
        }
      };

      canvas.on('path:created', handlePathCreated);
      canvas.on('mouse:down', handleMouseDown);
      canvas.on('mouse:up', handleMouseUp);
      canvas.on('object:modified', handleObjectModified);

      return () => {
        canvas.off('path:created', handlePathCreated);
        canvas.off('mouse:down', handleMouseDown);
        canvas.off('mouse:up', handleMouseUp);
        canvas.off('object:modified', handleObjectModified);
      };
    }, [onDrawingChange, isActive, currentTool, dataLoaded]);

    // Clear all drawings from canvas only
    const clearDrawings = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        return;
      }

      canvas.clear();
      if (onDrawingChange) {
        onDrawingChange('');
      }
    }, [onDrawingChange]);

    // Clear all drawings and trigger complete deletion
    const clearAllDrawings = useCallback(() => {
      clearDrawings();
      // The parent component should handle API deletion
    }, [clearDrawings]);

    // Undo last drawing
    const undoLastDrawing = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        return;
      }

      const objects = canvas.getObjects();
      if (objects.length > 0) {
        canvas.remove(objects[objects.length - 1]);
        canvas.renderAll();

        if (onDrawingChange) {
          const json = JSON.stringify(canvas.toJSON());
          onDrawingChange(json);
        }
      }
    }, [onDrawingChange]);

    // Export drawing as image
    const exportAsImage = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        return null;
      }

      return canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1 / scale, // Adjust for scale
      });
    }, [scale]);

    // Helper function to load image and reduce nesting
    const loadImageAsync = useCallback((src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }, []);

    // Helper function to load drawing image
    const loadDrawingImageAsync = useCallback((src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    }, []);

    // Export combined image with drawing overlay
    const exportCombinedImage = useCallback(async (): Promise<string> => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        throw new Error('Canvas not available');
      }

      // Create a new canvas for combining
      const combinedCanvas = document.createElement('canvas');
      const ctx = combinedCanvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size to original image dimensions
      combinedCanvas.width = width;
      combinedCanvas.height = height;

      try {
        // Load the base image
        const img = await loadImageAsync(imageUrl);

        // Draw the base image
        ctx.drawImage(img, 0, 0, width, height);

        // Get drawing as data URL
        const drawingDataUrl = canvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 1 / scale,
        });

        // Load and draw the drawing overlay
        const drawingImg = await loadDrawingImageAsync(drawingDataUrl);
        ctx.globalAlpha = opacity;
        ctx.drawImage(drawingImg, 0, 0, width, height);

        // Export combined result
        return combinedCanvas.toDataURL('image/png');
      } catch (error) {
        throw new Error(`Failed to export combined image: ${error instanceof Error ? error.message : String(error)}`);
      }
    }, [width, height, scale, opacity, imageUrl, loadImageAsync, loadDrawingImageAsync]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        clearDrawings,
        clearAllDrawings,
        undoLastDrawing,
        exportAsImage,
        exportCombinedImage,
      }),
      [clearDrawings, clearAllDrawings, undoLastDrawing, exportAsImage, exportCombinedImage],
    );

    return (
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          left: paddingX,
          top: paddingY,
          width: width * scale,
          height: height * scale,
        }}
      >
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${isActive && currentTool === 'pen' ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{
            opacity,
            cursor: isActive && currentTool === 'pen' ? 'crosshair' : 'default',
            zIndex: isActive && currentTool === 'pen' ? 10 : 1,
          }}
        />
        {isDrawing && (
          <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">描画中...</div>
        )}

        {showControls && isActive && (
          <div className="absolute bottom-2 left-2 flex gap-2 z-10 pointer-events-auto">
            <Button size="sm" variant="secondary" onClick={undoLastDrawing} className="bg-white/90 hover:bg-white">
              <LuUndo className="w-4 h-4 mr-1" />
              元に戻す
            </Button>
            <Button size="sm" variant="secondary" onClick={clearDrawings} className="bg-white/90 hover:bg-white">
              <LuTrash2 className="w-4 h-4 mr-1" />
              クリア
            </Button>
            {onDelete && (
              <Button size="sm" variant="destructive" onClick={onDelete} className="bg-red-500/90 hover:bg-red-500">
                <LuTrash2 className="w-4 h-4 mr-1" />
                完全削除
              </Button>
            )}
          </div>
        )}
      </div>
    );
  },
);

DrawingCanvas.displayName = 'DrawingCanvas';
