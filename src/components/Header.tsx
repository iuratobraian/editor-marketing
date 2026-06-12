import { useState } from 'react';
import { useEditorStore } from '../stores/editorStore';
import { 
  FolderPlus, Save, RotateCcw, RotateCw, Settings, Bell 
} from 'lucide-react';

export default function Header() {
  const { 
    mode, 
    setMode, 
    undo, 
    redo, 
    past, 
    future,
    videoClips,
    audioTracks,
    elements
  } = useEditorStore();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleNewProject = () => {
    if (confirm('¿Estás seguro de que deseas iniciar un nuevo proyecto? Se perderán los cambios no guardados.')) {
      useEditorStore.setState({
        videoClips: [],
        audioTracks: [],
        elements: [],
        selectedClipId: null,
        selectedAudioId: null,
        selectedIds: [],
        playbackTime: 0
      });
      alert('Nuevo proyecto creado.');
    }
  };

  const handleSaveProject = () => {
    try {
      localStorage.setItem('vp_saved_clips', JSON.stringify(videoClips));
      localStorage.setItem('vp_saved_audio', JSON.stringify(audioTracks));
      localStorage.setItem('vp_saved_elements', JSON.stringify(elements));
      alert('Proyecto guardado localmente de forma exitosa.');
    } catch (e) {
      alert('Fallo al guardar: Espacio local lleno.');
    }
  };

  const menuItems: Record<string, string[]> = {
    Archivo: ['Nuevo Proyecto (Ctrl+N)', 'Abrir Proyecto', 'Guardar Proyecto (Ctrl+S)', 'Importar Media...', 'Exportar Video...', 'Salir'],
    Editar: ['Deshacer (Ctrl+Z)', 'Rehacer (Ctrl+Y)', 'Cortar (Ctrl+X)', 'Copiar (Ctrl+C)', 'Pegar (Ctrl+V)', 'Eliminar (Del)'],
    Ver: ['Ajustar a Pantalla', 'Mostrar Grid', 'Guías Safe Area', 'Reglas de Canvas', 'Waveform Monitor', 'Vectorscope'],
    Proyecto: ['Configuración del Proyecto...', 'Administrador de LUTs', 'Proxies Automáticos', 'Ajustes de Render GPU'],
    Clip: ['Dividir (S)', 'Duplicar (Ctrl+D)', 'Invertir Dirección', 'Congelar Frame', 'Cámara Rápida/Lenta'],
    Secuencia: ['Auto-Slideshow Creator...', 'Anidar Clips', 'Ripple Delete', 'Borrar Huecos'],
    Marcadores: ['Añadir Marcador (M)', 'Ir a Siguiente Marcador', 'Eliminar Marcadores'],
    Ventana: ['Biblioteca Multimedia', 'Inspector de Propiedades', 'Línea de Tiempo', 'Scopes de Color', 'Efectos Node-Graph', 'Consola de Render'],
    Ayuda: ['Atajos de Teclado', 'Documentación IA', 'Soporte Vision Pro', 'Acerca de Studio']
  };

  return (
    <>
      <header className="h-14 border-b border-[#232A36] flex items-center px-4 justify-between bg-[#11151E] shrink-0 z-50 shadow-[0_4px_20px_rgba(0,0,0,0.4)] select-none">
        
        {/* LEFT LOGO & TOP DROPDOWN MENUS */}
        <div className="flex items-center gap-5">
          {/* Logo Vision Pro */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#7B5CFF] to-[#00C8FF] flex items-center justify-center shadow-[0_0_15px_rgba(123,92,255,0.4)]">
              <span className="text-white font-black text-sm">V</span>
            </div>
            <span className="text-sm font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              VISION PRO <span className="text-[#7B5CFF]">STUDIO</span>
            </span>
          </div>

          {/* Menus Anchors */}
          <div className="hidden lg:flex items-center gap-1.5 pl-4 border-l border-[#232A36]">
            {Object.keys(menuItems).map((menu) => (
              <div 
                key={menu} 
                className="relative"
                onMouseEnter={() => activeMenu && setActiveMenu(menu)}
              >
                <button
                  onClick={() => setActiveMenu(activeMenu === menu ? null : menu)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-bold tracking-wide transition-all duration-200 cursor-pointer ${
                    activeMenu === menu 
                      ? 'bg-white/10 text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {menu}
                </button>

                {activeMenu === menu && (
                  <div className="absolute left-0 mt-1.5 w-56 bg-[#161B25] border border-[#232A36] rounded-xl shadow-2xl py-1.5 z-[999] animate-fade-in">
                    {menuItems[menu].map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveMenu(null);
                          if (item.includes('Nuevo Proyecto')) handleNewProject();
                          else if (item.includes('Guardar Proyecto')) handleSaveProject();
                          else if (item.includes('Configuración del Proyecto')) setShowSettingsModal(true);
                          else alert(`Acción ejecutada: ${item}`);
                        }}
                        className="w-full text-left px-4 py-2 text-[10px] text-gray-300 hover:bg-[#7B5CFF]/10 hover:text-white transition-colors flex justify-between items-center"
                      >
                        <span>{item.split('(')[0].trim()}</span>
                        {item.includes('(') && (
                          <span className="text-[8px] text-gray-500 font-mono">
                            {item.substring(item.indexOf('(') + 1, item.indexOf(')'))}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE WORKSPACE TOGGLE */}
        <div className="flex bg-[#090B10] border border-[#232A36] rounded-lg p-0.5 shadow-inner">
          <button 
            onClick={() => setMode('image')} 
            className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
              mode === 'image' 
                ? 'bg-gradient-to-r from-[#7B5CFF] to-[#00C8FF] text-white shadow-md' 
                : 'text-gray-400 hover:text-white cursor-pointer'
            }`}
          >
            Design Studio
          </button>
          <button 
            onClick={() => setMode('video')} 
            className={`px-4 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
              mode === 'video' 
                ? 'bg-gradient-to-r from-[#7B5CFF] to-[#00C8FF] text-white shadow-md' 
                : 'text-gray-400 hover:text-white cursor-pointer'
            }`}
          >
            Video Compositor
          </button>
        </div>

        {/* RIGHT ACTION ITEMS */}
        <div className="flex items-center gap-3">
          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1 border-r border-[#232A36] pr-3">
            <button 
              onClick={handleNewProject} 
              className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer" 
              title="Nuevo Proyecto"
            >
              <FolderPlus size={16} />
            </button>
            <button 
              onClick={handleSaveProject} 
              className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer" 
              title="Guardar Proyecto"
            >
              <Save size={16} />
            </button>
            <button 
              onClick={undo} 
              disabled={past.length === 0} 
              className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer ${
                past.length > 0 ? 'text-gray-300 hover:text-white' : 'text-gray-600 opacity-30 cursor-not-allowed'
              }`}
              title="Deshacer (Ctrl + Z)"
            >
              <RotateCcw size={16} />
            </button>
            <button 
              onClick={redo} 
              disabled={future.length === 0} 
              className={`p-1.5 hover:bg-white/5 rounded-lg transition-colors cursor-pointer ${
                future.length > 0 ? 'text-gray-300 hover:text-white' : 'text-gray-600 opacity-30 cursor-not-allowed'
              }`}
              title="Rehacer (Ctrl + Y)"
            >
              <RotateCw size={16} />
            </button>
          </div>

          {/* Config & Profile Anchors */}
          <button 
            onClick={() => setShowSettingsModal(true)} 
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-all cursor-pointer border border-[#232A36]"
            title="Configuración de Rendimiento"
          >
            <Settings size={14} />
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-all cursor-pointer border border-[#232A36] relative"
            >
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#00C8FF] rounded-full animate-ping" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-72 bg-[#161B25] border border-[#232A36] rounded-xl shadow-2xl p-4 z-[999] animate-fade-in">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-2">Notificaciones del Motor</span>
                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] text-emerald-400">
                    🏆 <strong>Vision Pro Studio:</strong> ¡Bienvenido a la versión premium de postproducción IA!
                  </div>
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] text-blue-400">
                    💡 <strong>WASM Engine:</strong> Motor de renderizado FFmpeg WebAssembly optimizado y listo para compilar.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-[#232A36]">
            <div className="w-7 h-7 rounded-full bg-[#7B5CFF]/20 border border-[#7B5CFF]/30 flex items-center justify-center text-xs font-bold text-[#7B5CFF]">
              IA
            </div>
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider hidden md:inline-block">PRO ARTIST</span>
          </div>
        </div>

      </header>

      {/* GLOBAL BACKGROUND DROPMENU CLOSE LISTENER */}
      {activeMenu && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setActiveMenu(null)} 
        />
      )}

      {/* PERFORMANCE SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#11151E] border border-[#232A36] max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl relative text-white">
            <h3 className="text-sm font-black uppercase text-[#7B5CFF] tracking-wider flex items-center gap-2">
              <Settings className="animate-spin" size={16} />
              Ajustes de Render y Rendimiento
            </h3>
            
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 bg-black/35 rounded-xl border border-[#232A36] flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-200 block">Aceleración por GPU</span>
                  <span className="text-[9px] text-gray-500">Usa WebGL2 y WebCodecs para procesamiento rápido</span>
                </div>
                <div className="w-8 h-4 bg-[#00D97E] rounded-full p-0.5 flex justify-end items-center cursor-pointer">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
              </div>

              <div className="p-3 bg-black/35 rounded-xl border border-[#232A36] flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-200 block"> proxies de Baja Resolución</span>
                  <span className="text-[9px] text-gray-500">Previsualiza a 540p para edición fluida</span>
                </div>
                <div className="w-8 h-4 bg-gray-700 rounded-full p-0.5 flex items-center cursor-pointer">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
              </div>

              <div className="p-3 bg-black/35 rounded-xl border border-[#232A36] flex justify-between items-center">
                <div>
                  <span className="font-bold text-gray-200 block">Pre-render en Background</span>
                  <span className="text-[9px] text-gray-500">Procesa transiciones complejas al estar inactivo</span>
                </div>
                <div className="w-8 h-4 bg-[#00D97E] rounded-full p-0.5 flex justify-end items-center cursor-pointer">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-gradient-to-r from-[#7B5CFF] to-[#00C8FF] text-white font-bold rounded-lg text-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                Cerrar y Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
