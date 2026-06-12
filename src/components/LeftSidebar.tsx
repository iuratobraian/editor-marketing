import React, { useRef, useState } from 'react';
import { useEditorStore, PREMIUM_BACKGROUNDS, PRESET_TEMPLATES } from '../stores/editorStore';
import type { CanvasFormat, ShapeType } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  Sliders, Paintbrush, Box, Sparkles,
  Search, RefreshCw, Upload, Library
} from 'lucide-react';

// Curated stock photos
const CURATED_STOCK_ASSETS = [
  { name: 'Neon City Night', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=300&q=80', tag: 'neon' },
  { name: 'Cyberpunk Street', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=300&q=80', tag: 'cyberpunk' },
  { name: 'Minimalist Workspace', url: 'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=300&q=80', tag: 'workspace' },
  { name: 'Abstract Lines', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=300&q=80', tag: 'abstract' },
  { name: 'Bitcoin Gold', url: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=300&q=80', tag: 'crypto' },
  { name: 'Financial Graph', url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=300&q=80', tag: 'finance' }
];

// Curated Sky replacement photos
const SKY_PRESETS = [
  { name: 'Galaxia Estelar', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=300&q=80' },
  { name: 'Atardecer Dorado', url: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?auto=format&fit=crop&w=300&q=80' },
  { name: 'Aurora Boreal', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=300&q=80' },
  { name: 'Cielo de Tormenta', url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=300&q=80' }
];

export default function LeftSidebar() {
  const {
    format,
    setFormat,
    canvasBg,
    setCanvasBg,
    savedTemplates,
    loadTemplate,
    addElement,
    addShapeElement,
    addChartElement,
    brandingKit,
    updateBrandingColors,
    apiKey,
    setApiKey,
    isGenerating,
    setIsGenerating
  } = useEditorStore();

  const [activeTab, setActiveTab] = useState<'canvas' | 'lightroom' | 'shapes' | 'stock' | 'ai'>('canvas');
  const [skyReplacing, setSkyReplacing] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(25);
  const [brushIntensity, setBrushIntensity] = useState(50);
  const [selectedBrush, setSelectedBrush] = useState<'none' | 'dodge' | 'burn' | 'healing' | 'clone'>('none');
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          addElement('image', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...brandingKit.colors];
    newColors[index] = newColor;
    updateBrandingColors(newColors);
  };

  const handleGenerateText = async () => {
    if (!apiKey.trim()) {
      alert('Ingresa tu API Key de Gemini de Google.');
      return;
    }
    setIsGenerating(true);
    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = "Actúa como experto en marketing para fondos de inversión y trading. Crea una frase persuasiva (máximo 6 palabras). Sin comillas.";
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim().replace(/["']/g, '');
      addElement('text', text);
    } catch (error: any) {
      alert(`Error IA: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const applySkyReplacement = (skyUrl: string) => {
    setSkyReplacing(skyUrl);
    setTimeout(() => {
      // Mock action that adds a replacement sky background behind elements
      setCanvasBg(skyUrl);
      setSkyReplacing(null);
      alert('IA Sky Replacement: Fondo de cielo reemplazado con éxito.');
    }, 1200);
  };

  const filteredAssets = CURATED_STOCK_ASSETS.filter(asset => 
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-[320px] bg-[#11151E] border-r border-[#232A36] flex flex-col h-full shrink-0 relative z-40 select-none">
      
      {/* 1. LIGHTROOM / PHOTOSHOP STYLE VERTICAL ICON TABS */}
      <div className="flex border-b border-[#232A36] bg-[#090B10]/60 p-1 gap-1">
        {(['canvas', 'lightroom', 'shapes', 'stock', 'ai'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex flex-col items-center gap-1 cursor-pointer ${
              activeTab === tab 
                ? 'bg-[#7B5CFF]/20 text-[#00C8FF] border border-[#7B5CFF]/30' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab === 'canvas' && <Sliders size={12} />}
            {tab === 'lightroom' && <Paintbrush size={12} />}
            {tab === 'shapes' && <Box size={12} />}
            {tab === 'stock' && <Library size={12} />}
            {tab === 'ai' && <Sparkles size={12} />}
            <span>{tab === 'canvas' ? 'Lienzo' : tab === 'lightroom' ? 'Pincel' : tab === 'shapes' ? 'Formas' : tab === 'stock' ? 'Stock' : 'IA Tool'}</span>
          </button>
        ))}
      </div>

      {/* 2. TAB CONTENT SCROLL AREA */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        
        {/* CANVAS & BRANDING TAB */}
        {activeTab === 'canvas' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <span className="text-[10px] text-gray-500 uppercase font-black">Relación de Aspecto</span>
              <select 
                value={format} 
                onChange={(e) => setFormat(e.target.value as CanvasFormat)} 
                className="w-full bg-[#090B10] p-2.5 rounded-lg text-xs border border-[#232A36] outline-none text-white focus:border-[#7B5CFF] transition-colors cursor-pointer"
              >
                <option value="1:1">Post Feed (1:1)</option>
                <option value="9:16">Reel / Story (9:16)</option>
                <option value="16:9">YouTube Cover (16:9)</option>
                <option value="3:1">Banner Social (3:1)</option>
              </select>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-black">Fondos Base</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  onClick={() => setCanvasBg('transparent')} 
                  className={`h-10 rounded-lg border flex items-center justify-center text-[10px] hover:bg-white/5 bg-[#090B10] transition-all cursor-pointer ${
                    canvasBg === 'transparent' ? 'border-[#7B5CFF] text-white' : 'border-[#232A36] text-gray-500'
                  }`}
                >
                  Transparente
                </button>
                {PREMIUM_BACKGROUNDS.slice(0, 5).map((bg, i) => (
                  <button 
                    key={i} 
                    onClick={() => setCanvasBg(bg.css)} 
                    className={`h-10 rounded-lg border hover:ring-2 hover:ring-[#7B5CFF] transition-all cursor-pointer ${
                      canvasBg === bg.css ? 'border-[#7B5CFF] ring-1 ring-[#7B5CFF]' : 'border-[#232A36]'
                    }`} 
                    style={{ background: bg.css }} 
                    title={bg.name} 
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-black">Paleta de Marca</span>
              <div className="flex gap-2 justify-between bg-[#090B10]/40 p-2.5 rounded-xl border border-[#232A36]">
                {brandingKit.colors.map((color, i) => (
                  <div key={i} className="relative w-8 h-8 rounded-full border border-white/10 overflow-hidden cursor-pointer shadow-md" style={{ background: color }}>
                    <input 
                      type="color" 
                      value={color} 
                      onChange={(e) => handleColorChange(i, e.target.value)} 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full scale-150" 
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-black">Proyectos Guardados</span>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                {[...PRESET_TEMPLATES, ...savedTemplates].map((tpl, i) => (
                  <button 
                    key={i} 
                    onClick={() => loadTemplate(tpl)} 
                    className={`w-full bg-[#090B10]/80 hover:bg-[#7B5CFF]/10 border p-2.5 rounded-lg text-left transition-all flex items-center justify-between cursor-pointer ${
                      tpl.background === canvasBg && tpl.format === format 
                        ? 'border-[#7B5CFF] bg-[#7B5CFF]/5' 
                        : 'border-[#232A36]'
                    }`}
                  >
                    <div>
                      <span className="text-[8px] text-[#00C8FF] font-bold mb-0.5 block">{tpl.format}</span>
                      <span className="text-xs font-semibold text-gray-300 truncate block max-w-[200px]">{tpl.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LIGHTROOM PRESETS & BRUSHES TAB */}
        {activeTab === 'lightroom' && (
          <div className="space-y-4 animate-fade-in">
            <span className="text-[10px] text-gray-500 uppercase font-black block">Herramientas de Pincel</span>
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'dodge', label: 'Dodge (Aclarar)', icon: '☀️' },
                { type: 'burn', label: 'Burn (Oscurecer)', icon: '🌙' },
                { type: 'healing', label: 'Corrector', icon: '🩹' },
                { type: 'clone', label: 'Tampón Clonar', icon: '🧬' }
              ].map(b => (
                <button
                  key={b.type}
                  onClick={() => setSelectedBrush(b.type as any)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    selectedBrush === b.type 
                      ? 'bg-[#7B5CFF]/20 border-[#7B5CFF] text-white' 
                      : 'bg-[#090B10] border-[#232A36] text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="text-xl block mb-1">{b.icon}</span>
                  <span className="text-[10px] font-bold block">{b.label}</span>
                </button>
              ))}
            </div>

            {selectedBrush !== 'none' && (
              <div className="p-3 bg-[#090B10]/60 rounded-xl border border-[#232A36] space-y-3">
                <span className="text-[9px] text-[#00C8FF] uppercase font-bold block">Ajustes del Pincel: {selectedBrush.toUpperCase()}</span>
                <div>
                  <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                    <span>Tamaño:</span>
                    <span>{brushSize}px</span>
                  </div>
                  <input 
                    type="range"
                    min="5"
                    max="100"
                    value={brushSize}
                    onChange={e => setBrushSize(Number(e.target.value))}
                    className="w-full accent-[#7B5CFF] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                    <span>Intensidad:</span>
                    <span>{brushIntensity}%</span>
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="100"
                    value={brushIntensity}
                    onChange={e => setBrushIntensity(Number(e.target.value))}
                    className="w-full accent-[#7B5CFF] cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-black block">Sky Replacement IA (Fondo Inteligente)</span>
              <div className="grid grid-cols-2 gap-2">
                {SKY_PRESETS.map((sky, i) => (
                  <button
                    key={i}
                    onClick={() => applySkyReplacement(sky.url)}
                    className="relative rounded-xl border border-[#232A36] overflow-hidden aspect-video group/sky cursor-pointer"
                  >
                    <img src={sky.url} alt={sky.name} className="w-full h-full object-cover group-hover/sky:scale-110 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
                      {skyReplacing === sky.url ? (
                        <span className="text-[9px] font-bold text-emerald-400 animate-pulse">Reemplazando...</span>
                      ) : (
                        <span className="text-[9px] font-bold text-white text-center leading-tight">{sky.name}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SHAPES & VECTOR ELEMENTS TAB */}
        {activeTab === 'shapes' && (
          <div className="space-y-4 animate-fade-in">
            <span className="text-[10px] text-gray-500 uppercase font-black block">Formas Vectoriales</span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { name: 'Cuadrado', shape: 'rectangle', icon: '⬛' },
                { name: 'Círculo', shape: 'circle', icon: '⚫' },
                { name: 'Flecha', shape: 'arrow', icon: '➔' },
                { name: 'Línea', shape: 'line', icon: '➖' }
              ].map(item => (
                <button 
                  key={item.shape} 
                  onClick={() => addShapeElement(item.shape as ShapeType)} 
                  className="bg-[#090B10] hover:bg-[#7B5CFF]/10 rounded-xl p-3 flex flex-col items-center justify-center transition-all border border-[#232A36] cursor-pointer"
                  title={item.name}
                >
                  <span className="text-xl">{item.icon}</span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-black block">Gráficos Estadísticos</span>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => addChartElement('candlestick')} 
                  className="bg-[#090B10] hover:bg-[#7B5CFF]/15 border border-[#232A36] rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="text-2xl">📊</span>
                  <span className="text-[10px] font-bold text-gray-300">Velas Japonesas</span>
                </button>
                <button 
                  onClick={() => addChartElement('bar')} 
                  className="bg-[#090B10] hover:bg-[#7B5CFF]/15 border border-[#232A36] rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="text-2xl">📈</span>
                  <span className="text-[10px] font-bold text-gray-300">Barras Volúmen</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STOCK IMAGES TAB */}
        {activeTab === 'stock' && (
          <div className="space-y-3 animate-fade-in">
            <span className="text-[10px] text-gray-500 uppercase font-black block">Imágenes Stock Directas</span>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar en Pixabay stock..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#090B10] pl-8 pr-2.5 py-2 text-xs rounded-lg outline-none border border-[#232A36] text-white focus:border-[#7B5CFF] transition-colors" 
              />
              <Search size={12} className="absolute left-2.5 top-3 text-gray-500" />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {filteredAssets.map((asset, i) => (
                <div 
                  key={i} 
                  onClick={() => addElement('image', asset.url)} 
                  className="aspect-square bg-gray-950 rounded-xl overflow-hidden border border-[#232A36] hover:border-[#7B5CFF] transition-all cursor-pointer relative group/asset"
                >
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/asset:opacity-100 transition-opacity flex items-center justify-center text-[9px] font-black uppercase text-[#00C8FF]">
                    Insertar
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI COPYWRITER & IA ENGINE TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3.5 bg-gradient-to-br from-[#7B5CFF]/15 to-[#090B10] rounded-xl border border-[#7B5CFF]/30 space-y-2">
              <span className="text-[10px] text-[#00C8FF] uppercase font-bold flex items-center gap-1.5">
                <Sparkles size={12} className="animate-pulse" />
                <span>IA Copywriter (Gemini API)</span>
              </span>
              <input 
                type="password" 
                placeholder="Ingresa API Key..." 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)} 
                className="w-full bg-[#090B10] p-2 text-xs rounded-lg border border-[#232A36] outline-none text-white focus:border-[#7B5CFF] transition-all" 
              />
              <button 
                onClick={handleGenerateText} 
                disabled={isGenerating} 
                className="w-full bg-[#7B5CFF] hover:bg-[#7B5CFF]/90 text-white text-xs font-bold py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Generando Hook...</span>
                  </>
                ) : (
                  <>
                    <span>✍️</span>
                    <span>Generar Título Persuasivo</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-black block">Herramientas IA Integradas</span>
              <div className="space-y-1.5">
                {[
                  { name: 'Eliminar Fondo Sujetos', desc: 'Aísla al sujeto principal con IA' },
                  { name: 'Generador Imagen IA (Stable Diffusion)', desc: 'Convierte descripciones en imágenes' },
                  { name: 'Upscaling Inteligente 8K', desc: 'Duplica resolución de fotos con nitidez' },
                  { name: 'Restauración Facial IA', desc: 'Repara retratos de baja calidad' }
                ].map((iaTool, idx) => (
                  <button
                    key={idx}
                    onClick={() => alert(`Acción IA iniciada: ${iaTool.name}. Procesando en segundo plano...`)}
                    className="w-full text-left p-2.5 bg-[#090B10] hover:bg-[#7B5CFF]/10 rounded-xl border border-[#232A36] transition-all flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="text-[10px] font-bold text-gray-200">{iaTool.name}</span>
                    <span className="text-[8px] text-gray-500">{iaTool.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 3. SHUTTLE BOTTOM TRIGGERS */}
      <div className="p-4 border-t border-[#232A36] bg-[#090B10]/40 flex gap-2 shrink-0">
        <button 
          onClick={() => addElement('text')} 
          className="flex-1 bg-[#7B5CFF]/15 hover:bg-[#7B5CFF]/25 text-[#7B5CFF] py-2.5 rounded-xl text-xs font-bold border border-[#7B5CFF]/20 transition-all cursor-pointer flex justify-center items-center gap-1"
        >
          <span>✍️</span>
          <span>Añadir Texto</span>
        </button>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-xs font-bold border border-white/5 transition-all cursor-pointer flex justify-center items-center gap-1"
        >
          <Upload size={12} />
          <span>Subir Media</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          accept="image/*" 
          className="hidden" 
          onChange={handleImageUpload} 
        />
      </div>

    </div>
  );
}
