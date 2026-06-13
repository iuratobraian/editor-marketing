import React, { useRef, useState, useEffect } from 'react';
import { generateProxy } from '../lib/proxyHelper';
import { useEditorStore, CANVAS_DIMENSIONS } from '../stores/editorStore';
import { EFFECT_CATEGORIES, getEffectsByCategory } from '../lib/videoEffects';
import type { EffectCategory } from '../lib/videoEffects';
import { 
  Trash2, Music, 
  Upload, RefreshCw, Film, Plus, Search, Save
} from 'lucide-react';

interface VideoLeftSidebarProps {
  leftSidebarTab: 'presets' | 'search-photos' | 'search-icons' | 'text-effects' | 'transitions' | 'effects' | 'youtube-downloads';
  setLeftSidebarTab: (tab: 'presets' | 'search-photos' | 'search-icons' | 'text-effects' | 'transitions' | 'effects' | 'youtube-downloads') => void;
  photoSearchQuery: string;
  setPhotoSearchQuery: (query: string) => void;
  photoSearchResults: any[];
  isSearchingPhotos: boolean;
  handleSearchPhotos: () => void;
  iconSearchQuery: string;
  setIconSearchQuery: (query: string) => void;
  iconSearchResults: string[];
  isSearchingIcons: boolean;
  handleSearchIcons: () => void;
  handleAddIcon: (iconFullName: string) => void;
  customTransitions: { name: string; url: string }[];
  setCustomTransitions: React.Dispatch<React.SetStateAction<{ name: string; url: string }[]>>;
  handleImportTransitionsFolder: () => void;
  activeEffectCategory: EffectCategory;
  setActiveEffectCategory: (cat: EffectCategory) => void;
  addMode: 'sequence' | 'overlay';
  setAddMode: (mode: 'sequence' | 'overlay') => void;
  newTemplateName: string;
  setNewTemplateName: (name: string) => void;
  handleMediaUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const VideoLeftSidebar: React.FC<VideoLeftSidebarProps> = ({
  leftSidebarTab,
  setLeftSidebarTab,
  photoSearchQuery,
  setPhotoSearchQuery,
  photoSearchResults,
  isSearchingPhotos,
  handleSearchPhotos,
  iconSearchQuery,
  setIconSearchQuery,
  iconSearchResults,
  isSearchingIcons,
  handleSearchIcons,
  handleAddIcon,
  customTransitions,
  setCustomTransitions,
  handleImportTransitionsFolder,
  activeEffectCategory,
  setActiveEffectCategory,
  addMode,
  setAddMode,
  newTemplateName,
  setNewTemplateName,
  handleMediaUpload,
  handleAudioUpload,
}) => {
  const {
    format,
    videoClips,
    selectedClipId,
    savedVideoTemplates,
    setSelectedClipId,
    addVideoClip,
    updateClip,
    saveVideoTemplate,
    loadVideoTemplate,
    deleteVideoTemplate,
    playbackTime,
    addAudioTrack,
  } = useEditorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const selectedClip = videoClips.find(c => c.id === selectedClipId);

  // YouTube Downloader states and logic
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeFormat, setYoutubeFormat] = useState<'video' | 'audio'>('video');
  const [isDownloadingYoutube, setIsDownloadingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');

  // Downloads archive state
  const [downloadsList, setDownloadsList] = useState<{ filename: string; name: string; size: number; type: 'video' | 'audio'; url: string }[]>([]);
  const [isLoadingDownloads, setIsLoadingDownloads] = useState(false);
  const [downloadsError, setDownloadsError] = useState('');

  const fetchDownloads = async () => {
    setIsLoadingDownloads(true);
    setDownloadsError('');
    try {
      const response = await fetch('http://localhost:3001/downloads');
      if (!response.ok) throw new Error('Servidor de descargas no disponible.');
      const data = await response.json();
      setDownloadsList(data);
    } catch (err: any) {
      const isConnectionError = err.message === 'Failed to fetch' || err.code === 'ECONNREFUSED';
      setDownloadsError(
        isConnectionError 
          ? '❌ ERROR: El servidor proxy no está corriendo. Ejecuta "npm run dev" en la terminal.' 
          : (err.message || 'No se pudo conectar con el servidor de descargas.')
      );
    } finally {
      setIsLoadingDownloads(false);
    }
  };

  useEffect(() => {
    fetchDownloads();
  }, []);

  const handleImportDownload = (file: { filename: string; name: string; type: 'video' | 'audio'; url: string }) => {
    if (file.type === 'video') {
      const tempVid = document.createElement('video');
      tempVid.preload = 'metadata';
      tempVid.src = file.url;
      tempVid.onloadedmetadata = () => {
        const id = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const clipData = {
          type: 'video',
          url: file.url,
          name: file.name,
          duration: tempVid.duration || 10,
          startTrim: 0,
          endTrim: tempVid.duration || 10,
          volume: 100,
        };
        addVideoClip(clipData as any, id);
        generateProxy(id, file.url, (p) => console.log(`Proxy: ${p}%`)).then(proxyUrl => updateClip(id, { proxyUrl }));
        tempVid.remove();
      };
      tempVid.onerror = () => {
        addVideoClip({
          type: 'video',
          url: file.url,
          name: file.name,
          duration: 10,
          startTrim: 0,
          endTrim: 10,
          volume: 100,
          placementMode: addMode
        });
      };
    } else {
      const tempAudio = document.createElement('audio');
      tempAudio.preload = 'metadata';
      tempAudio.src = file.url;
      tempAudio.onloadedmetadata = () => {
        addAudioTrack({
          url: file.url,
          name: file.name,
          duration: tempAudio.duration || 10,
          startTrim: 0,
          volume: 100,
          timelineStart: playbackTime
        });
      };
      tempAudio.onerror = () => {
        addAudioTrack({
          url: file.url,
          name: file.name,
          duration: 10,
          startTrim: 0,
          volume: 100,
          timelineStart: playbackTime
        });
      };
    }
  };

  const handleDeleteDownload = async (filename: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${filename.replace(/^yt_(?:audio|video)_[^_]+_/, '').replace(/\.[^.]+$/, '')}"?`)) return;
    try {
      const response = await fetch(`http://localhost:3001/download/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Error al eliminar el archivo.');
      fetchDownloads();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar.');
    }
  };

  const [downloadProgress, setDownloadProgress] = useState<{
    percent: number;
    speed: string;
    eta: string;
  } | null>(null);

  const handleDownloadYoutube = async () => {
    if (!youtubeUrl.trim()) return;
    setIsDownloadingYoutube(true);
    setYoutubeError('');
    setDownloadProgress(null);

    try {
      const endpoint = youtubeFormat === 'video' ? '/yt-video' : '/yt-audio';
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl.trim() })
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = 'Error al descargar desde YouTube.';
        try {
          const errJson = JSON.parse(errText);
          errMsg = errJson.error || errMsg;
        } catch (_) {
          errMsg = errText || errMsg;
        }
        throw new Error(errMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('El stream de respuesta no está disponible.');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let fileData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'progress') {
              setDownloadProgress({
                percent: data.percent,
                speed: data.speed,
                eta: data.eta
              });
            } else if (data.type === 'complete') {
              if (data.success && data.file) {
                fileData = data.file;
              } else {
                throw new Error(data.error || 'La descarga falló en el servidor.');
              }
            }
          } catch (e: any) {
            console.error('Error parsing NDJSON chunk:', e);
          }
        }
      }

      if (fileData) {
        handleImportDownload(fileData);
        setYoutubeUrl('');
        fetchDownloads();
      } else {
        throw new Error('No se recibió la información del archivo descargado.');
      }
    } catch (err: any) {
      console.error(err);
      const isConnectionError = err.message === 'Failed to fetch' || err.code === 'ECONNREFUSED';
      setYoutubeError(
        isConnectionError 
          ? '❌ ERROR DE CONEXIÓN: El servidor proxy no está corriendo. Ejecuta "npm run dev" en la terminal.' 
          : (err.message || 'Error al descargar el video. Verifica el link o las cookies.')
      );
    } finally {
      setIsDownloadingYoutube(false);
      setDownloadProgress(null);
    }
  };

  return (
    <div className="flex shrink-0 border-r border-white/5" style={{ width: 320 }}>
      {/* ── VERTICAL ICON NAV ── */}
      <div className="w-[58px] bg-[#06060a] border-r border-white/5 flex flex-col items-center py-3 gap-1 shrink-0">
        {([
          { tab: 'presets',        icon: '🗂️',  label: 'Media'      },
          { tab: 'search-photos',  icon: '🖼️',  label: 'Fotos'      },
          { tab: 'search-icons',   icon: '⚡',   label: 'Íconos'     },
          { tab: 'text-effects',   icon: '✍️',  label: 'Texto'      },
          { tab: 'effects',        icon: '🌀',   label: 'Efectos'    },
          { tab: 'transitions',    icon: '🎬',   label: 'Transic.'   },
          { tab: 'youtube-downloads', icon: '🔴', label: 'YouTube'   },
        ] as const).map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => setLeftSidebarTab(tab as any)}
            title={label}
            className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer group ${
              leftSidebarTab === tab
                ? 'bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            <span className={`text-[7px] font-bold leading-none transition-colors ${leftSidebarTab === tab ? 'text-emerald-400' : 'text-gray-600 group-hover:text-gray-400'}`}>
              {label}
            </span>
          </button>
        ))}

        {/* Spacer + Upload quick-action */}
        <div className="flex-1" />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Subir archivo"
          className="w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 hover:bg-white/5 border border-transparent transition-all cursor-pointer group mb-1"
        >
          <Upload size={16} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
          <span className="text-[7px] text-gray-600 group-hover:text-gray-400 font-bold">Subir</span>
        </button>
      </div>

      {/* ── CONTENT PANEL ── */}
      <div className="flex-1 bg-[#09090b] flex flex-col overflow-hidden min-w-0">
        {/* ── MEDIA / COLECCIÓN ── */}
        {leftSidebarTab === 'presets' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Insert mode */}
            <div className="p-3 border-b border-white/5 shrink-0">
              <span className="text-[9px] text-gray-500 uppercase font-black block mb-1.5">Inserción</span>
              <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 gap-0.5">
                <button onClick={() => setAddMode('sequence')} className={`flex-1 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${addMode === 'sequence' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>Principal</button>
                <button onClick={() => setAddMode('overlay')} className={`flex-1 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${addMode === 'overlay' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>PIP</button>
              </div>
            </div>
            {/* Save template */}
            <div className="p-3 border-b border-white/5 shrink-0 space-y-2">
              <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1"><Save size={10}/> Guardar Plantilla</span>
              <div className="flex gap-2">
                <input value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} placeholder="Nombre..." className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50" />
                <button onClick={() => { saveVideoTemplate(newTemplateName); setNewTemplateName(''); }} disabled={!newTemplateName.trim()} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-lg text-[9px] font-bold cursor-pointer transition-all">Guardar</button>
              </div>
              <div className="space-y-1 max-h-[80px] overflow-y-auto custom-scrollbar pr-1">
                {savedVideoTemplates.map((tpl, i) => (
                  <div key={i} className="flex items-center justify-between p-1.5 rounded-lg bg-black/40 border border-white/5">
                    <button onClick={() => loadVideoTemplate(tpl)} className="text-[9px] font-semibold text-gray-300 hover:text-emerald-400 truncate text-left flex-1 cursor-pointer">🗂️ {tpl.name}</button>
                    <button onClick={() => deleteVideoTemplate(i)} className="text-red-500/80 hover:text-red-500 cursor-pointer ml-1"><Trash2 size={9}/></button>
                  </div>
                ))}
              </div>
            </div>
            {/* Clip thumbnails */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              <span className="text-[9px] text-gray-400 uppercase font-black block mb-2">Clips ({videoClips.length})</span>
              {videoClips.length === 0 && (
                <div className="py-8 text-center border border-dashed border-white/5 rounded-xl text-gray-600 text-xs flex flex-col items-center gap-2">
                  <Film size={18} className="opacity-30"/><span>Sin recursos</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                {videoClips.map(clip => (
                  <div key={clip.id} onClick={() => setSelectedClipId(clip.id)} className={`relative aspect-video rounded-lg bg-black border overflow-hidden cursor-pointer transition-all ${selectedClipId === clip.id ? 'border-emerald-500 shadow-md shadow-emerald-500/10' : 'border-white/10'}`}>
                    {clip.type === 'video' ? <video src={clip.url} className="w-full h-full object-cover opacity-60 pointer-events-none"/> : clip.type === 'text' ? <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-white font-bold text-[9px] p-2 text-center pointer-events-none select-none"><span className="line-clamp-2">{clip.textContent || 'Texto'}</span></div> : <img src={clip.url} alt="clip" className="w-full h-full object-cover opacity-60 pointer-events-none"/>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex flex-col justify-between">
                      <span className="text-[8px] bg-black/60 px-1 rounded-sm self-start font-mono">{clip.type === 'video' ? '📽️' : '🖼️'}</span>
                      <span className="text-[9px] font-medium truncate block max-w-full text-gray-300">{clip.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload buttons */}
            <div className="p-3 border-t border-white/5 shrink-0 flex gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 justify-center cursor-pointer transition-all"><Upload size={12}/>Video/Imagen</button>
              <button onClick={() => audioInputRef.current?.click()} className="flex-1 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-lg text-[10px] font-bold text-blue-400 flex items-center gap-1.5 justify-center cursor-pointer transition-all"><Music size={12}/>Audio</button>
            </div>
          </div>
        )}

        {/* ── FOTOS STOCK ── */}
        {leftSidebarTab === 'search-photos' && (
          <div className="flex flex-col h-full overflow-hidden p-3 gap-3">
            <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase shrink-0">Buscar Fotos Stock</span>
            <div className="flex gap-2 shrink-0">
              <input value={photoSearchQuery} onChange={e => setPhotoSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchPhotos()} placeholder="Buscar en Pixabay..." className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"/>
              <button onClick={handleSearchPhotos} disabled={isSearchingPhotos} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-2 rounded-lg transition-all flex items-center justify-center shrink-0 w-8 h-8 cursor-pointer">
                {isSearchingPhotos ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
              {photoSearchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-600 italic">Ingresa una palabra clave para buscar fotos.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pb-2">
                  {photoSearchResults.map((photo: any) => (
                    <div key={photo.id} onClick={() => { addVideoClip({ type: 'image', url: photo.url, name: photo.tags?.split(',')[0]?.trim() || 'Foto Stock', duration: 4, startTrim: 0, endTrim: 4, volume: 0 } as any); }} className="relative aspect-video rounded-xl overflow-hidden cursor-pointer group border border-white/5 hover:border-emerald-500/40 transition-all">
                      <img src={photo.previewUrl || photo.url} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"/>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <span className="text-[8px] text-white font-bold truncate">{photo.tags?.split(',')[0]?.trim()}</span>
                      </div>
                      <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={10} className="text-white"/></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ÍCONOS ── */}
        {leftSidebarTab === 'search-icons' && (
          <div className="flex flex-col h-full overflow-hidden p-3 gap-3">
            <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase shrink-0">Íconos Vectoriales</span>
            <div className="flex gap-2 shrink-0">
              <input value={iconSearchQuery} onChange={e => setIconSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchIcons()} placeholder="star, arrow, rocket..." className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"/>
              <button onClick={handleSearchIcons} disabled={isSearchingIcons} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-2 rounded-lg transition-all flex items-center justify-center shrink-0 w-8 h-8 cursor-pointer">
                {isSearchingIcons ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
              {iconSearchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-600 italic">Ingresa en inglés (ej. 'star', 'arrow', 'rocket')</div>
              ) : (
                <div className="grid grid-cols-4 gap-2 pb-2">
                  {iconSearchResults.map((iconFullName: string) => {
                    const parts = iconFullName.split(':');
                    const prefix = parts[0] || 'lucide';
                    const name = parts[1] || '';
                    const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?color=white`;
                    return (
                      <div key={iconFullName} onClick={() => handleAddIcon(iconFullName)} className="aspect-square rounded-xl bg-[#121215] border border-white/5 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all cursor-pointer flex items-center justify-center p-2 relative group/icon-item" title={`Añadir: ${name}`}>
                        <img src={svgUrl} alt={name} className="w-8 h-8 opacity-75 group-hover/icon-item:opacity-100 group-hover/icon-item:scale-110 transition-all"/>
                        <div className="absolute top-0 right-0 bg-emerald-500 rounded-bl-lg rounded-tr-xl p-0.5 opacity-0 group-hover/icon-item:opacity-100 transition-opacity"><Plus size={8} className="text-white"/></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TEXTO FX ── */}
        {leftSidebarTab === 'text-effects' && (
          <div className="flex flex-col h-full overflow-hidden p-3 gap-3">
            <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase shrink-0">Estilos de Texto</span>
            <p className="text-[9px] text-gray-500 shrink-0">Texto animado con efectos cinéticos modernos.</p>
            <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar space-y-2 pb-4">
              {[
                { name: 'Clásico Limpio', effect: 'none', desc: 'Minimalista estático' },
                { name: 'Sombra Suave', effect: 'shadow', desc: 'Sombra difuminada' },
                { name: 'Brillo Neón', effect: 'neon', desc: 'Luz de neón pulsante' },
                { name: 'Ciber Glitch', effect: 'glitch', desc: 'Aberración cromática' },
                { name: 'Typewriter', effect: 'typing', desc: 'Máquina de escribir' },
                { name: 'Zoom Suave', effect: 'fade-zoom', desc: 'Desvanecimiento + zoom' },
                { name: 'Bote Pop', effect: 'bounce', desc: 'Rebote elástico' },
              ].map(preset => (
                <button key={preset.effect} onClick={() => { const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 }; addVideoClip({ type: 'text', url: '', name: `Texto: ${preset.name}`, duration: 4, startTrim: 0, endTrim: 4, volume: 0, placementMode: 'overlay', textContent: preset.name.toUpperCase(), textColor: preset.effect === 'neon' ? '#10b981' : '#ffffff', textFontSize: 54, textFontFamily: 'Montserrat', textEffect: preset.effect as any, x: Math.round((dims.w - 600) / 2), y: Math.round((dims.h - 150) / 2), width: 600, height: 150 }); }} className="w-full text-left p-3 bg-[#0d0d11]/80 hover:bg-[#15151b] border border-white/5 hover:border-emerald-500/30 rounded-xl transition-all flex flex-col gap-1.5 cursor-pointer relative overflow-hidden group">
                  <div className="flex justify-between items-center w-full">
                    <span className={`font-bold text-xs ${preset.effect === 'neon' ? 'text-emerald-400 drop-shadow-[0_0_4px_#10b981]' : 'text-white'}`}>{preset.name}</span>
                    <Plus size={12} className="text-gray-500 group-hover:text-emerald-400 transition-colors"/>
                  </div>
                  <span className="text-[9px] text-gray-500 font-medium">{preset.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── EFECTOS ── */}
        {leftSidebarTab === 'effects' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Category pills */}
            <div className="p-2 border-b border-white/5 shrink-0">
              <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                {EFFECT_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setActiveEffectCategory(cat)} className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${activeEffectCategory === cat ? 'bg-emerald-500 text-white shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {!selectedClipId && (
              <div className="p-3 bg-yellow-500/5 border-b border-yellow-500/10 shrink-0">
                <p className="text-[9px] text-yellow-400/80">💡 Seleccioná un clip en la línea de tiempo para aplicar efectos.</p>
              </div>
            )}

            {/* Effect grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              <div className="grid grid-cols-2 gap-2 pb-4">
                {/* No effect / Reset */}
                <button
                  onClick={() => { if (selectedClipId) updateClip(selectedClipId, { effectPreset: undefined }); }}
                  className={`relative rounded-xl overflow-hidden border transition-all cursor-pointer group flex flex-col items-center justify-center gap-1.5 py-4 ${!selectedClip?.effectPreset ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/20'}`}
                >
                  <span className="text-xl">✖️</span>
                  <span className="text-[9px] font-bold text-gray-300">Sin Efecto</span>
                  {!selectedClip?.effectPreset && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400"/>}
                </button>

                {getEffectsByCategory(activeEffectCategory).map(effect => {
                  const isActive = selectedClip?.effectPreset === effect.id;
                  return (
                    <div
                      key={effect.id}
                      onClick={() => {
                        if (!selectedClipId) return;
                        updateClip(selectedClipId, { effectPreset: isActive ? undefined : effect.id });
                      }}
                      title={effect.description}
                      className={`relative rounded-xl overflow-hidden border transition-all cursor-pointer group flex flex-col items-center justify-center gap-1 py-3 ${isActive ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.25)]' : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}`}
                    >
                      <span className={`text-2xl transition-transform duration-300 ${effect.cssAnimation ? `group-hover:${effect.cssAnimation}` : ''}`}>
                        {effect.emoji}
                      </span>
                      <span className={`text-[9px] font-bold leading-tight text-center px-1 ${isActive ? 'text-emerald-400' : 'text-gray-300 group-hover:text-white'}`}>
                        {effect.name}
                      </span>
                      {isActive && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addVideoClip({
                            type: 'effect',
                            url: '',
                            name: effect.name,
                            duration: 3600,
                            startTrim: 0,
                            endTrim: 4,
                            volume: 0,
                            placementMode: 'overlay',
                            timelineStart: playbackTime,
                            effectPreset: effect.id
                          } as any);
                        }}
                        className="mt-1 px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer border border-emerald-500/30 hover:border-emerald-500 hover:shadow-[0_0_8px_rgba(16,185,129,0.4)] z-20"
                      >
                        + Pista (V3)
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TRANSICIONES PERSONALIZADAS ── */}
        {leftSidebarTab === 'transitions' && (
          <div className="flex flex-col h-full overflow-hidden p-3 gap-3">
            <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5 shrink-0"><Film size={10}/> Mis Transiciones</span>
            <p className="text-[9px] text-gray-500 shrink-0">Importá una carpeta de efectos de video y aplicalos con un clic.</p>
            <div className="flex flex-col gap-2 shrink-0">
              <button onClick={handleImportTransitionsFolder} className="w-full py-2 px-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 rounded-lg text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 justify-center transition-all cursor-pointer">
                <span>📁</span><span>Importar Carpeta</span>
              </button>
              {customTransitions.length > 0 && (
                <button onClick={() => setCustomTransitions([])} className="w-full py-1 text-[9px] text-red-400/60 hover:text-red-400 transition-colors cursor-pointer">Limpiar lista ({customTransitions.length})</button>
              )}
            </div>
            {customTransitions.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center border border-dashed border-white/5 rounded-xl">
                <div className="text-4xl opacity-20">🎬</div>
                <p className="text-[9px] text-gray-600 max-w-[140px] leading-relaxed">Cargá .mp4 / .webm / .gif de tu carpeta de transiciones.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar grid grid-cols-2 gap-2 pb-4 content-start">
                {customTransitions.map((trans, idx) => (
                  <div key={idx} className="relative group/trans rounded-xl overflow-hidden border border-white/5 hover:border-emerald-500/40 transition-all cursor-pointer bg-black"
                    onClick={() => {
                      if (!selectedClipId) { alert('Seleccioná un clip primero.'); return; }
                      const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                      addVideoClip({ type: 'video', url: trans.url, name: `Trans: ${trans.name}`, duration: 2, startTrim: 0, endTrim: 2, volume: 0, placementMode: 'overlay', timelineStart: playbackTime, x: 0, y: 0, width: dims.w, height: dims.h, fitMode: 'cover' } as any);
                    }}
                  >
                    <video src={trans.url} className="w-full aspect-video object-cover opacity-70 group-hover/trans:opacity-100 transition-opacity pointer-events-none" muted loop autoPlay/>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5"><span className="text-[8px] font-bold text-white truncate block">{trans.name}</span></div>
                    <div className="absolute top-1 right-1 opacity-0 group-hover/trans:opacity-100 transition-opacity bg-emerald-500 rounded-full p-0.5"><Plus size={10} className="text-white"/></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DESCARGAS YOUTUBE ── */}
        {leftSidebarTab === 'youtube-downloads' && (
          <div className="flex flex-col h-full overflow-hidden p-3 gap-3">
            <div className="flex justify-between items-center shrink-0">
              <span className="text-[9px] font-black tracking-widest text-red-500 uppercase flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-red-500" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.387.51A3.003 3.003 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.108c1.862.51 9.387.51 9.387.51s7.525 0 9.387-.51a3.003 3.003 0 0 0 2.11-2.108C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>Descargas de YouTube</span>
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch('http://localhost:3001/open-folder', { method: 'POST' });
                      if (!res.ok) throw new Error('No se pudo abrir la carpeta.');
                    } catch (err: any) {
                      alert('❌ ERROR: El servidor proxy no está corriendo. Ejecuta "npm run dev" en la terminal.');
                    }
                  }}
                  title="Abrir carpeta de descargas"
                  className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded text-[8px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-white/5 hover:border-white/10"
                >
                  📂 Carpeta
                </button>
                <button 
                  onClick={fetchDownloads} 
                  disabled={isLoadingDownloads} 
                  title="Actualizar biblioteca" 
                  className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                >
                  <RefreshCw size={12} className={isLoadingDownloads ? "animate-spin text-emerald-400" : ""} />
                </button>
              </div>
            </div>

            {/* Downloader Form */}
            <div className="bg-red-950/10 p-2.5 rounded-xl border border-red-500/10 flex flex-col gap-2 shrink-0">
              <span className="text-[8px] font-bold text-gray-400 uppercase">Nueva Descarga</span>
              <div className="flex gap-1.5">
                <input 
                  value={youtubeUrl} 
                  onChange={e => setYoutubeUrl(e.target.value)} 
                  placeholder="Pegar enlace de YouTube..." 
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[9px] text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50" 
                />
                <select 
                  value={youtubeFormat} 
                  onChange={e => setYoutubeFormat(e.target.value as any)} 
                  className="bg-black/60 border border-white/10 rounded-lg text-[9px] text-gray-300 px-1 focus:outline-none cursor-pointer"
                >
                  <option value="video">Máxima calidad (Video)</option>
                  <option value="audio">Máxima calidad (Audio)</option>
                </select>
              </div>
              <button 
                onClick={handleDownloadYoutube}
                disabled={isDownloadingYoutube || !youtubeUrl.trim()}
                className="w-full py-1 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:hover:bg-red-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.15)] active:scale-[0.98]"
              >
                {isDownloadingYoutube ? (
                  <>
                    <RefreshCw size={10} className="animate-spin"/>
                    <span>
                      {downloadProgress 
                        ? `Descargando: ${downloadProgress.percent.toFixed(1)}% (${downloadProgress.speed || ''})` 
                        : 'Conectando...'}
                    </span>
                  </>
                ) : (
                  <span>Descargar e Importar</span>
                )}
              </button>
              {isDownloadingYoutube && downloadProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[7.5px] text-gray-500 font-mono">
                    <span>{downloadProgress.percent.toFixed(1)}%</span>
                    <span>{downloadProgress.speed || '...'}</span>
                    <span>{downloadProgress.eta ? `ETA ${downloadProgress.eta}` : ''}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/50 border border-white/5 overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-[width] duration-150"
                      style={{ width: `${Math.max(0, Math.min(100, downloadProgress.percent))}%` }}
                    />
                  </div>
                </div>
              )}
              {youtubeError && (
                <div className="space-y-1 mt-1.5 p-2 bg-red-950/20 border border-red-500/20 rounded-lg">
                  <p className="text-[8px] text-red-400 font-black leading-tight">❌ Error de descarga / Cookies</p>
                  <p className="text-[7.5px] text-red-400/90 leading-tight">{youtubeError}</p>
                  <div className="text-[7.5px] text-gray-400 leading-normal pt-1 border-t border-white/5 space-y-1">
                    <p>💡 <strong>¿Por qué pide cookies?</strong> YouTube bloquea robots para evitar sobrecarga. Usar tus cookies le dice a YouTube que eres una persona real.</p>
                    <p><strong>Para solucionar en otra PC:</strong></p>
                    <p>1. Instala la extensión <strong>"Get cookies.txt LOCALLY"</strong>.</p>
                    <p>2. Entra a YouTube en tu navegador, abre la extensión y descarga <strong>cookies.txt</strong>.</p>
                    <p>3. Pon ese archivo en la carpeta del proyecto y listo.</p>
                  </div>
                </div>
              )}
            </div>

            {/* History Header */}
            <div className="flex items-center justify-between mt-1 mb-1">
              <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest shrink-0 block">Archivos Guardados ({downloadsList.length})</span>
              <button 
                onClick={async () => {
                  try {
                    const response = await fetch('http://localhost:3001/open-folder', { method: 'POST' });
                    if (!response.ok) throw new Error('No se pudo abrir la carpeta.');
                  } catch (err) {
                    alert('❌ ERROR: El servidor proxy no está corriendo. Ejecuta "npm run dev" en la terminal.');
                  }
                }}
                className="text-[8px] bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white px-2 py-0.5 rounded-full border border-white/10 transition-all flex items-center gap-1"
                title="Abrir carpeta de descargas en el explorador de archivos"
              >
                <span>📂 Abrir Carpeta</span>
              </button>
            </div>

            {/* Archive List */}
            <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar space-y-2">
              {isLoadingDownloads && downloadsList.length === 0 ? (
                <div className="py-8 text-center text-[10px] text-gray-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-red-500"/>
                  <span>Cargando archivos...</span>
                </div>
              ) : downloadsError ? (
                <div className="py-8 text-center text-[9px] text-red-400 border border-dashed border-red-500/10 rounded-xl px-2">
                  ❌ {downloadsError}
                </div>
              ) : downloadsList.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-white/5 rounded-xl text-gray-600 text-[10px] flex flex-col items-center gap-2">
                  <span className="text-2xl opacity-35">📥</span>
                  <span>No hay descargas guardadas en el servidor.</span>
                </div>
              ) : (
                downloadsList.map((file, idx) => (
                  <div key={idx} className="group p-2 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Icon Indicator */}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${file.type === 'video' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {file.type === 'video' ? '📽️' : '🎵'}
                      </div>
                      {/* File details */}
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-gray-300 block truncate group-hover:text-white transition-colors" title={file.name}>
                          {file.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[8px] text-gray-500 font-mono mt-0.5">
                          <span className="bg-white/5 px-1 rounded-sm uppercase">{file.type}</span>
                          <span>•</span>
                          <span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => handleImportDownload(file)} 
                        title="Importar al editor"
                        className="px-1.5 py-0.5 bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 hover:text-white rounded text-[8px] font-bold transition-all cursor-pointer"
                      >
                        Importar
                      </button>
                      <button 
                        onClick={() => handleDeleteDownload(file.filename)} 
                        title="Eliminar del disco"
                        className="p-1 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded transition-all cursor-pointer"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hidden file inputs inside LeftSidebar */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.mpeg,.mpg,.3gp,.ts,.m2ts,.wmv,.flv,.ogv,image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.avif"
        multiple
        className="hidden"
        onChange={handleMediaUpload}
      />
      <input
        type="file"
        ref={audioInputRef}
        accept="audio/*,.mp3,.m4a,.mka,.aac,.wav,.flac,.ogg,.opus"
        multiple
        className="hidden"
        onChange={handleAudioUpload}
      />
    </div>
  );
};
