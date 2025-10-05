import { Canvas, Control, FabricObject, Group, Image as FabricImage, Rect, Text, util } from 'fabric';
import * as React from 'react';
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { fetchApi } from '@/api/client';

import { type AnnotationTool } from './useFrameAnnotation';

export interface DragData {
  s3Path: string;
  filename: string;
  assetUrl?: string;
  type?: string;
}

export interface ExtendedFabricObject extends FabricObject {
  data?: { id: string };
}

export interface ExtendedGroup extends Group {
  data?: { id: string };
}

export interface ExtendedFabricImage extends FabricImage {
  data?: { id: string };
}

export type FabricControlEvent =
  | {
      e?: Event;
    }
  | MouseEvent
  | TouchEvent;

export interface OverlayImage {
  id: string;
  s3Path: string;
  filename: string;
  assetUrl?: string;
  position: { x: number; y: number }; // 相对位置 (0-1)
  scale: number; // 缩放比例
  opacity: number; // 透明度 (0-1)
  visible: boolean; // 是否可见
  fabricObject?: FabricImage | Group; // fabric.js对象引用
}

interface ImageOverlayCanvasProps {
  width: number;
  height: number;
  scale: number;
  paddingX: number;
  paddingY: number;
  overlayImages: OverlayImage[];
  onOverlayImagesChange?: (updater: ((current: OverlayImage[]) => OverlayImage[]) | OverlayImage[]) => void;
  onOverlaySelect?: (id: string | null) => void;
  isInteractive?: boolean; // 控制是否允许交互
  imageUrl?: string; // 背景图片URL（可选，目前未使用但调用方传递了）
  selectedOverlayId?: string | null; // 当前选中的叠加图片ID
  currentTool?: AnnotationTool; // 当前工具状态
}

export interface ImageOverlayCanvasRef {
  addOverlayImage: (dragData: DragData, position: { x: number; y: number }) => void;
  removeOverlayImage: (id: string) => void;
  updateOverlayImage: (id: string, updates: Partial<OverlayImage>) => void;
  clearAllOverlays: () => void;
}

export const ImageOverlayCanvas = React.forwardRef<ImageOverlayCanvasRef, ImageOverlayCanvasProps>(
  (
    {
      width,
      height,
      scale,
      paddingX,
      paddingY,
      overlayImages,
      onOverlayImagesChange,
      onOverlaySelect,
      isInteractive = true,
      imageUrl: _imageUrl, // 解构新增的属性（当前未使用）
      selectedOverlayId: _selectedOverlayId, // 当前未使用
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<Canvas | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // 初始化fabric canvas
    useEffect(() => {
      if (!canvasRef.current || fabricCanvasRef.current) {
        return;
      }

      try {
        const canvasWidth = width * scale;
        const canvasHeight = height * scale;

        const fabricCanvas = new Canvas(canvasRef.current, {
          width: canvasWidth,
          height: canvasHeight,
          selection: isInteractive,
          preserveObjectStacking: true,
          stopContextMenu: true,
          fireRightClick: false,
          skipTargetFind: !isInteractive,
          // 强制启用事件系统
          allowTouchScrolling: false,
          imageSmoothingEnabled: false,
        });

        fabricCanvasRef.current = fabricCanvas;

        // 强制设置 upperCanvasEl 的 pointer-events
        if (fabricCanvas.upperCanvasEl) {
          fabricCanvas.upperCanvasEl.style.pointerEvents = 'auto';
        }

        // 监听对象选择事件
        fabricCanvas.on('selection:created', (e) => {
          const activeObject = e.selected?.[0] as ExtendedFabricObject;
          if (activeObject && activeObject.data) {
            onOverlaySelect?.(activeObject.data.id);
          }
        });

        fabricCanvas.on('selection:updated', (e) => {
          const activeObject = e.selected?.[0] as ExtendedFabricObject;
          if (activeObject && activeObject.data) {
            onOverlaySelect?.(activeObject.data.id);
          }
        });

        fabricCanvas.on('selection:cleared', () => {
          onOverlaySelect?.(null);
        });

        // 监听对象修改事件
        fabricCanvas.on('object:modified', (e) => {
          const obj = e.target as ExtendedFabricObject;
          if (obj && obj.data) {
            updateOverlayFromFabricObject(obj);
          }
        });

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize fabric canvas:', error);
        setIsInitialized(false);
      }

      return () => {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose()?.catch?.(() => {
            console.error('Failed to dispose fabric canvas');
          });
          fabricCanvasRef.current = null;
        }
        setIsInitialized(false);
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // 更新canvas尺寸
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (canvas && isInitialized) {
        try {
          canvas.setDimensions({
            width: width * scale,
            height: height * scale,
          });
          canvas.renderAll();
        } catch (error) {
          console.error('Failed to update canvas dimensions:', error);
        }
      }
    }, [width, height, scale, isInitialized]);

    // 更新canvas交互性
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (canvas && isInitialized) {
        try {
          const shouldBeInteractive = isInteractive && overlayImages.length > 0;
          canvas.selection = isInteractive;
          canvas.skipTargetFind = !isInteractive;

          // 同步更新 upperCanvasEl 的 pointer-events
          if (canvas.upperCanvasEl) {
            canvas.upperCanvasEl.style.pointerEvents = shouldBeInteractive ? 'auto' : 'none';
          }

          // 如果不可交互，清除选择
          if (!isInteractive && canvas.getActiveObject()) {
            canvas.discardActiveObject();
            canvas.renderAll();
          }
        } catch (error) {
          console.error('Failed to update canvas interactivity:', error);
        }
      }
    }, [isInteractive, isInitialized, overlayImages.length]);

    // 从fabric对象更新overlay数据
    const updateOverlayFromFabricObject = useCallback(
      (fabricObj: ExtendedFabricObject) => {
        if (!fabricObj.data || !onOverlayImagesChange) {
          return;
        }

        // 使用函数式更新确保获取最新的状态
        onOverlayImagesChange?.((currentOverlays: OverlayImage[]) => {
          const updatedOverlays = currentOverlays.map((overlay) => {
            if (fabricObj.data && overlay.id === fabricObj.data.id) {
              return {
                ...overlay,
                position: {
                  x: fabricObj.left / (width * scale),
                  y: fabricObj.top / (height * scale),
                },
                scale: fabricObj.scaleX || 1,
                opacity: fabricObj.opacity || 1,
              };
            }
            return overlay;
          });

          return updatedOverlays;
        });
      },
      [onOverlayImagesChange, width, height, scale], // 移除overlayImages依赖
    );

    // 添加叠加图片
    const addOverlayImage = useCallback(
      async (dragData: DragData, position: { x: number; y: number }) => {
        console.log('🚀 addOverlayImage 被调用:', { dragData, position });

        const canvas = fabricCanvasRef.current;
        console.log('🎨 Canvas 状态检查:', {
          hasCanvas: !!canvas,
          isInitialized,
          canvasWidth: canvas?.width,
          canvasHeight: canvas?.height,
        });

        if (!canvas || !isInitialized) {
          console.warn('❌ Canvas not ready for adding overlay image:', { hasCanvas: !!canvas, isInitialized });
          return;
        }

        // 验证拖拽数据
        if (!dragData || !dragData.s3Path || !dragData.filename) {
          console.error('❌ Invalid drag data for overlay image:', dragData);
          return;
        }

        // 验证位置数据
        if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
          console.error('❌ Invalid position data for overlay image:', position);
          return;
        }

        console.log('✅ 所有验证通过，开始创建叠加图片...');

        const newOverlay: OverlayImage = {
          id: `overlay_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
          s3Path: dragData.s3Path,
          filename: dragData.filename,
          assetUrl: dragData.assetUrl,
          position,
          scale: 1,
          opacity: 1,
          visible: true,
        };

        // 通过API获取正确的签名URL，避免CORS问题
        try {
          const response = await fetchApi({
            url: '/api/v1/assets',
            method: 'get',
            params: { s3_path: dragData.s3Path },
          });

          const signedUrl = response.data.url;
          await loadFabricImageWithSignedUrl(signedUrl, newOverlay, position);
        } catch (error) {
          console.error('Failed to get signed url:', error);
          // Silently handle errors
        }
      },
      [onOverlayImagesChange, onOverlaySelect, width, height, scale, isInitialized],
    );

    // 关闭按钮渲染函数
    const renderCloseButton = useCallback((fabricObj: FabricObject) => {
      return (ctx: CanvasRenderingContext2D, left: number, top: number) => {
        const size = 16;
        ctx.save();
        ctx.translate(left, top);
        ctx.rotate(util.degreesToRadians((fabricObj.angle as number) || 0));

        // 绘制关闭按钮背景
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, 2 * Math.PI);
        ctx.fill();

        // 绘制X符号
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(4, 4);
        ctx.moveTo(4, -4);
        ctx.lineTo(-4, 4);
        ctx.stroke();
        ctx.restore();
      };
    }, []);

    // 透明度滑块渲染函数
    const renderOpacitySlider = useCallback((fabricObj: FabricObject) => {
      return (ctx: CanvasRenderingContext2D, left: number, top: number) => {
        const sliderHeight = 80;
        const sliderWidth = 8;
        const knobSize = 12;

        ctx.save();
        ctx.translate(left, top);

        // 绘制点击区域背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(-10, -sliderHeight / 2, 20, sliderHeight);

        // 绘制滑块轨道
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(-sliderWidth / 2, -sliderHeight / 2, sliderWidth, sliderHeight);

        // 绘制轨道边框
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(-sliderWidth / 2, -sliderHeight / 2, sliderWidth, sliderHeight);

        // 绘制已填充部分
        const currentOpacity = fabricObj.opacity || 1;
        const fillHeight = currentOpacity * sliderHeight;
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(-sliderWidth / 2, sliderHeight / 2 - fillHeight, sliderWidth, fillHeight);

        // 绘制滑块旋钮
        const knobY = sliderHeight / 2 - currentOpacity * sliderHeight;

        // 旋钮阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(1, knobY + 1, knobSize / 2, 0, 2 * Math.PI);
        ctx.fill();

        // 旋钮主体
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(0, knobY, knobSize / 2, 0, 2 * Math.PI);
        ctx.fill();

        // 旋钮边框
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 绘制透明度文本
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${Math.round(currentOpacity * 100)}%`, 0, sliderHeight / 2 + 8);

        ctx.restore();
      };
    }, []);

    // 计算透明度值的辅助函数
    const calculateOpacity = useCallback((e: MouseEvent, canvas: Canvas, fabricObj: FabricObject) => {
      const canvasElement = canvas.getElement();
      const canvasRect = canvasElement.getBoundingClientRect();
      const mouseY = e.clientY - canvasRect.top;
      const imgRect = fabricObj.getBoundingRect();
      const imgCenterY = imgRect.top + imgRect.height / 2;
      const sliderHeight = 80;
      const sliderTop = imgCenterY - sliderHeight / 2;
      const relativeY = Math.max(0, Math.min(1, (mouseY - sliderTop) / sliderHeight));
      return Math.max(0.01, Math.min(1, 1 - relativeY));
    }, []);

    // 更新透明度的辅助函数
    const updateOpacity = useCallback(
      (overlayId: string, newOpacity: number, fabricObj: FabricObject, canvas: Canvas) => {
        fabricObj.set('opacity', newOpacity);
        canvas.requestRenderAll();

        const updateOverlayOpacity = (overlays: OverlayImage[]) =>
          overlays.map((img) => (img.id === overlayId ? { ...img, opacity: newOpacity } : img));
        onOverlayImagesChange?.(updateOverlayOpacity);
      },
      [onOverlayImagesChange],
    );

    // 透明度滑块处理器
    const createOpacityHandler = useCallback(
      (overlayId: string, fabricObj: FabricObject, canvas: Canvas) => {
        return (eventData: FabricControlEvent) => {
          if (eventData && 'e' in eventData && eventData.e) {
            eventData.e.preventDefault();
            eventData.e.stopPropagation();
          }

          let isDragging = true;

          const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) {
              return;
            }

            const newOpacity = calculateOpacity(e, canvas, fabricObj);
            updateOpacity(overlayId, newOpacity, fabricObj, canvas);
          };

          const handleMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
          return true;
        };
      },
      [calculateOpacity, updateOpacity],
    );

    // 移除叠加图片的辅助函数
    const removeOverlayById = useCallback(
      (overlayId: string) => {
        const filterOverlays = (overlays: OverlayImage[]) => overlays.filter((img) => img.id !== overlayId);
        onOverlayImagesChange?.(filterOverlays);
      },
      [onOverlayImagesChange],
    );

    // 关闭按钮处理器
    const createCloseHandler = useCallback(
      (overlayId: string, fabricObj: FabricObject, canvas: Canvas) => {
        return (eventData: FabricControlEvent) => {
          if (eventData && 'e' in eventData && eventData.e) {
            eventData.e.preventDefault();
            eventData.e.stopPropagation();
          }
          canvas.remove(fabricObj);
          canvas.requestRenderAll();
          removeOverlayById(overlayId);
          onOverlaySelect?.(null);
          return true;
        };
      },
      [removeOverlayById, onOverlaySelect],
    );

    // 处理图片加载成功的逻辑
    const handleImageLoaded = useCallback(
      (img: HTMLImageElement, overlay: OverlayImage, pos: { x: number; y: number }) => {
        const fabricImg = new FabricImage(img, {
          left: pos.x,
          top: pos.y,
          scaleX: 0.5,
          scaleY: 0.5,
          opacity: overlay.opacity,
          selectable: true,
          moveCursor: 'move',
          hoverCursor: 'move',
        });

        (fabricImg as ExtendedFabricImage).data = { id: overlay.id };

        const canvas = fabricCanvasRef.current;
        if (!canvas) {
          throw new Error('Canvas not available');
        }

        // 设置图片属性
        fabricImg.set({
          left: pos.x * width * scale,
          top: pos.y * height * scale,
          selectable: true,
          moveCursor: 'grab',
          hoverCursor: 'grab',
          movingCursor: 'grabbing',
        });

        // 添加自定义控件到图片
        fabricImg.set('hasControls', true);
        fabricImg.set('hasBorders', true);

        // 自定义控件：关闭按钮
        fabricImg.controls.closeImg = new Control({
          x: 0.5,
          y: -0.5,
          offsetY: -16,
          offsetX: 16,
          cursorStyle: 'pointer',
          mouseUpHandler: createCloseHandler(overlay.id, fabricImg, canvas),
          render: renderCloseButton(fabricImg),
        });

        // 自定义控件：透明度滑块
        fabricImg.controls.opacitySlider = new Control({
          x: -0.5,
          y: 0,
          offsetX: -30,
          cursorStyle: 'ns-resize',
          sizeX: 20,
          sizeY: 80,
          mouseDownHandler: createOpacityHandler(overlay.id, fabricImg, canvas),
          render: renderOpacitySlider(fabricImg),
        });

        // 添加到Canvas
        canvas.add(fabricImg);
        canvas.bringObjectToFront(fabricImg);
        canvas.setActiveObject(fabricImg);
        canvas.requestRenderAll();

        // 更新React状态
        onOverlayImagesChange?.((currentOverlays) => [...currentOverlays, overlay]);
        onOverlaySelect?.(overlay.id);
      },
      [
        onOverlayImagesChange,
        onOverlaySelect,
        width,
        height,
        scale,
        createCloseHandler,
        createOpacityHandler,
        renderCloseButton,
        renderOpacitySlider,
      ],
    );

    // 创建错误占位图形的函数
    const createErrorPlaceholder = useCallback(
      (overlay: OverlayImage, pos: { x: number; y: number }) => {
        const errorRect = new Rect({
          left: 0,
          top: 0,
          width: 150,
          height: 120,
          fill: '#fee2e2',
          stroke: '#ef4444',
          strokeWidth: 2,
          selectable: false,
        });

        const errorText = new Text('图片加载失败', {
          left: 75,
          top: 45,
          fontSize: 14,
          fill: '#dc2626',
          fontFamily: 'Arial',
          originX: 'center',
          originY: 'center',
          selectable: false,
        });

        const filenameText = new Text(overlay.filename, {
          left: 75,
          top: 75,
          fontSize: 10,
          fill: '#dc2626',
          fontFamily: 'Arial',
          originX: 'center',
          originY: 'center',
          selectable: false,
        });

        const errorGroup = new Group([errorRect, errorText, filenameText], {
          left: pos.x * width * scale,
          top: pos.y * height * scale,
          selectable: true,
          moveCursor: 'grab',
          hoverCursor: 'grab',
        }) as ExtendedGroup;

        errorGroup.data = { id: overlay.id };
        overlay.fabricObject = errorGroup;

        const canvas = fabricCanvasRef.current;
        if (canvas) {
          canvas.add(errorGroup);
          canvas.setActiveObject(errorGroup);
          canvas.renderAll();
        }

        // 使用函数式更新
        onOverlayImagesChange?.((currentOverlays: OverlayImage[]) => {
          return [...currentOverlays, overlay];
        });

        onOverlaySelect?.(overlay.id);
      },
      [onOverlayImagesChange, onOverlaySelect, width, height, scale],
    );

    // 使用签名URL加载Fabric.js图片 - 改用两步法：先用原生Image加载，再转为Fabric对象
    const loadFabricImageWithSignedUrl = useCallback(
      (signedUrl: string, overlay: OverlayImage, pos: { x: number; y: number }) => {
        return new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          const timeoutId = setTimeout(() => {
            reject(new Error('Image loading timeout'));
          }, 15000);

          img.onload = () => {
            clearTimeout(timeoutId);
            try {
              handleImageLoaded(img, overlay, pos);
              resolve();
            } catch (fabricError) {
              console.error('Failed to create fabric image:', fabricError);
              createErrorPlaceholder(overlay, pos);
              resolve();
            }
          };

          img.onerror = () => {
            clearTimeout(timeoutId);
            reject(new Error('Native image loading failed'));
          };

          img.src = signedUrl;
        });
      },
      [handleImageLoaded, createErrorPlaceholder],
    );

    // 删除叠加图片
    const removeOverlayImage = useCallback(
      (id: string) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) {
          return;
        }

        const overlay = overlayImages.find((img) => img.id === id);
        if (overlay && overlay.fabricObject) {
          canvas.remove(overlay.fabricObject);
          canvas.renderAll();
        }

        const updatedOverlays = overlayImages.filter((img) => img.id !== id);
        onOverlayImagesChange?.(updatedOverlays);

        onOverlaySelect?.(null);
      },
      [overlayImages, onOverlayImagesChange, onOverlaySelect],
    );

    // 更新叠加图片属性
    const updateOverlayImage = useCallback(
      (id: string, updates: Partial<OverlayImage>) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) {
          return;
        }

        const overlay = overlayImages.find((img) => img.id === id);
        if (!overlay || !overlay.fabricObject) {
          return;
        }

        // 更新fabric对象
        if (updates.opacity !== undefined) {
          overlay.fabricObject.set('opacity', updates.opacity);
        }
        if (updates.scale !== undefined) {
          overlay.fabricObject.scale(updates.scale);
        }
        if (updates.visible !== undefined) {
          overlay.fabricObject.set('visible', updates.visible);
        }

        canvas.renderAll();

        // 更新state
        const updatedOverlays = overlayImages.map((img) => (img.id === id ? { ...img, ...updates } : img));
        onOverlayImagesChange?.(updatedOverlays);
      },
      [overlayImages, onOverlayImagesChange],
    );

    // 清除所有叠加图片
    const clearAllOverlays = useCallback(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) {
        return;
      }

      canvas.clear();
      onOverlayImagesChange?.([]);
      onOverlaySelect?.(null);
    }, [onOverlayImagesChange, onOverlaySelect]);

    // 暴露方法
    useImperativeHandle(
      ref,
      () => ({
        addOverlayImage,
        removeOverlayImage,
        updateOverlayImage,
        clearAllOverlays,
      }),
      [addOverlayImage, removeOverlayImage, updateOverlayImage, clearAllOverlays],
    );

    // 如果尺寸无效，不渲染组件
    if (width <= 0 || height <= 0 || scale <= 0) {
      return null;
    }

    // 有叠加图片时，优先操作叠加图片（拖拽、变形、调整透明度等）
    const shouldBeInteractive = isInteractive && overlayImages.length > 0;
    const pointerEvents = shouldBeInteractive ? 'pointer-events-auto' : 'pointer-events-none';

    return (
      <div className={`absolute inset-0 ${pointerEvents}`}>
        {/* 移除pointer-events-none，让Canvas接收事件 */}
        <div
          className="absolute"
          style={{
            left: paddingX,
            top: paddingY,
            width: width * scale,
            height: height * scale,
          }}
        >
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 ${pointerEvents}`}
            style={{
              // 图片叠加层始终处于最高层级，用于对比参考，不影响其他画布功能
              zIndex: 35,
              // 确保Canvas可以接收鼠标事件
              cursor: 'default',
            }}
          />
        </div>
      </div>
    );
  },
);

ImageOverlayCanvas.displayName = 'ImageOverlayCanvas';
