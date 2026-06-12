import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../stores/editorStore';
import type { TextEffect } from '../types';
import html2canvas from 'html2canvas';
import { 
  Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown, 
  Activity
} from 'lucide-react';

export default function RightSidebar() {
  const {
    elements,
    selectedIds,
    rightPanelTab,
    setRightPanelTab,
    updateElement,
    deleteSelected,
    groupSelected,
    ungroupSelected,
    clearSelection,
    bringToFront,
    sendToBack,
    moveLayerUp,
    moveLayerDown,
    toggleVisibility,
    toggleLock,
    format
  } = useEditorStore();

  const [activeInspectorSubTab, setActiveInspectorSubTab] = useState<'transform' | 'color' | 'mask' | 'animation'>('transform');
  const selectedEl = elements.find(e => selectedIds.includes(e.id));
  const isMultipleSelected = selectedIds.length > 1;
  const hasGroupedSelection = elements.some(el => selectedIds.includes(el.id) && el.groupId);

  const scopeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw animated color scopes (waveform / histogram parade) inside inspector for premium diagnostics
  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const drawScope = () => {
      ctx.fillStyle = '#090B10';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 20; i < canvas.height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw mock RGB Parade lines
      ctx.lineWidth = 1.5;
      offset += 0.05;

      const channels = [
        { color: '#FF4D6D', yOffset: 15 }, // Red
        { color: '#00D97E', yOffset: 35 }, // Green
        { color: '#00C8FF', yOffset: 55 }  // Blue
      ];

      channels.forEach((chan, idx) => {
        ctx.strokeStyle = chan.color;
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const waveVal = Math.sin((x + idx * 50) * 0.1 + offset) * 5 + 
                          Math.cos(x * 0.05 + offset * 2) * 3 + 
                          Math.sin(x * 0.3) * 1.5;
          const y = chan.yOffset + waveVal + 10;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      animId = requestAnimationFrame(drawScope);
    };

    drawScope();
    return () => cancelAnimationFrame(animId);
  }, [selectedEl]);

  const handleExport = async () => {
    const canvasEl = document.getElementById('editor-canvas-container');
    if (!canvasEl) {
      alert('Error: Canvas no encontrado.');
      return;
    }

    const currentSelectedIds = [...selectedIds];
    clearSelection();

    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const canvas = await html2canvas(canvasEl as HTMLDivElement, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2,
      });

      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Fallo al generar el archivo binario.");
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Vision-Pro-Design-${format.replace(':', 'x')}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png', 1.0);

    } catch (e: any) {
      alert(`Error de exportación: ${e.message}`);
    } finally {
      if (currentSelectedIds.length > 0) {
        useEditorStore.setState({ selectedIds: currentSelectedIds });
      }
    }
  };

  return (
    <div className="w-[340px] bg-[#11151E] border-l border-[#232A36] flex flex-col relative z-40 shrink-0 select-none text-white">
      
      {/* 1. TABS HEADER */}
      <div className="flex border-b border-[#232A36] shrink-0">
        <button 
          onClick={() => setRightPanelTab('inspector')} 
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
            rightPanelTab === 'inspector' 
              ? 'text-[#7B5CFF] border-b-2 border-[#7B5CFF] bg-[#7B5CFF]/5' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Propiedades FX
        </button>
        <button 
          onClick={() => setRightPanelTab('layers')} 
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
            rightPanelTab === 'layers' 
              ? 'text-[#7B5CFF] border-b-2 border-[#7B5CFF] bg-[#7B5CFF]/5' 
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Capas ({elements.length})
        </button>
      </div>

      {/* 2. TAB CONTENT AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        
        {/* INSPECTOR TAB */}
        {rightPanelTab === 'inspector' && (
          <>
            {isMultipleSelected && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-[#7B5CFF]/10 border border-[#7B5CFF]/30 p-3 rounded-xl">
                  <span className="text-xs text-[#00C8FF] font-bold block mb-1">Selección Múltiple</span>
                  <p className="text-[11px] text-gray-400">Hay {selectedIds.length} elementos seleccionados en el lienzo.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={groupSelected} 
                    className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#00D97E]/20 text-[#00D97E] border border-[#00D97E]/30 hover:bg-[#00D97E]/30 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>🔗</span>
                    <span>Agrupar</span>
                  </button>
                  {hasGroupedSelection && (
                    <button 
                      onClick={ungroupSelected} 
                      className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#FF4D6D]/20 text-[#FF4D6D] border border-[#FF4D6D]/30 hover:bg-[#FF4D6D]/30 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span>🔓</span>
                      <span>Desagrupar</span>
                    </button>
                  )}
                </div>
                <div className="pt-4 border-t border-[#232A36]">
                  <button 
                    onClick={deleteSelected} 
                    className="w-full bg-[#FF4D6D]/15 text-[#FF4D6D] border border-[#FF4D6D]/20 py-3 rounded-xl text-sm font-bold hover:bg-[#FF4D6D]/25 transition-colors cursor-pointer"
                  >
                    Eliminar Selección
                  </button>
                </div>
              </div>
            )}

            {!isMultipleSelected && selectedEl && (
              <div className="space-y-4 animate-fade-in">
                {/* SUBTABS DE EDICION (Transform, Color, Mask, Anim) */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-[#090B10]/60 rounded-lg border border-[#232A36]">
                  {(['transform', 'color', 'mask', 'animation'] as const).map(sub => (
                    <button
                      key={sub}
                      onClick={() => setActiveInspectorSubTab(sub)}
                      className={`py-1.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeInspectorSubTab === sub 
                          ? 'bg-[#7B5CFF]/20 text-[#00C8FF]' 
                          : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      {sub === 'transform' ? 'Transform' : sub === 'color' ? 'Color' : sub === 'mask' ? 'Máscara' : 'Anim'}
                    </button>
                  ))}
                </div>

                {/* SUBTAB 1: TRANSFORMACION */}
                {activeInspectorSubTab === 'transform' && (
                  <div className="space-y-4 pt-1">
                    {/* Positions */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase block mb-1">Posición X</span>
                        <input 
                          type="number"
                          value={selectedEl.x}
                          onChange={e => updateElement(selectedEl.id, { x: Number(e.target.value) })}
                          className="w-full bg-[#090B10] p-2 rounded-lg text-xs border border-[#232A36] outline-none text-white focus:border-[#7B5CFF]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase block mb-1">Posición Y</span>
                        <input 
                          type="number"
                          value={selectedEl.y}
                          onChange={e => updateElement(selectedEl.id, { y: Number(e.target.value) })}
                          className="w-full bg-[#090B10] p-2 rounded-lg text-xs border border-[#232A36] outline-none text-white focus:border-[#7B5CFF]"
                        />
                      </div>
                    </div>

                    {/* Sizing & Rotate */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase block mb-1">Ancho (W)</span>
                        <input 
                          type="number"
                          value={selectedEl.width || 400}
                          onChange={e => updateElement(selectedEl.id, { width: Number(e.target.value) })}
                          className="w-full bg-[#090B10] p-2 rounded-lg text-xs border border-[#232A36] outline-none text-white focus:border-[#7B5CFF]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase block mb-1">Rotación (deg)</span>
                        <input 
                          type="number"
                          defaultValue={0}
                          className="w-full bg-[#090B10] p-2 rounded-lg text-xs border border-[#232A36] outline-none text-white focus:border-[#7B5CFF]"
                        />
                      </div>
                    </div>

                    {/* Perspective Distortion */}
                    <div>
                      <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                        <span>PERSPECTIVA / DISTORSIÓN:</span>
                        <span>0%</span>
                      </div>
                      <input 
                        type="range"
                        min="-45"
                        max="45"
                        defaultValue="0"
                        className="w-full accent-[#7B5CFF] cursor-pointer"
                      />
                    </div>

                    {/* Text specific controls */}
                    {selectedEl.type === 'text' && (
                      <div className="space-y-3.5 border-t border-[#232A36] pt-3">
                        <span className="text-[10px] text-gray-400 uppercase font-black block">Tipografía</span>
                        <textarea 
                          value={selectedEl.content} 
                          onChange={e => updateElement(selectedEl.id, { content: e.target.value })} 
                          className="w-full bg-[#090B10] p-2.5 rounded-lg text-xs border border-[#232A36] text-white outline-none focus:border-[#7B5CFF] resize-none" 
                          rows={2} 
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-gray-500 uppercase block mb-1">Fuente</span>
                            <select 
                              value={selectedEl.fontFamily || "'Montserrat', sans-serif"} 
                              onChange={e => updateElement(selectedEl.id, { fontFamily: e.target.value })} 
                              className="w-full bg-[#090B10] p-2 rounded-lg text-xs border border-[#232A36] text-white outline-none cursor-pointer"
                            >
                              <option value="'Montserrat', sans-serif">Montserrat</option>
                              <option value="'Bebas Neue', sans-serif">Bebas Neue</option>
                              <option value="'Playfair Display', serif">Playfair Display</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-500 uppercase block mb-1">Tamaño</span>
                            <input 
                              type="number" 
                              value={selectedEl.fontSize || 60} 
                              onChange={e => updateElement(selectedEl.id, { fontSize: Number(e.target.value) })} 
                              className="w-full bg-[#090B10] p-2 rounded-lg text-xs border border-[#232A36] text-white outline-none" 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-gray-500 uppercase block mb-1">Color</span>
                            <input 
                              type="color" 
                              value={selectedEl.color || '#ffffff'} 
                              onChange={e => updateElement(selectedEl.id, { color: e.target.value })} 
                              className="w-full h-8 rounded-lg bg-[#090B10] border-0 p-0 cursor-pointer" 
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-gray-500 uppercase block mb-1">Efecto Letra</span>
                            <select 
                              value={selectedEl.textEffect || 'none'} 
                              onChange={e => updateElement(selectedEl.id, { textEffect: e.target.value as TextEffect })} 
                              className="w-full bg-[#090B10] p-2 rounded-lg text-xs border border-[#232A36] text-[#00C8FF] cursor-pointer"
                            >
                              <option value="none">Normal</option>
                              <option value="shadow">Sombra 3D</option>
                              <option value="neon">Brillo Neón</option>
                              <option value="outline">Contorno</option>
                              <option value="text-gradient">Degradado</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Blend modes */}
                    <div className="border-t border-[#232A36] pt-3">
                      <span className="text-[9px] text-gray-500 uppercase block mb-1.5">Modo de Fusión (Blend Mode)</span>
                      <select 
                        value={selectedEl.mixBlendMode || 'normal'} 
                        onChange={e => updateElement(selectedEl.id, { mixBlendMode: e.target.value as any })} 
                        className="w-full bg-[#090B10] p-2 rounded-lg text-xs border border-[#232A36] text-white cursor-pointer"
                      >
                        <option value="normal">Normal</option>
                        <option value="multiply">Multiplicar (Oscurecer)</option>
                        <option value="screen">Trama (Aclarar)</option>
                        <option value="overlay">Superponer (Contraste)</option>
                        <option value="lighten">Aclarar (Neon FX)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* SUBTAB 2: CORRECCION DE COLOR */}
                {activeInspectorSubTab === 'color' && (
                  <div className="space-y-4 pt-1">
                    {/* Lightroom sliders */}
                    <div className="space-y-3">
                      {[
                        { prop: 'brightness', label: 'Brillo', min: 0, max: 200, def: 100 },
                        { prop: 'contrast', label: 'Contraste', min: 0, max: 200, def: 100 },
                        { prop: 'saturate', label: 'Saturación', min: 0, max: 200, def: 100 },
                        { prop: 'blur', label: 'Desenfoque', min: 0, max: 20, def: 0 },
                        { prop: 'grayscale', label: 'Blanco y Negro', min: 0, max: 100, def: 0 }
                      ].map(({ prop, label, min, max, def }) => (
                        <div key={prop}>
                          <div className="flex justify-between text-[9px] text-gray-400 uppercase">
                            <span>{label}</span>
                            <span>{(selectedEl as any)[prop] ?? def}</span>
                          </div>
                          <input 
                            type="range" 
                            min={min} 
                            max={max} 
                            value={(selectedEl as any)[prop] ?? def} 
                            onChange={e => updateElement(selectedEl.id, { [prop]: Number(e.target.value) })} 
                            className="w-full accent-[#7B5CFF] h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer mt-1" 
                          />
                        </div>
                      ))}
                    </div>

                    {/* Color Wheels Mockup */}
                    <div className="border-t border-[#232A36] pt-3">
                      <span className="text-[10px] text-gray-400 uppercase font-black block mb-2">Ruedas de Color (DaVinci Resolve Style)</span>
                      <div className="grid grid-cols-3 gap-2">
                        {['Sombras', 'Medios', 'Luces'].map((wheel) => (
                          <div key={wheel} className="flex flex-col items-center gap-1.5">
                            <span className="text-[8px] text-gray-500 font-bold uppercase">{wheel}</span>
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-600 via-green-600 to-blue-600 border border-white/20 p-0.5 relative cursor-pointer shadow-inner">
                              <div className="w-full h-full rounded-full bg-[#11151E]/80 relative flex items-center justify-center">
                                <div className="w-1.5 h-1.5 bg-[#00C8FF] rounded-full absolute" style={{ top: '42%', left: '48%' }} />
                              </div>
                            </div>
                            <input type="number" defaultValue={0.0} className="w-12 bg-black border border-[#232A36] p-0.5 text-[8px] rounded text-center text-gray-400 font-mono" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Live Waveform Monitor */}
                    <div className="border-t border-[#232A36] pt-3">
                      <span className="text-[10px] text-gray-400 uppercase font-black block mb-1.5 flex items-center gap-1">
                        <Activity size={10} className="text-[#00C8FF]" />
                        <span>RGB Parade / Waveform Monitor</span>
                      </span>
                      <canvas 
                        ref={scopeCanvasRef} 
                        width={300} 
                        height={90} 
                        className="w-full bg-black rounded-lg border border-[#232A36] shadow-inner"
                      />
                    </div>
                  </div>
                )}

                {/* SUBTAB 3: MASCARAS */}
                {activeInspectorSubTab === 'mask' && (
                  <div className="space-y-4 pt-1">
                    <span className="text-[10px] text-gray-500 uppercase font-black block">Tipos de Máscaras</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: 'Rectangular', icon: '⬜' },
                        { name: 'Circular', icon: '⚫' },
                        { name: 'Bezier Pen', icon: '🖋️' },
                        { name: 'IA Auto Mask', icon: '✨' }
                      ].map((m, idx) => (
                        <button
                          key={idx}
                          onClick={() => alert(`Herramienta de máscara seleccionada: ${m.name}`)}
                          className="p-3 bg-[#090B10] hover:bg-[#7B5CFF]/15 border border-[#232A36] hover:border-[#7B5CFF]/40 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center gap-1 text-gray-400 hover:text-white"
                        >
                          <span className="text-lg">{m.icon}</span>
                          <span className="text-[10px] font-bold">{m.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Mask Controls */}
                    <div className="p-3.5 bg-[#090B10]/40 rounded-xl border border-[#232A36] space-y-3">
                      <span className="text-[9px] text-[#00C8FF] uppercase font-bold block">Propiedades de Máscara</span>
                      <div>
                        <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                          <span>Desvanecimiento (Feather):</span>
                          <span>10px</span>
                        </div>
                        <input type="range" min="0" max="50" defaultValue="10" className="w-full accent-[#7B5CFF] cursor-pointer" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                          <span>Expansión:</span>
                          <span>0%</span>
                        </div>
                        <input type="range" min="-50" max="50" defaultValue="0" className="w-full accent-[#7B5CFF] cursor-pointer" />
                      </div>
                    </div>
                  </div>
                )}

                {/* SUBTAB 4: KEYFRAME ANIMATIONS */}
                {activeInspectorSubTab === 'animation' && (
                  <div className="space-y-4 pt-1">
                    <span className="text-[10px] text-gray-500 uppercase font-black block">Curvas de Transición (Keyframes)</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { name: 'Lineal (Linear)', desc: 'Velocidad constante' },
                        { name: 'Suave (Ease In/Out)', desc: 'Aceleración progresiva' },
                        { name: 'Rebote (Elastic Bounce)', desc: 'Efecto resorte' },
                        { name: 'Cinemático (Slow Fade)', desc: 'Desvanecimiento lento' }
                      ].map((ani, idx) => (
                        <button
                          key={idx}
                          onClick={() => alert(`Curva de interpolación asignada: ${ani.name}`)}
                          className="text-left p-2.5 bg-[#090B10] hover:bg-[#7B5CFF]/15 border border-[#232A36] rounded-xl transition-all cursor-pointer flex flex-col gap-0.5 text-gray-400 hover:text-white"
                        >
                          <span className="text-[9px] font-black text-[#00D97E] uppercase">{ani.name}</span>
                          <span className="text-[8px] text-gray-500">{ani.desc}</span>
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => alert('Keyframe de transformación insertado en la posición de reproducción actual.')}
                      className="w-full py-2.5 bg-[#7B5CFF]/20 text-[#7B5CFF] hover:bg-[#7B5CFF]/30 border border-[#7B5CFF]/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex justify-center items-center gap-1.5"
                    >
                      <span>➕ Keyframe</span>
                      <span>Insertar Posición</span>
                    </button>
                  </div>
                )}

                {/* 5. INDIVIDUAL DELETE */}
                <div className="pt-4 border-t border-[#232A36]">
                  <button 
                    onClick={deleteSelected} 
                    className="w-full bg-[#FF4D6D]/15 hover:bg-[#FF4D6D]/25 border border-[#FF4D6D]/20 text-[#FF4D6D] py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Eliminar Capa
                  </button>
                </div>
              </div>
            )}

            {!selectedEl && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 space-y-3 pt-12">
                <span className="text-4xl opacity-30">✨</span>
                <p className="text-xs">Selecciona un elemento en el lienzo para ajustar sus propiedades.</p>
              </div>
            )}
          </>
        )}

        {/* LAYERS TAB */}
        {rightPanelTab === 'layers' && (
          <div className="space-y-2 animate-fade-in">
            {elements.length === 0 && (
              <p className="text-gray-600 text-xs text-center pt-10">No hay capas en el lienzo.</p>
            )}

            {/* Sort Z-Index descending */}
            {[...elements].sort((a, b) => b.zIndex - a.zIndex).map((el) => {
              const isSelected = selectedIds.includes(el.id);
              return (
                <div 
                  key={el.id} 
                  className={`flex flex-col bg-[#090B10] p-3 rounded-xl border transition-all ${
                    isSelected 
                      ? 'border-[#7B5CFF] bg-[#7B5CFF]/5' 
                      : 'border-[#232A36] hover:border-white/20'
                  }`}
                >
                  <div 
                    className="flex items-center justify-between mb-1.5 cursor-pointer" 
                    onClick={() => useEditorStore.getState().selectElement(el.id, false)}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xs">
                        {el.type === 'image' ? '🖼️' : el.type === 'icon' ? '⭐' : '📝'}
                      </span>
                      <span className="text-xs font-bold truncate w-24 text-white" title={el.name}>
                        {el.name}
                      </span>
                      {el.groupId && (
                        <span className="text-[8px] bg-[#00D97E]/20 text-[#00D97E] px-1 rounded font-bold border border-[#00D97E]/20">
                          G
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleLock(el.id); }} 
                        className={`p-1 rounded hover:bg-white/5 transition-colors cursor-pointer ${el.isLocked ? 'text-[#FF4D6D]' : 'text-gray-500'}`} 
                      >
                        {el.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(el.id); }} 
                        className={`p-1 rounded hover:bg-white/5 transition-colors cursor-pointer ${el.isHidden ? 'text-gray-600' : 'text-white'}`} 
                      >
                        {el.isHidden ? <EyeOff size={10} /> : <Eye size={10} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#232A36] mt-1">
                    <span className="text-[8px] text-gray-500 font-mono">Capa Z: {el.zIndex}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => sendToBack(el.id)} 
                        className="text-[9px] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-gray-400 cursor-pointer" 
                        title="Al Fondo"
                      >
                        Fondo
                      </button>
                      <button 
                        onClick={() => moveLayerDown(el.id)} 
                        className="text-[9px] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-gray-400 cursor-pointer" 
                      >
                        <ArrowDown size={10} />
                      </button>
                      <button 
                        onClick={() => moveLayerUp(el.id)} 
                        className="text-[9px] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-gray-400 cursor-pointer" 
                      >
                        <ArrowUp size={10} />
                      </button>
                      <button 
                        onClick={() => bringToFront(el.id)} 
                        className="text-[9px] bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded text-gray-400 cursor-pointer" 
                        title="Al Frente"
                      >
                        Frente
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. FIXED BOTTOM EXPORT ACTION */}
      <div className="p-4 border-t border-[#232A36] shrink-0 bg-[#090B10]">
        <button 
          onClick={handleExport} 
          className="w-full bg-gradient-to-r from-[#7B5CFF] to-[#00C8FF] text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(123,92,255,0.3)] active:scale-95 flex justify-center items-center gap-2 text-xs cursor-pointer hover:opacity-90"
        >
          <span>📥</span>
          <span>Descargar Fotografía 4K</span>
        </button>
      </div>

    </div>
  );
}
