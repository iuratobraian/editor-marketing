import { useEffect } from 'react';
import Header from './components/Header';
import LeftSidebar from './components/LeftSidebar';
import Canvas from './components/Canvas';
import RightSidebar from './components/RightSidebar';
import VideoCompositor from './components/VideoCompositor';
import { useEditorStore } from './stores/editorStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  // Bind global keyboard shortcuts
  useKeyboardShortcuts();

  const { mode } = useEditorStore();

  // Load Custom Premium Typography Stylesheets
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;700;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-emerald-500/30">
      
      {/* 1. APP TOP HEADER */}
      <Header />

      {/* 2. WORKSPACE CONTAINER */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* DESIGN STUDIO MODE */}
        {mode === 'image' && (
          <>
            {/* RESOLUTIONS, TEMPLATES, CONTROLS */}
            <LeftSidebar />

            {/* MAIN DRAGGABLE WORK CANVAS */}
            <Canvas />

            {/* PROPERTIES FX & LAYERS MANAGEMENT */}
            <RightSidebar />
          </>
        )}

        {/* VIDEO COMPOSITOR MODE */}
        {mode === 'video' && <VideoCompositor />}

      </div>
    </div>
  );
}
