import React, { useState, useEffect } from 'react';
import { useEditorStore, CANVAS_DIMENSIONS } from '../stores/editorStore';
import { Sliders, Volume2, Sparkles, Scissors, ArrowLeft, ArrowRight, Copy } from 'lucide-react';

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
  } = useEditorStore();

  const selectedClip = videoClips.find(c => c.id === selectedClipId);
  const selectedAudio = audioTracks.find(t => t.id === selectedAudioId);

  const [activeTab, setActiveTab] = useState<'video' | 'filters' | 'transition' | 'text'>('video');
  const [showQuickFilters, setShowQuickFilters] = useState<boolean>(true);
  const [showManualAdjust, setShowManualAdjust] = useState<boolean>(true);

  // Sync active tab based on selected clip type
  useEffect(() => {
    if (selectedClip) {
      if (selectedClip.type === 'text') {
        setActiveTab('text');
      } else {
        setActiveTab('video');
      }
    }
  }, [selectedClipId, selectedClip?.type]);

  return (
    <div className="w-[340px] bg-[#09090b] border-l border-white/5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar select-none text-white font-sans">
      {/* Header Tab */}
      <div className="p-4 border-b border-white/5 bg-[#050507] shrink-0">
        <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase flex items-center gap-1.5">
          <Sliders size={12} className="text-emerald-400" />
          <span>Inspector Pro</span>
        </span>
      </div>

      {/* Details Area */}
      <div className="p-5 flex-1 space-y-6">
        {/* A. Selected Video/Image clip inspector */}
        {selectedClip && (
          <div className="space-y-4 animate-fade-in">
            {/* Context Header */}
            <div className="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-center justify-between">
              <div>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider block mb-1">
                  {selectedClip.type === 'video' ? 'Clip de Video' : selectedClip.type === 'text' ? 'Capa de Texto' : 'Fotografía'}
                </span>
                <span className="text-xs font-bold text-white truncate block max-w-[170px]" title={selectedClip.name}>
                  {selectedClip.name}
                </span>
              </div>
              
              <div className="flex gap-1 shrink-0">
                <button 
                  onClick={() => {
                    const idx = videoClips.findIndex(c => c.id === selectedClipId);
                    if (idx > 0) reorderClips(idx, idx - 1);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-xs cursor-pointer text-gray-400 hover:text-white"
                  title="Mover a la izquierda"
                >
                  <ArrowLeft size={12} />
                </button>
                <button 
                  onClick={() => {
                    const idx = videoClips.findIndex(c => c.id === selectedClipId);
                    if (idx < videoClips.length - 1) reorderClips(idx, idx + 1);
                  }}
                  className="p-1 hover:bg-white/10 rounded text-xs cursor-pointer text-gray-400 hover:text-white"
                  title="Mover a la derecha"
                >
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>

            {/* Simple Sub-Tabs for Clean Layout */}
            <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 gap-0.5 text-[9px] font-bold">
              {selectedClip.type === 'text' && (
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 py-1 rounded transition-all cursor-pointer ${activeTab === 'text' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                >
                  Texto
                </button>
              )}
              <button
                onClick={() => setActiveTab('video')}
                className={`flex-1 py-1 rounded transition-all cursor-pointer ${activeTab === 'video' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                Diseño
              </button>
              <button
                onClick={() => setActiveTab('filters')}
                className={`flex-1 py-1 rounded transition-all cursor-pointer ${activeTab === 'filters' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                Ajustes
              </button>
              <button
                onClick={() => setActiveTab('transition')}
                className={`flex-1 py-1 rounded transition-all cursor-pointer ${activeTab === 'transition' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                Transic.
              </button>
            </div>

            {/* TAB CONTENT: TEXT */}
            {activeTab === 'text' && selectedClip.type === 'text' && (
              <div className="p-4 bg-white/2 rounded-xl border border-white/5 space-y-4">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Propiedades de Texto</span>
                
                <div>
                  <span className="text-[9px] text-gray-500 block mb-1">Contenido de Texto</span>
                  <textarea 
                    value={selectedClip.textContent || ''}
                    onChange={e => updateClip(selectedClip.id, { textContent: e.target.value })}
                    rows={3}
                    className="w-full bg-black p-2 rounded-lg text-xs border border-white/10 text-white outline-none focus:border-emerald-500 resize-none font-medium"
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
                      className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-emerald-500 text-xs font-mono"
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
                    className="w-full bg-black p-2 rounded text-xs border border-white/10 text-white outline-none focus:border-emerald-500 cursor-pointer"
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
                    className="w-full bg-black p-2 rounded text-xs border border-white/10 text-white outline-none focus:border-emerald-500 cursor-pointer"
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

            {/* TAB CONTENT: DESIGN (LAYING, WIDTH, ZOOM, SPEED, TRIM) */}
            {activeTab === 'video' && (
              <div className="space-y-4">
                {/* TRACK PLACEMENT */}
                <div className="space-y-3 p-4 bg-white/2 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Posicionamiento & Pista</span>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-1">Tipo de Pista</span>
                      <select 
                        value={selectedClip.placementMode || 'sequence'}
                        onChange={e => {
                          const mode = e.target.value as 'sequence' | 'overlay';
                          updateClip(selectedClip.id, { 
                            placementMode: mode,
                            timelineStart: mode === 'overlay' ? playbackTime : 0 
                          });
                        }}
                        className="w-full bg-black p-2.5 rounded-lg text-xs ring-1 ring-white/10 outline-none focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="sequence">Pista Principal (Secuencial)</option>
                        <option value="overlay">Superposición (Capa PIP)</option>
                      </select>
                    </div>

                    {selectedClip.placementMode === 'overlay' && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-500 block">Tiempo de Inicio (segundos)</span>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min="0"
                            max={Math.max(timelineDuration, 5)}
                            step="0.1"
                            value={selectedClip.timelineStart || 0}
                            onChange={e => updateClip(selectedClip.id, { timelineStart: Number(e.target.value) })}
                            className="flex-1 accent-emerald-500 cursor-pointer h-1.5 rounded bg-[#232A36]"
                          />
                          <input 
                            type="number"
                            min="0"
                            max={Math.max(timelineDuration, 5)}
                            step="0.1"
                            value={selectedClip.timelineStart || 0}
                            onChange={e => updateClip(selectedClip.id, { timelineStart: Number(e.target.value) })}
                            className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* LAYOUT DETAILS */}
                <div className="p-4 bg-white/2 rounded-xl border border-white/5 space-y-4">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Dimensión & Escala</span>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-0.5">Posición X (px)</span>
                      <input 
                        type="number"
                        value={selectedClip.x !== undefined ? selectedClip.x : 0}
                        onChange={e => updateClip(selectedClip.id, { x: Number(e.target.value) })}
                        className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-emerald-500 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-0.5">Posición Y (px)</span>
                      <input 
                        type="number"
                        value={selectedClip.y !== undefined ? selectedClip.y : 0}
                        onChange={e => updateClip(selectedClip.id, { y: Number(e.target.value) })}
                        className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-emerald-500 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-0.5 font-medium">Ancho (px)</span>
                      <input 
                        type="number"
                        value={selectedClip.width !== undefined ? selectedClip.width : (CANVAS_DIMENSIONS[format]?.w || 1080)}
                        onChange={e => updateClip(selectedClip.id, { width: Number(e.target.value) })}
                        className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-emerald-500 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-0.5 font-medium">Alto (px)</span>
                      <input 
                        type="number"
                        value={selectedClip.height !== undefined ? selectedClip.height : (CANVAS_DIMENSIONS[format]?.h || 1920)}
                        onChange={e => updateClip(selectedClip.id, { height: Number(e.target.value) })}
                        className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-emerald-500 font-mono text-[11px]"
                      />
                    </div>

                    <div className="col-span-2 flex items-center justify-between py-1 border-t border-white/5 mt-1">
                      <span className="text-[9px] text-gray-400">Bloquear aspecto al escalar</span>
                      <input 
                        type="checkbox"
                        checked={aspectRatioLock}
                        onChange={e => setAspectRatioLock(e.target.checked)}
                        className="accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </div>

                    <div className="col-span-2">
                      <span className="text-[9px] text-gray-500 block mb-0.5 font-medium">Ajuste de Escala (Fit Mode)</span>
                      <select 
                        value={selectedClip.fitMode || 'cover'}
                        onChange={e => updateClip(selectedClip.id, { fitMode: e.target.value as any })}
                        className="w-full bg-black p-2 rounded text-xs border border-white/10 text-white outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="cover">Rellenar (Cover)</option>
                        <option value="contain">Ajustar (Contain)</option>
                        <option value="fill">Estirar (Fill)</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <span className="text-[9px] text-gray-500 block mb-0.5 font-medium">Efecto de Zoom Animado</span>
                      <select 
                        value={selectedClip.zoomEffect || 'none'}
                        onChange={e => updateClip(selectedClip.id, { zoomEffect: e.target.value as any })}
                        className="w-full bg-black p-2 rounded text-xs border border-white/10 text-white outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="none">Sin Animación</option>
                        <option value="zoom-in">🔍 Zoom In Suave</option>
                        <option value="zoom-out">🔎 Zoom Out Suave</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <span className="text-[9px] text-gray-400 uppercase font-black block">Escala / Zoom</span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="50"
                        max="200"
                        value={selectedClip.scale || 100}
                        onChange={e => updateClip(selectedClip.id, { scale: Number(e.target.value) })}
                        className="flex-1 accent-emerald-500 cursor-pointer h-1.5 rounded bg-[#232A36]"
                      />
                      <input 
                        type="number"
                        min="50"
                        max="200"
                        value={selectedClip.scale || 100}
                        onChange={e => updateClip(selectedClip.id, { scale: Number(e.target.value) })}
                        className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* TIMING REMAP & SPEED */}
                {selectedClip.type === 'video' && (
                  <div className="space-y-3 p-4 bg-white/2 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} className="text-yellow-400" />
                      <span>Control de Velocidad</span>
                    </span>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-[9px] text-gray-500 block mb-1">Modo de Velocidad</span>
                        <select 
                          value={selectedClip.speedMode || 'constant'}
                          onChange={e => updateClip(selectedClip.id, { speedMode: e.target.value as 'constant' | 'curve' })}
                          className="w-full bg-black p-2.5 rounded-lg text-xs ring-1 ring-white/10 outline-none focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="constant">Velocidad Constante</option>
                          <option value="curve">Curva Dinámica</option>
                        </select>
                      </div>

                      {selectedClip.speedMode === 'curve' ? (
                        <div className="space-y-3">
                          <div>
                            <span className="text-[9px] text-gray-500 block mb-1">Preset de Curva</span>
                            <select 
                              value={selectedClip.speedCurvePreset || 'none'}
                              onChange={e => {
                                const preset = e.target.value as any;
                                let points = [1, 1, 1, 1, 1];
                                if (preset === 'bullet') points = [2.0, 2.0, 0.5, 2.0, 2.0];
                                else if (preset === 'montage') points = [0.5, 1.5, 3.0, 1.5, 0.5];
                                else if (preset === 'hero') points = [1.0, 1.0, 0.25, 1.0, 1.0];
                                else if (preset === 'jump') points = [3.0, 0.25, 3.0, 1.0, 1.0];
                                
                                updateClip(selectedClip.id, { 
                                  speedCurvePreset: preset,
                                  curvePoints: points
                                });
                              }}
                              className="w-full bg-black p-2.5 rounded-lg text-xs ring-1 ring-white/10 outline-none focus:ring-emerald-500 cursor-pointer"
                            >
                              <option value="none">Ninguno (1x plano)</option>
                              <option value="bullet">Bullet (Rápido - Lento - Rápido)</option>
                              <option value="montage">Montaje (Lento - Rápido - Lento)</option>
                              <option value="hero">Héroe (Lento al medio)</option>
                              <option value="jump">Jump Cut</option>
                              <option value="custom">Personalizado</option>
                            </select>
                          </div>

                          <div className="space-y-2 pt-1 border-t border-white/5">
                            <span className="text-[9px] text-gray-400 uppercase font-black block mb-1">Editar Puntos (0% a 100%)</span>
                            {(() => {
                              const pts = selectedClip.curvePoints || [1, 1, 1, 1, 1];
                              const labels = ['P1 (0%)', 'P2 (25%)', 'P3 (50%)', 'P4 (75%)', 'P5 (100%)'];
                              return pts.map((val, idx) => (
                                <div key={idx} className="space-y-0.5">
                                  <div className="flex justify-between text-[9px] text-gray-500">
                                    <span>{labels[idx]}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <input 
                                      type="range"
                                      min="0.25"
                                      max="4"
                                      step="0.05"
                                      value={val}
                                      onChange={e => {
                                        const newPts = [...pts];
                                        newPts[idx] = Number(e.target.value);
                                        updateClip(selectedClip.id, { 
                                          curvePoints: newPts,
                                          speedCurvePreset: 'custom'
                                        });
                                      }}
                                      className="flex-1 accent-yellow-400 cursor-pointer h-1 rounded-lg"
                                    />
                                    <input 
                                      type="number"
                                      min="0.25"
                                      max="4"
                                      step="0.05"
                                      value={val}
                                      onChange={e => {
                                        const newPts = [...pts];
                                        newPts[idx] = Number(e.target.value);
                                        updateClip(selectedClip.id, { 
                                          curvePoints: newPts,
                                          speedCurvePreset: 'custom'
                                        });
                                      }}
                                      className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-yellow-500"
                                    />
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[9px] text-gray-500 block">Velocidad Constante</span>
                          <div className="flex items-center gap-3">
                            <input 
                              type="range"
                              min="0.25"
                              max="4"
                              step="0.05"
                              value={selectedClip.constantSpeed || 1.0}
                              onChange={e => updateClip(selectedClip.id, { constantSpeed: Number(e.target.value) })}
                              className="flex-1 accent-emerald-500 cursor-pointer h-1 rounded"
                            />
                            <input 
                              type="number"
                              min="0.25"
                              max="4"
                              step="0.05"
                              value={selectedClip.constantSpeed || 1.0}
                              onChange={e => updateClip(selectedClip.id, { constantSpeed: Number(e.target.value) })}
                              className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TRIM SECTION */}
                <div className="space-y-3 p-4 bg-white/2 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <Scissors size={12} className="text-emerald-400" />
                    <span>Recortar Duración</span>
                  </span>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-[9px] text-gray-500 block">Recorte de Inicio (s)</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range"
                          min="0"
                          max={selectedClip.endTrim}
                          step="0.1"
                          value={selectedClip.startTrim}
                          onChange={e => updateClip(selectedClip.id, { startTrim: Number(e.target.value) })}
                          className="flex-1 accent-emerald-500 cursor-pointer h-1"
                        />
                        <input 
                          type="number"
                          min="0"
                          max={selectedClip.endTrim}
                          step="0.1"
                          value={selectedClip.startTrim}
                          onChange={e => updateClip(selectedClip.id, { startTrim: Number(e.target.value) })}
                          className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-gray-500 block">Recorte de Fin (s)</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range"
                          min={selectedClip.startTrim}
                          max={selectedClip.duration}
                          step="0.1"
                          value={selectedClip.endTrim}
                          onChange={e => updateClip(selectedClip.id, { endTrim: Number(e.target.value) })}
                          className="flex-1 accent-emerald-500 cursor-pointer h-1"
                        />
                        <input 
                          type="number"
                          min={selectedClip.startTrim}
                          max={selectedClip.duration}
                          step="0.1"
                          value={selectedClip.endTrim}
                          onChange={e => updateClip(selectedClip.id, { endTrim: Number(e.target.value) })}
                          className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded text-center">
                      Duración Resultante: {(selectedClip.endTrim - selectedClip.startTrim).toFixed(1)}s
                    </div>
                  </div>
                </div>

                {/* VOLUME OF ORIGINAL VIDEO */}
                {selectedClip.type === 'video' && (
                  <div className="space-y-3 p-4 bg-white/2 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                      <Volume2 size={12} className="text-emerald-400" />
                      <span>Volumen de Clip original</span>
                    </span>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="0"
                        max="200"
                        value={selectedClip.volume}
                        onChange={e => updateClip(selectedClip.id, { volume: Number(e.target.value) })}
                        className="flex-1 accent-emerald-500 cursor-pointer h-1.5"
                      />
                      <input 
                        type="number"
                        min="0"
                        max="200"
                        value={selectedClip.volume}
                        onChange={e => updateClip(selectedClip.id, { volume: Number(e.target.value) })}
                        className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* PREMIUM EFFECTS */}
                <div className="space-y-3 p-4 bg-gradient-to-r from-emerald-950/20 to-black rounded-xl border border-emerald-500/20">
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} />
                    <span>Mejoras WASM Inteligentes</span>
                  </span>
                  
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-gray-300 hover:text-white">
                      <input 
                        type="checkbox"
                        checked={selectedClip.improveSound}
                        onChange={e => updateClip(selectedClip.id, { improveSound: e.target.checked })}
                        className="w-4 h-4 rounded border-white/10 bg-black accent-emerald-500 cursor-pointer"
                      />
                      <span>Mejorar Sonido (Denoise)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-gray-300 hover:text-white">
                      <input 
                        type="checkbox"
                        checked={selectedClip.improveImage}
                        onChange={e => updateClip(selectedClip.id, { improveImage: e.target.checked })}
                        className="w-4 h-4 rounded border-white/10 bg-black accent-emerald-500 cursor-pointer"
                      />
                      <span>Mejorar Imagen (Nitidez)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: FILTERS & COLOR GRADIENTS */}
            {activeTab === 'filters' && (
              <div className="space-y-4">
                <div className="bg-[#050507] rounded-xl border border-white/5 overflow-hidden p-4 space-y-4">
                  {/* Collapsible toggle header for Quick Filters */}
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Filtros Rápidos</span>
                    <button 
                      onClick={() => setShowQuickFilters(!showQuickFilters)}
                      className="text-[10px] text-emerald-400 font-bold hover:underline cursor-pointer"
                    >
                      {showQuickFilters ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>

                  {showQuickFilters && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { name: 'Original', b: 100, c: 100, s: 100, bl: 0, g: 0, se: 0, h: 0 },
                        { name: 'Cinemático', b: 105, c: 115, s: 105, bl: 0, g: 0, se: 10, h: 0 },
                        { name: 'VHS Retro', b: 100, c: 110, s: 80, bl: 0.5, g: 0, se: 20, h: 0 },
                        { name: 'Cyberpunk', b: 100, c: 115, s: 150, bl: 0, g: 0, se: 0, h: 120 },
                        { name: 'Noir (B&N)', b: 95, c: 120, s: 100, bl: 0, g: 100, se: 0, h: 0 },
                        { name: 'Cálido', b: 100, c: 100, s: 110, bl: 0, g: 0, se: 30, h: 0 },
                        { name: 'Frío', b: 100, c: 100, s: 105, bl: 0, g: 0, se: 0, h: 200 }
                      ].map((filter) => (
                        <button
                          key={filter.name}
                          onClick={() => {
                            updateClip(selectedClip.id, {
                              brightness: filter.b,
                              contrast: filter.c,
                              saturate: filter.s,
                              blur: filter.bl,
                              grayscale: filter.g,
                              sepia: filter.se,
                              hueRotate: filter.h
                            });
                          }}
                          className="py-1.5 px-2 bg-white/5 hover:bg-emerald-600/20 hover:text-emerald-400 border border-white/5 rounded text-[10px] text-gray-300 font-semibold cursor-pointer text-center transition-colors truncate"
                        >
                          {filter.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Manual adjustment sliders with textboxes */}
                  <div className="flex justify-between items-center border-b border-white/5 pt-2 pb-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Ajuste Manual</span>
                    <button 
                      onClick={() => setShowManualAdjust(!showManualAdjust)}
                      className="text-[10px] text-emerald-400 font-bold hover:underline cursor-pointer"
                    >
                      {showManualAdjust ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>

                  {showManualAdjust && (
                    <div className="space-y-4 pt-1">
                      {[
                        { label: 'Brillo', prop: 'brightness', min: 0, max: 200 },
                        { label: 'Contraste', prop: 'contrast', min: 0, max: 200 },
                        { label: 'Saturación', prop: 'saturate', min: 0, max: 200 },
                        { label: 'Desenfoque', prop: 'blur', min: 0, max: 20 },
                        { label: 'Blanco & Negro', prop: 'grayscale', min: 0, max: 100 },
                        { label: 'Sepia', prop: 'sepia', min: 0, max: 100 },
                        { label: 'Tono (Giro)', prop: 'hueRotate', min: 0, max: 360 },
                        { label: 'Opacidad', prop: 'opacity', min: 0, max: 100 }
                      ].map(({ label, prop, min, max }) => (
                        <div key={prop} className="space-y-1">
                          <span className="text-[10px] text-gray-400 block font-medium">{label}</span>
                          <div className="flex items-center gap-3">
                            <input 
                              type="range"
                              min={min}
                              max={max}
                              value={(selectedClip as any)[prop]}
                              onChange={e => updateClip(selectedClip.id, { [prop]: Number(e.target.value) })}
                              className="flex-1 accent-emerald-500 cursor-pointer h-1"
                            />
                            <input 
                              type="number"
                              min={min}
                              max={max}
                              value={(selectedClip as any)[prop]}
                              onChange={e => updateClip(selectedClip.id, { [prop]: Number(e.target.value) })}
                              className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Apply Visual Effects to All clips */}
                <button 
                  onClick={() => {
                    applyEffectsToAllClips(selectedClip.id);
                    alert("¡Ajustes visuales aplicados a toda la cinta!");
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy size={12} /> Aplicar Ajustes a Todo
                </button>
              </div>
            )}

            {/* TAB CONTENT: TRANSITIONS */}
            {activeTab === 'transition' && (
              <div className="space-y-4">
                <div className="space-y-3 p-4 bg-[#050507] rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block border-b border-white/5 pb-1">Transiciones Rápidas</span>
                  
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {[
                      { name: 'Corte', type: 'none', dur: 0 },
                      { name: 'Disolver', type: 'fade', dur: 500 },
                      { name: 'Iris Abrir', type: 'camera-open', dur: 800 },
                      { name: 'Iris Cerrar', type: 'camera-close', dur: 800 },
                      { name: 'Bloques', type: 'blocks', dur: 600 },
                      { name: 'Desenfoque', type: 'blur', dur: 500 },
                    ].map((trans) => (
                      <button
                        key={trans.name}
                        onClick={() => {
                          updateClip(selectedClip.id, {
                            transitionType: trans.type as any,
                            transitionDuration: trans.dur
                          });
                        }}
                        className={`py-1.5 px-1 border rounded text-[10px] font-semibold cursor-pointer text-center transition-colors truncate ${
                          selectedClip.transitionType === trans.type
                            ? 'border-emerald-500 bg-emerald-600/10 text-emerald-400'
                            : 'border-white/5 bg-white/5 hover:bg-emerald-600/20 text-gray-300'
                        }`}
                      >
                        {trans.name}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-1">Efecto Manual</span>
                      <select 
                        value={selectedClip.transitionType}
                        onChange={e => updateClip(selectedClip.id, { transitionType: e.target.value as any })}
                        className="w-full bg-black p-2.5 rounded-lg text-xs ring-1 ring-white/10 outline-none focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="none">Corte Recto (Ninguno)</option>
                        <option value="fade">Disolvencia (Fade)</option>
                        <option value="slide-left">Slide Lateral</option>
                        <option value="zoom-in">Zoom In</option>
                        <option value="blur">Desenfoque (Blur)</option>
                        <option value="camera-open">Apertura (Iris)</option>
                        <option value="camera-close">Cierre (Iris)</option>
                        <option value="blocks">Bloques (Grilla)</option>
                      </select>
                    </div>

                    {selectedClip.transitionType !== 'none' && (
                      <div className="space-y-1">
                        <span className="text-[9px] text-gray-500 block">Duración (ms)</span>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min="100"
                            max="2000"
                            step="100"
                            value={selectedClip.transitionDuration}
                            onChange={e => updateClip(selectedClip.id, { transitionDuration: Number(e.target.value) })}
                            className="flex-1 accent-emerald-500 cursor-pointer h-1"
                          />
                          <input 
                            type="number"
                            min="100"
                            max="2000"
                            step="100"
                            value={selectedClip.transitionDuration}
                            onChange={e => updateClip(selectedClip.id, { transitionDuration: Number(e.target.value) })}
                            className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* DELETE CLIP BUTTON */}
            <button 
              onClick={() => deleteClip(selectedClip.id)}
              className="w-full py-3 mt-4 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer text-center"
            >
              Eliminar Capa de la Línea
            </button>
          </div>
        )}

        {/* B. Selected Background Audio Track Inspector */}
        {selectedAudio && (
          <div className="space-y-5 animate-fade-in">
            <div className="p-3.5 bg-blue-500/5 rounded-xl border border-blue-500/10">
              <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider block mb-1">
                Música / Grabación Seleccionada
              </span>
              <span className="text-xs font-bold text-white truncate block max-w-[200px]" title={selectedAudio.name}>
                {selectedAudio.name}
              </span>
            </div>

            {/* Volume Slider */}
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-black block">Volumen Mezcla</span>
              <div className="flex items-center gap-3">
                <input 
                  type="range"
                  min="0"
                  max="200"
                  value={selectedAudio.volume}
                  onChange={e => updateAudioTrack(selectedAudio.id, { volume: Number(e.target.value) })}
                  className="flex-1 accent-blue-500 cursor-pointer h-1.5"
                />
                <input 
                  type="number"
                  min="0"
                  max="200"
                  value={selectedAudio.volume}
                  onChange={e => updateAudioTrack(selectedAudio.id, { volume: Number(e.target.value) })}
                  className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Timeline Start Position Offset */}
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-black block">Tiempo de Inicio (s)</span>
              <div className="flex items-center gap-3">
                <input 
                  type="range"
                  min="0"
                  max={Math.max(timelineDuration, 5)}
                  step="0.1"
                  value={selectedAudio.timelineStart}
                  onChange={e => updateAudioTrack(selectedAudio.id, { timelineStart: Number(e.target.value) })}
                  className="flex-1 accent-blue-500 cursor-pointer h-1"
                />
                <input 
                  type="number"
                  min="0"
                  max={Math.max(timelineDuration, 5)}
                  step="0.1"
                  value={selectedAudio.timelineStart}
                  onChange={e => updateAudioTrack(selectedAudio.id, { timelineStart: Number(e.target.value) })}
                  className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Audio Trim length */}
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 uppercase font-black block">Duración Recorte (s)</span>
              <div className="flex items-center gap-3">
                <input 
                  type="range"
                  min="1"
                  max="60"
                  step="0.5"
                  value={selectedAudio.duration}
                  onChange={e => updateAudioTrack(selectedAudio.id, { duration: Number(e.target.value) })}
                  className="flex-1 accent-blue-500 cursor-pointer h-1"
                />
                <input 
                  type="number"
                  min="1"
                  max="60"
                  step="0.5"
                  value={selectedAudio.duration}
                  onChange={e => updateAudioTrack(selectedAudio.id, { duration: Number(e.target.value) })}
                  className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button 
              onClick={() => deleteAudioTrack(selectedAudio.id)}
              className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer text-center"
            >
              Eliminar Música de Fondo
            </button>
          </div>
        )}

        {/* Empty select guide - Render Audio Mixer */}
        {!selectedClip && !selectedAudio && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-3 bg-white/2 border border-white/5 rounded-xl text-center text-gray-400">
              <span className="text-[10px] font-bold block mb-1">💡 SELECCIÓN</span>
              <p className="text-[10px] text-gray-500 leading-normal">Haz clic en cualquier clip o pista de música en la línea de tiempo para editar sus propiedades individuales.</p>
            </div>

            {/* GLOBAL MIXER AREA */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                <Volume2 size={12} className="text-emerald-400" />
                <span>Mezclador de Audio Global</span>
              </span>

              {/* Master Volume Controls */}
              <div className="space-y-3 bg-gradient-to-br from-emerald-950/20 to-blue-950/20 p-3 rounded-xl border border-white/10">
                <span className="text-[9px] text-gray-300 font-bold uppercase tracking-wider block mb-1">Volúmenes Generales</span>
                
                {/* Master Ambient Volume */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-emerald-400 font-semibold">Sonido Ambiente General</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range"
                      min="0"
                      max="200"
                      value={masterAmbientVolume}
                      onChange={e => setMasterAmbientVolume(Number(e.target.value))}
                      className="flex-1 accent-emerald-500 cursor-pointer h-1.5"
                    />
                    <input 
                      type="number"
                      min="0"
                      max="200"
                      value={masterAmbientVolume}
                      onChange={e => setMasterAmbientVolume(Number(e.target.value))}
                      className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Master Music Volume */}
                <div className="space-y-1 mt-2">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-blue-400 font-semibold">Música / Off General</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range"
                      min="0"
                      max="200"
                      value={masterMusicVolume}
                      onChange={e => setMasterMusicVolume(Number(e.target.value))}
                      className="flex-1 accent-blue-500 cursor-pointer h-1.5"
                    />
                    <input 
                      type="number"
                      min="0"
                      max="200"
                      value={masterMusicVolume}
                      onChange={e => setMasterMusicVolume(Number(e.target.value))}
                      className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Original clips (ambient sound) mixer list */}
              <div className="space-y-3">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Sonido Ambiente (Video Clips)</span>
                {videoClips.filter(c => c.type === 'video').length === 0 ? (
                  <span className="text-[10px] text-gray-600 italic block">No hay clips de video en la línea de tiempo.</span>
                ) : (
                  <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
                    {videoClips.filter(c => c.type === 'video').map(clip => (
                      <div key={clip.id} className="space-y-1">
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-gray-300 truncate w-32" title={clip.name}>{clip.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min="0"
                            max="200"
                            value={clip.volume}
                            onChange={e => updateClip(clip.id, { volume: Number(e.target.value) })}
                            className="flex-1 accent-emerald-500 cursor-pointer h-1"
                          />
                          <input 
                            type="number"
                            min="0"
                            max="200"
                            value={clip.volume}
                            onChange={e => updateClip(clip.id, { volume: Number(e.target.value) })}
                            className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Background music & Voiceover mixer list */}
              <div className="space-y-3">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Pistas de Música / Voz en Off</span>
                {audioTracks.length === 0 ? (
                  <span className="text-[10px] text-gray-600 italic block">No hay pistas de música agregadas.</span>
                ) : (
                  <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
                    {audioTracks.map(track => (
                      <div key={track.id} className="space-y-1">
                        <div className="flex justify-between text-[10px] mb-0.5">
                          <span className="text-gray-300 truncate w-32" title={track.name}>🎵 {track.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range"
                            min="0"
                            max="200"
                            value={track.volume}
                            onChange={e => updateAudioTrack(track.id, { volume: Number(e.target.value) })}
                            className="flex-1 accent-blue-500 cursor-pointer h-1"
                          />
                          <input 
                            type="number"
                            min="0"
                            max="200"
                            value={track.volume}
                            onChange={e => updateAudioTrack(track.id, { volume: Number(e.target.value) })}
                            className="w-16 bg-black border border-white/10 rounded px-1.5 py-0.5 text-right font-mono text-[10px] text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FIXED EXPORT FOOTER */}
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
                    ? 'bg-blue-600/25 text-blue-400 border border-blue-500/30'
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
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm cursor-pointer"
        >
          <span>🎬</span>
          <span>Exportar Video WASM</span>
        </button>
      </div>
    </div>
  );
};
