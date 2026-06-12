import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- TIPOS DE DATOS ---
type ElementType = 'text' | 'image' | 'icon';
type TextBgStyle = 'none' | 'solid' | 'glass' | 'gradient';
type CanvasFormat = '1:1' | '9:16' | '16:9' | '3:1';
type AppMode = 'image' | 'video';

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
  zIndex: number;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  blur?: number;
}

interface Template {
  name: string;
  format: CanvasFormat;
  elements: EditorElement[];
}

// --- DICCIONARIO DE MEDIDAS EXACTAS ---
const CANVAS_DIMENSIONS: Record<CanvasFormat, { w: number, h: number, css: string }> = {
  '1:1': { w: 1080, h: 1080, css: 'aspect-square max-w-[500px] w-full' },
  '9:16': { w: 1080, h: 1920, css: 'aspect-[9/16] max-h-[800px] h-full' },
  '16:9': { w: 1920, h: 1080, css: 'aspect-video max-w-[800px] w-full' },
  '3:1': { w: 1500, h: 500, css: 'aspect-[3/1] max-w-[900px] w-full' },
};

// --- LIBRERÍA DE ICONOS (Vectores SVG / Texto) ---
const ICONS = [
  { name: 'Instagram', val: '📸' },
  { name: 'Facebook', val: '📘' },
  { name: 'Apple', val: '🍎' },
  { name: 'Bitcoin', val: '₿' },
  { name: 'Oro', val: '🥇' },
  { name: 'USD', val: '💵' },
  { name: 'Trading', val: '📈' },
  { name: 'Alerta', val: '🚨' }
];

export default function App() {
  // --- ESTADO GLOBAL ---
  const [mode, setMode] = useState<AppMode>('image');
  
  // Estado de Imagen
  const [elements, setElements] = useState<EditorElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [format, setFormat] = useState<CanvasFormat>('9:16');
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  // Estado de Video
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);

  // IA
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // --- MOTOR DE PLANTILLAS (TEMPLATE ENGINE) ---
  // *NOTA PARA AGENTES: Agreguen las 80 plantillas en este array siguiendo esta estructura.
  const PRESET_TEMPLATES: Template[] = [
    {
      name: 'Historia Alerta Cripto',
      format: '9:16',
      elements: [
        { id: '1', type: 'text', content: 'ALERTA DE MERCADO', x: 50, y: 150, fontSize: 60, fontFamily: "'Bebas Neue', sans-serif", color: '#ff4444', bgStyle: 'glass', zIndex: 2 },
        { id: '2', type: 'icon', content: '₿', x: 200, y: 300, fontSize: 120, zIndex: 3 },
        { id: '3', type: 'text', content: 'Ruptura Inminente', x: 50, y: 500, fontSize: 40, fontFamily: "'Montserrat', sans-serif", color: '#ffffff', bgStyle: 'none', zIndex: 2 }
      ]
    },
    {
      name: 'Feed Rendimiento Semanal',
      format: '1:1',
      elements: [
        { id: '1', type: 'text', content: 'RESULTADOS VIP', x: 100, y: 80, fontSize: 50, fontFamily: "'Montserrat', sans-serif", color: '#10b981', bgStyle: 'none', zIndex: 2 },
        { id: '2', type: 'icon', content: '📈', x: 200, y: 200, fontSize: 150, zIndex: 3 },
        { id: '3', type: 'text', content: '+450 PIPS ESTA SEMANA', x: 80, y: 400, fontSize: 35, fontFamily: "'Bebas Neue', sans-serif", color: '#ffffff', bgStyle: 'glass', zIndex: 2 }
      ]
    },
    {
      name: 'Banner Corporativo Institucional',
      format: '3:1',
      elements: [
        { id: '1', type: 'text', content: 'TRADESHARE MASTERMIND', x: 50, y: 50, fontSize: 50, fontFamily: "'Playfair Display', serif", color: '#ffffff', bgStyle: 'none', zIndex: 2 },
        { id: '2', type: 'text', content: 'La evolución del trading algorítmico', x: 50, y: 120, fontSize: 24, fontFamily: "'Montserrat', sans-serif", color: '#10b981', bgStyle: 'none', zIndex: 2 }
      ]
    }
  ];

  const loadTemplate = (template: Template) => {
    setFormat(template.format);
    // Clonación profunda básica para no mutar la plantilla original
    setElements(JSON.parse(JSON.stringify(template.elements)).map((el: EditorElement) => ({...el, id: Date.now() + Math.random().toString()})));
    setSelectedId(null);
  };

  const saveCurrentDesign = () => {
    if (elements.length === 0) return alert("El lienzo está vacío.");
    const newTemplate: Template = {
      name: `Diseño Guardado ${savedTemplates.length + 1}`,
      format: format,
      elements: elements
    };
    setSavedTemplates([...savedTemplates, newTemplate]);
    alert("Diseño guardado en tu biblioteca local.");
  };

  // --- MOTOR DE IA ---
  const handleGenerateText = async () => {
    if (!apiKey.trim()) return alert('Ingresa tu API Key de Gemini.');
    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = "Experto en marketing para comunidad de trading. Genera frase de impacto (max 5 palabras). No comillas.";
      const result = await model.generateContent(prompt);
      handleAddText(result.response.text().trim().replace(/["']/g, ''));
    } catch (error: any) { alert(`Error IA: ${error.message}`); } 
    finally { setIsGenerating(false); }
  };

  // --- CONTROL DE ELEMENTOS ---
  const getNextZIndex = () => elements.length > 0 ? Math.max(...elements.map(e => e.zIndex)) + 1 : 1;

  const handleAddText = (text = 'NUEVO TEXTO') => {
    setElements([...elements, { id: Date.now().toString(), type: 'text', content: text, x: 50, y: 50, fontSize: 40, fontFamily: "'Montserrat', sans-serif", color: '#ffffff', bgStyle: 'none', zIndex: getNextZIndex() }]);
  };

  const handleAddIcon = (icon: string) => {
    setElements([...elements, { id: Date.now().toString(), type: 'icon', content: icon, x: 100, y: 100, fontSize: 80, zIndex: getNextZIndex() }]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setElements([...elements, { id: Date.now().toString(), type: 'image', content: event.target?.result as string, x: 0, y: 0, width: 400, brightness: 100, contrast: 100, saturate: 100, blur: 0, zIndex: elements.length === 0 ? 0 : getNextZIndex() }]);
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

  // --- FÍSICAS DRAG & DROP ---
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
      updateElement(id, { x: e.clientX - rect.left - parseFloat(e.dataTransfer.getData('offsetX') || '0'), y: e.clientY - rect.top - parseFloat(e.dataTransfer.getData('offsetY') || '0') });
    }
  };

  // --- RENDERIZADO EXPORTACIÓN IMAGEN ---
  const handleExport = async () => {
    if (!editorRef.current) return;
    const currentSelected = selectedId;
    setSelectedId(null);
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 50)); 
    try {
      const canvas = await html2canvas(editorRef.current, { useCORS: true, backgroundColor: '#111', scale: 2 });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png', 1.0);
      link.download = `TradeShare-${format.replace(':', 'x')}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { alert("Error al exportar."); } 
    finally { setSelectedId(currentSelected); }
  };

  // --- LÓGICA DE VIDEO UI ---
  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/')).slice(0, 100); // Límite 100 imágenes
    
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
      }, 1500); // 1.5 segundos por imagen (transición)
    }
    return () => clearInterval(interval);
  }, [isPlaying, videoFrames.length]);


  // --- ESTILOS VISUALES ---
  const getTextStyles = (el: EditorElement): React.CSSProperties => {
    let baseStyles: React.CSSProperties = { whiteSpace: 'pre-wrap', lineHeight: '1.1', fontFamily: el.fontFamily };
    if (el.bgStyle === 'solid') baseStyles = { ...baseStyles, backgroundColor: el.bgColor, padding: '16px 24px', borderRadius: '8px' };
    else if (el.bgStyle === 'glass') baseStyles = { ...baseStyles, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', padding: '16px 24px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px' };
    else if (el.bgStyle === 'gradient') baseStyles = { ...baseStyles, background: 'linear-gradient(135deg, #10b981 0%, #0f172a 100%)', padding: '16px 24px', borderRadius: '8px' };
    else baseStyles = { ...baseStyles, textShadow: '0 8px 16px rgba(0,0,0,0.9)' };
    return baseStyles;
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden">
      
      {/* HEADER NAVEGACIÓN */}
      <header className="h-16 border-b border-white/10 flex items-center px-6 justify-between bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-black tracking-tighter bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">Marketing Pro</span>
          <div className="flex bg-white/5 rounded-lg p-1 ring-1 ring-white/10">
            <button onClick={() => setMode('image')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'image' ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}>Imágenes</button>
            <button onClick={() => setMode('video')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'video' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}>Creador de Video</button>
          </div>
        </div>
      </header>

      {/* ÁREA PRINCIPAL */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ========================================= */}
        {/* MODO EDITOR DE IMAGEN                     */}
        {/* ========================================= */}
        {mode === 'image' && (
          <>
            {/* SIDEBAR IZQUIERDO: HERRAMIENTAS Y PLANTILLAS */}
            <div className="w-[320px] bg-[#0f0f11] border-r border-white/5 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-6 shrink-0">
              
              {/* Sección Plantillas */}
              <div className="space-y-3">
                <h3 className="text-xs text-gray-500 uppercase font-bold tracking-wider">Plantillas Pro (Auto-Creación)</h3>
                <div className="grid grid-cols-1 gap-2">
                  {[...PRESET_TEMPLATES, ...savedTemplates].map((tpl, i) => (
                    <button key={i} onClick={() => loadTemplate(tpl)} className="bg-black/40 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 p-3 rounded-xl text-left transition-all group">
                      <span className="text-[10px] text-emerald-400 font-bold mb-1 block">{tpl.format}</span>
                      <span className="text-sm font-medium text-gray-300 group-hover:text-white">{tpl.name}</span>
                    </button>
                  ))}
                </div>
                <button onClick={saveCurrentDesign} className="w-full text-xs py-2 border border-white/10 rounded-lg text-gray-400 hover:bg-white/5">+ Guardar mi diseño actual</button>
              </div>

              {/* Sección Formato Canvas */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <h3 className="text-xs text-gray-500 uppercase font-bold tracking-wider">Formato</h3>
                <select value={format} onChange={(e) => setFormat(e.target.value as CanvasFormat)} className="w-full bg-black p-2.5 rounded-lg text-sm ring-1 ring-white/10 outline-none text-white">
                  <option value="1:1">Post / Carrusel (1:1)</option>
                  <option value="9:16">Historia / Reel (9:16)</option>
                  <option value="16:9">Portada Web (16:9)</option>
                  <option value="3:1">Banner Corporativo (3:1)</option>
                </select>
              </div>

              {/* Agregar Elementos Básicos */}
              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                <button onClick={() => handleAddText()} className="bg-white/5 hover:bg-white/10 py-3 rounded-xl text-sm font-medium">Texto</button>
                <label className="bg-white/5 hover:bg-white/10 py-3 rounded-xl text-sm font-medium cursor-pointer text-center">
                  Imagen <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              {/* Iconos Corporativos */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                 <h3 className="text-xs text-gray-500 uppercase font-bold tracking-wider">Iconografía</h3>
                 <div className="flex flex-wrap gap-2">
                   {ICONS.map(icon => (
                     <button key={icon.name} onClick={() => handleAddIcon(icon.val)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-lg text-xl flex items-center justify-center transition-transform hover:scale-110" title={icon.name}>
                       {icon.val}
                     </button>
                   ))}
                 </div>
              </div>

              {/* Integración IA */}
              <div className="bg-emerald-900/20 p-4 rounded-xl ring-1 ring-emerald-500/20 mt-auto">
                <h3 className="text-xs text-emerald-400 font-bold uppercase mb-2 flex items-center gap-1">✨ Generador AI</h3>
                <input type="password" placeholder="Tu API Key de Gemini..." value={apiKey} onChange={e => setApiKey(e.target.value)} className="w-full bg-black/50 p-2 text-xs rounded-lg mb-2 outline-none border border-white/10" />
                <button onClick={handleGenerateText} disabled={isGenerating} className="w-full bg-emerald-500 text-black text-xs font-bold py-2 rounded-lg">{isGenerating ? 'Generando...' : 'Crear Copy'}</button>
              </div>
            </div>

            {/* CANVAS (LIENZO) */}
            <div className="flex-1 bg-[#111] overflow-auto flex items-center justify-center p-8 radial-bg relative">
              <div 
                ref={editorRef} onDragOver={e => e.preventDefault()} onDrop={handleDrop}
                className={`relative bg-[#050505] overflow-hidden shadow-2xl ring-1 ring-white/10 shrink-0 ${CANVAS_DIMENSIONS[format].css}`}
              >
                {elements.sort((a, b) => a.zIndex - b.zIndex).map((el) => (
                  <div
                    key={el.id} draggable onDragStart={e => handleDragStart(e, el.id)} onClick={() => setSelectedId(el.id)}
                    className={`absolute cursor-move transition-shadow ${selectedId === el.id ? 'ring-2 ring-emerald-500 z-[999]' : 'hover:ring-1 hover:ring-white/20'}`}
                    style={{ left: `${el.x}px`, top: `${el.y}px`, zIndex: selectedId === el.id ? 999 : el.zIndex, width: el.type === 'image' ? `${el.width}px` : 'auto' }}
                  >
                    {el.type === 'text' && <div style={{...getTextStyles(el), fontSize: `${el.fontSize}px`, color: el.color}}>{el.content}</div>}
                    {el.type === 'image' && <img src={el.content} alt="" className="w-full block pointer-events-none" style={{ filter: `brightness(${el.brightness}%) contrast(${el.contrast}%) saturate(${el.saturate}%) blur(${el.blur}px)` }} />}
                    {el.type === 'icon' && <div style={{ fontSize: `${el.fontSize}px`, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>{el.content}</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* SIDEBAR DERECHO: EDICIÓN ACTIVA */}
            <div className="w-[280px] bg-[#0f0f11] border-l border-white/5 p-5 overflow-y-auto custom-scrollbar shrink-0 flex flex-col">
               {selectedId ? (
                 <div className="space-y-4">
                    <h3 className="text-xs text-gray-500 uppercase font-bold tracking-wider">Propiedades</h3>
                    
                    {elements.find(e => e.id === selectedId)?.type === 'text' && (
                      <div className="space-y-3">
                        <textarea value={elements.find(e => e.id === selectedId)?.content} onChange={e => updateElement(selectedId, {content: e.target.value})} className="w-full bg-black p-2 rounded text-sm ring-1 ring-white/10 text-white outline-none" rows={3} />
                        <select value={elements.find(e => e.id === selectedId)?.fontFamily} onChange={e => updateElement(selectedId, {fontFamily: e.target.value})} className="w-full bg-black p-2 rounded text-sm outline-none">
                          <option value="'Montserrat', sans-serif">Montserrat</option>
                          <option value="'Bebas Neue', sans-serif">Bebas Neue</option>
                          <option value="'Playfair Display', serif">Playfair</option>
                        </select>
                        <div className="flex gap-2">
                          <input type="number" value={elements.find(e => e.id === selectedId)?.fontSize} onChange={e => updateElement(selectedId, {fontSize: Number(e.target.value)})} className="w-16 bg-black p-1 text-center rounded text-sm" />
                          <input type="color" value={elements.find(e => e.id === selectedId)?.color} onChange={e => updateElement(selectedId, {color: e.target.value})} className="w-full h-8 rounded bg-black" />
                        </div>
                        <select value={elements.find(e => e.id === selectedId)?.bgStyle} onChange={e => updateElement(selectedId, {bgStyle: e.target.value as TextBgStyle})} className="w-full bg-black p-2 rounded text-sm outline-none">
                          <option value="none">Sin Fondo (Sombra)</option>
                          <option value="glass">Cristal Oscuro</option>
                          <option value="solid">Sólido</option>
                          <option value="gradient">Gradiente Pro</option>
                        </select>
                      </div>
                    )}

                    {elements.find(e => e.id === selectedId)?.type === 'image' && (
                      <div className="space-y-4">
                        {['width', 'brightness', 'contrast', 'blur'].map(prop => (
                          <div key={prop}>
                            <span className="text-[10px] text-gray-400 uppercase">{prop}</span>
                            <input type="range" min="0" max={prop === 'width' ? 2000 : prop==='blur'? 20 : 200} value={(elements.find(e => e.id === selectedId) as any)[prop]} onChange={e => updateElement(selectedId, {[prop]: Number(e.target.value)})} className="w-full accent-emerald-500" />
                          </div>
                        ))}
                      </div>
                    )}

                    {elements.find(e => e.id === selectedId)?.type === 'icon' && (
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase">Tamaño</span>
                        <input type="range" min="20" max="400" value={elements.find(e => e.id === selectedId)?.fontSize} onChange={e => updateElement(selectedId, {fontSize: Number(e.target.value)})} className="w-full accent-emerald-500" />
                      </div>
                    )}

                    <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
                      <button onClick={() => updateElement(selectedId, {zIndex: getNextZIndex()})} className="bg-white/10 py-2 rounded text-sm hover:bg-white/20">Subir Capa</button>
                      <button onClick={deleteSelected} className="bg-red-500/20 text-red-400 py-2 rounded text-sm hover:bg-red-500/40">Eliminar</button>
                    </div>
                 </div>
               ) : (
                 <p className="text-gray-600 text-sm text-center mt-10">Selecciona un elemento para editar sus propiedades.</p>
               )}

               <button onClick={handleExport} className="mt-auto w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-all">
                 Descargar Imagen
               </button>
            </div>
          </>
        )}

        {/* ========================================= */}
        {/* MODO EDITOR DE VIDEO (PREVIEW & COMPOSICIÓN) */}
        {/* ========================================= */}
        {mode === 'video' && (
          <div className="flex flex-col w-full bg-[#0a0a0c]">
            {/* Panel de Control Video */}
            <div className="h-24 border-b border-white/5 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Compositor de Reels/Video</h2>
                <p className="text-xs text-gray-400">Genera una secuencia animada subiendo hasta 100 imágenes.</p>
              </div>
              <div className="flex gap-4">
                <label className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all">
                  Subir Carpeta de Imágenes
                  {/* El atributo webkitdirectory permite seleccionar carpetas enteras */}
                  <input type="file" accept="image/*" multiple webkitdirectory="true" className="hidden" onChange={handleFolderUpload} />
                </label>
                <label className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2 rounded-lg cursor-pointer text-sm font-bold transition-all">
                  Subir Archivos Sueltos
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleFolderUpload} />
                </label>
              </div>
            </div>

            {/* Pantalla de Previsualización */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
              <div className="aspect-[9/16] h-[60vh] bg-black ring-1 ring-white/10 rounded-xl overflow-hidden relative shadow-2xl">
                {videoFrames.length > 0 ? (
                  videoFrames.map((frame, idx) => (
                    <img 
                      key={idx} 
                      src={frame} 
                      alt={`Frame ${idx}`} 
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${currentFrame === idx ? 'opacity-100' : 'opacity-0'}`} 
                    />
                  ))
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 p-8 text-center text-sm">
                    Sube imágenes para previsualizar la secuencia de video.
                  </div>
                )}
              </div>

              {/* Controles de Reproducción */}
              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  disabled={videoFrames.length === 0}
                  className="bg-white text-black px-8 py-3 rounded-full font-bold text-lg disabled:opacity-50"
                >
                  {isPlaying ? '⏸ Pausar Preview' : '▶ Reproducir Video'}
                </button>
                <button 
                  onClick={() => { setVideoFrames([]); setIsPlaying(false); setCurrentFrame(0); }}
                  className="bg-red-500/20 text-red-400 px-6 py-3 rounded-full font-bold"
                >
                  Limpiar Línea de Tiempo
                </button>
              </div>
            </div>

            {/* Línea de Tiempo / Thumbnails */}
            <div className="h-32 border-t border-white/5 bg-[#050505] p-4 flex gap-2 overflow-x-auto custom-scrollbar items-center">
              {videoFrames.map((frame, idx) => (
                <div key={idx} onClick={() => setCurrentFrame(idx)} className={`h-full aspect-[9/16] bg-gray-900 rounded shrink-0 cursor-pointer overflow-hidden ring-2 transition-all ${currentFrame === idx ? 'ring-emerald-500 scale-105' : 'ring-transparent opacity-50 hover:opacity-100'}`}>
                   <img src={frame} alt="thumb" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}