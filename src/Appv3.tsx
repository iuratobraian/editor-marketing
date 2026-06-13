import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ==========================================
// 1. TIPOS DE DATOS Y ARQUITECTURA CORE
// ==========================================
type ElementType = 'text' | 'image' | 'icon';
type TextBgStyle = 'none' | 'solid' | 'glass' | 'gradient';
type TextEffect = 'none' | 'shadow' | 'neon' | 'outline' | 'text-gradient' | 'glitch';
type CanvasFormat = '1:1' | '9:16' | '16:9' | '3:1';
type AppMode = 'image' | 'video';
type TransitionType = 'fade' | 'slide-left' | 'zoom-in' | 'blur';

interface EditorElement {
  id: string;
  type: ElementType;
  content: string;
  x: number;
  y: number;
  width?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bgColor?: string;
  bgStyle?: TextBgStyle;
  textEffect?: TextEffect;
  zIndex: number;
  // Filtros Avanzados
  brightness?: number;
  contrast?: number;
  saturate?: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
  hueRotate?: number;
  opacity?: number;
  mixBlendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'lighten'; // FX Premium
}

interface Template {
  name: string;
  format: CanvasFormat;
  background?: string;
  elements: EditorElement[];
}

interface VideoSettings {
  frameDuration: number; // ms en pantalla
  transitionDuration: number; // ms de transición
  effect: TransitionType;
}

const CANVAS_DIMENSIONS: Record<CanvasFormat, { w: number, h: number, css: string }> = {
  '1:1': { w: 1080, h: 1080, css: 'aspect-square max-w-[500px] w-full' },
  '9:16': { w: 1080, h: 1920, css: 'aspect-[9/16] max-h-[800px] h-full' },
  '16:9': { w: 1920, h: 1080, css: 'aspect-video max-w-[800px] w-full' },
  '3:1': { w: 1500, h: 500, css: 'aspect-[3/1] max-w-[900px] w-full' },
};

// --- FONDOS INSTITUCIONALES (ULTRA PREMIUM) ---
const PREMIUM_BACKGROUNDS = [
  { name: 'Dark Void', css: 'linear-gradient(to bottom right, #000000, #0a0a0a)' },
  { name: 'Emerald Aurora', css: 'radial-gradient(ellipse at top, #064e3b, transparent), radial-gradient(ellipse at bottom, #022c22, transparent), #000000' },
  { name: 'Corporate Deep Blue', css: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)' },
  { name: 'Neon Cyber', css: 'linear-gradient(45deg, #000000 0%, #064e3b 50%, #000000 100%)' },
  { name: 'Gold Reserve', css: 'radial-gradient(circle at center, #451a03 0%, #000000 100%)' },
];

const ICONS = [
  { name: 'Instagram', val: '📸' }, { name: 'Facebook', val: '📘' }, { name: 'Apple', val: '🍎' },
{ name: 'Bitcoin', val: '₿' }, { name: 'Oro', val: '🥇' }, { name: 'USD', val: '💵' },
{ name: 'Trading', val: '📈' }, { name: 'Alerta', val: '🚨' }, { name: 'Lock', val: '🔒' }
];

// --- PLANTILLAS BASE (Z-Index configurado para superponer imágenes) ---
const PRESET_TEMPLATES: Template[] = [
  {
    name: 'Alerta Cripto (9:16)',
    format: '9:16',
      background: PREMIUM_BACKGROUNDS[1].css,
      elements: [
        { id: 't1', type: 'text', content: 'ALERTA VIP', x: 50, y: 150, fontSize: 80, fontFamily: "'Bebas Neue', sans-serif", color: '#10b981', bgStyle: 'none', textEffect: 'neon', zIndex: 100 },
        { id: 'i1', type: 'icon', content: '🚨', x: 200, y: 350, fontSize: 120, zIndex: 101 },
        { id: 't2', type: 'text', content: 'NUEVO SETUP\nDISPONIBLE', x: 50, y: 550, fontSize: 40, fontFamily: "'Montserrat', sans-serif", color: '#ffffff', bgStyle: 'glass', textEffect: 'none', zIndex: 102 }
      ]
  },
{
  name: 'Análisis Institucional (16:9)',
  format: '16:9',
    background: PREMIUM_BACKGROUNDS[2].css,
    elements: [
      { id: 't3', type: 'text', content: 'ZONA DE LIQUIDEZ', x: 80, y: 100, fontSize: 60, fontFamily: "'Bebas Neue', sans-serif", color: '#ffffff', bgStyle: 'solid', bgColor: '#000000', textEffect: 'none', zIndex: 100 },
      { id: 't4', type: 'text', content: 'EUR/USD', x: 80, y: 200, fontSize: 120, fontFamily: "'Montserrat', sans-serif", color: '#3b82f6', bgStyle: 'none', textEffect: 'text-gradient', zIndex: 101 }
    ]
}
];

export default function App() {
  // ==========================================
  // 2. ESTADOS GLOBALES (APP STATE)
  // ==========================================
  const [mode, setMode] = useState<AppMode>('image');

  // --- Estado: Editor de Imagen ---
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<CanvasFormat>('9:16');
  const [canvasBg, setCanvasBg] = useState<string>(PREMIUM_BACKGROUNDS[0].css);
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  // --- Estado: Editor de Video ---
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    frameDuration: 2000,      // 2 segundos por imagen
    transitionDuration: 800,  // 0.8s de animación
    effect: 'fade'            // Transición por defecto
  });

  // --- Estado: Inteligencia Artificial ---
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Cargar Tipografías Premium
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); }
  }, []);

  // [FIN PARTE 1]

  // ==========================================
  // 3. MOTOR DE PLANTILLAS E INTELIGENCIA ARTIFICIAL
  // ==========================================
  const loadTemplate = (template: Template) => {
    setFormat(template.format);
    if (template.background) setCanvasBg(template.background);

    // Clonación profunda: Forzamos que los elementos de la plantilla vayan arriba
    const clonedElements = JSON.parse(JSON.stringify(template.elements)).map((el: EditorElement) => ({
      ...el,
      id: Date.now() + Math.random().toString(),
                                                                                                     zIndex: el.type === 'image' ? 10 : 100 + Math.floor(Math.random() * 50)
    }));
    setElements(clonedElements);
    setSelectedId(null);
  };

  const saveCurrentDesign = () => {
    if (elements.length === 0) return alert("El lienzo está vacío.");
    const newTemplate: Template = {
      name: `Diseño Guardado ${savedTemplates.length + 1}`,
      format: format,
        background: canvasBg,
        elements: elements
    };
    setSavedTemplates([...savedTemplates, newTemplate]);
    alert("Diseño guardado en la memoria local.");
  };

  const handleGenerateText = async () => {
    if (!apiKey.trim()) return alert('Ingresa tu API Key de Gemini de Google.');
    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = "Actúa como experto en marketing para fondos de inversión y trading. Crea una frase persuasiva (máximo 6 palabras). Sin comillas.";
      const result = await model.generateContent(prompt);
      handleAddText(result.response.text().trim().replace(/["']/g, ''));
    } catch (error: any) { alert(`Error IA: ${error.message}`); }
    finally { setIsGenerating(false); }
  };

  // ==========================================
  // 4. CONTROL DE CAPAS Y Z-INDEX (SMART LAYERS)
  // ==========================================
  // Imágenes van al fondo (Base 10), Textos/Iconos/Plantillas van arriba (Base 100)
  const getNextZIndex = (type: ElementType) => {
    const base = type === 'image' ? 10 : 100;
    const sameTypeElements = elements.filter(e => (type === 'image' ? e.zIndex < 100 : e.zIndex >= 100));
    return sameTypeElements.length > 0 ? Math.max(...sameTypeElements.map(e => e.zIndex)) + 1 : base;
  };

  const handleAddText = (text = 'DOBLE CLICK PARA EDITAR') => {
    setElements([...elements, {
      id: Date.now().toString(), type: 'text', content: text,
                x: 50, y: 50, fontSize: 60, fontFamily: "'Montserrat', sans-serif",
                color: '#ffffff', bgStyle: 'none', textEffect: 'shadow',
                opacity: 100, mixBlendMode: 'normal',
                zIndex: getNextZIndex('text')
    }]);
  };

  const handleAddIcon = (icon: string) => {
    setElements([...elements, { id: Date.now().toString(), type: 'icon', content: icon, x: 100, y: 100, fontSize: 100, zIndex: getNextZIndex('icon') }]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setElements([...elements, {
        id: Date.now().toString(), type: 'image', content: event.target?.result as string,
                                             x: 0, y: 0, width: 600, brightness: 100, contrast: 100, saturate: 100, blur: 0,
                                             grayscale: 0, sepia: 0, hueRotate: 0, opacity: 100, mixBlendMode: 'normal',
                                             zIndex: getNextZIndex('image') // Asegura que quede DEBAJO de los textos
      }]);
      reader.readAsDataURL(file);
    }
  };

  const updateElement = (id: string, changes: Partial<EditorElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...changes } : el));
  };

  const deleteSelected = () => {
    setElements(elements.filter(el => el.id !== selectedId));
    setSelectedId(null);
  };

  // ==========================================
  // 5. DRAG & DROP Y EXPORTACIÓN BINARIA (BLOB)
  // ==========================================
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setSelectedId(id);
    e.dataTransfer.setData('text/plain', id);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    e.dataTransfer.setData('offsetX', (e.clientX - rect.left).toString());
    e.dataTransfer.setData('offsetY', (e.clientY - rect.top).toString());
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id && editorRef.current) {
      const rect = editorRef.current.getBoundingClientRect();
      updateElement(id, {
        x: e.clientX - rect.left - parseFloat(e.dataTransfer.getData('offsetX') || '0'),
                    y: e.clientY - rect.top - parseFloat(e.dataTransfer.getData('offsetY') || '0')
      });
    }
  };

  // Exportación Avanzada: Soluciona el error de tamaño usando Blobs
  const handleExport = async () => {
    if (!editorRef.current) return;
    const currentSelected = selectedId;
    setSelectedId(null);
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      const canvas = await html2canvas(editorRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2 // Alta Resolución
      });

      // Empaquetado Binario: Previene cuelgues del navegador con imágenes 4K
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
          try {
            if (!blob) {
              reject(new Error("Fallo al generar el archivo binario."));
              return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Structura-Design-${format.replace(':', 'x')}-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url); // Liberar memoria RAM
            resolve();
          } catch (err) {
            reject(err);
          }
        }, 'image/png', 1.0);
      });

    } catch (e: any) {
      alert(`Error de exportación: ${e?.message || e || 'Error desconocido'}`);
    } finally {
      setSelectedId(currentSelected);
    }
  };

  // ==========================================
  // 6. LÓGICA DE VIDEO (OPENCUT TRANSITIONS ENGINE)
  // ==========================================
  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/')).slice(0, 100);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => setVideoFrames(prev => [...prev, event.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  // Motor de renderizado en tiempo real (Play/Pause)
  useEffect(() => {
    let interval: number;
    if (isPlaying && videoFrames.length > 0) {
      interval = window.setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % videoFrames.length);
      }, videoSettings.frameDuration);
    }
    return () => clearInterval(interval);
  }, [isPlaying, videoFrames.length, videoSettings.frameDuration]);

  // Gestor Dinámico de Estilos y Efectos de Texto
  const getTextStyles = (el: EditorElement): React.CSSProperties => {
    let baseStyles: React.CSSProperties = {
      whiteSpace: 'pre-wrap', lineHeight: '1.1', fontFamily: el.fontFamily,
      textTransform: el.fontFamily === "'Bebas Neue', sans-serif" ? 'uppercase' : 'none',
      color: el.color, opacity: (el.opacity ?? 100) / 100, mixBlendMode: el.mixBlendMode || 'normal'
    };

    if (el.bgStyle === 'solid') {
      baseStyles = { ...baseStyles, backgroundColor: el.bgColor || '#000', padding: '16px 24px', borderRadius: '8px' };
    } else if (el.bgStyle === 'glass') {
      baseStyles = { ...baseStyles, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', padding: '16px 24px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' };
    } else if (el.bgStyle === 'gradient') {
      baseStyles = { ...baseStyles, background: 'linear-gradient(135deg, #10b981 0%, #0f172a 100%)', padding: '16px 24px', borderRadius: '8px', border: 'none' };
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

  // Función para determinar las clases CSS de transición del Creador de Video
  const getTransitionClasses = (idx: number) => {
    const isActive = currentFrame === idx;
    let base = "absolute inset-0 w-full h-full object-cover transition-all ease-in-out ";

    // Inyectar duración dinámica por JS
    base += `duration-[${videoSettings.transitionDuration}ms] `;

    if (videoSettings.effect === 'fade') {
      return base + (isActive ? 'opacity-100' : 'opacity-0');
    } else if (videoSettings.effect === 'zoom-in') {
      return base + (isActive ? 'opacity-100 scale-110' : 'opacity-0 scale-100');
    } else if (videoSettings.effect === 'slide-left') {
      return base + (isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10');
    } else if (videoSettings.effect === 'blur') {
      return base + (isActive ? 'opacity-100 blur-0' : 'opacity-0 blur-xl');
    }
    return base;
  };

  // [AQUÍ INSERTARÉ LA PARTE 3 EN EL PRÓXIMO MENSAJE]
  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-emerald-500/30">

    {/* HEADER NAVEGACIÓN */}
    <header className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-[#020617] shrink-0 z-50">
    <div className="flex items-center gap-4">
    <div className="w-8 h-8 rounded bg-gradient-to-tr from-emerald-500 to-emerald-800 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
    <span className="material-symbols-outlined text-sm font-bold text-white">tune</span>
    </div>
    <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
    Structura <span className="text-emerald-500">FX</span>
    </span>
    <div className="ml-8 flex bg-white/5 rounded-lg p-1 ring-1 ring-white/10">
    <button onClick={() => setMode('image')} className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${mode === 'image' ? 'bg-emerald-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Design Studio</button>
    <button onClick={() => setMode('video')} className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${mode === 'video' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Video Compositor</button>
    </div>
    </div>
    </header>

    {/* ÁREA PRINCIPAL */}
    <div className="flex flex-1 overflow-hidden">

    {/* ========================================= */}
    {/* MODO 1: EDITOR DE IMÁGENES ULTRA PREMIUM */}
    {/* ========================================= */}
    {mode === 'image' && (
      <>
      {/* SIDEBAR IZQUIERDO: RECURSOS Y PLANTILLAS */}
      <div className="w-[320px] bg-[#0a0a0c] border-r border-white/5 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6 shrink-0 relative z-40">

      <div className="space-y-2">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Resolución / Canvas</h3>
      <select value={format} onChange={(e) => setFormat(e.target.value as CanvasFormat)} className="w-full bg-[#050505] p-3 rounded-xl text-sm ring-1 ring-white/10 outline-none text-white focus:ring-emerald-500 transition-shadow">
      <option value="1:1">Post Instagram (1:1)</option>
      <option value="9:16">Reel / Story (9:16)</option>
      <option value="16:9">YouTube Thumbnail (16:9)</option>
      <option value="3:1">Banner X/LinkedIn (3:1)</option>
      </select>
      </div>

      <div className="space-y-3 pt-4 border-t border-white/5">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Plantillas Inteligentes</h3>
      <div className="grid grid-cols-1 gap-2">
      {[...PRESET_TEMPLATES, ...savedTemplates].map((tpl, i) => (
        <button key={i} onClick={() => loadTemplate(tpl)} className="bg-white/5 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 p-3 rounded-xl text-left transition-all group flex items-center justify-between">
        <div>
        <span className="text-[10px] text-emerald-500 font-bold mb-1 block">{tpl.format}</span>
        <span className="text-sm font-medium text-gray-300 group-hover:text-white">{tpl.name}</span>
        </div>
        </button>
      ))}
      </div>
      <button onClick={saveCurrentDesign} className="w-full text-xs py-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors">Guardar Layout Actual</button>
      </div>

      <div className="space-y-3 pt-4 border-t border-white/5">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Fondos (Capa 0)</h3>
      <div className="grid grid-cols-2 gap-2">
      <button onClick={() => setCanvasBg('transparent')} className="h-12 rounded-lg border border-white/10 flex items-center justify-center text-xs text-gray-500 hover:bg-white/5 bg-[#050505]">Vacío</button>
      {PREMIUM_BACKGROUNDS.map((bg, i) => (
        <button key={i} onClick={() => setCanvasBg(bg.css)} className="h-12 rounded-lg border border-white/10 hover:ring-2 hover:ring-emerald-500 transition-all" style={{ background: bg.css }} title={bg.name} />
      ))}
      </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
      <button onClick={() => handleAddText()} className="bg-white/5 hover:bg-white/10 py-3 rounded-xl text-sm font-bold border border-white/5 transition-colors">+ Añadir Texto</button>
      <label className="bg-white/5 hover:bg-white/10 py-3 rounded-xl text-sm font-bold cursor-pointer text-center border border-white/5 transition-colors">
      + Subir Imagen <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </label>
      </div>

      <div className="space-y-2 pt-4 border-t border-white/5">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Insignias</h3>
      <div className="flex flex-wrap gap-2">
      {ICONS.map(icon => (
        <button key={icon.name} onClick={() => handleAddIcon(icon.val)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-lg text-xl flex items-center justify-center transition-transform hover:scale-110 border border-white/5">
        {icon.val}
        </button>
      ))}
      </div>
      </div>

      <div className="bg-gradient-to-br from-[#064e3b]/30 to-black p-4 rounded-xl ring-1 ring-emerald-500/20 mt-auto">
      <h3 className="text-[10px] text-emerald-500 font-bold uppercase mb-3">✨ IA Copywriter</h3>
      <input type="password" placeholder="Tu API Key de Gemini..." value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-[#050505] p-2.5 text-xs rounded-lg mb-2 outline-none ring-1 ring-white/10 focus:ring-emerald-500" />
      <button onClick={handleGenerateText} disabled={isGenerating} className="w-full bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-emerald-500 transition-colors">
      {isGenerating ? 'Escribiendo...' : 'Generar Frase Hook'}
      </button>
      </div>
      </div>

      {/* CANVAS (LIENZO DE TRABAJO) */}
      <div className="flex-1 bg-[#020202] overflow-auto flex items-center justify-center p-8 relative z-10 custom-scrollbar" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #111827 0%, #000000 100%)' }}>
      <div
      ref={editorRef} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
      className={`relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] ring-1 ring-white/10 shrink-0 transition-all duration-300 ${CANVAS_DIMENSIONS[format].css}`}
      style={{ background: canvasBg }}
      >
      {elements.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 font-medium pointer-events-none px-4 text-center z-50">
        <span className="text-5xl mb-4 opacity-30">🖼️</span>
        Elige un fondo o sube una imagen
        </div>
      )}

      {elements.sort((a, b) => a.zIndex - b.zIndex).map((el) => (
        <div
        key={el.id} draggable onDragStart={e => handleDragStart(e, el.id)} onClick={() => setSelectedId(el.id)}
        className={`absolute cursor-move transition-shadow ${selectedId === el.id ? 'ring-2 ring-blue-500 z-[999] shadow-2xl' : 'hover:ring-1 hover:ring-white/30'}`}
        style={{ left: `${el.x}px`, top: `${el.y}px`, zIndex: selectedId === el.id ? 999 : el.zIndex, width: el.type === 'image' ? `${el.width}px` : 'auto' }}
        >
        {el.type === 'text' && <div style={{...getTextStyles(el), fontSize: `${el.fontSize}px`}}>{el.content}</div>}

        {el.type === 'image' && (
          <img
          src={el.content} alt="Capa" className="w-full block pointer-events-none"
          style={{
            filter: `brightness(${el.brightness}%) contrast(${el.contrast}%) saturate(${el.saturate}%) blur(${el.blur}px) grayscale(${el.grayscale}%) sepia(${el.sepia}%) hue-rotate(${el.hueRotate}deg)`,
                                 opacity: `${el.opacity}%`,
                                 mixBlendMode: el.mixBlendMode
          }}
          />
        )}

        {el.type === 'icon' && <div style={{ fontSize: `${el.fontSize}px`, filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.8))' }}>{el.content}</div>}
        </div>
      ))}
      </div>
      </div>

      {/* SIDEBAR DERECHO: INSPECTOR FX */}
      <div className="w-[320px] bg-[#0a0a0c] border-l border-white/5 p-5 overflow-y-auto custom-scrollbar shrink-0 flex flex-col relative z-40">
      {selectedId ? (
        <div className="space-y-5">
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <h3 className="text-xs text-blue-400 uppercase font-bold tracking-wider">Inspector FX</h3>
        <button onClick={() => updateElement(selectedId, {zIndex: getNextZIndex(elements.find(e => e.id === selectedId)?.type || 'text')})} className="text-[10px] bg-white/10 px-2 py-1 rounded text-white hover:bg-white/20">Subir Capa</button>
        </div>

        {/* CONTROLES DE TEXTO AVANZADOS */}
        {elements.find(e => e.id === selectedId)?.type === 'text' && (
          <div className="space-y-4">
          <textarea value={elements.find(e => e.id === selectedId)?.content} onChange={e => updateElement(selectedId, {content: e.target.value})} className="w-full bg-[#050505] p-3 rounded-lg text-sm ring-1 ring-white/10 text-white outline-none focus:ring-blue-500 resize-none" rows={3} />

          <div>
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Tipografía</span>
          <select value={elements.find(e => e.id === selectedId)?.fontFamily} onChange={e => updateElement(selectedId, {fontFamily: e.target.value})} className="w-full bg-[#050505] p-2.5 rounded-lg text-sm outline-none ring-1 ring-white/10">
          <option value="'Montserrat', sans-serif">Montserrat</option>
          <option value="'Bebas Neue', sans-serif">Bebas Neue</option>
          <option value="'Playfair Display', serif">Playfair Display</option>
          </select>
          </div>

          <div className="flex gap-2">
          <div className="flex-1">
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Tamaño</span>
          <input type="number" value={elements.find(e => e.id === selectedId)?.fontSize} onChange={e => updateElement(selectedId, {fontSize: Number(e.target.value)})} className="w-full bg-[#050505] p-2.5 rounded-lg text-sm ring-1 ring-white/10" />
          </div>
          <div className="flex-1">
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Color Base</span>
          <input type="color" value={elements.find(e => e.id === selectedId)?.color} onChange={e => updateElement(selectedId, {color: e.target.value})} className="w-full h-[42px] rounded-lg bg-[#050505] cursor-pointer" />
          </div>
          </div>

          <div>
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Efecto Visual (Letra)</span>
          <select value={elements.find(e => e.id === selectedId)?.textEffect} onChange={e => updateElement(selectedId, {textEffect: e.target.value as TextEffect})} className="w-full bg-[#050505] p-2.5 rounded-lg text-sm outline-none ring-1 ring-white/10 text-blue-400 font-medium">
          <option value="none">Normal</option>
          <option value="shadow">Sombra 3D Pura</option>
          <option value="neon">Brillo Neón Exterior</option>
          <option value="outline">Stroke (Solo Contorno)</option>
          <option value="text-gradient">Degradado</option>
          </select>
          </div>

          <div>
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Resalte de Fondo (Caja)</span>
          <select value={elements.find(e => e.id === selectedId)?.bgStyle} onChange={e => updateElement(selectedId, {bgStyle: e.target.value as TextBgStyle})} className="w-full bg-[#050505] p-2.5 rounded-lg text-sm outline-none ring-1 ring-white/10">
          <option value="none">Sin Fondo</option>
          <option value="glass">Cristal (Desenfoque)</option>
          <option value="solid">Caja Oscura</option>
          <option value="gradient">Gradiente Corporativo</option>
          </select>
          </div>

          <div>
          <span className="text-[10px] text-gray-500 uppercase flex justify-between"><span>Opacidad</span><span>{elements.find(e => e.id === selectedId)?.opacity}%</span></span>
          <input type="range" min="0" max="100" value={elements.find(e => e.id === selectedId)?.opacity || 100} onChange={e => updateElement(selectedId, {opacity: Number(e.target.value)})} className="w-full accent-blue-500" />
          </div>
          </div>
        )}

        {/* CONTROLES DE IMAGEN (FILTROS BLEND) */}
        {elements.find(e => e.id === selectedId)?.type === 'image' && (
          <div className="space-y-4">
          <div>
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Modo de Fusión (Blend)</span>
          <select value={elements.find(e => e.id === selectedId)?.mixBlendMode || 'normal'} onChange={e => updateElement(selectedId, {mixBlendMode: e.target.value as any})} className="w-full bg-[#050505] p-2.5 rounded-lg text-sm outline-none ring-1 ring-white/10 text-blue-400">
          <option value="normal">Normal</option>
          <option value="multiply">Multiplicar (Oscurecer)</option>
          <option value="screen">Trama (Aclarar)</option>
          <option value="overlay">Superponer (Contraste)</option>
          <option value="lighten">Aclarar (Neon FX)</option>
          </select>
          </div>

          {[
            { prop: 'width', label: 'Escala (px)', min: 100, max: 2000 },
                                                                       { prop: 'opacity', label: 'Opacidad (%)', min: 0, max: 100 },
                                                                       { prop: 'blur', label: 'Desenfoque (px)', min: 0, max: 20 },
                                                                       { prop: 'brightness', label: 'Brillo (%)', min: 0, max: 200 },
                                                                       { prop: 'contrast', label: 'Contraste (%)', min: 0, max: 200 },
                                                                       { prop: 'grayscale', label: 'Blanco y Negro (%)', min: 0, max: 100 },
                                                                       { prop: 'hueRotate', label: 'Tono (deg)', min: 0, max: 360 }
          ].map(({prop, label, min, max}) => (
            <div key={prop}>
            <div className="flex justify-between">
            <span className="text-[10px] text-gray-400 uppercase">{label}</span>
            </div>
            <input type="range" min={min} max={max} value={(elements.find(e => e.id === selectedId) as any)[prop] ?? (prop === 'opacity' ? 100 : 0)} onChange={e => updateElement(selectedId, {[prop]: Number(e.target.value)})} className="w-full accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-1" />
            </div>
          ))}
          </div>
        )}

        {/* CONTROLES DE ICONO */}
        {elements.find(e => e.id === selectedId)?.type === 'icon' && (
          <div>
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Escala Vectorial</span>
          <input type="range" min="20" max="400" value={elements.find(e => e.id === selectedId)?.fontSize} onChange={e => updateElement(selectedId, {fontSize: Number(e.target.value)})} className="w-full accent-blue-500" />
          </div>
        )}

        <div className="pt-4 mt-2 border-t border-white/5">
        <button onClick={deleteSelected} className="w-full bg-red-500/10 text-red-500 py-3 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors">Eliminar Capa</button>
        </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 space-y-3">
        <span className="material-symbols-outlined text-4xl opacity-30">touch_app</span>
        <p className="text-sm">Selecciona una capa en el lienzo para desplegar las herramientas de FX.</p>
        </div>
      )}

      <button onClick={handleExport} className="mt-auto w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95">
      Descargar Blob 4K
      </button>
      </div>
      </>
    )}

    {/* ========================================= */}
    {/* MODO 2: OPENCUT VIDEO COMPOSITOR          */}
    {/* ========================================= */}
    {mode === 'video' && (
      <div className="flex flex-col w-full bg-[#050505]">
      <div className="h-24 border-b border-white/5 p-6 flex items-center justify-between bg-[#0a0a0c]">
      <div>
      <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Secuenciador de Transiciones</h2>
      <p className="text-xs text-gray-400 mt-1">Sube tus diseños y configura tiempos y efectos para crear un Reel.</p>
      </div>
      <div className="flex gap-4 items-center">

      {/* CONTROLES DE TRANSICIÓN */}
      <div className="flex gap-3 bg-[#050505] p-1.5 rounded-lg ring-1 ring-white/10 mr-4">
      <select value={videoSettings.effect} onChange={e => setVideoSettings({...videoSettings, effect: e.target.value as TransitionType})} className="bg-transparent text-xs text-white outline-none px-2 cursor-pointer border-r border-white/10">
      <option value="fade">Fade Suave</option>
      <option value="zoom-in">Ken Burns (Zoom)</option>
      <option value="slide-left">Deslizamiento</option>
      <option value="blur">Blur In/Out</option>
      </select>
      <div className="px-2 flex items-center gap-2 text-xs text-gray-400" title="Tiempo que la imagen dura en pantalla">
      <span>⏱ Pantalla:</span>
      <input type="number" value={videoSettings.frameDuration} onChange={e => setVideoSettings({...videoSettings, frameDuration: Number(e.target.value)})} className="w-16 bg-black p-1 rounded text-white text-center outline-none" step="500" /> ms
      </div>
      <div className="px-2 flex items-center gap-2 text-xs text-gray-400 border-l border-white/10" title="Velocidad del efecto visual">
      <span>⚡ Efecto:</span>
      <input type="number" value={videoSettings.transitionDuration} onChange={e => setVideoSettings({...videoSettings, transitionDuration: Number(e.target.value)})} className="w-16 bg-black p-1 rounded text-white text-center outline-none" step="100" /> ms
      </div>
      </div>

      <label className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-all text-white">
      + Subir Lote (Carpeta)
      <input type="file" accept="image/*" multiple webkitdirectory="true" className="hidden" onChange={handleFolderUpload} />
      </label>
      <label className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl cursor-pointer text-sm font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
      + Subir Archivos
      <input type="file" accept="image/*" multiple className="hidden" onChange={handleFolderUpload} />
      </label>
      </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative radial-bg">
      <div className="aspect-[9/16] h-[60vh] bg-black ring-1 ring-white/10 rounded-xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
      {videoFrames.length > 0 ? (
        videoFrames.map((frame, idx) => (
          <img
          key={idx} src={frame} alt={`Frame ${idx}`}
          className={getTransitionClasses(idx)}
          />
        ))
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
        <span className="text-4xl mb-4 opacity-30">🎞️</span>
        <p className="text-sm">Sube tus diseños exportados para generar<br/>la previsualización animada.</p>
        </div>
      )}
      </div>

      <div className="mt-8 flex gap-4">
      <button onClick={() => setIsPlaying(!isPlaying)} disabled={videoFrames.length === 0} className="bg-white hover:bg-gray-200 text-black px-10 py-3 rounded-xl font-bold text-lg disabled:opacity-50 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
      {isPlaying ? '⏸ Detener Animación' : '▶ Renderizar Playback'}
      </button>
      <button onClick={() => { setVideoFrames([]); setIsPlaying(false); setCurrentFrame(0); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-3 rounded-xl font-bold transition-colors">
      Limpiar Proyecto
      </button>
      </div>
      </div>

      <div className="h-32 border-t border-white/5 bg-[#0a0a0c] p-4 flex gap-3 overflow-x-auto custom-scrollbar items-center">
      {videoFrames.length === 0 && <span className="text-xs text-gray-600 m-auto">Pista de video vacía.</span>}
      {videoFrames.map((frame, idx) => (
        <div key={idx} onClick={() => setCurrentFrame(idx)} className={`h-full aspect-[9/16] bg-gray-900 rounded-lg shrink-0 cursor-pointer overflow-hidden transition-all ${currentFrame === idx ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0a0a0c] scale-105' : 'ring-1 ring-white/10 opacity-50 hover:opacity-100'}`}>
        <img src={frame} alt="thumb" className="w-full h-full object-cover" />
        <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] text-white font-mono">{idx + 1}</div>
        </div>
      ))}
      </div>
      </div>
    )}

    </div>
    </div>
  );
}
