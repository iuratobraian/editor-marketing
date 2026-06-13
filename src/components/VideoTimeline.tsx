import React from 'react';
import { useEditorStore } from '../stores/editorStore';
import { Scissors, Mic, MicOff, Trash2 } from 'lucide-react';
import { getClipPlayDuration } from './VideoCompositor';

interface VideoTimelineProps {
  timelineHeight: number;
  handleTimelineHeightResize: (e: React.PointerEvent) => void;
  handleSplitClip: () => void;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  timelineTrackRef: React.RefObject<HTMLDivElement | null>;
  handleTimelineScrub: (e: React.MouseEvent<HTMLDivElement>) => void;
  timelineDuration: number;
  setContextMenu: (menu: any) => void;
  handleOverlayTimelineDrag: (e: React.PointerEvent, clipId: string, initialStart: number) => void;
  handleAudioTimelineDrag: (e: React.PointerEvent, trackId: string, initialStart: number) => void;
  handleTimelineResize: (e: React.PointerEvent<any>, clipId: string, direction: 'left' | 'right', trackType: 'video' | 'audio') => void;
  nodesList: any[];
  nodeConnections: any[];
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  timelineHeight,
  handleTimelineHeightResize,
  handleSplitClip,
  isRecording,
  startRecording,
  stopRecording,
  timelineTrackRef,
  handleTimelineScrub,
  timelineDuration,
  setContextMenu,
  handleOverlayTimelineDrag,
  handleAudioTimelineDrag,
  handleTimelineResize,
  nodesList,
  nodeConnections,
}) => {
  const {
    videoClips,
    audioTracks,
    selectedClipId,
    selectedAudioId,
    setSelectedClipId,
    setSelectedAudioId,
    playbackTime,
    deleteClip,
    deleteAudioTrack,
  } = useEditorStore();

  const titleClips = videoClips.filter(c => c.placementMode === 'overlay' && c.type === 'text');
  const mediaOverlayClips = videoClips.filter(c => c.placementMode === 'overlay' && c.type !== 'text');
  const baseClips = videoClips.filter(c => c.placementMode !== 'overlay');
  
  const voiceTracks = audioTracks.filter(t => t.name.toLowerCase().includes('voz') || t.name.toLowerCase().includes('grabación') || t.name.toLowerCase().includes('off'));
  const fxTracks = audioTracks.filter(t => t.name.toLowerCase().includes('fx') || t.name.toLowerCase().includes('efecto'));
  const musicTracks = audioTracks.filter(t => !t.name.toLowerCase().includes('voz') && !t.name.toLowerCase().includes('grabación') && !t.name.toLowerCase().includes('off') && !t.name.toLowerCase().includes('fx') && !t.name.toLowerCase().includes('efecto'));

  return (
    <div style={{ height: `${timelineHeight}px` }} className="bg-[#09090b] flex flex-col shrink-0 relative w-full border-t border-white/5 select-none">
      {/* Height Resize Handle */}
      <div 
        className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize bg-transparent hover:bg-emerald-500/40 active:bg-emerald-500/80 transition-colors z-[99]"
        onPointerDown={handleTimelineHeightResize}
      />
    
      {/* Timeline header track labels & zoom ruler */}
      <div className="h-10 border-b border-white/5 flex items-center text-[10px] text-gray-500 tracking-wider font-mono">
        <div className="w-[120px] px-5 font-bold uppercase shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
          <span>Pistas</span>
          <div className="flex gap-1">
            {/* Scissors cut split button */}
            <button 
              onClick={handleSplitClip}
              disabled={videoClips.length === 0}
              className="p-1 hover:text-white text-gray-500 disabled:opacity-30 transition-colors cursor-pointer"
              title="Dividir clip en el cursor (Tecla S)"
            >
              <Scissors size={12} />
            </button>
            
            {/* Real-time Mic Voiceover Recorder */}
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-1 transition-colors cursor-pointer ${
                isRecording 
                  ? 'text-red-500 animate-pulse' 
                  : 'text-gray-500 hover:text-white'
              }`}
              title={isRecording ? "Detener Grabación de Voz" : "Grabar Voz en Off en el cursor"}
            >
              {isRecording ? <MicOff size={12} /> : <Mic size={12} />}
            </button>
          </div>
        </div>
        
        {/* Visual Ruler */}
        <div 
          ref={timelineTrackRef}
          className="flex-1 h-full relative cursor-pointer" 
          onClick={handleTimelineScrub}
        >
          {Array.from({ length: Math.ceil(Math.max(timelineDuration, 5)) + 1 }).map((_, idx) => (
            <div 
              key={idx} 
              className="absolute bottom-0 h-4 border-l border-white/10 flex flex-col justify-between"
              style={{ left: `${(idx / Math.max(timelineDuration, 5)) * 100}%` }}
            >
              <span className="text-[8px] transform -translate-x-1/2 -translate-y-4 select-none">
                {idx}s
              </span>
            </div>
          ))}
          
          {/* Playhead Indicator Needle */}
          {timelineDuration > 0 && (
            <div 
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-50 pointer-events-none"
              style={{ left: `${(playbackTime / timelineDuration) * 100}%` }}
            >
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full transform -translate-x-[40%] -translate-y-[40%]" />
            </div>
          )}
        </div>
      </div>

      {/* SCROLLABLE TRACK CONTENT */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col select-none bg-black/20">
        
        {/* V5: AJUSTES TRACK */}
        {nodesList.length > 0 && nodeConnections.length > 0 && (
          <div className="h-8 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/30 shrink-0">
            <div className="w-[120px] px-5 font-bold text-[9px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
              <span>V5 Ajustes</span>
            </div>
            <div className="flex-1 h-full px-2 flex items-center relative">
              <div className="h-[75%] rounded bg-indigo-600/20 border border-indigo-500/30 flex items-center px-2 text-[9px] text-indigo-300 font-bold w-full max-w-[280px]">
                🎛️ Ajustes de Color Globales (Nodal)
              </div>
            </div>
          </div>
        )}

        {/* V4: TITULOS TRACK */}
        {titleClips.length > 0 && (
          <div className="h-8 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/20 shrink-0">
            <div className="w-[120px] px-5 font-bold text-[9px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
              <span>V4 Títulos</span>
            </div>
            <div className="flex-1 h-full px-2 flex items-center relative bg-white/[0.005]">
              {titleClips.map((clip) => {
                const clipDuration = getClipPlayDuration(clip);
                const percentWidth = (clipDuration / Math.max(timelineDuration, 5)) * 100;
                const startOffset = ((clip.timelineStart || 0) / Math.max(timelineDuration, 5)) * 100;

                return (
                  <div 
                    key={clip.id}
                    onClick={() => setSelectedClipId(clip.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedClipId(clip.id);
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        clipId: clip.id,
                        type: 'clip'
                      });
                    }}
                    onPointerDown={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.getAttribute('data-resize-handle')) return;
                      handleOverlayTimelineDrag(e, clip.id, clip.timelineStart || 0);
                    }}
                    className={`h-[80%] rounded border flex flex-col justify-center px-2 cursor-pointer absolute shrink-0 transition-shadow select-none group/timeline-overlay overflow-hidden ${
                      selectedClipId === clip.id 
                        ? 'border-[#7B5CFF] bg-[#7B5CFF]/25 shadow-[0_0_10px_rgba(123,92,255,0.3)] ring-1 ring-[#7B5CFF]' 
                        : 'border-white/10 bg-[#1b1230] hover:border-white/30'
                    }`}
                    style={{ 
                      width: `${Math.max(percentWidth, 10)}%`,
                      left: `${startOffset}%`
                    }}
                  >
                    {selectedClipId === clip.id && (
                      <>
                        <div 
                          data-resize-handle="true"
                          className="absolute left-0 top-0 bottom-0 w-2 bg-[#7B5CFF]/60 cursor-ew-resize hover:bg-[#7B5CFF] z-10 rounded-l" 
                          onPointerDown={(e) => handleTimelineResize(e, clip.id, 'left', 'video')}
                        />
                        <div 
                          data-resize-handle="true"
                          className="absolute right-0 top-0 bottom-0 w-2 bg-[#7B5CFF]/60 cursor-ew-resize hover:bg-[#7B5CFF] z-10 rounded-r" 
                          onPointerDown={(e) => handleTimelineResize(e, clip.id, 'right', 'video')}
                        />
                      </>
                    )}
                    <div className="flex justify-between items-center gap-1">
                      <span className="text-[8.5px] font-bold truncate block">{clip.name}</span>
                      <span className="text-[7px] text-gray-400 font-mono shrink-0">{clipDuration.toFixed(1)}s</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* V3: EFECTOS TRACK */}
        {nodesList.length > 0 && nodeConnections.length > 0 && (
          <div className="h-8 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/30 shrink-0">
            <div className="w-[120px] px-5 font-bold text-[9px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
              <span>V3 Efectos</span>
            </div>
            <div className="flex-1 h-full px-2 flex items-center relative">
              <div className="h-[75%] rounded bg-pink-500/20 border border-pink-500/30 flex items-center px-2 text-[9px] text-pink-300 font-bold w-full max-w-[200px]">
                ✨ Filtro Nodal Conectado
              </div>
            </div>
          </div>
        )}

        {/* V2: SUPERPOSICIONES TRACK */}
        <div className="h-11 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/20 shrink-0">
          <div className="w-[120px] px-5 font-bold text-[9px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
            <span>V2 Superposiciones</span>
          </div>
          <div className="flex-1 h-full px-2 flex items-center relative bg-white/[0.005]">
            {mediaOverlayClips.map((clip) => {
              const clipDuration = getClipPlayDuration(clip);
              const percentWidth = (clipDuration / Math.max(timelineDuration, 5)) * 100;
              const startOffset = ((clip.timelineStart || 0) / Math.max(timelineDuration, 5)) * 100;

              return (
                <div 
                  key={clip.id}
                  onClick={() => setSelectedClipId(clip.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedClipId(clip.id);
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      clipId: clip.id,
                      type: 'clip'
                    });
                  }}
                  onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.getAttribute('data-resize-handle')) return;
                    handleOverlayTimelineDrag(e, clip.id, clip.timelineStart || 0);
                  }}
                  className={`h-[80%] rounded border flex flex-col justify-between p-1 cursor-pointer absolute shrink-0 transition-shadow select-none group/timeline-overlay overflow-hidden ${
                    selectedClipId === clip.id 
                      ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.3)] ring-1 ring-blue-500' 
                      : 'border-white/10 bg-[#0c1322] hover:border-white/30'
                  }`}
                  style={{ 
                    width: `${Math.max(percentWidth, 10)}%`,
                    left: `${startOffset}%`
                  }}
                >
                  {selectedClipId === clip.id && (
                    <>
                      <div 
                        data-resize-handle="true"
                        className="absolute left-0 top-0 bottom-0 w-2.5 bg-blue-500/60 cursor-ew-resize hover:bg-blue-400 z-10 rounded-l" 
                        onPointerDown={(e) => handleTimelineResize(e, clip.id, 'left', 'video')}
                      />
                      <div 
                        data-resize-handle="true"
                        className="absolute right-0 top-0 bottom-0 w-2.5 bg-blue-500/60 cursor-ew-resize hover:bg-blue-400 z-10 rounded-r" 
                        onPointerDown={(e) => handleTimelineResize(e, clip.id, 'right', 'video')}
                      />
                    </>
                  )}
                  <div className="flex justify-between items-center gap-1 leading-none">
                    <span className="text-[8.5px] font-bold truncate block">{clip.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}
                      className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors z-20 shrink-0"
                    >
                      <Trash2 size={8} />
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-[7px] text-gray-400 font-mono leading-none">
                    <span>{clip.type === 'video' ? '🎬 PIP' : '🖼️ PIP'}</span>
                    <span>{clipDuration.toFixed(1)}s</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* V1: VIDEO PRINCIPAL TRACK */}
        <div className="h-11 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/30 shrink-0">
          <div className="w-[120px] px-5 font-bold text-[9px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
            <span>V1 Principal</span>
          </div>
          <div className="flex-1 h-full px-2 flex items-center gap-1 overflow-x-auto custom-scrollbar relative">
            {baseClips.map((clip, idx) => {
              const clipDuration = getClipPlayDuration(clip);
              const percentWidth = (clipDuration / Math.max(timelineDuration, 5)) * 100;
              
              return (
                <React.Fragment key={clip.id}>
                  <div 
                    onClick={() => setSelectedClipId(clip.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedClipId(clip.id);
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        clipId: clip.id,
                        type: 'clip'
                      });
                    }}
                    className={`h-[80%] rounded border flex flex-col justify-between p-1 cursor-pointer shrink-0 transition-all relative overflow-hidden ${
                      selectedClipId === clip.id 
                        ? 'border-emerald-500 bg-emerald-500/10' 
                        : 'border-white/10 bg-[#121215] hover:border-white/30'
                    }`}
                    style={{ width: `${Math.max(percentWidth, 12)}%` }}
                  >
                    {selectedClipId === clip.id && (
                      <>
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-2.5 bg-emerald-500/60 cursor-ew-resize hover:bg-emerald-400 z-10 rounded-l" 
                          onPointerDown={(e) => handleTimelineResize(e, clip.id, 'left', 'video')}
                        />
                        <div 
                          className="absolute right-0 top-0 bottom-0 w-2.5 bg-emerald-500/60 cursor-ew-resize hover:bg-emerald-400 z-10 rounded-r" 
                          onPointerDown={(e) => handleTimelineResize(e, clip.id, 'right', 'video')}
                        />
                      </>
                    )}
                    <div className="flex justify-between items-center gap-1 leading-none">
                      <span className="text-[8.5px] font-bold truncate block">{clip.name}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}
                        className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors z-20 shrink-0"
                      >
                        <Trash2 size={8} />
                      </button>
                    </div>
                    <div className="flex justify-between items-center text-[7px] text-gray-400 font-mono leading-none">
                      <span>{clip.type === 'video' ? '🎬 Base' : '🖼️ Base'}</span>
                      <span>{clipDuration.toFixed(1)}s</span>
                    </div>
                  </div>

                  {/* Transition button */}
                  {idx < baseClips.length - 1 && (
                    <button 
                      onClick={() => setSelectedClipId(clip.id)}
                      className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold bg-white/10 hover:bg-white/20 text-gray-400 transition-all cursor-pointer"
                      title={`Transición: ${clip.transitionType}`}
                    >
                      ⧓
                    </button>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* A1: MUSICA TRACK */}
        <div className="h-8 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/20 shrink-0">
          <div className="w-[120px] px-5 font-bold text-[9px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
            <span>A1 Música</span>
          </div>
          <div className="flex-1 h-full px-2 flex items-center relative bg-white/[0.005]">
            {musicTracks.map((track) => {
              const percentWidth = (track.duration / Math.max(timelineDuration, 5)) * 100;
              const startOffset = (track.timelineStart / Math.max(timelineDuration, 5)) * 100;

              return (
                <div 
                  key={track.id}
                  onClick={() => setSelectedAudioId(track.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedAudioId(track.id);
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      audioId: track.id,
                      type: 'audio'
                    });
                  }}
                  onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.getAttribute('data-resize-handle')) return;
                    handleAudioTimelineDrag(e, track.id, track.timelineStart);
                  }}
                  className={`h-[80%] rounded border flex items-center px-1.5 cursor-pointer absolute shrink-0 transition-all overflow-hidden ${
                    selectedAudioId === track.id 
                      ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                      : 'border-white/10 bg-[#070e17] hover:border-white/30'
                  }`}
                  style={{ 
                    width: `${Math.max(percentWidth, 12)}%`,
                    left: `${startOffset}%`
                  }}
                >
                  {selectedAudioId === track.id && (
                    <>
                      <div 
                        data-resize-handle="true"
                        className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500/60 cursor-ew-resize hover:bg-blue-400 z-10 rounded-l" 
                        onPointerDown={(e) => handleTimelineResize(e, track.id, 'left', 'audio')}
                      />
                      <div 
                        data-resize-handle="true"
                        className="absolute right-0 top-0 bottom-0 w-2 bg-blue-500/60 cursor-ew-resize hover:bg-blue-400 z-10 rounded-r" 
                        onPointerDown={(e) => handleTimelineResize(e, track.id, 'right', 'audio')}
                      />
                    </>
                  )}
                  <div className="flex justify-between items-center gap-1.5 h-full w-full">
                    <span className="text-[8px] font-bold truncate block">🎵 {track.name}</span>
                    <div className="flex items-center gap-1 text-[7px] text-gray-400 font-mono shrink-0">
                      <span>V:{track.volume}%</span>
                      <span>{track.duration.toFixed(0)}s</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteAudioTrack(track.id); }}
                        className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors z-20 shrink-0"
                      >
                        <Trash2 size={8} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* A2: EFECTOS DE SONIDO TRACK */}
        <div className="h-8 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/30 shrink-0">
          <div className="w-[120px] px-5 font-bold text-[9px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
            <span>A2 FX Sonidos</span>
          </div>
          <div className="flex-1 h-full px-2 flex items-center relative bg-white/[0.005]">
            {fxTracks.map((track) => {
              const percentWidth = (track.duration / Math.max(timelineDuration, 5)) * 100;
              const startOffset = (track.timelineStart / Math.max(timelineDuration, 5)) * 100;

              return (
                <div 
                  key={track.id}
                  onClick={() => setSelectedAudioId(track.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedAudioId(track.id);
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      audioId: track.id,
                      type: 'audio'
                    });
                  }}
                  onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.getAttribute('data-resize-handle')) return;
                    handleAudioTimelineDrag(e, track.id, track.timelineStart);
                  }}
                  className={`h-[80%] rounded border flex items-center px-1.5 cursor-pointer absolute shrink-0 transition-all overflow-hidden ${
                    selectedAudioId === track.id 
                      ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_10px_rgba(234,179,8,0.3)]' 
                      : 'border-white/10 bg-[#1c190f] hover:border-white/30'
                  }`}
                  style={{ 
                    width: `${Math.max(percentWidth, 12)}%`,
                    left: `${startOffset}%`
                  }}
                >
                  {selectedAudioId === track.id && (
                    <>
                      <div 
                        data-resize-handle="true"
                        className="absolute left-0 top-0 bottom-0 w-2 bg-yellow-500/60 cursor-ew-resize hover:bg-yellow-400 z-10 rounded-l" 
                        onPointerDown={(e) => handleTimelineResize(e, track.id, 'left', 'audio')}
                      />
                      <div 
                        data-resize-handle="true"
                        className="absolute right-0 top-0 bottom-0 w-2 bg-yellow-500/60 cursor-ew-resize hover:bg-yellow-400 z-10 rounded-r" 
                        onPointerDown={(e) => handleTimelineResize(e, track.id, 'right', 'audio')}
                      />
                    </>
                  )}
                  <div className="flex justify-between items-center gap-1.5 h-full w-full">
                    <span className="text-[8px] font-bold truncate block">⚡ {track.name}</span>
                    <div className="flex items-center gap-1 text-[7px] text-gray-400 font-mono shrink-0">
                      <span>V:{track.volume}%</span>
                      <span>{track.duration.toFixed(0)}s</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteAudioTrack(track.id); }}
                        className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors z-20 shrink-0"
                      >
                        <Trash2 size={8} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* A3: VOZ EN OFF TRACK */}
        <div className="h-8 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/20 shrink-0">
          <div className="w-[120px] px-5 font-bold text-[9px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
            <span>A3 Voz en Off</span>
          </div>
          <div className="flex-1 h-full px-2 flex items-center relative bg-white/[0.005]">
            {voiceTracks.map((track) => {
              const percentWidth = (track.duration / Math.max(timelineDuration, 5)) * 100;
              const startOffset = (track.timelineStart / Math.max(timelineDuration, 5)) * 100;

              return (
                <div 
                  key={track.id}
                  onClick={() => setSelectedAudioId(track.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedAudioId(track.id);
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      audioId: track.id,
                      type: 'audio'
                    });
                  }}
                  onPointerDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.getAttribute('data-resize-handle')) return;
                    handleAudioTimelineDrag(e, track.id, track.timelineStart);
                  }}
                  className={`h-[80%] rounded border flex items-center px-1.5 cursor-pointer absolute shrink-0 transition-all overflow-hidden ${
                    selectedAudioId === track.id 
                      ? 'border-red-500 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                      : 'border-white/10 bg-[#1c1012] hover:border-white/30'
                  }`}
                  style={{ 
                    width: `${Math.max(percentWidth, 12)}%`,
                    left: `${startOffset}%`
                  }}
                >
                  {selectedAudioId === track.id && (
                    <>
                      <div 
                        data-resize-handle="true"
                        className="absolute left-0 top-0 bottom-0 w-2 bg-red-500/60 cursor-ew-resize hover:bg-red-400 z-10 rounded-l" 
                        onPointerDown={(e) => handleTimelineResize(e, track.id, 'left', 'audio')}
                      />
                      <div 
                        data-resize-handle="true"
                        className="absolute right-0 top-0 bottom-0 w-2 bg-red-500/60 cursor-ew-resize hover:bg-red-400 z-10 rounded-r" 
                        onPointerDown={(e) => handleTimelineResize(e, track.id, 'right', 'audio')}
                      />
                    </>
                  )}
                  <div className="flex justify-between items-center gap-1.5 h-full w-full">
                    <span className="text-[8px] font-bold truncate block">🎙️ {track.name}</span>
                    <div className="flex items-center gap-1 text-[7px] text-gray-400 font-mono shrink-0">
                      <span>V:{track.volume}%</span>
                      <span>{track.duration.toFixed(0)}s</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteAudioTrack(track.id); }}
                        className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors z-20 shrink-0"
                      >
                        <Trash2 size={8} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
