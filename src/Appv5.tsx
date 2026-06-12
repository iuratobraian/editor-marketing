import React, { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Play, Pause, Scissors, Copy, Trash2, Type, Image as ImageIcon, Music, Layers, Zap, Download } from 'lucide-react';

// ==========================================
// 1. ARQUITECTURA CORE Y TIPOS
// ==========================================
type AppMode = 'image' | 'video';
type CanvasFormat = '1:1' | '9:16' | '16:9' | '3:1';
type TextEffect = 'none' | 'shadow-3d' | 'neon' | 'glitch' | 'metallic' | 'holographic';

// Tipos para el Editor Gráfico (Canva Style)
interface GraphicElement {
  id: string;
  type: 'text' | 'image' | 'icon';
  content: string;
  x: number; y: number; zIndex: number;
  width?: number; fontSize?: number; fontFamily?: string;
  color?: string; bgStyle?: 'none' | 'glass' | 'solid' | 'gradient';
  textEffect?: TextEffect;
  opacity?: number; mixBlendMode?: any;
  isLocked?: boolean; isHidden?: boolean;
}

// Tipos para el Editor de Video (CapCut Style)
interface Track {
  id: string;
  type: 'video' | 'audio' | 'text' | 'effect';
  name: string;
  clips: Clip[];
}

interface Clip {
  id: string;
  content: string; // URL o Texto
  startMs: number; // Inicio en la línea de tiempo
  durationMs: number; // Duración
  color?: string; // Para clips de texto
}

const FORMATS: Record<CanvasFormat, string> = {
  '1:1': 'aspect-square max-w-[600px]',
  '9:16': 'aspect-[9/16] max-h-[800px]',
  '16:9': 'aspect-video max-w-[900px]',
  '3:1': 'aspect-[3/1] max-w-[1000px]'
};

export default function App() {
  const [mode, setMode] = useState<AppMode>('video'); // Iniciamos en Video para mostrar la nueva UI
  const [format, setFormat] = useState<CanvasFormat>('9:16');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // --- ESTADO: DISEÑO GRÁFICO ---
  const [elements, setElements] = useState<GraphicElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [canvasBg, setCanvasBg] = useState('linear-gradient(135deg, #020617 0%, #0f172a 100%)');

  // --- ESTADO: TIMELINE DE VIDEO ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [tracks, setTracks] = useState<Track[]>([
    { id: 't1', type: 'video', name: 'Main Media', clips: [] },
    { id: 't2', type: 'text', name: 'Captions / Text', clips: [] },
    { id: 't3', type: 'audio', name: 'SFX / Music', clips: [] },
  ]);
  const maxTimelineMs = 15000; // 15 segundos de proyecto para este prototipo

  // ==========================================
  // 2. LÓGICA DE EXPORTACIÓN ROBUSTA (html-to-image)
  // ==========================================
  const handleExportImage = async () => {
    if (!editorRef.current) return;
    const prevSelected = selectedElementId;
    setSelectedElementId(null);

    // Pequeño delay para limpiar la UI antes de capturar
    await new Promise(r => setTimeout(r, 150));

    try {
      // toPng soluciona el error oklab/oklch de Tailwind v4
      const dataUrl = await toPng(editorRef.current, {
        cacheBust: true,
        pixelRatio: 3, // Calidad Ultra HD
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      });

      const link = document.createElement('a');
      link.download = `Structura-FX-Export-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Error en el renderizado de alta fidelidad.');
    } finally {
      setSelectedElementId(prevSelected);
    }
  };

  // ==========================================
  // 3. LÓGICA DEL TIMELINE (VIDEO)
  // ==========================================
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setCurrentTimeMs(prev => {
          if (prev >= maxTimelineMs) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 50; // Update cada 50ms
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const addClipToTrack = (trackId: string, type: 'video' | 'text') => {
    setTracks(tracks.map(t => {
      if (t.id === trackId) {
        return {
          ...t,
          clips: [...t.clips, {
            id: Date.now().toString(),
                         content: type === 'text' ? 'NUEVO TEXTO FX' : 'Media',
                         startMs: currentTimeMs,
                         durationMs: 3000,
                         color: type === 'text' ? '#10b981' : '#3b82f6'
          }]
        };
      }
      return t;
    }));
  };

  // ==========================================
  // 4. ESTILOS FX AVANZADOS
  // ==========================================
  const applyTextFX = (el: GraphicElement): React.CSSProperties => {
    let style: React.CSSProperties = {
      fontFamily: el.fontFamily || "'Montserrat', sans-serif",
      fontSize: `${el.fontSize || 40}px`,
      color: el.color || '#fff',
      opacity: (el.opacity || 100) / 100,
      mixBlendMode: el.mixBlendMode || 'normal',
      whiteSpace: 'pre-wrap',
      lineHeight: '1.1'
    };

    switch(el.textEffect) {
      case 'shadow-3d':
        style.textShadow = '0 1px 0 #ccc, 0 2px 0 #c9c9c9, 0 3px 0 #bbb, 0 4px 0 #b9b9b9, 0 5px 0 #aaa, 0 6px 1px rgba(0,0,0,.1), 0 0 5px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.3), 0 3px 5px rgba(0,0,0,.2), 0 5px 10px rgba(0,0,0,.25), 0 10px 10px rgba(0,0,0,.2), 0 20px 20px rgba(0,0,0,.15)';
        break;
      case 'neon':
        style.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${el.color}, 0 0 40px ${el.color}, 0 0 80px ${el.color}`;
        style.color = '#fff';
        break;
      case 'metallic':
        style.backgroundImage = 'linear-gradient(to bottom, #d4af37 20%, #ffdf73 40%, #aa7700 80%)'; // Oro institucional
        style.WebkitBackgroundClip = 'text';
        style.WebkitTextFillColor = 'transparent';
        style.filter = 'drop-shadow(0px 4px 6px rgba(0,0,0,0.8))';
        break;
      case 'glitch':
        style.textShadow = '2px 0 #0ff, -2px 0 #f0f';
        break;
    }

    if (el.bgStyle === 'glass') {
      style.background = 'rgba(0,0,0,0.4)';
      style.backdropFilter = 'blur(12px)';
      style.padding = '10px 20px';
      style.borderRadius = '8px';
      style.border = '1px solid rgba(255,255,255,0.1)';
    }

    return style;
  };

  return (
    <div className="flex flex-col h-screen bg-[#020202] text-white overflow-hidden">

    {/* HEADER: STRUCTURA FX AI */}
    <header className="h-14 border-b border-white/10 bg-[#050505] flex items-center justify-between px-6 shrink-0 z-50">
    <div className="flex items-center gap-3">
    <Zap className="text-emerald-500 w-5 h-5" />
    <h1 className="font-black tracking-tight text-xl">
    STRUCTURA <span className="text-emerald-500">FX AI</span>
    </h1>
    </div>
    <div className="flex bg-white/5 rounded-lg p-1 ring-1 ring-white/10">
    <button onClick={() => setMode('image')} className={`px-6 py-1 text-sm font-bold rounded ${mode === 'image' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>Design Canvas</button>
    <button onClick={() => setMode('video')} className={`px-6 py-1 text-sm font-bold rounded ${mode === 'video' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Video Timeline</button>
    </div>
    </header>

    {mode === 'image' ? (
      /* ========================================================================= */
      /* MÓDULO 1: DISEÑO GRÁFICO (CANVA STYLE)                                    */
      /* ========================================================================= */
      <div className="flex flex-1 overflow-hidden">
      {/* BARRA LATERAL IZQUIERDA */}
      <div className="w-80 bg-[#0a0a0c] border-r border-white/5 p-4 flex flex-col gap-6 overflow-y-auto">
      <div>
      <h3 className="text-xs text-gray-500 font-bold mb-2">Formato Institucional</h3>
      <select value={format} onChange={e => setFormat(e.target.value as CanvasFormat)} className="w-full bg-[#111] p-2 rounded outline-none border border-white/10">
      <option value="1:1">Post (1:1)</option>
      <option value="9:16">Reel/Story (9:16)</option>
      <option value="16:9">YouTube (16:9)</option>
      </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
      <button onClick={() => setElements([...elements, { id: Date.now().toString(), type: 'text', content: 'TEXTO FX', x: 50, y: 50, zIndex: 100, fontSize: 60, textEffect: 'shadow-3d', color: '#10b981' }])} className="bg-white/5 hover:bg-white/10 py-3 rounded flex flex-col items-center gap-1 border border-white/5">
      <Type className="w-5 h-5" /> <span className="text-xs">Texto</span>
      </button>
      <button className="bg-white/5 hover:bg-white/10 py-3 rounded flex flex-col items-center gap-1 border border-white/5">
      <ImageIcon className="w-5 h-5" /> <span className="text-xs">Media</span>
      </button>
      </div>

      <button onClick={handleExportImage} className="mt-auto bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
      <Download className="w-4 h-4" /> Render HD
      </button>
      </div>

      {/* CANVAS CENTRAL */}
      <div className="flex-1 bg-[#050505] flex items-center justify-center p-8 overflow-auto radial-bg-dark">
      <div ref={editorRef} className={`relative bg-black shadow-2xl ring-1 ring-white/10 overflow-hidden ${FORMATS[format]}`} style={{ background: canvasBg }}>
      {elements.map(el => (
        <div key={el.id} onClick={() => setSelectedElementId(el.id)} className={`absolute cursor-move ${selectedElementId === el.id ? 'ring-2 ring-emerald-500' : ''}`} style={{ left: el.x, top: el.y, zIndex: el.zIndex }}>
        {el.type === 'text' && <div style={applyTextFX(el)}>{el.content}</div>}
        </div>
      ))}
      </div>
      </div>

      {/* INSPECTOR DERECHO */}
      <div className="w-80 bg-[#0a0a0c] border-l border-white/5 p-4 overflow-y-auto">
      <h3 className="text-xs text-emerald-500 font-bold mb-4 uppercase">Inspector FX</h3>
      {selectedElementId ? (
        <div className="space-y-4">
        <select value={elements.find(e => e.id === selectedElementId)?.textEffect} onChange={e => setElements(elements.map(el => el.id === selectedElementId ? {...el, textEffect: e.target.value as TextEffect} : el))} className="w-full bg-[#111] p-2 rounded outline-none border border-white/10 text-sm">
        <option value="none">Plano</option>
        <option value="shadow-3d">3D Institucional</option>
        <option value="neon">Neon Glow</option>
        <option value="metallic">Oro Metálico</option>
        <option value="glitch">Cyber Glitch</option>
        </select>
        </div>
      ) : (
        <p className="text-gray-600 text-sm">Selecciona un elemento.</p>
      )}
      </div>
      </div>
    ) : (
      /* ========================================================================= */
      /* MÓDULO 2: EDICIÓN DE VIDEO (CAPCUT STYLE)                                 */
      /* ========================================================================= */
      <div className="flex flex-col flex-1 overflow-hidden">

      {/* PREVIEW SUPERIOR */}
      <div className="flex-1 flex bg-[#050505] border-b border-white/5">
      {/* PANEL DE ASSETS (Media Library) */}
      <div className="w-72 bg-[#0a0a0c] border-r border-white/5 p-4">
      <h3 className="text-xs text-gray-500 font-bold mb-4">Media Library</h3>
      <div className="grid grid-cols-2 gap-2">
      <div className="aspect-video bg-gray-900 rounded border border-white/10 flex items-center justify-center text-xs text-gray-600 cursor-pointer hover:border-blue-500" onClick={() => addClipToTrack('t1', 'video')}>+ B-Roll</div>
      <div className="aspect-video bg-gray-900 rounded border border-white/10 flex items-center justify-center text-xs text-gray-600 cursor-pointer hover:border-emerald-500" onClick={() => addClipToTrack('t2', 'text')}>+ Title FX</div>
      </div>
      </div>

      {/* PLAYER CENTRAL */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="aspect-[9/16] h-full max-h-[500px] bg-black ring-1 ring-white/10 rounded-lg relative overflow-hidden shadow-2xl">
      {/* Lógica de renderizado del frame actual */}
      <div className="absolute inset-0 flex items-center justify-center text-gray-700">
      <span className="text-xl font-bold">{currentTimeMs} ms</span>
      </div>
      {/* Mostrar clips activos en el tiempo actual */}
      {tracks.flatMap(t => t.clips).filter(c => currentTimeMs >= c.startMs && currentTimeMs < c.startMs + c.durationMs).map(clip => (
        <div key={clip.id} className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center" style={{ color: clip.color, textShadow: '0 4px 10px rgba(0,0,0,0.8)' }}>
        <h2 className="text-4xl font-black">{clip.content}</h2>
        </div>
      ))}
      </div>

      {/* CONTROLES DEL PLAYER */}
      <div className="flex items-center gap-4 mt-4">
      <span className="font-mono text-xs text-gray-400">{(currentTimeMs / 1000).toFixed(2)}s</span>
      <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors">
      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-1" />}
      </button>
      <span className="font-mono text-xs text-gray-400">{(maxTimelineMs / 1000).toFixed(2)}s</span>
      </div>
      </div>

      {/* INSPECTOR DE VIDEO */}
      <div className="w-72 bg-[#0a0a0c] border-l border-white/5 p-4">
      <h3 className="text-xs text-blue-500 font-bold mb-4 uppercase">Track Inspector</h3>
      <div className="space-y-4">
      <button className="w-full bg-[#111] border border-white/10 p-2 rounded text-xs text-left hover:bg-white/5">✨ Auto Captions (IA)</button>
      <button className="w-full bg-[#111] border border-white/10 p-2 rounded text-xs text-left hover:bg-white/5">✂️ Remove Silence</button>
      <button className="w-full bg-[#111] border border-white/10 p-2 rounded text-xs text-left hover:bg-white/5">🎨 Color Grade LUTs</button>
      </div>
      </div>
      </div>

      {/* TIMELINE MULTICAPA INFERIOR */}
      <div className="h-64 bg-[#0a0a0c] flex flex-col">
      {/* HERRAMIENTAS TIMELINE */}
      <div className="h-10 border-b border-white/5 flex items-center px-4 gap-4 bg-[#111]">
      <button className="p-1 hover:bg-white/10 rounded"><Scissors className="w-4 h-4 text-gray-400" /></button>
      <button className="p-1 hover:bg-white/10 rounded"><Copy className="w-4 h-4 text-gray-400" /></button>
      <button className="p-1 hover:bg-white/10 rounded"><Trash2 className="w-4 h-4 text-gray-400" /></button>
      </div>

      {/* TRACKS AREA */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">

      {/* PLAYHEAD (Aguja indicadora de tiempo) */}
      <div
      className="absolute top-0 bottom-0 w-px bg-red-500 z-50 pointer-events-none"
      style={{ left: `${(currentTimeMs / maxTimelineMs) * 100}%` }}
      >
      <div className="absolute -top-1 -translate-x-1/2 border-[5px] border-transparent border-t-red-500" />
      </div>

      <div className="p-2 space-y-2 relative">
      {tracks.map(track => (
        <div key={track.id} className="flex h-16 bg-[#111] rounded border border-white/5 relative">
        {/* Header del Track */}
        <div className="w-32 bg-black/50 border-r border-white/5 p-2 flex items-center gap-2 shrink-0 z-40">
        {track.type === 'video' && <ImageIcon className="w-4 h-4 text-blue-500" />}
        {track.type === 'text' && <Type className="w-4 h-4 text-emerald-500" />}
        {track.type === 'audio' && <Music className="w-4 h-4 text-purple-500" />}
        <span className="text-[10px] text-gray-400 truncate">{track.name}</span>
        </div>

        {/* Zona de Clips (Representación Visual del Porcentaje) */}
        <div className="flex-1 relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDF2MjBIMHptMTAgMGgxdjIwSDEwem0xMCAwaDF2MjBIMjB6bTEwIDBoMXYyMEgzMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')]">
        {track.clips.map(clip => {
          const leftPercent = (clip.startMs / maxTimelineMs) * 100;
          const widthPercent = (clip.durationMs / maxTimelineMs) * 100;
          return (
            <div
            key={clip.id}
            className="absolute top-1 bottom-1 rounded-md border border-white/20 p-1 flex items-center overflow-hidden cursor-pointer hover:border-white/50 transition-colors"
            style={{
              left: `${leftPercent}%`,
              width: `${widthPercent}%`,
              backgroundColor: track.type === 'video' ? '#1e3a8a' : track.type === 'text' ? '#064e3b' : '#4c1d95'
            }}
            >
            <span className="text-[10px] font-bold text-white/80 whitespace-nowrap">{clip.content}</span>
            </div>
          );
        })}
        </div>
        </div>
      ))}
      </div>
      </div>
      </div>
      </div>
    )}
    </div>
  );
}
