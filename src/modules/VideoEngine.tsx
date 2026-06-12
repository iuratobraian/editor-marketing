import React from 'react';

export default function VideoEngine() {
    return (
        <div className="flex flex-col h-full items-center justify-center bg-[#050505]">
        <div className="text-center">
        <h2 className="text-xl font-bold text-blue-500">Video Engine Local (WASM)</h2>
        <p className="text-gray-500 text-sm mt-2">Renderizado de clips mediante FFmpeg en tu navegador.</p>
        </div>
        </div>
    );
}
