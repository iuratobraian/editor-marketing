import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ==========================================
// 1. TIPOS DE DATOS Y CONFIGURACIÓN CORE
// ==========================================
type ElementType = 'text' | 'image' | 'icon';
type TextBgStyle = 'none' | 'solid' | 'glass' | 'gradient';
type TextEffect = 'none' | 'shadow' | 'neon' | 'outline' | 'text-gradient';
type CanvasFormat = '1:1' | '9:16' | '16:9' | '3:1';
type AppMode = 'image' | 'video';

interface EditorElement {
  id: string;
  type: ElementType;
  content: string; // URL, texto o emoji
  x: number;
  y: number;
  width?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bgColor?: string;
  bgStyle?: TextBgStyle;
  textEffect?: TextEffect; // NUEVO: Efectos visuales de texto
  zIndex: number;
  // NUEVO: Filtros avanzados de imagen
  brightness?: number;
  contrast?: number;
  saturate?: number;
  blur?: number;
  grayscale?: number;
  sepia?: number;
  hueRotate?: number;
}

interface Template {
  name: string;
  format: CanvasFormat;
  background?: string;
  elements: EditorElement[];
}

const CANVAS_DIMENSIONS: Record<CanvasFormat, { w: number, h: number, css: string }> = {
  '1:1': { w: 1080, h: 1080, css: 'aspect-square max-w-[500px] w-full' },
  '9:16': { w: 1080, h: 1920, css: 'aspect-[9/16] max-h-[800px] h-full' },
  '16:9': { w: 1920, h: 1080, css: 'aspect-video max-w-[800px] w-full' },
  '3:1': { w: 1500, h: 500, css: 'aspect-[3/1] max-w-[900px] w-full' },
};

// --- BANCO DE FONDOS INSTITUCIONALES ---
const PREMIUM_BACKGROUNDS = [
  { name: 'Dark Void', css: 'linear-gradient(to bottom right, #050505, #111111)' },
  { name: 'Emerald Mesh', css: 'radial-gradient(at 0% 0%, #064e3b 0%, transparent 50%), radial-gradient(at 100% 100%, #022c22 0%, transparent 50%), #000000' },
  { name: 'Structura Blue', css: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' },
  { name: 'Cyber Grid', css: 'repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(16, 185, 129, 0.05) 50px), repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(16, 185, 129, 0.05) 50px), #050505' },
  { name: 'Gold Luxury', css: 'radial-gradient(circle at center, #422006 0%, #000000 100%)' },
];

const ICONS = [
  { name: 'Instagram', val: '📸' }, { name: 'Facebook', val: '📘' }, { name: 'Apple', val: '🍎' },
{ name: 'Bitcoin', val: '₿' }, { name: 'Oro', val: '🥇' }, { name: 'USD', val: '💵' },
{ name: 'Trading', val: '📈' }, { name: 'Alerta', val: '🚨' }, { name: 'Lock', val: '🔒' }
];

// --- PLANTILLAS BASE (Con z-index corregido) ---
const PRESET_TEMPLATES: Template[] = [
  {
    name: 'Alerta de Mercado (9:16)',
    format: '9:16',
      background: PREMIUM_BACKGROUNDS[1].css,
      elements: [
        { id: 't1', type: 'text', content: 'ALERTA VIP', x: 50, y: 150, fontSize: 80, fontFamily: "'Bebas Neue', sans-serif", color: '#10b981', bgStyle: 'none', textEffect: 'neon', zIndex: 10 },
        { id: 'i1', type: 'icon', content: '🚨', x: 200, y: 350, fontSize: 120, zIndex: 10 },
        { id: 't2', type: 'text', content: 'Nueva entrada disponible\nen el portal', x: 50, y: 550, fontSize: 30, fontFamily: "'Montserrat', sans-serif", color: '#ffffff', bgStyle: 'glass', textEffect: 'none', zIndex: 10 }
      ]
  },
{
  name: 'Portada Setup (16:9)',
  format: '16:9',
    background: PREMIUM_BACKGROUNDS[2].css,
    elements: [
      { id: 't3', type: 'text', content: 'ANÁLISIS INSTITUCIONAL', x: 80, y: 100, fontSize: 60, fontFamily: "'Bebas Neue', sans-serif", color: '#ffffff', bgStyle: 'none', textEffect: 'shadow', zIndex: 10 },
      { id: 't4', type: 'text', content: 'USD/JPY', x: 80, y: 200, fontSize: 100, fontFamily: "'Montserrat', sans-serif", color: '#3b82f6', bgStyle: 'none', textEffect: 'text-gradient', zIndex: 10 }
    ]
}
];

export default function App() {
  // ==========================================
  // 2. ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================
  const [mode, setMode] = useState<AppMode>('image');

  // Estado del Lienzo
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<CanvasFormat>('9:16');
  const [canvasBg, setCanvasBg] = useState<string>(PREMIUM_BACKGROUNDS[0].css);
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Estado de Video
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  // IA Config
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Cargar fuentes Pro de Google
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); }
  }, []);

  // [AQUÍ INSERTARÉ LA PARTE 2 EN EL PRÓXIMO MENSAJE]

  // ==========================================
  // 3. LÓGICA DE PLANTILLAS E IA
  // ==========================================
  const loadTemplate = (template: Template) => {
    setFormat(template.format);
    if (template.background) setCanvasBg(template.background);

    // Clonación profunda para no mutar la plantilla original
    const clonedElements = JSON.parse(JSON.stringify(template.elements)).map((el: EditorElement) => ({
      ...el,
      id: Date.now() + Math.random().toString()
    }));
    setElements(clonedElements);
    setSelectedId(null);
  };

  const saveCurrentDesign = () => {
    if (elements.length === 0) return alert("El lienzo está vacío.");
    const newTemplate: Template = {
      name: `Diseño Personalizado ${savedTemplates.length + 1}`,
      format: format,
        background: canvasBg,
        elements: elements
    };
    setSavedTemplates([...savedTemplates, newTemplate]);
    alert("Diseño guardado exitosamente en tu biblioteca local.");
  };

  const handleGenerateText = async () => {
    if (!apiKey.trim()) return alert('Ingresa tu API Key de Gemini.');
    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = "Actúa como un experto en marketing digital institucional para una firma de trading algorítmico. Genera una frase de impacto (max 5 palabras) sobre mercados o rentabilidad. No uses comillas.";
      const result = await model.generateContent(prompt);
      handleAddText(result.response.text().trim().replace(/["']/g, ''));
    } catch (error: any) { alert(`Error IA: ${error.message}`); }
    finally { setIsGenerating(false); }
  };

  // ==========================================
  // 4. CONTROL DE CAPAS (LAYERS)
  // ==========================================
  // Z-Index inicia en 10 para asegurar que el fondo quede atrás
  const getNextZIndex = () => elements.length > 0 ? Math.max(...elements.map(e => e.zIndex)) + 1 : 10;

  const handleAddText = (text = 'NUEVO TEXTO') => {
    setElements([...elements, {
      id: Date.now().toString(), type: 'text', content: text,
                x: 50, y: 50, fontSize: 60, fontFamily: "'Montserrat', sans-serif",
                color: '#ffffff', bgStyle: 'none', textEffect: 'shadow', zIndex: getNextZIndex()
    }]);
  };

  const handleAddIcon = (icon: string) => {
    setElements([...elements, { id: Date.now().toString(), type: 'icon', content: icon, x: 100, y: 100, fontSize: 100, zIndex: getNextZIndex() }]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setElements([...elements, {
        id: Date.now().toString(), type: 'image', content: event.target?.result as string,
                                             x: 0, y: 0, width: 500, brightness: 100, contrast: 100, saturate: 100, blur: 0,
                                             grayscale: 0, sepia: 0, hueRotate: 0, zIndex: getNextZIndex()
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
  // 5. DRAG & DROP Y EXPORTACIÓN PRO
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

  const handleExport = async () => {
    if (!editorRef.current) return;
    const currentSelected = selectedId;
    setSelectedId(null); // Quitar marcos de selección
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 150)); // Dar tiempo extra al renderizado DOM
    try {
      const canvas = await html2canvas(editorRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Respeta el fondo en gradiente o imagen que pusimos
        scale: 2 // Exportación en Alta Definición
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png', 1.0);
      link.download = `Marketing-Pro-${format.replace(':', 'x')}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("Error al exportar. Intenta con imágenes menos pesadas.");
    } finally {
      setSelectedId(currentSelected);
    }
  };

  // ==========================================
  // 6. LÓGICA DE VIDEO Y ESTILOS AVANZADOS
  // ==========================================
  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/')).slice(0, 100);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => setVideoFrames(prev => [...prev, event.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    let interval: number;
    if (isPlaying && videoFrames.length > 0) {
      interval = window.setInterval(() => {
        setCurrentFrame(prev => (prev + 1) % videoFrames.length);
      }, 1000); // 1 segundo por transición
    }
    return () => clearInterval(interval);
  }, [isPlaying, videoFrames.length]);

  const getTextStyles = (el: EditorElement): React.CSSProperties => {
    let baseStyles: React.CSSProperties = {
      whiteSpace: 'pre-wrap', lineHeight: '1.1', fontFamily: el.fontFamily,
      textTransform: el.fontFamily === "'Bebas Neue', sans-serif" ? 'uppercase' : 'none',
      color: el.color
    };

    // Efectos de Caja de Fondo
    if (el.bgStyle === 'solid') {
      baseStyles = { ...baseStyles, backgroundColor: el.bgColor || '#000', padding: '16px 24px', borderRadius: '8px' };
    } else if (el.bgStyle === 'glass') {
      baseStyles = { ...baseStyles, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)', padding: '16px 24px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' };
    } else if (el.bgStyle === 'gradient') {
      baseStyles = { ...baseStyles, background: 'linear-gradient(135deg, #10b981 0%, #0f172a 100%)', padding: '16px 24px', borderRadius: '8px', border: 'none' };
    }

    // Efectos Visuales Nativos sobre la Letra
    if (el.textEffect === 'shadow') {
      baseStyles.textShadow = '0 10px 20px rgba(0,0,0,0.9), 0 6px 6px rgba(0,0,0,0.6)';
    } else if (el.textEffect === 'neon') {
      baseStyles.textShadow = `0 0 10px ${el.color}, 0 0 20px ${el.color}, 0 0 40px ${el.color}, 0 0 80px ${el.color}`;
      baseStyles.color = '#ffffff'; // Centro blanco, borde iluminado
    } else if (el.textEffect === 'outline') {
      baseStyles.WebkitTextStroke = `2px ${el.color}`;
      baseStyles.color = 'transparent';
      baseStyles.textShadow = 'none';
    } else if (el.textEffect === 'text-gradient') {
      baseStyles.background = `linear-gradient(to bottom right, #ffffff, ${el.color})`;
      baseStyles.WebkitBackgroundClip = 'text';
      baseStyles.WebkitTextFillColor = 'transparent';
    }

    return baseStyles;
  };

  // [AQUÍ INSERTARÉ LA PARTE 3 EN EL PRÓXIMO MENSAJE]

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-emerald-500/30">

    {/* HEADER NAVEGACIÓN */}
    <header className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-[#0a0a0c] shrink-0 z-50">
    <div className="flex items-center gap-4">
    <div className="w-8 h-8 rounded bg-gradient-to-tr from-emerald-400 to-blue-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
    <span className="material-symbols-outlined text-sm font-bold text-black">🚀</span>
    </div>
    <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
    Structura <span className="text-emerald-400">Pro</span>
    </span>
    <div className="ml-8 flex bg-white/5 rounded-lg p-1 ring-1 ring-white/10">
    <button onClick={() => setMode('image')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'image' ? 'bg-emerald-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>Editor UI</button>
    <button onClick={() => setMode('video')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'video' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>Creador FX (Video)</button>
    </div>
    </div>
    </header>

    {/* ÁREA PRINCIPAL */}
    <div className="flex flex-1 overflow-hidden">

    {/* ========================================= */}
    {/* MODO 1: EDITOR DE IMAGEN INSTITUCIONAL  */}
    {/* ========================================= */}
    {mode === 'image' && (
      <>
      {/* SIDEBAR IZQUIERDO: HERRAMIENTAS, FONDOS Y PLANTILLAS */}
      <div className="w-[320px] bg-[#0f0f11] border-r border-white/5 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6 shrink-0 relative z-40">

      {/* Sección Formato Canvas */}
      <div className="space-y-2">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Lienzo</h3>
      <select value={format} onChange={(e) => setFormat(e.target.value as CanvasFormat)} className="w-full bg-[#050505] p-3 rounded-xl text-sm ring-1 ring-white/10 outline-none text-white focus:ring-emerald-500 transition-shadow">
      <option value="1:1">Feed / Carrusel (1:1)</option>
      <option value="9:16">Historia / Reel (9:16)</option>
      <option value="16:9">Portada YouTube (16:9)</option>
      <option value="3:1">Banner X/LinkedIn (3:1)</option>
      </select>
      </div>

      {/* Plantillas y Guardado */}
      <div className="space-y-3 pt-4 border-t border-white/5">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Plantillas Pro</h3>
      <div className="grid grid-cols-1 gap-2">
      {[...PRESET_TEMPLATES, ...savedTemplates].map((tpl, i) => (
        <button key={i} onClick={() => loadTemplate(tpl)} className="bg-white/5 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 p-3 rounded-xl text-left transition-all group flex items-center justify-between">
        <div>
        <span className="text-[10px] text-emerald-400 font-bold mb-1 block">{tpl.format}</span>
        <span className="text-sm font-medium text-gray-300 group-hover:text-white">{tpl.name}</span>
        </div>
        <span className="opacity-0 group-hover:opacity-100 text-emerald-400 text-lg transition-opacity">→</span>
        </button>
      ))}
      </div>
      <button onClick={saveCurrentDesign} className="w-full text-xs py-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors">+ Guardar Configuración Actual</button>
      </div>

      {/* Fondos Institucionales */}
      <div className="space-y-3 pt-4 border-t border-white/5">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Fondos Base</h3>
      <div className="grid grid-cols-2 gap-2">
      <button onClick={() => setCanvasBg('transparent')} className="h-12 rounded-lg border border-white/10 flex items-center justify-center text-xs text-gray-500 hover:bg-white/5">Sin Fondo</button>
      {PREMIUM_BACKGROUNDS.map((bg, i) => (
        <button key={i} onClick={() => setCanvasBg(bg.css)} className="h-12 rounded-lg border border-white/10 hover:ring-2 hover:ring-emerald-500 transition-all" style={{ background: bg.css }} title={bg.name} />
      ))}
      </div>
      </div>

      {/* Agregar Elementos Básicos */}
      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
      <button onClick={() => handleAddText()} className="bg-white/5 hover:bg-white/10 py-3 rounded-xl text-sm font-bold border border-white/5 transition-colors text-emerald-50">+ Capa Texto</button>
      <label className="bg-white/5 hover:bg-white/10 py-3 rounded-xl text-sm font-bold cursor-pointer text-center border border-white/5 transition-colors text-emerald-50">
      + Capa Imagen <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </label>
      </div>

      {/* Iconos Corporativos */}
      <div className="space-y-2 pt-4 border-t border-white/5">
      <h3 className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Iconos / Insignias</h3>
      <div className="flex flex-wrap gap-2">
      {ICONS.map(icon => (
        <button key={icon.name} onClick={() => handleAddIcon(icon.val)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-lg text-xl flex items-center justify-center transition-transform hover:scale-110 border border-white/5" title={icon.name}>
        {icon.val}
        </button>
      ))}
      </div>
      </div>

      {/* Integración IA */}
      <div className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 p-4 rounded-xl ring-1 ring-white/10 mt-auto">
      <h3 className="text-[10px] text-emerald-400 font-bold uppercase mb-3 flex items-center gap-1">✨ Structura AI Engine</h3>
      <input type="password" placeholder="Tu API Key de Gemini..." value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-black/50 p-2.5 text-xs rounded-lg mb-2 outline-none ring-1 ring-white/10 focus:ring-emerald-500" />
      <button onClick={handleGenerateText} disabled={isGenerating} className="w-full bg-emerald-500 text-black text-xs font-bold py-2.5 rounded-lg hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]">
      {isGenerating ? 'Analizando...' : 'Generar Copy Automático'}
      </button>
      </div>
      </div>

      {/* CANVAS (LIENZO DE TRABAJO) */}
      <div className="flex-1 bg-[#050505] overflow-auto flex items-center justify-center p-8 relative z-10 custom-scrollbar" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1f2937 0%, #050505 100%)' }}>
      <div
      ref={editorRef} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
      className={`relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 shrink-0 transition-all duration-300 ${CANVAS_DIMENSIONS[format].css}`}
      style={{ background: canvasBg }} // El fondo real se ancla aquí
      >
      {elements.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 font-medium pointer-events-none px-4 text-center z-50">
        <span className="text-5xl mb-4 opacity-50">🎨</span>
        Agrega un elemento para comenzar a diseñar tu creativo.
        </div>
      )}

      {elements.sort((a, b) => a.zIndex - b.zIndex).map((el) => (
        <div
        key={el.id} draggable onDragStart={e => handleDragStart(e, el.id)} onClick={() => setSelectedId(el.id)}
        className={`absolute cursor-move transition-shadow ${selectedId === el.id ? 'ring-2 ring-emerald-500 z-[999] shadow-2xl' : 'hover:ring-1 hover:ring-white/30'}`}
        style={{ left: `${el.x}px`, top: `${el.y}px`, zIndex: selectedId === el.id ? 999 : el.zIndex, width: el.type === 'image' ? `${el.width}px` : 'auto' }}
        >
        {el.type === 'text' && <div style={{...getTextStyles(el), fontSize: `${el.fontSize}px`}}>{el.content}</div>}

        {el.type === 'image' && (
          <img
          src={el.content} alt="Capa" className="w-full block pointer-events-none"
          style={{
            filter: `brightness(${el.brightness}%) contrast(${el.contrast}%) saturate(${el.saturate}%) blur(${el.blur}px) grayscale(${el.grayscale}%) sepia(${el.sepia}%) hue-rotate(${el.hueRotate}deg)`
          }}
          />
        )}

        {el.type === 'icon' && <div style={{ fontSize: `${el.fontSize}px`, filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.8))' }}>{el.content}</div>}
        </div>
      ))}
      </div>
      </div>

      {/* SIDEBAR DERECHO: PANEL DE PROPIEDADES AVANZADO */}
      <div className="w-[300px] bg-[#0f0f11] border-l border-white/5 p-5 overflow-y-auto custom-scrollbar shrink-0 flex flex-col relative z-40">
      {selectedId ? (
        <div className="space-y-5">
        <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <h3 className="text-xs text-emerald-400 uppercase font-bold tracking-wider">Inspector FX</h3>
        <button onClick={() => updateElement(selectedId, {zIndex: getNextZIndex()})} className="text-[10px] bg-white/10 px-2 py-1 rounded text-white hover:bg-white/20">Traer al Frente</button>
        </div>

        {/* CONTROLES DE TEXTO AVANZADOS */}
        {elements.find(e => e.id === selectedId)?.type === 'text' && (
          <div className="space-y-4">
          <div>
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Contenido</span>
          <textarea value={elements.find(e => e.id === selectedId)?.content} onChange={e => updateElement(selectedId, {content: e.target.value})} className="w-full bg-[#050505] p-3 rounded-lg text-sm ring-1 ring-white/10 text-white outline-none focus:ring-emerald-500 resize-none" rows={3} />
          </div>

          <div>
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Tipografía</span>
          <select value={elements.find(e => e.id === selectedId)?.fontFamily} onChange={e => updateElement(selectedId, {fontFamily: e.target.value})} className="w-full bg-[#050505] p-2.5 rounded-lg text-sm outline-none ring-1 ring-white/10">
          <option value="'Montserrat', sans-serif">Montserrat (Moderna)</option>
          <option value="'Bebas Neue', sans-serif">Bebas Neue (Impacto)</option>
          <option value="'Playfair Display', serif">Playfair (Elegante)</option>
          </select>
          </div>

          <div className="flex gap-2">
          <div className="flex-1">
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Tamaño</span>
          <input type="number" value={elements.find(e => e.id === selectedId)?.fontSize} onChange={e => updateElement(selectedId, {fontSize: Number(e.target.value)})} className="w-full bg-[#050505] p-2.5 rounded-lg text-sm ring-1 ring-white/10" />
          </div>
          <div className="flex-1">
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Color</span>
          <input type="color" value={elements.find(e => e.id === selectedId)?.color} onChange={e => updateElement(selectedId, {color: e.target.value})} className="w-full h-[42px] rounded-lg bg-[#050505] cursor-pointer" />
          </div>
          </div>

          <div>
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Caja / Resalte Posterior</span>
          <select value={elements.find(e => e.id === selectedId)?.bgStyle} onChange={e => updateElement(selectedId, {bgStyle: e.target.value as TextBgStyle})} className="w-full bg-[#050505] p-2.5 rounded-lg text-sm outline-none ring-1 ring-white/10">
          <option value="none">Sin Fondo (Texto Libre)</option>
          <option value="glass">Cristal (Desenfoque)</option>
          <option value="solid">Caja Sólida</option>
          <option value="gradient">Gradiente Corporativo</option>
          </select>
          </div>

          <div>
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Efecto Visual (FX)</span>
          <select value={elements.find(e => e.id === selectedId)?.textEffect} onChange={e => updateElement(selectedId, {textEffect: e.target.value as TextEffect})} className="w-full bg-[#050505] p-2.5 rounded-lg text-sm outline-none ring-1 ring-white/10 text-emerald-400 font-medium">
          <option value="none">Sin Efecto</option>
          <option value="shadow">Sombra 3D Pura</option>
          <option value="neon">Brillo Neón Exterior</option>
          <option value="outline">Solo Contorno (Stroke)</option>
          <option value="text-gradient">Texto en Degradado</option>
          </select>
          </div>
          </div>
        )}

        {/* CONTROLES DE IMAGEN (FILTROS PRO) */}
        {elements.find(e => e.id === selectedId)?.type === 'image' && (
          <div className="space-y-4">
          <span className="text-[10px] text-gray-500 uppercase block mb-2 border-b border-white/5 pb-1">Dimensiones y Filtros FX</span>
          {[
            { prop: 'width', label: 'Escalar (px)', min: 100, max: 2000 },
                                                                       { prop: 'brightness', label: 'Brillo (%)', min: 0, max: 200 },
                                                                       { prop: 'contrast', label: 'Contraste (%)', min: 0, max: 200 },
                                                                       { prop: 'saturate', label: 'Saturación (%)', min: 0, max: 300 },
                                                                       { prop: 'blur', label: 'Desenfoque (px)', min: 0, max: 20 },
                                                                       { prop: 'grayscale', label: 'Blanco y Negro (%)', min: 0, max: 100 },
                                                                       { prop: 'sepia', label: 'Sepia Vintage (%)', min: 0, max: 100 },
                                                                       { prop: 'hueRotate', label: 'Rotación de Color (deg)', min: 0, max: 360 }
          ].map(({prop, label, min, max}) => (
            <div key={prop}>
            <div className="flex justify-between">
            <span className="text-[10px] text-gray-400 uppercase">{label}</span>
            <span className="text-[10px] text-gray-500">{(elements.find(e => e.id === selectedId) as any)[prop]}</span>
            </div>
            <input type="range" min={min} max={max} value={(elements.find(e => e.id === selectedId) as any)[prop]} onChange={e => updateElement(selectedId, {[prop]: Number(e.target.value)})} className="w-full accent-emerald-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer mt-1" />
            </div>
          ))}
          </div>
        )}

        {/* CONTROLES DE ICONO */}
        {elements.find(e => e.id === selectedId)?.type === 'icon' && (
          <div>
          <span className="text-[10px] text-gray-500 uppercase block mb-1">Tamaño del Vector</span>
          <input type="range" min="20" max="400" value={elements.find(e => e.id === selectedId)?.fontSize} onChange={e => updateElement(selectedId, {fontSize: Number(e.target.value)})} className="w-full accent-emerald-500" />
          </div>
        )}

        <div className="pt-6 mt-4 border-t border-white/5">
        <button onClick={deleteSelected} className="w-full bg-red-500/10 text-red-400 py-3 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors border border-red-500/20">Eliminar Capa</button>
        </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-600 space-y-3">
        <span className="material-symbols-outlined text-4xl opacity-50">touch_app</span>
        <p className="text-sm">Selecciona una capa en el lienzo para editar sus propiedades avanzadas.</p>
        </div>
      )}

      <button onClick={handleExport} className="mt-auto w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 flex justify-center items-center gap-2">
      <span>Exportar HD Final</span>
      </button>
      </div>
      </>
    )}

    {/* ========================================= */}
    {/* MODO 2: EDITOR DE VIDEO (SLIDESHOW UI)  */}
    {/* ========================================= */}
    {mode === 'video' && (
      <div className="flex flex-col w-full bg-[#050505]">
      <div className="h-24 border-b border-white/5 p-6 flex items-center justify-between bg-[#0a0a0c]">
      <div>
      <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Secuenciador de Video FX</h2>
      <p className="text-xs text-gray-400 mt-1">Crea animaciones dinámicas subiendo tus diseños generados previamente (Max. 100 frames).</p>
      </div>
      <div className="flex gap-4">
      <label className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-all text-white">
      + Subir Carpeta Completa
      <input type="file" accept="image/*" multiple webkitdirectory="true" className="hidden" onChange={handleFolderUpload} />
      </label>
      <label className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl cursor-pointer text-sm font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
      + Archivos Sueltos
      <input type="file" accept="image/*" multiple className="hidden" onChange={handleFolderUpload} />
      </label>
      </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative radial-bg">
      <div className="aspect-[9/16] h-[55vh] bg-black ring-1 ring-white/10 rounded-2xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.8)]">
      {videoFrames.length > 0 ? (
        videoFrames.map((frame, idx) => (
          <img
          key={idx} src={frame} alt={`Frame ${idx}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${currentFrame === idx ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}
          style={{ transitionProperty: 'opacity, transform' }} // Efecto Ken Burns ligero
          />
        ))
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
        <span className="text-4xl mb-4 opacity-50">🎞️</span>
        <p className="text-sm">Sube tus diseños exportados para generar<br/>la previsualización del Reel final.</p>
        </div>
      )}
      </div>

      <div className="mt-10 flex gap-4">
      <button onClick={() => setIsPlaying(!isPlaying)} disabled={videoFrames.length === 0} className="bg-white hover:bg-gray-200 text-black px-10 py-3.5 rounded-xl font-bold text-lg disabled:opacity-50 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)]">
      {isPlaying ? '⏸ Pausar Secuencia' : '▶ Reproducir Master'}
      </button>
      <button onClick={() => { setVideoFrames([]); setIsPlaying(false); setCurrentFrame(0); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-8 py-3.5 rounded-xl font-bold transition-colors">
      Limpiar Proyecto
      </button>
      </div>
      </div>

      <div className="h-36 border-t border-white/5 bg-[#0a0a0c] p-5 flex gap-3 overflow-x-auto custom-scrollbar items-center">
      {videoFrames.length === 0 && <span className="text-xs text-gray-600 m-auto">La línea de tiempo está vacía.</span>}
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
