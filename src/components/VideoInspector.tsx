import React, { useState, useEffect } from 'react';
import { useEditorStore, CANVAS_DIMENSIONS } from '../stores/editorStore';
import { Volume2, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import type { VideoClip, KeyframePoint } from '../types';

interface VideoInspectorProps {
  handleExportVideo: () => void;
  exportQuality: '720p' | '1080p' | '4k';
  setExportQuality: (quality: '720p' | '1080p' | '4k') => void;
  timelineDuration: number;
  aspectRatioLock: boolean;
  setAspectRatioLock: (lock: boolean) => void;
}

export const VideoInspector: React.FC<VideoInspectorProps> = ({
  handleExportVideo,
  exportQuality,
  setExportQuality,
  timelineDuration,
  aspectRatioLock,
  setAspectRatioLock,
}) => {
  if (false as boolean) {
    console.log(aspectRatioLock, setAspectRatioLock);
  }
  const {
    format,
    videoClips,
    audioTracks,
    selectedClipId,
    selectedAudioId,
    reorderClips,
    updateClip,
    deleteClip,
    updateAudioTrack,
    deleteAudioTrack,
    masterAmbientVolume,
    masterMusicVolume,
    setMasterAmbientVolume,
    setMasterMusicVolume,
    applyEffectsToAllClips,
    playbackTime,
    addVideoClip,
  } = useEditorStore();

  const selectedClip = videoClips.find(c => c.id === selectedClipId);
  const selectedAudio = audioTracks.find(t => t.id === selectedAudioId);

  // Main Tabs: Video, Velocidad, Animación, Ajustar, Texto (only for text clips)
  const [mainTab, setMainTab] = useState<'video' | 'speed' | 'animation' | 'adjust' | 'text'>('video');
  
  // Sub-tabs depending on the main tab
  const [videoSubTab, setVideoSubTab] = useState<'basic' | 'bg' | 'mask' | 'retouch'>('basic');
  const [speedSubTab, setSpeedSubTab] = useState<'standard' | 'curve' | 'effects'>('standard');
  const [animationSubTab, setAnimationSubTab] = useState<'in' | 'out' | 'combo'>('in');
  const [adjustSubTab, setAdjustSubTab] = useState<'basic' | 'hsl' | 'curves' | 'wheels' | 'mask'>('basic');

  // Interactive controls state
  const [activeHslColor, setActiveHslColor] = useState<string>('red');
  const [activeCurveChannel, setActiveCurveChannel] = useState<'rgb' | 'red' | 'green' | 'blue'>('rgb');

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    transform: true,
    blend: true,
    stabilize: true,
    colorCorr: true,
    lut: true,
    adjustSliders: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Switch tabs automatically based on selected clip type
  useEffect(() => {
    if (selectedClip) {
      if (selectedClip.type === 'text') {
        setMainTab('text');
      } else {
        if (mainTab === 'text') setMainTab('video');
      }
    }
  }, [selectedClipId, selectedClip?.type]);

  // Keyframes Helper logic
  const getKeyframeForTime = (property: string): KeyframePoint | undefined => {
    if (!selectedClip || !selectedClip.keyframes?.[property]) return undefined;
    return selectedClip.keyframes[property].find(k => Math.abs(k.time - playbackTime) < 0.1);
  };

  const hasKeyframes = (property: string): boolean => {
    return !!(selectedClip && selectedClip.keyframes?.[property] && selectedClip.keyframes[property].length > 0);
  };

  const toggleKeyframe = (property: string, value: any) => {
    if (!selectedClip) return;
    const currentKeyframes = selectedClip.keyframes?.[property] || [];
    const existsIdx = currentKeyframes.findIndex(k => Math.abs(k.time - playbackTime) < 0.1);
    
    let updated: KeyframePoint[] = [];
    if (existsIdx >= 0) {
      // Remove keyframe
      updated = currentKeyframes.filter((_, idx) => idx !== existsIdx);
    } else {
      // Add keyframe and keep it sorted
      updated = [...currentKeyframes, { time: playbackTime, value }].sort((a, b) => a.time - b.time);
    }

    updateClip(selectedClip.id, {
      keyframes: {
        ...(selectedClip.keyframes || {}),
        [property]: updated
      }
    });
  };

  // Navigating keyframes
  const navigateKeyframe = (property: string, direction: 'prev' | 'next') => {
    if (!selectedClip || !selectedClip.keyframes?.[property]) return;
    const points = selectedClip.keyframes[property];
    if (points.length === 0) return;

    if (direction === 'prev') {
      const candidates = points.filter(p => p.time < playbackTime - 0.05);
      if (candidates.length > 0) {
        useEditorStore.getState().setPlaybackTime(candidates[candidates.length - 1].time);
      }
    } else {
      const candidates = points.filter(p => p.time > playbackTime + 0.05);
      if (candidates.length > 0) {
        useEditorStore.getState().setPlaybackTime(candidates[0].time);
      }
    }
  };

  // Draggable rotation dial logic
  const handleDialMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedClip) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const updateAngle = (clientX: number, clientY: number) => {
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const angle = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
      updateClip(selectedClip.id, { rotation: angle });
    };

    updateAngle(e.clientX, e.clientY);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      updateAngle(moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Format HSL label
  const getHslColorHex = (colorName: string) => {
    const map: Record<string, string> = {
      red: '#ef4444', orange: '#f97316', yellow: '#eab308', 
      green: '#22c55e', cyan: '#06b6d4', blue: '#3b82f6', 
      purple: '#a855f7', magenta: '#ec4899'
    };
    return map[colorName] || '#ffffff';
  };

  // Keyframe Rombo Render SVG
  const renderKeyframeIcon = (property: string, currentValue: any) => {
    const keyframe = getKeyframeForTime(property);
    const hasAny = hasKeyframes(property);
    
    return (
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {hasAny && (
          <button 
            onClick={() => navigateKeyframe(property, 'prev')}
            className="text-gray-500 hover:text-white transition-colors cursor-pointer text-[10px]"
            title="Keyframe anterior"
          >
            ◀
          </button>
        )}
        <button
          onClick={() => toggleKeyframe(property, currentValue)}
          className={`transition-all duration-150 cursor-pointer flex items-center justify-center p-0.5 rounded hover:bg-white/5 ${
            keyframe ? 'text-[#00b5b5]' : 'text-gray-600 hover:text-gray-300'
          }`}
          title={keyframe ? "Eliminar Keyframe" : "Agregar Keyframe"}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
            {keyframe ? (
              <polygon points="12,2 22,12 12,22 2,12" />
            ) : (
              <polygon points="12,4 20,12 12,20 4,12" stroke="currentColor" strokeWidth="2" fill="none" />
            )}
          </svg>
        </button>
        {hasAny && (
          <button 
            onClick={() => navigateKeyframe(property, 'next')}
            className="text-gray-500 hover:text-white transition-colors cursor-pointer text-[10px]"
            title="Keyframe siguiente"
          >
            ▶
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="w-[340px] bg-[#09090b] border-l border-white/5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar select-none text-white font-sans">
      
      {/* ── TOP NAV BAR (CAPCUT STYLE) ── */}
      <div className="flex border-b border-white/5 bg-[#050507] shrink-0 text-[11px] font-bold overflow-x-auto custom-scrollbar scrollbar-none">
        {([
          { id: 'video', label: 'Video', visible: selectedClip?.type !== 'text' },
          { id: 'text', label: 'Texto', visible: selectedClip?.type === 'text' },
          { id: 'speed', label: 'Velocidad', visible: selectedClip?.type === 'video' },
          { id: 'animation', label: 'Animación', visible: !!selectedClip },
          { id: 'adjust', label: 'Ajustar', visible: !!selectedClip },
        ] as const).map(({ id, label, visible }) => {
          if (!visible) return null;
          return (
            <button
              key={id}
              onClick={() => setMainTab(id as any)}
              className={`px-4 py-3 border-b-2 transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider ${
                mainTab === id 
                  ? 'border-[#00b5b5] text-[#00b5b5]' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── SUB TABS BAR ── */}
      {selectedClip && (
        <div className="px-4 py-2 bg-[#0c0c0e] border-b border-white/5 shrink-0 flex gap-1">
          {mainTab === 'video' && (
            ([
              { id: 'basic', label: 'Básico' },
              { id: 'bg', label: 'Eliminar fondo' },
              { id: 'mask', label: 'Máscara' },
              { id: 'retouch', label: 'Retoque' }
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setVideoSubTab(tab.id)}
                className={`px-2.5 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${
                  videoSubTab === tab.id ? 'bg-[#232328] text-[#00b5b5]' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))
          )}

          {mainTab === 'speed' && (
            ([
              { id: 'standard', label: 'Estándar' },
              { id: 'curve', label: 'Curva' },
              { id: 'effects', label: 'Efectos de velocidad' }
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setSpeedSubTab(tab.id)}
                className={`px-2.5 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${
                  speedSubTab === tab.id ? 'bg-[#232328] text-[#00b5b5]' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))
          )}

          {mainTab === 'animation' && (
            ([
              { id: 'in', label: 'Entrada' },
              { id: 'out', label: 'Salida' },
              { id: 'combo', label: 'Combinado' }
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setAnimationSubTab(tab.id)}
                className={`px-2.5 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${
                  animationSubTab === tab.id ? 'bg-[#232328] text-[#00b5b5]' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))
          )}

          {mainTab === 'adjust' && (
            ([
              { id: 'basic', label: 'Básico' },
              { id: 'hsl', label: 'HSL' },
              { id: 'curves', label: 'Curvas' },
              { id: 'wheels', label: 'Círculo cromático' },
              { id: 'mask', label: 'Máscara' }
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setAdjustSubTab(tab.id)}
                className={`px-2.5 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${
                  adjustSubTab === tab.id ? 'bg-[#232328] text-[#00b5b5]' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))
          )}
        </div>
      )}

      {/* ── INSPECTOR PROPERTIES VIEWPORT ── */}
      <div className="flex-1 p-5 space-y-6">
        
        {/* A. CLIP SELECTED */}
        {selectedClip && (
          <div className="space-y-5">
            
            {/* Context Header */}
            <div className="p-3.5 bg-zinc-950/40 rounded-xl border border-white/5 flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-[8px] bg-[#00b5b5]/15 text-[#00b5b5] border border-[#00b5b5]/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest inline-block mb-1">
                  {selectedClip.type === 'video' ? 'Video' : selectedClip.type === 'text' ? 'Texto' : 'Imagen'}
                </span>
                <span className="text-xs font-bold text-gray-200 truncate block w-[170px]" title={selectedClip.name}>
                  {selectedClip.name}
                </span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button 
                  onClick={() => {
                    const idx = videoClips.findIndex(c => c.id === selectedClipId);
                    if (idx > 0) reorderClips(idx, idx - 1);
                  }}
                  className="p-1 hover:bg-white/5 rounded text-gray-500 hover:text-white transition-colors cursor-pointer"
                  title="Mover atrás"
                >
                  <ArrowLeft size={12} />
                </button>
                <button 
                  onClick={() => {
                    const idx = videoClips.findIndex(c => c.id === selectedClipId);
                    if (idx < videoClips.length - 1) reorderClips(idx, idx + 1);
                  }}
                  className="p-1 hover:bg-white/5 rounded text-gray-500 hover:text-white transition-colors cursor-pointer"
                  title="Mover adelante"
                >
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* TAB: VIDEO - SUB TAB: BASIC */}
            {mainTab === 'video' && videoSubTab === 'basic' && (
              <div className="space-y-5">
                
                {/* 1. TRANSFORMATION SECTION */}
                <div className="border-b border-white/5 pb-4 space-y-3">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('transform')}>
                    <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider">Transformación</span>
                    <span className="text-[10px] text-gray-500">{expandedSections.transform ? '▲' : '▼'}</span>
                  </div>

                  {expandedSections.transform && (
                    <div className="space-y-4 pt-1">
                      
                      {/* Escala (0% to 500%) */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                          <span>Escala</span>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              min="0"
                              max="500"
                              value={selectedClip.scale || 100}
                              onChange={e => updateClip(selectedClip.id, { scale: Number(e.target.value) })}
                              className="w-12 bg-black border border-white/10 rounded px-1 text-center font-mono text-[10px] text-white focus:outline-none"
                            />
                            <span>%</span>
                            {renderKeyframeIcon('scale', selectedClip.scale || 100)}
                          </div>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="500"
                          value={selectedClip.scale || 100}
                          onChange={e => updateClip(selectedClip.id, { scale: Number(e.target.value) })}
                          className="w-full accent-[#00b5b5] cursor-pointer h-1 rounded bg-[#232328]"
                        />
                      </div>

                      {/* Escala uniforme switch */}
                      <div className="flex justify-between items-center text-[10px] text-gray-400 py-1">
                        <span>Escala uniforme</span>
                        <button 
                          onClick={() => updateClip(selectedClip.id, { uniformScale: !selectedClip.uniformScale })}
                          className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                            selectedClip.uniformScale !== false ? 'bg-[#00b5b5]' : 'bg-zinc-800'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full bg-white transition-transform ${
                            selectedClip.uniformScale !== false ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Posición X e Y */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1">
                          <span>Posición</span>
                          <div className="flex gap-2">
                            {renderKeyframeIcon('x', selectedClip.x || 0)}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex bg-black border border-white/10 rounded px-2 py-1 items-center justify-between text-[10px]">
                            <span className="text-gray-600 font-mono">X</span>
                            <input 
                              type="number"
                              value={selectedClip.x || 0}
                              onChange={e => updateClip(selectedClip.id, { x: Number(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none font-mono text-white"
                            />
                          </div>
                          <div className="flex bg-black border border-white/10 rounded px-2 py-1 items-center justify-between text-[10px]">
                            <span className="text-gray-600 font-mono">Y</span>
                            <input 
                              type="number"
                              value={selectedClip.y || 0}
                              onChange={e => updateClip(selectedClip.id, { y: Number(e.target.value) })}
                              className="w-full bg-transparent text-right outline-none font-mono text-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Girar / Rotación */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                          <span>Girar (Rotación)</span>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              min="-360"
                              max="360"
                              value={selectedClip.rotation || 0}
                              onChange={e => updateClip(selectedClip.id, { rotation: Number(e.target.value) })}
                              className="w-12 bg-black border border-white/10 rounded px-1 text-center font-mono text-[10px] text-white focus:outline-none"
                            />
                            <span>°</span>
                            {renderKeyframeIcon('rotation', selectedClip.rotation || 0)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pt-1">
                          {/* Circular Angle Dial */}
                          <div 
                            onMouseDown={handleDialMouseDown}
                            className="w-9 h-9 rounded-full border border-white/20 bg-black/40 relative cursor-pointer flex items-center justify-center shrink-0"
                            title="Arrastra para girar"
                          >
                            <div 
                              className="absolute top-0 bottom-0 left-[calc(50%-1px)] w-[2px] origin-center bg-cyan-400/80"
                              style={{ transform: `rotate(${selectedClip.rotation || 0}deg)` }}
                            >
                              <div className="w-1 h-1 bg-cyan-400 rounded-full mx-auto" />
                            </div>
                            <div className="w-1 h-1 bg-white rounded-full z-10" />
                          </div>
                          <input 
                            type="range"
                            min="-360"
                            max="360"
                            value={selectedClip.rotation || 0}
                            onChange={e => updateClip(selectedClip.id, { rotation: Number(e.target.value) })}
                            className="flex-1 accent-[#00b5b5] cursor-pointer h-1 rounded bg-[#232328]"
                          />
                        </div>
                      </div>

                      {/* Alignment buttons */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-500 block">Alineación</span>
                        <div className="flex bg-[#121215] border border-white/5 p-1 rounded-lg gap-0.5 justify-around">
                          {([
                            { id: 'left', label: ' izquierdo', action: () => updateClip(selectedClip.id, { x: 0 }) },
                            { id: 'center-h', label: '↔️ centro', action: () => {
                              const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                              updateClip(selectedClip.id, { x: Math.round((dims.w - selectedClip.width) / 2) });
                            }},
                            { id: 'right', label: ' derecho', action: () => {
                              const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                              updateClip(selectedClip.id, { x: dims.w - selectedClip.width });
                            }},
                            { id: 'top', label: '⬆️ arriba', action: () => updateClip(selectedClip.id, { y: 0 }) },
                            { id: 'center-v', label: '↕️ centro', action: () => {
                              const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                              updateClip(selectedClip.id, { y: Math.round((dims.h - selectedClip.height) / 2) });
                            }},
                            { id: 'bottom', label: '⬇️ abajo', action: () => {
                              const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                              updateClip(selectedClip.id, { y: dims.h - selectedClip.height });
                            }}
                          ]).map((btn, idx) => (
                            <button
                              key={idx}
                              onClick={btn.action}
                              className="px-2 py-1 hover:bg-white/5 rounded text-[8px] font-bold text-gray-400 hover:text-white transition-all cursor-pointer"
                              title={btn.label}
                            >
                              {btn.id === 'left' && '⇤'}
                              {btn.id === 'center-h' && '⇹'}
                              {btn.id === 'right' && '⇥'}
                              {btn.id === 'top' && '⇞'}
                              {btn.id === 'center-v' && '⇳'}
                              {btn.id === 'bottom' && '⇟'}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* 2. BLEND SECTION */}
                <div className="border-b border-white/5 pb-4 space-y-3">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('blend')}>
                    <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider">Mezcla</span>
                    <div className="flex items-center">
                      <span className="text-[10px] text-gray-500 mr-2">{expandedSections.blend ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expandedSections.blend && (
                    <div className="space-y-4 pt-1">
                      
                      {/* Modo */}
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-500 block">Modo de mezcla</span>
                        <select 
                          value={selectedClip.mixBlendMode || 'normal'}
                          onChange={e => updateClip(selectedClip.id, { mixBlendMode: e.target.value as any })}
                          className="w-full bg-black p-2.5 rounded-lg text-xs border border-white/10 text-white outline-none focus:border-[#00b5b5] cursor-pointer"
                        >
                          <option value="normal">Predeterminado (Normal)</option>
                          <option value="multiply">Multiplicar</option>
                          <option value="screen">Pantalla (Screen)</option>
                          <option value="overlay">Superponer (Overlay)</option>
                          <option value="soft-light">Luz suave (Soft Light)</option>
                          <option value="hard-light">Luz fuerte (Hard Light)</option>
                          <option value="color-dodge">Sobreexposición (Color Dodge)</option>
                          <option value="color-burn">Subexposición (Color Burn)</option>
                          <option value="difference">Diferencia</option>
                          <option value="darken">Oscurecer</option>
                          <option value="lighten">Aclarar</option>
                        </select>
                      </div>

                      {/* Opacidad (0% to 100%) */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-gray-400">
                          <span>Opacidad</span>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number"
                              min="0"
                              max="100"
                              value={selectedClip.opacity === undefined ? 100 : selectedClip.opacity}
                              onChange={e => updateClip(selectedClip.id, { opacity: Number(e.target.value) })}
                              className="w-12 bg-black border border-white/10 rounded px-1 text-center font-mono text-[10px] text-white focus:outline-none"
                            />
                            <span>%</span>
                            {renderKeyframeIcon('opacity', selectedClip.opacity === undefined ? 100 : selectedClip.opacity)}
                          </div>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={selectedClip.opacity === undefined ? 100 : selectedClip.opacity}
                          onChange={e => updateClip(selectedClip.id, { opacity: Number(e.target.value) })}
                          className="w-full accent-[#00b5b5] cursor-pointer h-1 rounded bg-[#232328]"
                        />
                      </div>

                    </div>
                  )}
                </div>

                {/* 3. STABILIZATION SECTION */}
                <div className="pb-4 space-y-3">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('stabilize')}>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={!!selectedClip.stabilizationEnabled}
                        onChange={e => updateClip(selectedClip.id, { stabilizationEnabled: e.target.checked })}
                        className="accent-[#00b5b5] w-3.5 h-3.5"
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider">Estabilización</span>
                      <span className="text-[8px] bg-purple-600/30 text-purple-400 border border-purple-500/30 px-1 rounded font-bold">PRO</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{expandedSections.stabilize ? '▲' : '▼'}</span>
                  </div>

                  {expandedSections.stabilize && selectedClip.stabilizationEnabled && (
                    <div className="space-y-4 pt-1 bg-[#121215]/40 p-3 rounded-lg border border-white/5">
                      <div>
                        <span className="text-[9px] text-gray-500 block mb-1 font-medium">Modo de estabilización</span>
                        <select 
                          value={selectedClip.stabilizationMode || 'basic'}
                          onChange={e => updateClip(selectedClip.id, { stabilizationMode: e.target.value as any })}
                          className="w-full bg-black p-2 rounded text-xs border border-white/10 text-white outline-none focus:border-[#00b5b5] cursor-pointer"
                        >
                          <option value="basic">Estabilización Básica (Suave)</option>
                          <option value="advanced">Estabilización Avanzada (Trípode)</option>
                          <option value="ai">Estabilizador Óptico IA</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-gray-400">
                          <span>Intensidad</span>
                          <span>{selectedClip.stabilizationIntensity || 50}%</span>
                        </div>
                        <input 
                          type="range"
                          min="10"
                          max="100"
                          value={selectedClip.stabilizationIntensity || 50}
                          onChange={e => updateClip(selectedClip.id, { stabilizationIntensity: Number(e.target.value) })}
                          className="w-full accent-[#00b5b5] h-1"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB: VIDEO - SUB TAB: BACKGROUND REMOVAL */}
            {mainTab === 'video' && videoSubTab === 'bg' && (
              <div className="space-y-4 p-4 bg-zinc-950/40 rounded-xl border border-white/5">
                <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider block">Eliminar Fondo de Video</span>
                <p className="text-[10px] text-gray-500 leading-normal">Utiliza inteligencia artificial o croma para extraer el fondo del video y colocar superposiciones.</p>
                
                <div className="space-y-3 pt-2">
                  <button 
                    onClick={() => {
                      updateClip(selectedClip.id, { improveImage: !selectedClip.improveImage });
                      alert('Recorte automático inteligente (Chroma Key / IA Segmentación) iniciado en el clip...');
                    }}
                    className="w-full py-2.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all cursor-pointer"
                  >
                    Auto Recorte Inteligente (IA)
                  </button>

                  <div className="border border-white/10 rounded-lg p-3 space-y-2">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Clave de Color (Chroma Key)</span>
                    <div className="flex items-center gap-3">
                      <input type="color" className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer" />
                      <span className="text-[9px] text-gray-500">Seleccionar color del fondo a remover</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: VIDEO - SUB TAB: MASK */}
            {mainTab === 'video' && videoSubTab === 'mask' && (
              <div className="space-y-4 bg-zinc-950/40 p-4 rounded-xl border border-white/5 text-[10px]">
                <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider block">Máscara de Recorte</span>
                
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'none', label: 'Ninguno' },
                    { id: 'circle', label: '🔴 Círculo' },
                    { id: 'rectangle', label: '⬜ Rectángulo' },
                  ] as const).map(m => (
                    <button
                      key={m.id}
                      onClick={() => updateClip(selectedClip.id, { maskType: m.id })}
                      className={`p-2 rounded border text-center transition-all cursor-pointer ${
                        (selectedClip.maskType || 'none') === m.id
                          ? 'border-[#00b5b5] bg-[#00b5b5]/15 text-[#00b5b5]'
                          : 'border-white/5 bg-black/40 text-gray-400 hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: SPEED - SUB TAB: STANDARD */}
            {mainTab === 'speed' && speedSubTab === 'standard' && (
              <div className="space-y-5">
                
                {/* Velocidad Slider (0.1x to 100x) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] text-gray-400">
                    <span>Velocidad</span>
                    <div className="flex items-center gap-1 font-mono text-white text-[10px]">
                      <span>{(selectedClip.constantSpeed || 1.0).toFixed(2)}x</span>
                    </div>
                  </div>
                  <input 
                    type="range"
                    min="0.1"
                    max="10.0"
                    step="0.05"
                    value={selectedClip.constantSpeed || 1.0}
                    onChange={e => {
                      const speed = Number(e.target.value);
                      updateClip(selectedClip.id, { constantSpeed: speed });
                    }}
                    className="w-full accent-[#00b5b5] cursor-pointer h-1 rounded bg-[#232328]"
                  />
                  <div className="flex justify-between text-[8px] text-gray-600 font-mono px-0.5">
                    <span>0.1x</span>
                    <span>1.0x</span>
                    <span>2.0x</span>
                    <span>5.0x</span>
                    <span>10.0x</span>
                  </div>
                </div>

                {/* Duración (Adjusts automatically based on speed) */}
                <div className="flex justify-between items-center text-[10px] text-gray-400 border-b border-white/5 pb-3">
                  <span>Duración</span>
                  <span className="font-mono text-[#00b5b5] font-bold">
                    {(selectedClip.duration / (selectedClip.constantSpeed || 1.0)).toFixed(1)}s
                  </span>
                </div>

                {/* Cambiar tono del audio (Preserve pitch) */}
                <div className="flex justify-between items-center text-[10px] text-gray-400 py-1">
                  <span>Mantener tono del audio original (Preserve Pitch)</span>
                  <button 
                    onClick={() => updateClip(selectedClip.id, { preservePitch: !selectedClip.preservePitch })}
                    className={`w-8 h-4 rounded-full p-0.5 transition-colors cursor-pointer ${
                      selectedClip.preservePitch ? 'bg-[#00b5b5]' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${
                      selectedClip.preservePitch ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Cámara lenta fluida */}
                <div className="pt-2">
                  <span className="text-[10px] text-gray-500 block mb-1">Cámara lenta fluida (Interpolación)</span>
                  <select 
                    value={selectedClip.slowMoInterpolation || 'blending'}
                    onChange={e => updateClip(selectedClip.id, { slowMoInterpolation: e.target.value as any })}
                    className="w-full bg-black p-2.5 rounded-lg text-xs border border-white/10 text-white outline-none focus:border-[#00b5b5] cursor-pointer"
                  >
                    <option value="blending">Mezcla de fotogramas (Frame Blending)</option>
                    <option value="optical">Flujo óptico (Optical Flow - Alta Calidad)</option>
                    <option value="ai">Cámara lenta por Inteligencia Artificial</option>
                  </select>
                </div>

              </div>
            )}

            {/* TAB: SPEED - SUB TAB: CURVE */}
            {mainTab === 'speed' && speedSubTab === 'curve' && (
              <div className="space-y-4">
                <span className="text-[10px] text-gray-400 block font-bold">Presets de Curvas de Velocidad (Rampas)</span>
                
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'none', name: 'Ninguno' },
                    { id: 'bullet', name: 'Montaña / Bullet' },
                    { id: 'montage', name: 'Montaje' },
                    { id: 'hero', name: 'Héroe Lento' },
                    { id: 'jump', name: 'Jump Cut' },
                    { id: 'custom', name: 'Personalizado' },
                  ] as const).map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        let pts = [1, 1, 1, 1, 1];
                        if (preset.id === 'bullet') pts = [2.0, 2.0, 0.5, 2.0, 2.0];
                        else if (preset.id === 'montage') pts = [0.5, 1.5, 3.0, 1.5, 0.5];
                        else if (preset.id === 'hero') pts = [1.0, 1.0, 0.25, 1.0, 1.0];
                        else if (preset.id === 'jump') pts = [3.0, 0.25, 3.0, 1.0, 1.0];
                        updateClip(selectedClip.id, {
                          speedMode: 'curve',
                          speedCurvePreset: preset.id,
                          curvePoints: pts
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-[9px] font-bold ${
                        selectedClip.speedCurvePreset === preset.id
                          ? 'border-[#00b5b5] bg-[#00b5b5]/15 text-[#00b5b5]'
                          : 'border-white/5 bg-black/40 text-gray-400 hover:text-white'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                {selectedClip.speedMode === 'curve' && (
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <span className="text-[9px] text-gray-500 font-bold uppercase block">Puntos Bezier (Pestaña Velocidad)</span>
                    {(selectedClip.curvePoints || [1, 1, 1, 1, 1]).map((val, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[8px] text-gray-400">
                          <span>Punto {idx + 1} ({idx * 25}%)</span>
                          <span className="font-mono text-cyan-400">{val.toFixed(2)}x</span>
                        </div>
                        <input 
                          type="range"
                          min="0.25"
                          max="4.0"
                          step="0.05"
                          value={val}
                          onChange={e => {
                            const newPts = [...(selectedClip.curvePoints || [1, 1, 1, 1, 1])];
                            newPts[idx] = Number(e.target.value);
                            updateClip(selectedClip.id, { curvePoints: newPts, speedCurvePreset: 'custom' });
                          }}
                          className="w-full accent-cyan-500 h-1"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: SPEED - SUB TAB: SPEED EFFECTS */}
            {mainTab === 'speed' && speedSubTab === 'effects' && (
              <div className="space-y-3 text-[10px] text-gray-400">
                <span className="text-[10px] text-gray-300 block font-bold">Biblioteca de Rampas</span>
                <p>Efectos cinematográficos de cámara lenta y velocidad acelerada automatizados para eventos deportivos o clips de marketing.</p>
                <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-center text-gray-500">
                  ⚡ Selecciona "Curva" para editar y aplicar perfiles personalizados.
                </div>
              </div>
            )}

            {/* TAB: ANIMATION - SUB TABS */}
            {mainTab === 'animation' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-300 font-bold uppercase">Biblioteca de Animaciones</span>
                  <span className="text-[9px] text-gray-500">Tipo: {animationSubTab === 'in' ? 'Entrada' : animationSubTab === 'out' ? 'Salida' : 'Combo Loop'}</span>
                </div>

                {/* Animated cards grid Mockup */}
                <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[200px] custom-scrollbar pr-1">
                  {[
                    { id: 'none', label: 'Ninguno', emoji: '🚫' },
                    { id: 'fade', label: 'Desvanecer', emoji: '🌫️' },
                    { id: 'zoom', label: 'Zoom In/Out', emoji: '🔍' },
                    { id: 'slide', label: 'Deslizar', emoji: '➡️' },
                    { id: 'bounce', label: 'Rebote', emoji: '🥎' },
                    { id: 'spin', label: 'Girar', emoji: '🌀' },
                    { id: 'glitch', label: 'Glitch', emoji: '👾' },
                    { id: 'glow', label: 'Brillo', emoji: '✨' },
                    { id: 'shake', label: 'Sacudir', emoji: '📳' }
                  ].map(anim => {
                    const activeType = animationSubTab === 'in' 
                      ? selectedClip.animationInType 
                      : animationSubTab === 'out' 
                      ? selectedClip.animationOutType 
                      : selectedClip.animationComboType;
                    const isActive = (activeType || 'none') === anim.id;

                    return (
                      <button
                        key={anim.id}
                        onClick={() => {
                          const updateObj: Partial<VideoClip> = {};
                          if (animationSubTab === 'in') {
                            updateObj.animationInType = anim.id;
                            updateObj.animationInDuration = selectedClip.animationInDuration || 0.5;
                          } else if (animationSubTab === 'out') {
                            updateObj.animationOutType = anim.id;
                            updateObj.animationOutDuration = selectedClip.animationOutDuration || 0.5;
                          } else {
                            updateObj.animationComboType = anim.id;
                            updateObj.animationComboDuration = selectedClip.animationComboDuration || 1.0;
                          }
                          updateClip(selectedClip.id, updateObj);
                        }}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-2 gap-1.5 transition-all cursor-pointer text-center ${
                          isActive
                            ? 'border-[#00b5b5] bg-[#00b5b5]/10 text-white font-bold'
                            : 'border-white/5 bg-zinc-950/40 text-gray-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <span className="text-xl">{anim.emoji}</span>
                        <span className="text-[8px] leading-tight block truncate w-full">{anim.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Duration Slider */}
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Duración de Animación</span>
                    <span className="font-mono text-[#00b5b5] font-bold">
                      {animationSubTab === 'in' 
                        ? (selectedClip.animationInDuration || 0.5).toFixed(1) 
                        : animationSubTab === 'out' 
                        ? (selectedClip.animationOutDuration || 0.5).toFixed(1)
                        : (selectedClip.animationComboDuration || 1.0).toFixed(1)}s
                    </span>
                  </div>
                  <input 
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={animationSubTab === 'in' 
                      ? (selectedClip.animationInDuration || 0.5) 
                      : animationSubTab === 'out' 
                      ? (selectedClip.animationOutDuration || 0.5)
                      : (selectedClip.animationComboDuration || 1.0)}
                    onChange={e => {
                      const dur = Number(e.target.value);
                      const updateObj: Partial<VideoClip> = {};
                      if (animationSubTab === 'in') updateObj.animationInDuration = dur;
                      else if (animationSubTab === 'out') updateObj.animationOutDuration = dur;
                      else updateObj.animationComboDuration = dur;
                      updateClip(selectedClip.id, updateObj);
                    }}
                    className="w-full accent-[#00b5b5] cursor-pointer h-1 rounded"
                  />
                </div>
              </div>
            )}

            {/* TAB: ADJUST - SUB TAB: BASIC */}
            {mainTab === 'adjust' && adjustSubTab === 'basic' && (
              <div className="space-y-5">
                
                {/* Ajuste Automático IA */}
                <div className="flex justify-between items-center text-[10px] text-gray-300 font-bold border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={!!selectedClip.autoAdjustEnabled}
                      onChange={e => updateClip(selectedClip.id, { autoAdjustEnabled: e.target.checked })}
                      className="accent-[#00b5b5]"
                    />
                    <span>Ajuste automático IA</span>
                  </div>
                  <span className="text-[8px] bg-purple-600/30 text-purple-400 px-1 rounded font-bold border border-purple-500/20">PRO</span>
                </div>

                {/* Combinación de Colores */}
                <div className="flex justify-between items-center text-[10px] text-gray-300 font-bold border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      checked={!!selectedClip.colorMatchEnabled}
                      onChange={e => updateClip(selectedClip.id, { colorMatchEnabled: e.target.checked })}
                      className="accent-[#00b5b5]"
                    />
                    <span>Combinación de colores</span>
                  </div>
                  <span className="text-[8px] bg-purple-600/30 text-purple-400 px-1 rounded font-bold border border-purple-500/20">PRO</span>
                </div>

                {/* LUT Section */}
                <div className="border-b border-white/5 pb-4 space-y-3">
                  <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('lut')}>
                    <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider">LUT</span>
                    <span className="text-[10px] text-gray-500">{expandedSections.lut ? '▲' : '▼'}</span>
                  </div>

                  {expandedSections.lut && (
                    <div className="space-y-3 pt-1">
                      <div>
                        <span className="text-[9px] text-gray-500 block mb-1">Nombre del LUT</span>
                        <select 
                          value={selectedClip.lutName || 'none'}
                          onChange={e => updateClip(selectedClip.id, { lutName: e.target.value })}
                          className="w-full bg-black p-2.5 rounded-lg text-xs border border-white/10 text-white outline-none focus:border-[#00b5b5] cursor-pointer"
                        >
                          <option value="none">Ninguno</option>
                          <option value="cinematic">Cinematic 3D</option>
                          <option value="teal_orange">Teal & Orange</option>
                          <option value="sony_slog">Sony S-Log Rec709</option>
                          <option value="canon_clog">Canon C-Log Rec709</option>
                          <option value="fuji_flog">Fujifilm F-Log</option>
                          <option value="kodak_chrome">Kodak Portra Chrome</option>
                        </select>
                      </div>

                      {selectedClip.lutName && selectedClip.lutName !== 'none' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-gray-400">
                            <span>Intensidad</span>
                            <span>{selectedClip.lutIntensity || 100}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={selectedClip.lutIntensity || 100}
                            onChange={e => updateClip(selectedClip.id, { lutIntensity: Number(e.target.value) })}
                            className="w-full accent-[#00b5b5] h-1"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Adjust Sliders Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center cursor-pointer border-b border-white/5 pb-2" onClick={() => toggleSection('adjustSliders')}>
                    <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider">Ajustar Sliders</span>
                    <span className="text-[10px] text-gray-500">{expandedSections.adjustSliders ? '▲' : '▼'}</span>
                  </div>

                  {expandedSections.adjustSliders && (
                    <div className="space-y-4 pt-1">
                      {[
                        { label: 'Brillo', prop: 'brightness', min: 0, max: 200, def: 100 },
                        { label: 'Contraste', prop: 'contrast', min: 0, max: 200, def: 100 },
                        { label: 'Saturación', prop: 'saturate', min: 0, max: 200, def: 100 },
                        { label: 'Desenfoque', prop: 'blur', min: 0, max: 20, def: 0 },
                        { label: 'Matiz (Hue)', prop: 'hueRotate', min: 0, max: 360, def: 0 },
                      ].map(({ label, prop, min, max, def }) => {
                        const val = (selectedClip as any)[prop] === undefined ? def : (selectedClip as any)[prop];
                        return (
                          <div key={prop} className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-gray-400">
                              <span>{label}</span>
                              <div className="flex items-center gap-1">
                                <input 
                                  type="number"
                                  min={min}
                                  max={max}
                                  value={val}
                                  onChange={e => updateClip(selectedClip.id, { [prop]: Number(e.target.value) })}
                                  className="w-12 bg-black border border-white/10 rounded px-1 text-center font-mono text-[10px] text-white focus:outline-none"
                                />
                                {renderKeyframeIcon(prop, val)}
                              </div>
                            </div>
                            <input 
                              type="range"
                              min={min}
                              max={max}
                              value={val}
                              onChange={e => updateClip(selectedClip.id, { [prop]: Number(e.target.value) })}
                              className="w-full accent-[#00b5b5] cursor-pointer h-1 rounded bg-[#232328]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bottom Global Actions */}
                <div className="pt-3 border-t border-white/5 flex gap-2 shrink-0">
                  <button 
                    onClick={() => {
                      updateClip(selectedClip.id, {
                        brightness: 100, contrast: 100, saturate: 100, blur: 0, hueRotate: 0, opacity: 100, scale: 100, rotation: 0, lutName: 'none', autoAdjustEnabled: false
                      });
                      alert('Ajustes del clip restablecidos.');
                    }}
                    className="flex-1 py-2 rounded-lg bg-zinc-900 border border-white/10 text-[9px] font-bold text-gray-400 hover:text-white transition-all cursor-pointer"
                  >
                    Restablecer
                  </button>
                  <button 
                    onClick={() => {
                      applyEffectsToAllClips(selectedClip.id);
                      alert('¡Filtros y ajustes de color propagados a todos los clips del editor!');
                    }}
                    className="flex-1 py-2 rounded-lg bg-[#00b5b5]/20 hover:bg-[#00b5b5] text-[#00b5b5] hover:text-white border border-[#00b5b5]/30 text-[9px] font-bold transition-all cursor-pointer"
                  >
                    Aplicar a todo
                  </button>
                </div>

              </div>
            )}

            {/* TAB: ADJUST - SUB TAB: HSL */}
            {mainTab === 'adjust' && adjustSubTab === 'hsl' && (
              <div className="space-y-4">
                <span className="text-[10px] text-gray-300 block font-bold uppercase">Corrección HSL de Color</span>
                
                {/* 8 Color select buttons row */}
                <div className="flex justify-between p-1 bg-black/40 rounded-xl border border-white/5">
                  {['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'magenta'].map(color => {
                    const isActive = activeHslColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setActiveHslColor(color)}
                        className={`w-6 h-6 rounded-full border transition-all cursor-pointer flex items-center justify-center ${
                          isActive ? 'border-[#00b5b5] scale-110 shadow-[0_0_8px_rgba(0,181,181,0.5)]' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: getHslColorHex(color) }}
                      >
                        {isActive && <span className="text-[8px] text-black">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* HSL Sliders */}
                <div className="space-y-4 pt-2 bg-zinc-950/40 p-4 rounded-xl border border-white/5">
                  <span className="text-[9px] font-bold uppercase tracking-wider block text-[#00b5b5]">Canal: {activeHslColor.toUpperCase()}</span>
                  
                  {['Tono (Hue)', 'Saturación', 'Luminosidad'].map((label, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[9px] text-gray-400">
                        <span>{label}</span>
                        <span className="font-mono text-cyan-400">0</span>
                      </div>
                      <input 
                        type="range"
                        min="-100"
                        max="100"
                        defaultValue="0"
                        className="w-full accent-cyan-500 h-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: ADJUST - SUB TAB: CURVES */}
            {mainTab === 'adjust' && adjustSubTab === 'curves' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-300 font-bold uppercase">Curvas de Tono</span>
                  <div className="flex gap-1 bg-[#121215] p-0.5 rounded border border-white/5">
                    {['rgb', 'red', 'green', 'blue'].map(c => (
                      <button
                        key={c}
                        onClick={() => setActiveCurveChannel(c as any)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all cursor-pointer ${
                          activeCurveChannel === c 
                            ? 'bg-[#00b5b5] text-white' 
                            : 'text-gray-500 hover:text-white'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Curve Grid Preview Mockup */}
                <div className="w-full aspect-square bg-zinc-950 border border-white/10 rounded-xl relative p-1 flex items-center justify-center group overflow-hidden">
                  <svg className="w-full h-full stroke-gray-800" strokeWidth="0.5" strokeDasharray="2 2">
                    <line x1="25%" y1="0" x2="25%" y2="100%" />
                    <line x1="50%" y1="0" x2="50%" y2="100%" />
                    <line x1="75%" y1="0" x2="75%" y2="100%" />
                    <line x1="0" y1="25%" x2="100%" y2="25%" />
                    <line x1="0" y1="50%" x2="100%" y2="50%" />
                    <line x1="0" y1="75%" x2="100%" y2="75%" />
                    {/* Curve path representation */}
                    <path d="M 0 300 Q 150 150, 300 0" fill="none" stroke={
                      activeCurveChannel === 'rgb' ? '#ffffff' : 
                      activeCurveChannel === 'red' ? '#ef4444' : 
                      activeCurveChannel === 'green' ? '#22c55e' : '#3b82f6'
                    } strokeWidth="2" strokeDasharray="none" />
                  </svg>
                  <span className="absolute bottom-2 right-2 text-[8px] text-gray-600 font-mono">RGB Curves Editor</span>
                </div>
              </div>
            )}

            {/* TAB: ADJUST - SUB TAB: COLOR WHEELS */}
            {mainTab === 'adjust' && adjustSubTab === 'wheels' && (
              <div className="space-y-4">
                <span className="text-[10px] text-gray-300 block font-bold uppercase">Círculo Cromático de 3 vías</span>
                
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Sombras (Shadows)', color: 'from-blue-900/30' },
                    { label: 'Medios (Midtones)', color: 'from-yellow-900/30' },
                    { label: 'Luces (Highlights)', color: 'from-red-900/30' },
                    { label: 'Global', color: 'from-zinc-800/30' }
                  ].map((wheel, idx) => (
                    <div key={idx} className="flex flex-col items-center bg-zinc-950/40 p-2.5 rounded-xl border border-white/5 gap-1.5">
                      <span className="text-[8px] font-bold text-gray-400 text-center block">{wheel.label}</span>
                      
                      {/* Gradient Color Wheel SVG Representation */}
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 via-yellow-500 to-purple-500 relative flex items-center justify-center shadow-lg border border-white/10 group cursor-crosshair">
                        <div className="w-14 h-14 rounded-full bg-[#0c0c0f] opacity-80 pointer-events-none absolute" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white border border-[#7B5CFF] shadow z-10 hover:scale-125 transition-transform" />
                      </div>

                      <input type="range" min="-100" max="100" defaultValue="0" className="w-full accent-cyan-500 h-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: TEXT CONTROLS (ONLY FOR TEXT LAYERS) */}
            {mainTab === 'text' && selectedClip.type === 'text' && (
              <div className="p-4 bg-zinc-950/40 rounded-xl border border-white/5 space-y-4">
                <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider block">Propiedades de Texto</span>
                
                <div>
                  <span className="text-[9px] text-gray-500 block mb-1">Contenido de Texto</span>
                  <textarea 
                    value={selectedClip.textContent || ''}
                    onChange={e => updateClip(selectedClip.id, { textContent: e.target.value })}
                    rows={3}
                    className="w-full bg-black p-2.5 rounded-lg text-xs border border-white/10 text-white outline-none focus:border-[#00b5b5] resize-none font-medium"
                    placeholder="Escribe el texto aquí..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1">Tamaño de Fuente (px)</span>
                    <input 
                      type="number"
                      min="10"
                      max="200"
                      value={selectedClip.textFontSize || 40}
                      onChange={e => updateClip(selectedClip.id, { textFontSize: Number(e.target.value) })}
                      className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-[#00b5b5] text-xs font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1">Color de Texto</span>
                    <div className="flex gap-1.5 items-center">
                      <input 
                        type="color"
                        value={selectedClip.textColor || '#ffffff'}
                        onChange={e => updateClip(selectedClip.id, { textColor: e.target.value })}
                        className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer p-0 shrink-0"
                      />
                      <input 
                        type="text"
                        value={selectedClip.textColor || '#ffffff'}
                        onChange={e => updateClip(selectedClip.id, { textColor: e.target.value })}
                        className="w-full bg-black p-1 text-[10px] rounded border border-white/10 font-mono text-center"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-gray-500 block mb-1 font-medium">Tipografía</span>
                  <select 
                    value={selectedClip.textFontFamily || 'Montserrat'}
                    onChange={e => updateClip(selectedClip.id, { textFontFamily: e.target.value })}
                    className="w-full bg-black p-2.5 rounded text-xs border border-white/10 text-white outline-none focus:border-[#00b5b5] cursor-pointer"
                  >
                    <option value="Montserrat">Montserrat (Moderno)</option>
                    <option value="Bebas Neue">Bebas Neue (Impacto)</option>
                    <option value="Playfair Display">Playfair Display (Elegante)</option>
                    <option value="sans-serif">System Sans</option>
                  </select>
                </div>

                <div>
                  <span className="text-[9px] text-gray-500 block mb-1 font-medium">Estilo / Animación Kinetic</span>
                  <select 
                    value={selectedClip.textEffect || 'none'}
                    onChange={e => updateClip(selectedClip.id, { textEffect: e.target.value as any })}
                    className="w-full bg-black p-2.5 rounded text-xs border border-white/10 text-white outline-none focus:border-[#00b5b5] cursor-pointer"
                  >
                    <option value="none">Estático Simple</option>
                    <option value="shadow">Estático con Sombra</option>
                    <option value="neon">Pulsación de Neón Glow</option>
                    <option value="glitch">Glitch Cibernético</option>
                    <option value="typing">Máquina de Escribir (Reveal)</option>
                    <option value="fade-zoom">Desvanecimiento Suave (Ken Burns)</option>
                    <option value="bounce">Bote Elástico (Pop In)</option>
                  </select>
                </div>
              </div>
            )}

            {/* DELETE CLIP BUTTON */}
            <button 
              onClick={() => deleteClip(selectedClip.id)}
              className="w-full py-3 mt-4 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Trash2 size={12} />
              <span>Eliminar Capa del Editor</span>
            </button>

          </div>
        )}

        {/* B. SELECTED AUDIO TRACK */}
        {selectedAudio && (
          <div className="space-y-5">
            <div className="p-3.5 bg-blue-500/5 rounded-xl border border-blue-500/10">
              <span className="text-[8px] bg-blue-500/25 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider inline-block mb-1">
                Audio
              </span>
              <span className="text-xs font-bold text-gray-200 truncate block w-[200px]" title={selectedAudio.name}>
                {selectedAudio.name}
              </span>
            </div>

            {/* Volume Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>Volumen Mezcla</span>
                <span className="font-mono text-blue-400">{selectedAudio.volume}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="200"
                value={selectedAudio.volume}
                onChange={e => updateAudioTrack(selectedAudio.id, { volume: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-[#232328]"
              />
            </div>

            {/* Timeline Start Position Offset */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>Tiempo de Inicio (s)</span>
                <span className="font-mono text-blue-400">{selectedAudio.timelineStart.toFixed(1)}s</span>
              </div>
              <input 
                type="range"
                min="0"
                max={Math.max(timelineDuration, 5)}
                step="0.1"
                value={selectedAudio.timelineStart}
                onChange={e => updateAudioTrack(selectedAudio.id, { timelineStart: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer h-1 bg-[#232328]"
              />
            </div>

            {/* Audio Trim length */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-gray-400">
                <span>Duración Recorte (s)</span>
                <span className="font-mono text-blue-400">{selectedAudio.duration.toFixed(1)}s</span>
              </div>
              <input 
                type="range"
                min="1"
                max="60"
                step="0.5"
                value={selectedAudio.duration}
                onChange={e => updateAudioTrack(selectedAudio.id, { duration: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer h-1 bg-[#232328]"
              />
            </div>

            <button 
              onClick={() => deleteAudioTrack(selectedAudio.id)}
              className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <Trash2 size={12} />
              <span>Eliminar Música de Fondo</span>
            </button>
          </div>
        )}

        {/* C. NO SELECTION - GLOBAL MIXER */}
        {!selectedClip && !selectedAudio && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 bg-zinc-950/40 border border-white/5 rounded-xl text-center text-gray-400 space-y-3">
              <span className="text-[9px] font-black tracking-widest text-[#00b5b5] block mb-1">💡 SELECCIÓN</span>
              <p className="text-[10px] text-gray-500 leading-normal mb-2">Haz clic en cualquier clip o pista de música en la línea de tiempo para editar sus propiedades individuales.</p>
              
              <button 
                onClick={() => {
                  addVideoClip({
                    type: 'adjustment',
                    url: '',
                    name: 'Capa de Ajuste',
                    duration: 3600,
                    startTrim: 0,
                    endTrim: 4,
                    volume: 0,
                    placementMode: 'overlay',
                    timelineStart: playbackTime
                  } as any);
                }}
                className="w-full py-2 px-3 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 hover:border-indigo-500 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/5 hover:shadow-indigo-600/20"
              >
                <span>➕</span>
                <span>Añadir Capa de Ajuste (V5)</span>
              </button>
            </div>

            {/* GLOBAL MIXER AREA */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Volume2 size={12} className="text-emerald-400" />
                <span>Mezclador de Audio Global</span>
              </span>

              {/* Master Volume Controls */}
              <div className="space-y-3 bg-zinc-950/40 p-3.5 rounded-xl border border-white/5">
                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Volúmenes Generales</span>
                
                {/* Master Ambient Volume */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Sonido Ambiente General</span>
                    <span className="font-mono text-emerald-400">{masterAmbientVolume}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="200"
                    value={masterAmbientVolume}
                    onChange={e => setMasterAmbientVolume(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5"
                  />
                </div>

                {/* Master Music Volume */}
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Música / Grabación General</span>
                    <span className="font-mono text-blue-400">{masterMusicVolume}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="200"
                    value={masterMusicVolume}
                    onChange={e => setMasterMusicVolume(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>

              {/* Original clips (ambient sound) mixer list */}
              <div className="space-y-3">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Sonido Ambiente (Clips de Video)</span>
                {videoClips.filter(c => c.type === 'video').length === 0 ? (
                  <span className="text-[10px] text-gray-600 italic block">No hay clips de video en la línea de tiempo.</span>
                ) : (
                  <div className="space-y-3 bg-zinc-950/40 p-3.5 rounded-xl border border-white/5">
                    {videoClips.filter(c => c.type === 'video').map(clip => (
                      <div key={clip.id} className="space-y-1">
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span className="truncate w-32 text-gray-300" title={clip.name}>{clip.name}</span>
                          <span className="font-mono text-emerald-400">{clip.volume}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="200"
                          value={clip.volume}
                          onChange={e => updateClip(clip.id, { volume: Number(e.target.value) })}
                          className="w-full accent-emerald-500 cursor-pointer h-1 bg-[#232328]"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── FIXED EXPORT FOOTER (RESTYLED PREMIUM) ── */}
      <div className="p-5 border-t border-white/5 bg-[#050507] shrink-0 space-y-4">
        <div className="space-y-1.5">
          <span className="text-[9px] text-gray-400 uppercase font-bold block">Calidad de Exportación</span>
          <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
            {(['720p', '1080p', '4k'] as const).map((q) => (
              <button
                key={q}
                onClick={() => setExportQuality(q)}
                className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  exportQuality === q
                    ? 'bg-[#00b5b5]/25 text-[#00b5b5] border border-[#00b5b5]/30'
                    : 'text-gray-400 border border-transparent hover:bg-white/5'
                }`}
              >
                {q === '720p' && '720p'}
                {q === '1080p' && '1080p'}
                {q === '4k' && '4K'}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleExportVideo}
          disabled={videoClips.length === 0}
          className="w-full bg-[#00b5b5] hover:bg-[#00b5b5]/90 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,181,181,0.3)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm cursor-pointer"
        >
          <span>🎬</span>
          <span>Exportar Video WASM</span>
        </button>
      </div>
    </div>
  );
};
