import React from 'react';
import { useEditorStore, CANVAS_DIMENSIONS } from '../stores/editorStore';
import { getEffectById } from '../lib/videoEffects';
import { Play, Pause } from 'lucide-react';
import type { VideoClip } from '../types';
import { getClipPlayDuration } from './VideoCompositor';

const getSafeUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('https://assets.mixkit.co/')) {
    return url.replace('https://assets.mixkit.co/', '/proxy-mixkit/');
  }
  return url;
};

interface VideoPlayerProps {
  workspaceLayout: 'standard' | 'node-graph';
  setWorkspaceLayout: (layout: 'standard' | 'node-graph') => void;
  showLeftSidebar: boolean;
  setShowLeftSidebar: (show: boolean) => void;
  showTimeline: boolean;
  setShowTimeline: (show: boolean) => void;
  showRightSidebar: boolean;
  setShowRightSidebar: (show: boolean) => void;
  showScopes: boolean;
  setShowScopes: (show: boolean) => void;
  setShowSlideshowModal: (show: boolean) => void;
  playerDimensions: { width: number; height: number };
  previewContainerRef: React.RefObject<HTMLDivElement | null>;
  viewportParentRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  nextVideoRef: React.RefObject<HTMLVideoElement | null>;
  setContextMenu: (menu: any) => void;
  currentPlayback: any;
  containerScale: number;
  handlePreviewPointerDown: (e: React.PointerEvent, handleType: 'move' | 'tl' | 'tr' | 'bl' | 'br') => void;
  getFilterCSS: (clip: VideoClip) => string;
  getTransitionStyle: (progress: number, type: string, isNext: boolean) => React.CSSProperties;
  waveformCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  vectorscopeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  histogramCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  rgbParadeCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  nodesList: any[];
  nodeConnections: any[];
  setNodesList: React.Dispatch<React.SetStateAction<any[]>>;
  setNodeConnections: React.Dispatch<React.SetStateAction<any[]>>;
  draggingNodeId: string | null;
  draggingWire: any;
  setDraggingWire: (wire: any) => void;
  handleNodePointerDown: (e: React.PointerEvent, nodeId: string) => void;
  handlePinPointerDown: (e: React.PointerEvent, nodeId: string, pin: string, type: 'in' | 'out') => void;
  handlePinPointerUp: (e: React.PointerEvent, toNodeId: string, toPin: string) => void;
  timelineDuration: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  workspaceLayout,
  setWorkspaceLayout,
  showLeftSidebar,
  setShowLeftSidebar,
  showTimeline,
  setShowTimeline,
  showRightSidebar,
  setShowRightSidebar,
  showScopes,
  setShowScopes,
  setShowSlideshowModal,
  playerDimensions,
  previewContainerRef,
  viewportParentRef,
  videoRef,
  nextVideoRef,
  setContextMenu,
  currentPlayback,
  containerScale,
  handlePreviewPointerDown,
  getFilterCSS,
  getTransitionStyle,
  waveformCanvasRef,
  vectorscopeCanvasRef,
  histogramCanvasRef,
  rgbParadeCanvasRef,
  nodesList,
  nodeConnections,
  setNodesList,
  setNodeConnections,
  draggingNodeId,
  draggingWire,
  setDraggingWire,
  handleNodePointerDown,
  handlePinPointerDown,
  handlePinPointerUp,
  timelineDuration,
}) => {
  const {
    format,
    setFormat,
    videoClips,
    setVideoClips,
    setAudioTracks,
    selectedClipId,
    setSelectedClipId,
    playbackTime,
    setPlaybackTime,
    isPlaying,
    setIsPlaying,
  } = useEditorStore();

  return (
    <div className="flex-1 bg-[#090B10] flex flex-col p-6 relative overflow-hidden">
      {/* Viewport Control Toolbar */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-[#232A36] mb-4 shrink-0">
        <div className="flex gap-2">
          <button 
            onClick={() => setWorkspaceLayout('standard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              workspaceLayout === 'standard' 
                ? 'bg-[#7B5CFF] text-white shadow-[0_0_15px_rgba(123,92,255,0.4)]' 
                : 'bg-[#161B25] text-gray-400 hover:text-white border border-[#232A36]'
            }`}
          >
            <span>Monitor</span> Monitor Standard
          </button>
          <button 
            onClick={() => setWorkspaceLayout('node-graph')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              workspaceLayout === 'node-graph' 
                ? 'bg-[#7B5CFF] text-white shadow-[0_0_15px_rgba(123,92,255,0.4)]' 
                : 'bg-[#161B25] text-gray-400 hover:text-white border border-[#232A36]'
            }`}
          >
            <span>⚡</span> Nodal Effects Graph
          </button>
        </div>

        {/* Collapsible Panel Controls & Format Selector */}
        <div className="flex gap-2.5 items-center">
          <div className="flex bg-[#161B25]/85 p-0.5 rounded-xl border border-[#232A36] gap-0.5">
            <button
              onClick={() => setShowLeftSidebar(!showLeftSidebar)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                showLeftSidebar
                  ? 'bg-emerald-600/90 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={showLeftSidebar ? "Ocultar Biblioteca (Left)" : "Mostrar Biblioteca (Left)"}
            >
              <span>📁</span> Biblioteca
            </button>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                showTimeline
                  ? 'bg-emerald-600/90 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={showTimeline ? "Ocultar Línea de Tiempo (Bottom)" : "Mostrar Línea de Tiempo (Bottom)"}
            >
              <span>🎞️</span> Línea de Tiempo
            </button>
            <button
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                showRightSidebar
                  ? 'bg-emerald-600/90 text-white shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={showRightSidebar ? "Ocultar Inspector (Right)" : "Mostrar Inspector (Right)"}
            >
              <span>⚙️</span> Inspector
            </button>
          </div>

          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as any)}
            className="bg-[#161B25] text-xs font-bold text-gray-300 border border-[#232A36] px-2.5 py-1.5 rounded-lg outline-none focus:border-[#7B5CFF] cursor-pointer"
            title="Formato de Proyecto"
          >
            <option value="16:9">📺 Horizontal (16:9)</option>
            <option value="9:16">📱 Vertical (9:16)</option>
            <option value="1:1">⬜ Cuadrado (1:1)</option>
            <option value="3:1">↔️ Banner (3:1)</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setShowScopes(!showScopes)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showScopes 
                ? 'bg-[#00C8FF]/20 text-[#00C8FF] border border-[#00C8FF]/40' 
                : 'bg-[#161B25] text-gray-400 hover:text-white border border-[#232A36]'
            }`}
          >
            <span>📊</span> Scopes Diagnósticos
          </button>
          <button 
            onClick={() => setShowSlideshowModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00D97E] text-[#090B10] hover:bg-[#00D97E]/95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>🪄</span> Slideshow Automático
          </button>
        </div>
      </div>

      {/* Viewport Workspace content */}
      {workspaceLayout === 'standard' ? (
        <div ref={viewportParentRef} className="flex-1 w-full flex items-center justify-center gap-6 overflow-hidden">
          
          {/* Standard Preview Player Monitor */}
          <div 
            ref={previewContainerRef}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                type: 'canvas'
              });
            }}
            className="relative shadow-[0_0_80px_rgba(0,0,0,0.9)] bg-neutral-950 overflow-hidden ring-1 ring-white/10 rounded-2xl flex items-center justify-center shrink"
            style={{
              width: `${playerDimensions.width}px`,
              height: `${playerDimensions.height}px`,
            }}
          >
            {/* Solid black canvas background */}
            <div className="absolute inset-0 bg-[#050505] w-full h-full" />

            {videoClips.length > 0 && currentPlayback ? (
              <div className="absolute inset-0 w-full h-full">
                
                {/* 1. RENDER ACTIVE BASE CLIP */}
                {currentPlayback.activeBaseClip && (() => {
                  const clip = currentPlayback.activeBaseClip;
                  const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                  
                  const cW = clip.width !== undefined ? clip.width : dims.w;
                  const cH = clip.height !== undefined ? clip.height : dims.h;
                  const cX = clip.x !== undefined ? clip.x : 0;
                  const cY = clip.y !== undefined ? clip.y : 0;

                  const playOffset = playbackTime - (currentPlayback.activeBaseClipStart || 0);
                  const clipPlayDur = getClipPlayDuration(clip);
                  const zoomProgress = clipPlayDur > 0 ? Math.min(Math.max(playOffset / clipPlayDur, 0), 1) : 0;
                  let zoomScale = 1.0;
                  if (clip.zoomEffect === 'zoom-in') {
                    zoomScale = 1.0 + zoomProgress * 0.20;
                  } else if (clip.zoomEffect === 'zoom-out') {
                    zoomScale = 1.20 - zoomProgress * 0.20;
                  }

                  const style: React.CSSProperties = {
                    position: 'absolute',
                    left: `${cX * containerScale}px`,
                    top: `${cY * containerScale}px`,
                    width: `${cW * containerScale}px`,
                    height: `${cH * containerScale}px`,
                    filter: getFilterCSS(clip),
                    transform: `scale(${((clip.scale || 100) / 100) * zoomScale})`,
                    zIndex: 10,
                    ...(currentPlayback.inTransition 
                      ? getTransitionStyle(currentPlayback.transitionProgress, currentPlayback.transitionType, false)
                      : {})
                  };

                  const isSelected = selectedClipId === clip.id;
                  const effect = clip.effectPreset ? getEffectById(clip.effectPreset) : undefined;

                  return (
                    <div 
                      style={style}
                      className={`group/player-layer touch-none ${
                        isSelected ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'hover:ring-1 hover:ring-white/30'
                      } ${effect?.cssAnimation || ''}`}
                      onPointerDown={(e) => {
                        setSelectedClipId(clip.id);
                        handlePreviewPointerDown(e, 'move');
                      }}
                    >
                      {clip.type === 'video' ? (
                        <video 
                          ref={videoRef}
                          src={getSafeUrl(clip.url)}
                          className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                          playsInline
                          muted
                        />
                      ) : clip.type === 'text' ? (
                        <div 
                          className={`w-full h-full flex items-center justify-center p-4 text-center font-bold break-words select-none leading-normal ${
                            clip.textEffect === 'glitch' ? 'animate-glitch' :
                            clip.textEffect === 'typing' ? 'animate-typing' :
                            clip.textEffect === 'neon' ? 'animate-neon' :
                            clip.textEffect === 'fade-zoom' ? 'animate-fade-zoom' :
                            clip.textEffect === 'bounce' ? 'animate-bounce' : ''
                          }`}
                          style={{
                            color: clip.textColor || '#ffffff',
                            fontSize: `${(clip.textFontSize || 40) * containerScale}px`,
                            fontFamily: clip.textFontFamily || 'Montserrat',
                            textShadow: clip.textEffect === 'shadow' ? '3px 3px 6px rgba(0,0,0,0.8)' : undefined,
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {clip.textContent || 'Texto'}
                        </div>
                      ) : (
                        <img 
                          src={getSafeUrl(clip.url)}
                          alt="active preview"
                          className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                        />
                      )}

                      {effect?.overlay && (
                        <div 
                          className="absolute inset-0 pointer-events-none z-30 animate-pulse-slow"
                          style={{
                            ...effect.overlay.style,
                            mixBlendMode: effect.overlay.blendMode as any || 'normal'
                          }}
                        />
                      )}

                      {/* Drag resize corner handles */}
                      {isSelected && (
                        <>
                          <div 
                            onPointerDown={(e) => handlePreviewPointerDown(e, 'tl')}
                            className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -top-1.5 -left-1.5 cursor-nwse-resize z-50 shadow-md active:scale-125 transition-transform"
                          />
                          <div 
                            onPointerDown={(e) => handlePreviewPointerDown(e, 'tr')}
                            className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -top-1.5 -right-1.5 cursor-nesw-resize z-50 shadow-md active:scale-125 transition-transform"
                          />
                          <div 
                            onPointerDown={(e) => handlePreviewPointerDown(e, 'bl')}
                            className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -left-1.5 cursor-nesw-resize z-50 shadow-md active:scale-125 transition-transform"
                          />
                          <div 
                            onPointerDown={(e) => handlePreviewPointerDown(e, 'br')}
                            className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -right-1.5 cursor-nwse-resize z-50 shadow-md active:scale-125 transition-transform"
                          />
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* 2. RENDER TRANSITION BASE CLIP */}
                {currentPlayback.inTransition && currentPlayback.nextBaseClip && (() => {
                  const clip = currentPlayback.nextBaseClip;
                  const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                  
                  const cW = clip.width !== undefined ? clip.width : dims.w;
                  const cH = clip.height !== undefined ? clip.height : dims.h;
                  const cX = clip.x !== undefined ? clip.x : 0;
                  const cY = clip.y !== undefined ? clip.y : 0;

                  const transDur = (currentPlayback.activeBaseClip && currentPlayback.activeBaseClip.transitionType !== 'none') 
                    ? (currentPlayback.activeBaseClip.transitionDuration / 1000) 
                    : 0;
                  const transStart = (currentPlayback.activeBaseClipStart || 0) + getClipPlayDuration(currentPlayback.activeBaseClip!) - transDur;
                  const playOffset = playbackTime - transStart;
                  const clipPlayDur = getClipPlayDuration(clip);
                  const zoomProgress = clipPlayDur > 0 ? Math.min(Math.max(playOffset / clipPlayDur, 0), 1) : 0;
                  let zoomScale = 1.0;
                  if (clip.zoomEffect === 'zoom-in') {
                    zoomScale = 1.0 + zoomProgress * 0.20;
                  } else if (clip.zoomEffect === 'zoom-out') {
                    zoomScale = 1.20 - zoomProgress * 0.20;
                  }

                  const style: React.CSSProperties = {
                    position: 'absolute',
                    left: `${cX * containerScale}px`,
                    top: `${cY * containerScale}px`,
                    width: `${cW * containerScale}px`,
                    height: `${cH * containerScale}px`,
                    filter: getFilterCSS(clip),
                    transform: `scale(${((clip.scale || 100) / 100) * zoomScale})`,
                    zIndex: 9,
                    ...getTransitionStyle(currentPlayback.transitionProgress, currentPlayback.transitionType, true)
                  };

                  const effect = clip.effectPreset ? getEffectById(clip.effectPreset) : undefined;

                  return (
                    <div style={style} className={`pointer-events-none ${effect?.cssAnimation || ''}`}>
                      {clip.type === 'video' ? (
                        <video 
                          ref={nextVideoRef}
                          src={getSafeUrl(clip.url)}
                          className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                          playsInline
                          muted
                        />
                      ) : clip.type === 'text' ? (
                        <div 
                          className={`w-full h-full flex items-center justify-center p-4 text-center font-bold break-words select-none leading-normal ${
                            clip.textEffect === 'glitch' ? 'animate-glitch' :
                            clip.textEffect === 'typing' ? 'animate-typing' :
                            clip.textEffect === 'neon' ? 'animate-neon' :
                            clip.textEffect === 'fade-zoom' ? 'animate-fade-zoom' :
                            clip.textEffect === 'bounce' ? 'animate-bounce' : ''
                          }`}
                          style={{
                            color: clip.textColor || '#ffffff',
                            fontSize: `${(clip.textFontSize || 40) * containerScale}px`,
                            fontFamily: clip.textFontFamily || 'Montserrat',
                            textShadow: clip.textEffect === 'shadow' ? '3px 3px 6px rgba(0,0,0,0.8)' : undefined,
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {clip.textContent || 'Texto'}
                        </div>
                      ) : (
                        <img 
                          src={getSafeUrl(clip.url)}
                          alt="next transition preview"
                          className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                        />
                      )}

                      {effect?.overlay && (
                        <div 
                          className="absolute inset-0 pointer-events-none z-30 animate-pulse-slow"
                          style={{
                            ...effect.overlay.style,
                            mixBlendMode: effect.overlay.blendMode as any || 'normal'
                          }}
                        />
                      )}
                    </div>
                  );
                })()}

                {/* 3. RENDER ACTIVE OVERLAY CLIPS */}
                {currentPlayback.activeOverlays.map(({ clip, localTime }: any) => {
                  const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                  
                  const cW = clip.width !== undefined ? clip.width : dims.w;
                  const cH = clip.height !== undefined ? clip.height : dims.h;
                  const cX = clip.x !== undefined ? clip.x : 0;
                  const cY = clip.y !== undefined ? clip.y : 0;

                  const playOffset = playbackTime - (clip.timelineStart || 0);
                  const clipPlayDur = getClipPlayDuration(clip);
                  const zoomProgress = clipPlayDur > 0 ? Math.min(Math.max(playOffset / clipPlayDur, 0), 1) : 0;
                  let zoomScale = 1.0;
                  if (clip.zoomEffect === 'zoom-in') {
                    zoomScale = 1.0 + zoomProgress * 0.20;
                  } else if (clip.zoomEffect === 'zoom-out') {
                    zoomScale = 1.20 - zoomProgress * 0.20;
                  }

                  const style: React.CSSProperties = {
                    position: 'absolute',
                    left: `${cX * containerScale}px`,
                    top: `${cY * containerScale}px`,
                    width: `${cW * containerScale}px`,
                    height: `${cH * containerScale}px`,
                    filter: getFilterCSS(clip),
                    transform: `scale(${((clip.scale || 100) / 100) * zoomScale})`,
                    zIndex: 20
                  };

                  const isSelected = selectedClipId === clip.id;
                  const effect = clip.effectPreset ? getEffectById(clip.effectPreset) : undefined;

                  return (
                    <div 
                      key={clip.id}
                      style={style}
                      className={`group/player-layer touch-none ${
                        isSelected ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'hover:ring-1 hover:ring-white/30'
                      } ${effect?.cssAnimation || ''}`}
                      onPointerDown={(e) => {
                        setSelectedClipId(clip.id);
                        handlePreviewPointerDown(e, 'move');
                      }}
                    >
                      {effect?.overlay && (
                        <div 
                          className="absolute inset-0 pointer-events-none z-30 animate-pulse-slow"
                          style={{
                            ...effect.overlay.style,
                            mixBlendMode: effect.overlay.blendMode as any || 'normal'
                          }}
                        />
                      )}
                      {clip.type === 'video' ? (
                        <video 
                          data-overlay-clip-id={clip.id}
                          data-local-time={localTime}
                          src={getSafeUrl(clip.url)}
                          className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                          playsInline
                          muted
                        />
                      ) : clip.type === 'text' ? (
                        <div 
                          className={`w-full h-full flex items-center justify-center p-4 text-center font-bold break-words select-none leading-normal ${
                            clip.textEffect === 'glitch' ? 'animate-glitch' :
                            clip.textEffect === 'typing' ? 'animate-typing' :
                            clip.textEffect === 'neon' ? 'animate-neon' :
                            clip.textEffect === 'fade-zoom' ? 'animate-fade-zoom' :
                            clip.textEffect === 'bounce' ? 'animate-bounce' : ''
                          }`}
                          style={{
                            color: clip.textColor || '#ffffff',
                            fontSize: `${(clip.textFontSize || 40) * containerScale}px`,
                            fontFamily: clip.textFontFamily || 'Montserrat',
                            textShadow: clip.textEffect === 'shadow' ? '3px 3px 6px rgba(0,0,0,0.8)' : undefined,
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {clip.textContent || 'Texto'}
                        </div>
                      ) : clip.type === 'adjustment' ? (
                        <div 
                          className="w-full h-full pointer-events-none"
                          style={{
                            backdropFilter: getFilterCSS(clip).replace(/opacity\([^)]+\)/g, ''),
                            backgroundColor: 'rgba(99, 102, 241, 0.03)',
                          }}
                        />
                      ) : clip.type === 'effect' ? (
                        <div 
                          className="w-full h-full pointer-events-none"
                          style={{
                            backgroundColor: 'rgba(236, 72, 153, 0.03)',
                          }}
                        />
                      ) : (
                        <img 
                          src={getSafeUrl(clip.url)}
                          alt="overlay preview"
                          className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                        />
                      )}

                      {/* Drag resize corner handles */}
                      {isSelected && (
                        <>
                          <div 
                            onPointerDown={(e) => handlePreviewPointerDown(e, 'tl')}
                            className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -top-1.5 -left-1.5 cursor-nwse-resize z-50 shadow-md active:scale-125 transition-transform"
                          />
                          <div 
                            onPointerDown={(e) => handlePreviewPointerDown(e, 'tr')}
                            className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -top-1.5 -right-1.5 cursor-nesw-resize z-50 shadow-md active:scale-125 transition-transform"
                          />
                          <div 
                            onPointerDown={(e) => handlePreviewPointerDown(e, 'bl')}
                            className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -left-1.5 cursor-nesw-resize z-50 shadow-md active:scale-125 transition-transform"
                          />
                          <div 
                            onPointerDown={(e) => handlePreviewPointerDown(e, 'br')}
                            className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -right-1.5 cursor-nwse-resize z-50 shadow-md active:scale-125 transition-transform"
                          />
                        </>
                      )}
                    </div>
                  );
                })}

              </div>
            ) : (
              <div className="flex flex-col items-center text-center text-gray-600 gap-3">
                <span className="text-4xl opacity-30">🎬</span>
                <p className="text-xs">Sube y añade videos o fotos en el panel izquierdo.</p>
              </div>
            )}
          </div>

          {/* Scopes Side Panel */}
          {showScopes && (
            <div className="w-[280px] h-full max-h-[48vh] bg-[#11151E] border border-[#232A36] rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar shrink-0">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block border-b border-[#232A36] pb-1.5 flex items-center gap-1.5">
                <span>📊</span> Scopes Diagnósticos
              </span>
              <div className="grid grid-cols-2 gap-2 flex-1 min-h-[200px]">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-gray-500 uppercase">Waveform</span>
                  <canvas ref={waveformCanvasRef} className="w-full aspect-[4/3] rounded-lg border border-[#232A36] bg-[#090B10]" width={150} height={110} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-gray-500 uppercase">Vectorscope</span>
                  <canvas ref={vectorscopeCanvasRef} className="w-full aspect-[4/3] rounded-lg border border-[#232A36] bg-[#090B10]" width={150} height={110} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-gray-500 uppercase">Histogram</span>
                  <canvas ref={histogramCanvasRef} className="w-full aspect-[4/3] rounded-lg border border-[#232A36] bg-[#090B10]" width={150} height={110} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-mono text-gray-500 uppercase">RGB Parade</span>
                  <canvas ref={rgbParadeCanvasRef} className="w-full aspect-[4/3] rounded-lg border border-[#232A36] bg-[#090B10]" width={150} height={110} />
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Nodal split layout */
        <div className="flex-1 w-full flex flex-col gap-4 overflow-hidden h-full">
          
          {/* Upper scaled-down player */}
          <div className="h-[35%] flex items-center justify-center gap-6 relative shrink-0">
            <div 
              ref={previewContainerRef}
              className="relative aspect-video max-h-full h-full shadow-[0_0_40px_rgba(0,0,0,0.9)] bg-neutral-950 overflow-hidden ring-1 ring-white/10 rounded-xl flex items-center justify-center"
              style={{
                aspectRatio: format === '9:16' ? '9/16' : format === '16:9' ? '16/9' : format === '1:1' ? '1/1' : '3/1',
              }}
            >
              <div className="absolute inset-0 bg-[#050505] w-full h-full" />
              
              {videoClips.length > 0 && currentPlayback ? (
                <div className="absolute inset-0 w-full h-full">
                  {/* Scaled preview */}
                  {currentPlayback.activeBaseClip && (() => {
                    const clip = currentPlayback.activeBaseClip;
                    const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                    
                    const cW = clip.width !== undefined ? clip.width : dims.w;
                    const cH = clip.height !== undefined ? clip.height : dims.h;
                    const cX = clip.x !== undefined ? clip.x : 0;
                    const cY = clip.y !== undefined ? clip.y : 0;

                    const style: React.CSSProperties = {
                      position: 'absolute',
                      left: `${cX * containerScale}px`,
                      top: `${cY * containerScale}px`,
                      width: `${cW * containerScale}px`,
                      height: `${cH * containerScale}px`,
                      filter: getFilterCSS(clip),
                      transform: `scale(${(clip.scale || 100) / 100})`,
                      zIndex: 10,
                    };

                    return (
                      <div style={style} className="w-full h-full">
                        {clip.type === 'video' ? (
                          <video src={getSafeUrl(clip.url)} className="w-full h-full object-cover" muted />
                        ) : clip.type === 'text' ? (
                          <div 
                            className="w-full h-full flex items-center justify-center p-4 text-center font-bold break-words select-none leading-normal"
                            style={{
                              color: clip.textColor || '#ffffff',
                              fontSize: `${(clip.textFontSize || 40) * containerScale}px`,
                              fontFamily: clip.textFontFamily || 'Montserrat',
                              textShadow: clip.textEffect === 'shadow' ? '3px 3px 6px rgba(0,0,0,0.8)' : undefined,
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {clip.textContent || 'Texto'}
                          </div>
                        ) : (
                          <img src={getSafeUrl(clip.url)} alt="preview" className="w-full h-full object-cover" />
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <span className="text-[10px] text-gray-600">Línea vacía</span>
              )}
            </div>

            {showScopes && (
              <div className="w-[220px] h-full bg-[#11151E] border border-[#232A36] rounded-xl p-2 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar shrink-0 justify-center">
                <div className="grid grid-cols-2 gap-1">
                  <canvas ref={waveformCanvasRef} className="w-full aspect-[4/3] rounded border border-[#232A36] bg-[#090B10]" width={100} height={75} />
                  <canvas ref={vectorscopeCanvasRef} className="w-full aspect-[4/3] rounded border border-[#232A36] bg-[#090B10]" width={100} height={75} />
                  <canvas ref={histogramCanvasRef} className="w-full aspect-[4/3] rounded border border-[#232A36] bg-[#090B10]" width={100} height={75} />
                  <canvas ref={rgbParadeCanvasRef} className="w-full aspect-[4/3] rounded border border-[#232A36] bg-[#090B10]" width={100} height={75} />
                </div>
              </div>
            )}
          </div>

          {/* Lower Nodal Editor board workspace */}
          <div className="flex-1 bg-[#11151E] border border-[#232A36] rounded-2xl relative overflow-hidden flex flex-col min-h-[240px]">
            
            <div className="px-4 py-2 border-b border-[#232A36] bg-[#161B25] flex justify-between items-center shrink-0">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                🔗 Vision Pro Effects Graph (Arrastra conexiones entre pines)
              </span>
              <span className="text-[8px] text-gray-500 font-bold">
                *Haz clic en un cable para borrar la conexión
              </span>
            </div>

            {/* Nodal Editor Canvas Board */}
            <div 
              id="node-graph-board" 
              className="flex-1 relative overflow-hidden bg-[#090B10] bg-dot-grid w-full h-full"
              onPointerUp={() => setDraggingWire(null)}
            >
              
              {/* SVG connection wires */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {nodeConnections.map((conn, idx) => {
                  const fromNode = nodesList.find(n => n.id === conn.fromId);
                  const toNode = nodesList.find(n => n.id === conn.toId);
                  if (!fromNode || !toNode) return null;

                  const x1 = fromNode.x + 180;
                  const y1 = fromNode.y + 50;
                  const x2 = toNode.x;
                  const y2 = toNode.y + 50;

                  const dx = Math.abs(x2 - x1) * 0.5;
                  const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                  return (
                    <g key={idx}>
                      <path 
                        d={pathD} 
                        fill="none" 
                        stroke="rgba(123, 92, 255, 0.6)" 
                        strokeWidth="4" 
                        className="hover:stroke-red-500 cursor-pointer pointer-events-auto transition-colors"
                        onClick={() => {
                          setNodeConnections(prev => prev.filter((_, cIdx) => cIdx !== idx));
                        }}
                      >
                        <title>Haz clic para borrar conexión</title>
                      </path>
                      <path 
                        d={pathD} 
                        fill="none" 
                        stroke="#00C8FF" 
                        strokeWidth="1.5" 
                        className="pointer-events-none"
                      />
                    </g>
                  );
                })}
                
                {draggingWire && (() => {
                  const dx = Math.abs(draggingWire.currentX - draggingWire.startX) * 0.5;
                  const pathD = `M ${draggingWire.startX} ${draggingWire.startY} C ${draggingWire.startX + dx} ${draggingWire.startY}, ${draggingWire.currentX - dx} ${draggingWire.currentY}, ${draggingWire.currentX} ${draggingWire.currentY}`;
                  return (
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke="rgba(0, 219, 126, 0.8)" 
                      strokeWidth="2.5" 
                      strokeDasharray="4 4"
                      className="pointer-events-none"
                    />
                  );
                })()}
              </svg>

              {/* Nodes mapping */}
              {nodesList.map(node => (
                <div 
                  key={node.id}
                  style={{ left: `${node.x}px`, top: `${node.y}px` }}
                  className={`absolute w-[180px] h-[100px] bg-[#11151E]/95 border rounded-xl flex flex-col p-2.5 shadow-xl select-none z-20 group/node cursor-grab active:cursor-grabbing hover:border-[#7B5CFF] transition-all ${
                    node.id === draggingNodeId ? 'opacity-40 border-[#7B5CFF] scale-95 shadow-2xl' : 'border-[#232A36]'
                  }`}
                  onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.getAttribute('data-nodrag')) return;
                    handleNodePointerDown(e, node.id);
                  }}
                >
                  <div className="flex items-center justify-between border-b border-[#232A36] pb-1 mb-2">
                    <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider truncate w-[100px]">{node.label}</span>
                    <span className="text-[8px] bg-[#232A36] text-gray-500 px-1 rounded font-mono font-bold uppercase">{node.type}</span>
                  </div>

                  {node.type === 'filter' ? (
                    <div className="flex-1 flex flex-col justify-center gap-1" data-nodrag="true">
                      <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                        <span>Intensidad</span>
                        <span>{node.value}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="200"
                        value={node.value}
                        onChange={(e) => {
                          const newVal = Number(e.target.value);
                          setNodesList(prev => prev.map(n => n.id === node.id ? { ...n, value: newVal } : n));
                        }}
                        className="w-full accent-[#7B5CFF] h-1 cursor-pointer rounded bg-[#232A36]"
                        data-nodrag="true"
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[8px] text-gray-600 font-medium italic">
                        {node.type === 'input' ? '📥 Input original' : '📺 Render final'}
                      </span>
                    </div>
                  )}

                  {node.type !== 'input' && (
                    <div 
                      className="absolute -left-2 top-[calc(50%-6px)] w-3.5 h-3.5 bg-[#090B10] border-2 border-[#232A36] rounded-full hover:border-[#00C8FF] hover:bg-[#00C8FF] transition-all cursor-crosshair z-30 flex items-center justify-center group-hover/node:scale-110"
                      data-nodrag="true"
                      onPointerUp={(e) => handlePinPointerUp(e, node.id, 'in')}
                      title="Conectar entrada"
                    >
                      <div className="w-1 bg-[#232A36] rounded-full" />
                    </div>
                  )}

                  {node.type !== 'output' && (
                    <div 
                      className="absolute -right-2 top-[calc(50%-6px)] w-3.5 h-3.5 bg-[#090B10] border-2 border-[#232A36] rounded-full hover:border-[#00D97E] hover:bg-[#00D97E] transition-all cursor-crosshair z-30 flex items-center justify-center group-hover/node:scale-110"
                      data-nodrag="true"
                      onPointerDown={(e) => handlePinPointerDown(e, node.id, 'out', 'out')}
                      title="Arrastrar conexión"
                    >
                      <div className="w-1 bg-[#232A36] rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Playback HUD controls */}
      <div className="mt-6 flex items-center justify-between w-full max-w-[500px] bg-[#09090b] px-6 py-2 rounded-xl ring-1 ring-white/5 gap-4 self-center shrink-0">
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={videoClips.length === 0}
            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shadow-lg"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <button 
            onClick={() => { setVideoClips([]); setAudioTracks([]); setPlaybackTime(0); setIsPlaying(false); }}
            className="text-[10px] font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Limpiar Todo
          </button>
        </div>

        {/* Counter status */}
        <div className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
          <span className="text-white font-bold">{playbackTime.toFixed(1)}s</span>
          <span className="opacity-30">/</span>
          <span>{timelineDuration.toFixed(1)}s</span>
        </div>
      </div>
    </div>
  );
};
