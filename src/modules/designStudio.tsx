import React, { useState, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Layers, Type, ImageIcon, Download, Lock, Eye, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export default function DesignStudio() {
    const [elements, setElements] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // 1. GESTOR DE CAPAS (LOGIC ENGINE)
    const bringToFront = (id: string) => {
        const maxZ = Math.max(...elements.map(e => e.zIndex), 100);
        setElements(elements.map(el => el.id === id ? { ...el, zIndex: maxZ + 1 } : el));
    };

    const sendToBack = (id: string) => {
        const minZ = Math.min(...elements.map(e => e.zIndex), 10);
        setElements(elements.map(el => el.id === id ? { ...el, zIndex: Math.max(1, minZ - 1) } : el));
    };

    const toggleVisibility = (id: string) => {
        setElements(elements.map(el => el.id === id ? { ...el, isHidden: !el.isHidden } : el));
    };

    // 2. EXPORTADOR BLOB 4K (Anti-error)
    const handleExport = async () => {
        if (!editorRef.current) return;
        try {
            const dataUrl = await toPng(editorRef.current, { pixelRatio: 3, cacheBust: true });
            const link = document.createElement('a');
            link.download = `Structura-Pro-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (e) {
            alert("Error en el renderizado: Asegúrate de que las imágenes tengan permisos CORS.");
        }
    };

    return (
        <div className="flex h-full bg-[#020202]">
        {/* Sidebar Herramientas */}
        <div className="w-72 bg-[#0a0a0c] border-r border-white/5 p-4 flex flex-col gap-4">
        <button onClick={() => setElements([...elements, { id: Date.now().toString(), content: 'Nuevo Texto', zIndex: 100, isHidden: false, type: 'text' }])} className="w-full py-3 bg-white/5 rounded text-xs font-bold border border-white/10 hover:bg-emerald-600 flex items-center gap-2">
        <Type size={16} /> Añadir Texto Pro
        </button>
        <button onClick={handleExport} className="w-full py-3 bg-emerald-600 rounded text-xs font-bold flex items-center justify-center gap-2">
        <Download size={16} /> Exportar HD (Blob)
        </button>
        </div>

        {/* Canvas Profesional */}
        <div className="flex-1 p-10 flex items-center justify-center">
        <div ref={editorRef} className="relative w-[500px] aspect-[9/16] bg-black shadow-2xl ring-1 ring-white/10 overflow-hidden">
        {elements.filter(el => !el.isHidden).sort((a,b) => a.zIndex - b.zIndex).map(el => (
            <div key={el.id} onClick={() => setSelectedId(el.id)} className={`absolute p-4 text-white text-3xl font-black ${selectedId === el.id ? 'ring-2 ring-emerald-500' : ''}`} style={{zIndex: el.zIndex}}>
            {el.content}
            </div>
        ))}
        </div>
        </div>

        {/* Gestor de Capas Profesional */}
        <div className="w-80 border-l border-white/10 p-4 bg-[#0a0a0c]">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-4">Gestor de Capas (Z-Index)</h3>
        {elements.sort((a,b) => b.zIndex - a.zIndex).map(el => (
            <div key={el.id} className="p-3 bg-[#111] rounded mt-2 border border-white/5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
            {el.content}
            <div className="flex gap-2 text-gray-400">
            <Eye size={14} className="cursor-pointer" onClick={() => toggleVisibility(el.id)}/>
            <Trash2 size={14} className="cursor-pointer hover:text-red-500" onClick={() => setElements(elements.filter(e => e.id !== el.id))}/>
            </div>
            </div>
            <div className="flex justify-between">
            <button onClick={() => bringToFront(el.id)}><ArrowUp size={12}/></button>
            <button onClick={() => sendToBack(el.id)}><ArrowDown size={12}/></button>
            </div>
            </div>
        ))}
        </div>
        </div>
    );
}
