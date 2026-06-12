import React, { useRef } from 'react';
import { useEditorStore, CANVAS_DIMENSIONS } from '../stores/editorStore';
import type { EditorElement } from '../types';

export default function Canvas() {
  const {
    format,
    canvasBg,
    elements,
    selectedIds,
    selectElement,
    updateElements,
    activeGuides,
    setActiveGuides,
    gridSettings,
    saveHistory
  } = useEditorStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Dragging local tracking references
  const dragInfoRef = useRef<{
    draggedId: string | null;
    initialPointer: { x: number; y: number };
    initialPositions: Record<string, { x: number; y: number }>;
    hasMoved: boolean;
  }>({
    draggedId: null,
    initialPointer: { x: 0, y: 0 },
    initialPositions: {},
    hasMoved: false
  });

  const handlePointerDown = (e: React.PointerEvent, el: EditorElement) => {
    if (el.isLocked || el.isHidden) return;
    
    // Support multi-selection with Shift key
    selectElement(el.id, e.shiftKey);
    e.stopPropagation();

    // Get current elements state to prepare drag tracking
    const storeState = useEditorStore.getState();
    const currentSelectedIds = storeState.selectedIds.includes(el.id)
      ? storeState.selectedIds
      : [el.id];

    // Record initial coordinates of all selected items
    const initialPositions: Record<string, { x: number; y: number }> = {};
    storeState.elements.forEach(item => {
      if (currentSelectedIds.includes(item.id)) {
        initialPositions[item.id] = { x: item.x, y: item.y };
      }
    });

    dragInfoRef.current = {
      draggedId: el.id,
      initialPointer: { x: e.clientX, y: e.clientY },
      initialPositions,
      hasMoved: false
    };

    // Attach global window listeners for smooth dragging outside viewport
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // Set pointer capture to lock events
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const info = dragInfoRef.current;
    if (!info.draggedId) return;

    if (!info.hasMoved) {
      // Save history snapshot on the very first drag movement
      saveHistory();
      info.hasMoved = true;
    }

    const dx = e.clientX - info.initialPointer.x;
    const dy = e.clientY - info.initialPointer.y;

    const mainElStart = info.initialPositions[info.draggedId];
    if (!mainElStart) return;

    let targetX = mainElStart.x + dx;
    let targetY = mainElStart.y + dy;

    // 1. Grid Snapping
    if (gridSettings.snapToGrid && gridSettings.gridSize > 0) {
      targetX = Math.round(targetX / gridSettings.gridSize) * gridSettings.gridSize;
      targetY = Math.round(targetY / gridSettings.gridSize) * gridSettings.gridSize;
    }

    // 2. Smart Align Guides
    let guideX: number | null = null;
    let guideY: number | null = null;
    const snapThreshold = 8;

    const mainDom = document.getElementById(`element-${info.draggedId}`);
    const mainW = mainDom ? mainDom.offsetWidth : 100;
    const mainH = mainDom ? mainDom.offsetHeight : 50;

    const canvasDom = canvasRef.current;
    const canvasW = canvasDom ? canvasDom.offsetWidth : 1080;
    const canvasH = canvasDom ? canvasDom.offsetHeight : 1920;

    // Center snaps for Canvas itself
    const mainCenterX = targetX + mainW / 2;
    const mainCenterY = targetY + mainH / 2;

    if (Math.abs(mainCenterX - canvasW / 2) <= snapThreshold) {
      targetX = canvasW / 2 - mainW / 2;
      guideX = canvasW / 2;
    }
    if (Math.abs(mainCenterY - canvasH / 2) <= snapThreshold) {
      targetY = canvasH / 2 - mainH / 2;
      guideY = canvasH / 2;
    }

    // Align with all OTHER visible elements in canvas
    const otherElements = elements.filter(
      item => !Object.keys(info.initialPositions).includes(item.id) && !item.isHidden
    );

    for (const other of otherElements) {
      const otherDom = document.getElementById(`element-${other.id}`);
      const otherW = otherDom ? otherDom.offsetWidth : 100;
      const otherH = otherDom ? otherDom.offsetHeight : 50;
      const otherX = other.x;
      const otherY = other.y;

      // --- Horizontal Snapping (X-axis alignments) ---
      // Left to Left
      if (Math.abs(targetX - otherX) <= snapThreshold) {
        targetX = otherX;
        guideX = otherX;
      }
      // Right to Right
      else if (Math.abs((targetX + mainW) - (otherX + otherW)) <= snapThreshold) {
        targetX = otherX + otherW - mainW;
        guideX = otherX + otherW;
      }
      // Center to Center
      else if (Math.abs((targetX + mainW / 2) - (otherX + otherW / 2)) <= snapThreshold) {
        targetX = otherX + otherW / 2 - mainW / 2;
        guideX = otherX + otherW / 2;
      }
      // Left to Right
      else if (Math.abs(targetX - (otherX + otherW)) <= snapThreshold) {
        targetX = otherX + otherW;
        guideX = otherX + otherW;
      }
      // Right to Left
      else if (Math.abs((targetX + mainW) - otherX) <= snapThreshold) {
        targetX = otherX - mainW;
        guideX = otherX;
      }

      // --- Vertical Snapping (Y-axis alignments) ---
      // Top to Top
      if (Math.abs(targetY - otherY) <= snapThreshold) {
        targetY = otherY;
        guideY = otherY;
      }
      // Bottom to Bottom
      else if (Math.abs((targetY + mainH) - (otherY + otherH)) <= snapThreshold) {
        targetY = otherY + otherH - mainH;
        guideY = otherY + otherH;
      }
      // Center to Center
      else if (Math.abs((targetY + mainH / 2) - (otherY + otherH / 2)) <= snapThreshold) {
        targetY = otherY + otherH / 2 - mainH / 2;
        guideY = otherY + otherH / 2;
      }
      // Top to Bottom
      else if (Math.abs(targetY - (otherY + otherH)) <= snapThreshold) {
        targetY = otherY + otherH;
        guideY = otherY + otherH;
      }
      // Bottom to Top
      else if (Math.abs((targetY + mainH) - otherY) <= snapThreshold) {
        targetY = otherY - mainH;
        guideY = otherY;
      }
    }

    // Set visual guide lines in state
    setActiveGuides({ x: guideX, y: guideY });

    // Calculate actual delta change for multi-drag
    const appliedDx = targetX - mainElStart.x;
    const appliedDy = targetY - mainElStart.y;

    // Apply movement delta to ALL selected items
    const selectedIdsToMove = Object.keys(info.initialPositions);
    updateElements(selectedIdsToMove, (item) => {
      const start = info.initialPositions[item.id];
      if (!start) return {};
      return {
        x: start.x + appliedDx,
        y: start.y + appliedDy
      };
    });
  };

  const handlePointerUp = () => {
    // Clear alignment visual lines
    setActiveGuides({ x: null, y: null });

    dragInfoRef.current = {
      draggedId: null,
      initialPointer: { x: 0, y: 0 },
      initialPositions: {},
      hasMoved: false
    };

    // Remove window listeners
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const getTextStyles = (el: EditorElement): React.CSSProperties => {
    let baseStyles: React.CSSProperties = {
      whiteSpace: 'pre-wrap',
      lineHeight: '1.1',
      fontFamily: el.fontFamily,
      textTransform: el.fontFamily === "'Bebas Neue', sans-serif" ? 'uppercase' : 'none',
      color: el.color,
      opacity: (el.opacity ?? 100) / 100,
      mixBlendMode: el.mixBlendMode || 'normal',
    };

    if (el.bgStyle === 'solid') {
      baseStyles = { 
        ...baseStyles, 
        backgroundColor: el.bgColor || '#000000', 
        padding: '16px 24px', 
        borderRadius: '8px' 
      };
    } else if (el.bgStyle === 'glass') {
      baseStyles = { 
        ...baseStyles, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        backdropFilter: 'blur(20px)', 
        padding: '16px 24px', 
        border: '1px solid rgba(255,255,255,0.1)', 
        borderRadius: '12px' 
      };
    } else if (el.bgStyle === 'gradient') {
      baseStyles = { 
        ...baseStyles, 
        background: 'linear-gradient(135deg, #10b981 0%, #0f172a 100%)', 
        padding: '16px 24px', 
        borderRadius: '8px', 
        border: 'none' 
      };
    }

    if (el.textEffect === 'shadow') {
      baseStyles.textShadow = '0 10px 30px rgba(0,0,0,0.9), 0 5px 10px rgba(0,0,0,0.8)';
    } else if (el.textEffect === 'neon') {
      baseStyles.textShadow = `0 0 10px ${el.color}, 0 0 20px ${el.color}, 0 0 40px ${el.color}, 0 0 80px ${el.color}`;
      baseStyles.color = '#ffffff';
    } else if (el.textEffect === 'outline') {
      baseStyles.WebkitTextStroke = `2px ${el.color}`;
      baseStyles.color = 'transparent';
    } else if (el.textEffect === 'text-gradient') {
      baseStyles.background = `linear-gradient(135deg, #ffffff, ${el.color})`;
      baseStyles.WebkitBackgroundClip = 'text';
      baseStyles.WebkitTextFillColor = 'transparent';
    }

    return baseStyles;
  };

  return (
    <div 
      className="flex-1 bg-[#020202] overflow-auto flex items-center justify-center p-8 relative z-10 custom-scrollbar select-none" 
      style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #111827 0%, #000000 100%)' }}
      onClick={() => useEditorStore.getState().clearSelection()}
    >
      <div
        ref={canvasRef}
        id="editor-canvas-container"
        className={`relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] ring-1 ring-white/10 shrink-0 transition-all duration-300 ${
          CANVAS_DIMENSIONS[format].css
        }`}
        style={{ background: canvasBg }}
      >
        {/* Empty Canvas Indicator */}
        {elements.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 font-medium pointer-events-none px-4 text-center z-50">
            <span className="text-5xl mb-4 opacity-30">🖼️</span>
            Elige un fondo o sube una imagen para arrancar
          </div>
        )}

        {/* Dynamic elements layers */}
        {elements
          .filter(el => !el.isHidden)
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((el) => {
            const isSelected = selectedIds.includes(el.id);
            return (
              <div
                key={el.id}
                id={`element-${el.id}`}
                onPointerDown={(e) => handlePointerDown(e, el)}
                className={`absolute transition-shadow touch-none ${
                  el.isLocked ? 'cursor-default' : 'cursor-move'
                } ${
                  isSelected 
                    ? 'ring-2 ring-blue-500 z-[999] shadow-2xl' 
                    : 'hover:ring-1 hover:ring-white/30'
                }`}
                style={{
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  zIndex: isSelected ? 999 : el.zIndex,
                  width: el.type === 'image' || el.type === 'shape' || el.type === 'chart' ? `${el.width}px` : 'auto',
                  height: el.type === 'shape' || el.type === 'chart' ? `${el.height}px` : 'auto',
                }}
              >
                {el.type === 'text' && (
                  <div style={{ ...getTextStyles(el), fontSize: `${el.fontSize}px` }}>
                    {el.content}
                  </div>
                )}

                {el.type === 'image' && (
                  <img
                    src={el.content}
                    alt="Capa Imagen"
                    className="w-full block pointer-events-none"
                    style={{
                      filter: `brightness(${el.brightness}%) contrast(${el.contrast}%) saturate(${el.saturate}%) blur(${el.blur}px) grayscale(${el.grayscale}%) sepia(${el.sepia}%) hue-rotate(${el.hueRotate}deg)`,
                      opacity: `${el.opacity}%`,
                      mixBlendMode: el.mixBlendMode,
                    }}
                  />
                )}

                {el.type === 'icon' && (
                  <div style={{ fontSize: `${el.fontSize}px`, filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.8))' }}>
                    {el.content}
                  </div>
                )}

                {el.type === 'shape' && (
                  <div className="w-full h-full relative" style={{ opacity: (el.opacity ?? 100) / 100 }}>
                    {el.shapeType === 'rectangle' && (
                      <div 
                        className="w-full h-full rounded-md" 
                        style={{ 
                          backgroundColor: el.fillColor || '#10b981', 
                          borderColor: el.strokeColor || '#ffffff', 
                          borderWidth: `${el.strokeWidth ?? 2}px` 
                        }} 
                      />
                    )}
                    {el.shapeType === 'circle' && (
                      <div 
                        className="w-full h-full rounded-full" 
                        style={{ 
                          backgroundColor: el.fillColor || '#3b82f6', 
                          borderColor: el.strokeColor || '#ffffff', 
                          borderWidth: `${el.strokeWidth ?? 2}px` 
                        }} 
                      />
                    )}
                    {el.shapeType === 'arrow' && (
                      <div 
                        className="w-full h-full flex items-center justify-center font-bold text-white leading-none" 
                        style={{ 
                          backgroundColor: el.fillColor || '#ef4444', 
                          fontSize: `${(el.width || 100) / 2.5}px` 
                        }}
                      >
                        ➔
                      </div>
                    )}
                    {el.shapeType === 'line' && (
                      <div 
                        className="w-full h-[4px] rounded" 
                        style={{ 
                          backgroundColor: el.strokeColor || '#ffffff',
                          marginTop: 'calc(50% - 2px)'
                        }} 
                      />
                    )}
                  </div>
                )}

                {el.type === 'chart' && (
                  <div 
                    className="w-full h-full bg-black/90 p-4 rounded-xl border border-white/10 flex flex-col font-sans"
                    style={{ opacity: (el.opacity ?? 100) / 100 }}
                  >
                    <span className="text-[10px] text-gray-500 uppercase font-black block mb-2">{el.name}</span>
                    <div className="flex-1 flex gap-2 items-end justify-between border-b border-l border-white/10 p-2 relative h-[80%]">
                      {el.chartData && (() => {
                        const prices = el.chartData.flatMap(d => [d.open, d.high, d.low, d.close]);
                        const maxPrice = Math.max(...prices, 150);
                        const minPrice = Math.min(...prices, 80);
                        const priceRange = maxPrice - minPrice || 1;

                        return el.chartData.map((d, idx) => {
                          const wickTop = ((maxPrice - d.high) / priceRange) * 100;
                          const wickHeight = ((d.high - d.low) / priceRange) * 100;
                          
                          const bodyTop = ((maxPrice - Math.max(d.open, d.close)) / priceRange) * 100;
                          const bodyHeight = ((Math.abs(d.close - d.open)) / priceRange) * 100;
                          
                          const isGreen = d.close >= d.open;
                          const candleColor = isGreen ? '#10b981' : '#ef4444';

                          if (el.chartType === 'candlestick') {
                            return (
                              <div key={idx} className="flex-1 flex flex-col items-center relative h-full">
                                {/* Wick (linea fina) */}
                                <div 
                                  className="absolute w-[1.5px] z-10" 
                                  style={{ top: `${wickTop}%`, height: `${wickHeight}%`, backgroundColor: candleColor }}
                                />
                                {/* Body (caja gruesa) */}
                                <div 
                                  className="absolute w-[60%] rounded-[1px] z-20" 
                                  style={{ top: `${bodyTop}%`, height: `${Math.max(bodyHeight, 2)}%`, backgroundColor: candleColor }}
                                />
                                {/* Label */}
                                <span className="absolute bottom-[-18px] text-[8px] text-gray-500 font-mono truncate max-w-full">
                                  {d.label}
                                </span>
                              </div>
                            );
                          } else {
                            // Bar chart volume/price
                            const barHeight = ((d.close - minPrice) / priceRange) * 100;
                            return (
                              <div key={idx} className="flex-1 flex flex-col justify-end items-center relative h-full">
                                <div 
                                  className="w-[70%] rounded-t-sm" 
                                  style={{ height: `${Math.max(barHeight, 5)}%`, backgroundColor: el.chartColor || '#3b82f6' }}
                                />
                                <span className="absolute bottom-[-18px] text-[8px] text-gray-500 font-mono truncate max-w-full">
                                  {d.label}
                                </span>
                              </div>
                            );
                          }
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {/* 3. ALIGNMENT SMART GUIDES LINES RENDERING */}
        {activeGuides.x !== null && (
          <div 
            className="absolute top-0 bottom-0 w-[1.5px] border-l border-dashed border-red-500/80 z-[1000] pointer-events-none"
            style={{ left: `${activeGuides.x}px` }}
          />
        )}
        {activeGuides.y !== null && (
          <div 
            className="absolute left-0 right-0 h-[1.5px] border-t border-dashed border-red-500/80 z-[1000] pointer-events-none"
            style={{ top: `${activeGuides.y}px` }}
          />
        )}
      </div>
    </div>
  );
}
