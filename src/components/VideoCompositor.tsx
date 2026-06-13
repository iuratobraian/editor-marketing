import React, { useEffect, useRef, useState } from 'react';
import { openDB } from 'idb';
import { VideoLeftSidebar } from './VideoLeftSidebar';
import { VideoPlayer } from './VideoPlayer';
import { VideoTimeline } from './VideoTimeline';
import { VideoInspector } from './VideoInspector';
import { useEditorStore, CANVAS_DIMENSIONS } from '../stores/editorStore';
import type { VideoClip } from '../types';
import type { EffectCategory } from '../lib/videoEffects';
import { VideoExportEngine } from '../modules/VideoExportEngine';
import { RefreshCw } from 'lucide-react';


const PRESET_IMAGES = [
  { name: 'Stock Trading Screen', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80', type: 'image' },
  { name: 'Gold Bull Statue', url: 'https://images.unsplash.com/photo-1579226905180-636b76d96082?auto=format&fit=crop&w=600&q=80', type: 'image' },
  { name: 'Bitcoin & Crypto', url: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=600&q=80', type: 'image' },
  { name: 'Office Workspace', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80', type: 'image' },
  { name: 'Neon City Night', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80', type: 'image' },
  { name: 'Successful Leader', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80', type: 'image' }
];

// Helper to convert SVG URL to base64 PNG Data URL
const convertSvgUrlToPngDataUrl = async (svgUrl: string): Promise<string> => {
  // Fetch SVG content first (Iconify supports CORS fetch)
  const response = await fetch(svgUrl);
  if (!response.ok) throw new Error("Failed to fetch SVG content");
  const svgText = await response.text();

  // Convert to inline base64 data URL to prevent COEP issues when loading in Image
  const base64 = btoa(unescape(encodeURIComponent(svgText)));
  const dataUrl = `data:image/svg+xml;base64,${base64}`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 256;
      canvas.height = img.naturalHeight || 256;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        try {
          const pngUrl = canvas.toDataURL("image/png");
          resolve(pngUrl);
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });
};

// Helper to get or create proxy for a video
const getProxyUrl = async (clipId: string, originalUrl: string, onProgress: (p: number) => void): Promise<string> => {
  const db = await openDB('EditorMarketingDB', 1, {
    upgrade(db) { db.createObjectStore('proxies'); }
  });
  
  // Hash or clipId as key
  const proxyKey = `proxy_${clipId}`;
  const cached = await db.get('proxies', proxyKey);
  if (cached) return URL.createObjectURL(cached);

  // If not cached, need to generate (requires ffmpeg instance)
  // For now return original to avoid circular dependency with VideoExportEngine
  return originalUrl;
};

export const getClipPlayDuration = (clip: VideoClip): number => {
  const origDur = clip.endTrim - clip.startTrim;
  if (clip.type === 'image') return origDur;
  
  if (clip.speedMode === 'curve') {
    const pts = clip.curvePoints || [1, 1, 1, 1, 1];
    const segmentOrig = origDur / 5;
    let total = 0;
    for (let i = 0; i < 5; i++) {
      const speed = pts[i] || 1.0;
      total += segmentOrig / speed;
    }
    return total;
  } else {
    const speed = clip.constantSpeed || 1.0;
    return origDur / speed;
  }
};

export const getClipSourceTimeAndSpeed = (clip: VideoClip, playOffset: number): { sourceTime: number; speed: number } => {
  const origDur = clip.endTrim - clip.startTrim;
  if (clip.type === 'image') {
    return { sourceTime: clip.startTrim + playOffset, speed: 1.0 };
  }

  if (clip.speedMode === 'curve') {
    const pts = clip.curvePoints || [1, 1, 1, 1, 1];
    const deltaD = origDur / 5;
    
    let accumulatedPlayTime = 0;
    for (let i = 0; i < 5; i++) {
      const speed = pts[i] || 1.0;
      const segmentPlayDur = deltaD / speed;
      
      if (playOffset <= accumulatedPlayTime + segmentPlayDur) {
        const segmentElapsedPlay = playOffset - accumulatedPlayTime;
        const segmentElapsedSource = segmentElapsedPlay * speed;
        const sourceTime = clip.startTrim + (i * deltaD) + segmentElapsedSource;
        return { sourceTime, speed };
      }
      accumulatedPlayTime += segmentPlayDur;
    }
    // Fallback (end of clip)
    return { sourceTime: clip.endTrim, speed: pts[4] || 1.0 };
  } else {
    const speed = clip.constantSpeed || 1.0;
    const sourceTime = clip.startTrim + (playOffset * speed);
    return { sourceTime, speed };
  }
};

const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.mkv',
  '.webm',
  '.avi',
  '.m4v',
  '.mpeg',
  '.mpg',
  '.3gp',
  '.ts',
  '.m2ts',
  '.wmv',
  '.flv',
  '.ogv',
]);

function hasSupportedVideoExtension(fileName: string) {
  const cleanName = fileName.toLowerCase().split('?')[0].split('#')[0];
  return Array.from(SUPPORTED_VIDEO_EXTENSIONS).some((ext) => cleanName.endsWith(ext));
}

function isSupportedVideoFile(file: File) {
  return file.type.startsWith('video/') || hasSupportedVideoExtension(file.name);
}

function isSupportedImageFile(file: File) {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name);
}

export default function VideoCompositor() {
  const {
    format,
    videoClips,
    audioTracks,
    selectedClipId,
    selectedAudioId,
    playbackTime,
    isPlaying,
    setVideoClips,
    setAudioTracks,
    setSelectedClipId,
    setPlaybackTime,
    setIsPlaying,
    addVideoClip,
    updateClip,
    deleteClip,
    addAudioTrack,
    updateAudioTrack,
    deleteAudioTrack,
    masterAmbientVolume,
    masterMusicVolume,
    nodesList,
    nodeConnections,
    setNodesList,
    setNodeConnections
  } = useEditorStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const audioPlayersRef = useRef<Record<string, HTMLAudioElement>>({});
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  
  // Scopes canvas refs
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const vectorscopeCanvasRef = useRef<HTMLCanvasElement>(null);
  const histogramCanvasRef = useRef<HTMLCanvasElement>(null);
  const rgbParadeCanvasRef = useRef<HTMLCanvasElement>(null);

  // Copy, paste, and duplicate overlay/sequence clips
  const copiedClipRef = useRef<VideoClip | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    clipId?: string;
    audioId?: string;
    type: 'clip' | 'audio' | 'canvas' | 'timeline';
  } | null>(null);

  const [exportQuality, setExportQuality] = useState<'720p' | '1080p' | '4k' | 'whatsapp'>('1080p');
  const [aspectRatioLock, setAspectRatioLock] = useState<boolean>(false);

  // Vision Pro workspace layout configurations
  const [workspaceLayout, setWorkspaceLayout] = useState<'standard' | 'node-graph'>('standard');
  const [showScopes, setShowScopes] = useState<boolean>(false);
  const [showSlideshowModal, setShowSlideshowModal] = useState<boolean>(false);

  // Slideshow creator settings
  const [slideshowTheme, setSlideshowTheme] = useState<'bodas' | 'viajes' | 'deportes' | 'cyberpunk' | 'corporate'>('viajes');
  const [slideshowDuration, setSlideshowDuration] = useState<number>(4);
  const [slideshowTransition, setSlideshowTransition] = useState<'fade' | 'zoom-in' | 'slide-left' | 'blur' | 'blocks'>('fade');
  const [slideshowPhotos, setSlideshowPhotos] = useState<string[]>(PRESET_IMAGES.map(img => img.url));

  // Node graph drag & drop states
  const [draggingWire, setDraggingWire] = useState<{
    fromId: string;
    fromPin: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const nodeOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const duplicateClip = (clipId: string) => {
    const clip = videoClips.find(c => c.id === clipId);
    if (!clip) return;
    const newId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const duplicated: VideoClip = {
      ...clip,
      id: newId,
      name: `${clip.name} (Copia)`,
      x: clip.placementMode === 'overlay' ? clip.x + 20 : clip.x,
      y: clip.placementMode === 'overlay' ? clip.y + 20 : clip.y,
      timelineStart: clip.placementMode === 'overlay' ? Number(((clip.timelineStart || 0) + 1.0).toFixed(2)) : 0
    };
    
    if (clip.placementMode === 'overlay') {
      setVideoClips([...videoClips, duplicated]);
    } else {
      const idx = videoClips.findIndex(c => c.id === clipId);
      const updated = [...videoClips];
      updated.splice(idx + 1, 0, duplicated);
      setVideoClips(updated);
    }
    setSelectedClipId(newId);
  };

  const copyClip = (clipId: string) => {
    const clip = videoClips.find(c => c.id === clipId);
    if (clip) {
      copiedClipRef.current = JSON.parse(JSON.stringify(clip));
    }
  };

  const pasteClip = () => {
    const copied = copiedClipRef.current;
    if (!copied) return;
    const newId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const formatDims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
    const width = copied.width !== undefined ? copied.width : Math.min(400, formatDims.w);
    const height = copied.height !== undefined ? copied.height : Math.min(400, formatDims.h);
    const x = Math.round((formatDims.w - width) / 2);
    const y = Math.round((formatDims.h - height) / 2);

    const pasted: VideoClip = {
      ...copied,
      id: newId,
      name: `${copied.name} (Pegado)`,
      timelineStart: Number(playbackTime.toFixed(2)),
      placementMode: 'overlay', // Default to overlay when pasting at playhead
      x,
      y,
      width,
      height
    };
    setVideoClips([...videoClips, pasted]);
    setSelectedClipId(newId);
  };

  const moveOverlayDepth = (clipId: string, action: 'front' | 'back') => {
    const clip = videoClips.find(c => c.id === clipId);
    if (!clip) return;
    const others = videoClips.filter(c => c.id !== clipId);
    if (action === 'front') {
      setVideoClips([...others, clip]);
    } else {
      setVideoClips([clip, ...others]);
    }
  };

  // Helper to render static text overlays to high-quality base64 PNG data URLs
  const renderTextClipToDataUrl = (clip: VideoClip): string => {
    const canvas = document.createElement('canvas');
    canvas.width = clip.width || 600;
    canvas.height = clip.height || 200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fontSize = clip.textFontSize || 40;
    const fontFamily = clip.textFontFamily || 'Montserrat';
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = clip.textColor || '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = clip.textContent || 'TEXTO';
    const x = canvas.width / 2;
    const y = canvas.height / 2;

    type ClipTextEffect = NonNullable<VideoClip['textEffect']>;
    const effect = (clip.textEffect || 'none') as ClipTextEffect;
    if (effect === 'neon') {
      ctx.shadowColor = clip.textColor || '#10b981';
      ctx.shadowBlur = 18;
    } else if (effect === 'shadow') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
    } else if (effect === 'glitch') {
      ctx.save();
      ctx.fillStyle = '#ff4d4d';
      ctx.fillText(text, x - 2, y);
      ctx.fillStyle = '#4dd7ff';
      ctx.fillText(text, x + 2, y);
      ctx.restore();
    } else if (effect === 'bounce') {
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetY = 2;
    } else if (effect === 'fade-zoom') {
      ctx.globalAlpha = 0.92;
    } else if (effect === 'typing') {
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 3;
    }

    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    let startY = y - (totalHeight / 2) + (lineHeight / 2);

    lines.forEach((line) => {
      ctx.fillText(line, x, startY);
      startY += lineHeight;
    });

    if (effect === 'typing' && text.length > 0) {
      const lastLineWidth = ctx.measureText(lines[lines.length - 1] || '').width;
      const cursorX = x + (lastLineWidth / 2) + 6;
      const cursorY = startY - lineHeight + 6;
      ctx.fillRect(cursorX, cursorY - fontSize * 0.7, 3, fontSize * 0.95);
    }

    return canvas.toDataURL('image/png');
  };

  // Auto-close context menu on click
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Helper to find snapping points (other clips' start/end or playhead)
  const getMagneticTime = (time: number, excludeId: string, threshold = 0.15): number => {
    const snapPoints: number[] = [0, playbackTime]; // Start of timeline and Playhead
    
    // Add all clips' start and end points
    videoClips.forEach(c => {
      if (c.id === excludeId) return;
      const dur = getClipPlayDuration(c);
      if (c.placementMode === 'overlay') {
        snapPoints.push(c.timelineStart || 0);
        snapPoints.push((c.timelineStart || 0) + dur);
      } else {
        // Sequential clips snapping is more complex but we can add their absolute timeline positions if needed
        // For now, snapping for overlays is the primary goal
      }
    });

    // Add audio tracks' start and end points
    audioTracks.forEach(t => {
      snapPoints.push(t.timelineStart);
      snapPoints.push(t.timelineStart + t.duration);
    });

    for (const point of snapPoints) {
      if (Math.abs(time - point) < threshold) {
        return point;
      }
    }
    return time;
  };

  // Drag timeline overlays to change timelineStart
  const handleOverlayTimelineDrag = (e: React.PointerEvent, clipId: string, initialStart: number) => {
    e.stopPropagation();
    if (!timelineTrackRef.current) return;
    
    const trackWidth = timelineTrackRef.current.clientWidth;
    const maxDur = Math.max(timelineDuration, 5);
    const startX = e.clientX;
    
    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaSec = (deltaX / trackWidth) * maxDur;
      const clip = videoClips.find(c => c.id === clipId);
      if (!clip) return;
      const clipPlayDur = getClipPlayDuration(clip);
      let newStart = Math.max(0, Math.min(maxDur - clipPlayDur, initialStart + deltaSec));
      
      // Apply magnetic snapping
      newStart = getMagneticTime(newStart, clipId);
      
      updateClip(clipId, { timelineStart: Number(newStart.toFixed(2)) });
    };
    
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };
  
  // Scrub on visual ruler click to jump playhead position
  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const maxDur = Math.max(timelineDuration, 5);
    const newTime = (clickX / width) * maxDur;
    setPlaybackTime(Number(Math.min(maxDur, Math.max(0, newTime)).toFixed(2)));
  };

  // Timeline resize handler for trimming clips from left or right edges
  const handleTimelineResize = (
    e: React.PointerEvent<any>, 
    id: string, 
    direction: 'left' | 'right', 
    type: 'video' | 'audio'
  ) => {
    e.stopPropagation();
    if (!timelineTrackRef.current) return;
    
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const trackWidth = rect.width || 500;
    const maxDur = Math.max(timelineDuration, 5);
    const startX = e.clientX;

    if (type === 'video') {
      const clip = videoClips.find(c => c.id === id);
      if (!clip) return;
      const initialStartTrim = clip.startTrim;
      const initialEndTrim = clip.endTrim;
      const initialTimelineStart = clip.timelineStart || 0;
      
      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaSec = (deltaX / trackWidth) * maxDur;
        
        if (clip.placementMode === 'overlay') {
          if (direction === 'left') {
            let newTimelineStart = Math.max(0, initialTimelineStart + deltaSec);
            
            // Apply magnetic snapping to the start edge
            newTimelineStart = getMagneticTime(newTimelineStart, id);
            
            const trimChange = newTimelineStart - initialTimelineStart;
            let newStartTrim = initialStartTrim + trimChange;
            if (newStartTrim < 0) newStartTrim = 0;
            if (newStartTrim > clip.duration - 0.5) newStartTrim = clip.duration - 0.5;
            
            updateClip(id, { 
              timelineStart: Number(newTimelineStart.toFixed(2)),
              startTrim: Number(newStartTrim.toFixed(2))
            });
          } else {
            let newEndTrim = initialEndTrim + deltaSec;
            if (newEndTrim < clip.startTrim + 0.5) newEndTrim = clip.startTrim + 0.5;
            if (newEndTrim > clip.duration) newEndTrim = clip.duration;
            
            // Apply magnetic snapping to the end edge
            const currentClipStart = clip.timelineStart || 0;
            const absoluteEnd = currentClipStart + (newEndTrim - clip.startTrim);
            const snappedAbsoluteEnd = getMagneticTime(absoluteEnd, id);
            const snappedDelta = snappedAbsoluteEnd - absoluteEnd;
            newEndTrim += snappedDelta;
            
            updateClip(id, { endTrim: Number(newEndTrim.toFixed(2)) });
          }
        } else {
          // Sequential clips snapping is handled by their neighbors automatically in the renderer
          if (direction === 'left') {
            let newStartTrim = initialStartTrim + deltaSec;
            if (newStartTrim < 0) newStartTrim = 0;
            if (newStartTrim > clip.endTrim - 0.5) newStartTrim = clip.endTrim - 0.5;
            updateClip(id, { startTrim: Number(newStartTrim.toFixed(2)) });
          } else {
            let newEndTrim = initialEndTrim + deltaSec;
            if (newEndTrim < clip.startTrim + 0.5) newEndTrim = clip.startTrim + 0.5;
            if (newEndTrim > clip.duration) newEndTrim = clip.duration;
            updateClip(id, { endTrim: Number(newEndTrim.toFixed(2)) });
          }
        }
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    } else {
      const track = audioTracks.find(t => t.id === id);
      if (!track) return;
      const initialTimelineStart = track.timelineStart;
      const initialDuration = track.duration;
      const initialStartTrim = track.startTrim;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaSec = (deltaX / trackWidth) * maxDur;

        if (direction === 'left') {
          const newTimelineStart = Math.max(0, initialTimelineStart + deltaSec);
          const trimChange = newTimelineStart - initialTimelineStart;
          let newStartTrim = initialStartTrim + trimChange;
          if (newStartTrim < 0) newStartTrim = 0;
          
          updateAudioTrack(id, {
            timelineStart: Number(newTimelineStart.toFixed(2)),
            startTrim: Number(newStartTrim.toFixed(2))
          });
        } else {
          let newDuration = initialDuration + deltaSec;
          if (newDuration < 0.5) newDuration = 0.5;
          updateAudioTrack(id, { duration: Number(newDuration.toFixed(2)) });
        }
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }
  };

  // State variables for Left Sidebar stock/tabs search
  const [leftSidebarTab, setLeftSidebarTab] = useState<'presets' | 'search-photos' | 'search-icons' | 'text-effects' | 'transitions' | 'effects' | 'youtube-downloads'>('presets');
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [photoSearchResults, setPhotoSearchResults] = useState<any[]>([]);
  const [isSearchingPhotos, setIsSearchingPhotos] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState('');
  const [iconSearchResults, setIconSearchResults] = useState<string[]>([]);
  const [isSearchingIcons, setIsSearchingIcons] = useState(false);

  // Search photos on Pixabay/Openverse with robust fallbacks
  const handleSearchPhotos = async () => {
    if (!photoSearchQuery.trim()) return;
    setIsSearchingPhotos(true);
    try {
      const query = encodeURIComponent(photoSearchQuery.trim());
      // 1. Try Pixabay (key provided by user, open CORS)
      const pixabayUrl = `https://pixabay.com/api/?key=2422501-8311ab81ff61d798fcf9ed297&q=${query}&image_type=photo&per_page=24`;
      let response = await fetch(pixabayUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && data.hits && data.hits.length > 0) {
          const mapped = data.hits.map((hit: any) => ({
            id: `pix_${hit.id}`,
            urls: {
              regular: hit.largeImageURL || hit.webformatURL,
              thumb: hit.previewURL,
              small: hit.webformatURL
            },
            alt_description: hit.tags || 'Foto Stock',
            description: `De ${hit.user} en Pixabay`
          }));
          setPhotoSearchResults(mapped);
          return;
        }
      }

      // 2. Fallback to WordPress Openverse search
      const openverseUrl = `https://api.openverse.org/v1/images/?q=${query}&page_size=20`;
      response = await fetch(openverseUrl);
      if (response.ok) {
        const data = await response.json();
        if (data && data.results && data.results.length > 0) {
          const mapped = data.results.map((item: any) => ({
            id: `opv_${item.id}`,
            urls: {
              regular: item.url,
              thumb: item.thumbnail,
              small: item.thumbnail
            },
            alt_description: item.title || 'Foto Stock',
            description: `De ${item.creator || 'Desconocido'} en Openverse`
          }));
          setPhotoSearchResults(mapped);
          return;
        }
      }

      setPhotoSearchResults([]);
      alert("No se encontraron resultados en los catálogos libres.");
    } catch (e: any) {
      console.error("Stock photo search failed:", e);
      // Last-resort fallback through proxy
      try {
        const query = encodeURIComponent(photoSearchQuery.trim());
        const targetUrl = `https://api.openverse.org/v1/images/?q=${query}&page_size=20`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const proxyRes = await fetch(proxyUrl);
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          const parsed = JSON.parse(json.contents);
          if (parsed && parsed.results) {
            const mapped = parsed.results.map((item: any) => ({
              id: `prox_${item.id}`,
              urls: {
                regular: item.url,
                thumb: item.thumbnail,
                small: item.thumbnail
              },
              alt_description: item.title || 'Foto Stock',
              description: `De ${item.creator || 'Desconocido'} en Openverse`
            }));
            setPhotoSearchResults(mapped);
            return;
          }
        }
      } catch (err: any) {
        console.error("Proxy search failed as well:", err);
      }
      alert("Error al buscar fotos: " + e.message);
    } finally {
      setIsSearchingPhotos(false);
    }
  };

  // Search icons on Iconify Search API
  const handleSearchIcons = async () => {
    if (!iconSearchQuery.trim()) return;
    setIsSearchingIcons(true);
    try {
      const response = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(iconSearchQuery.trim())}&limit=32`);
      if (!response.ok) throw new Error("Icon search failed");
      const data = await response.json();
      if (data && data.icons) {
        setIconSearchResults(data.icons);
      } else {
        setIconSearchResults([]);
      }
    } catch (e: any) {
      console.error(e);
      alert("Error al buscar iconos: " + e.message);
    } finally {
      setIsSearchingIcons(false);
    }
  };

  // Convert SVG icon to PNG Data URL and add to workspace
  const handleAddIcon = async (iconFullName: string) => {
    const parts = iconFullName.split(':');
    const prefix = parts[0] || 'lucide';
    const name = parts[1] || '';
    if (!name) return;
    
    const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?color=white&width=256&height=256`;
    
    try {
      const pngDataUrl = await convertSvgUrlToPngDataUrl(svgUrl);
      addVideoClip({
        type: 'image',
        url: pngDataUrl,
        name: `Icono: ${name}`,
        duration: 3,
        startTrim: 0,
        endTrim: 3,
        volume: 0,
        placementMode: addMode
      });
    } catch (e) {
      console.warn("SVG to PNG conversion failed, adding SVG URL directly:", e);
      addVideoClip({
        type: 'image',
        url: svgUrl,
        name: `Icono: ${name} (SVG)`,
        duration: 3,
        startTrim: 0,
        endTrim: 3,
        volume: 0,
        placementMode: addMode
      });
    }
  };
  
  // Add mode for assets (sequence on main track or absolute overlay)
  const [addMode, setAddMode] = useState<'sequence' | 'overlay'>('sequence');
  
  // Scale and dimensions state
  const [containerScale, setContainerScale] = useState(1);

  // ResizeObserver for tracking preview container dimensions
  useEffect(() => {
    if (!previewContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (!previewContainerRef.current) return;
      const container = previewContainerRef.current;
      const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
      setContainerScale(container.offsetWidth / dims.w);
    });
    resizeObserver.observe(previewContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [format, videoClips]);

  const resizeInfoRef = useRef<{
    handle: string | null; // 'move' | 'tl' | 'tr' | 'bl' | 'br'
    initialPointer: { x: number; y: number };
    initialClipLayout: { x: number; y: number; width: number; height: number };
    scaleFactor: number;
  }>({
    handle: null,
    initialPointer: { x: 0, y: 0 },
    initialClipLayout: { x: 0, y: 0, width: 0, height: 0 },
    scaleFactor: 1
  });

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportLogs, setExportLogs] = useState('');
  const exportEngineRef = useRef<VideoExportEngine | null>(null);

  // Split and recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Layout toggles and sizing
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [timelineHeight, setTimelineHeight] = useState(240);

  // Transitions & Effects states
  const [customTransitions, setCustomTransitions] = useState<{ name: string; url: string }[]>([]);
  const [activeEffectCategory, setActiveEffectCategory] = useState<EffectCategory>('Tendencias');

  // Viewport refs and sizing
  const viewportParentRef = useRef<HTMLDivElement>(null);
  const formatDims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
  const playerDimensions = { width: formatDims.w, height: formatDims.h };

  // Calculate timeline durations
  const getTimelineDuration = () => {
    const seqClips = videoClips.filter(c => c.placementMode !== 'overlay');
    let seqTotal = 0;
    for (let i = 0; i < seqClips.length; i++) {
      const clip = seqClips[i];
      const trimmedDur = getClipPlayDuration(clip);
      const transDur = (i < seqClips.length - 1 && clip.transitionType !== 'none') 
        ? (clip.transitionDuration / 1000) 
        : 0;
      seqTotal += trimmedDur - transDur;
    }

    const overlayClips = videoClips.filter(c => c.placementMode === 'overlay');
    let overlayMax = 0;
    for (const clip of overlayClips) {
      const clipDur = getClipPlayDuration(clip);
      const clipEnd = (clip.timelineStart || 0) + clipDur;
      if (clipEnd > overlayMax) {
        overlayMax = clipEnd;
      }
    }

    return Math.max(seqTotal, overlayMax, 0.1);
  };

  const timelineDuration = getTimelineDuration();

  // Resize timeline height
  const handleTimelineHeightResize = (e: React.PointerEvent) => {
    const startY = e.clientY;
    const startHeight = timelineHeight;
    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaY = moveEvent.clientY - startY;
      setTimelineHeight(Math.max(100, Math.min(600, startHeight - deltaY)));
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Import transitions directory fallback support
  const handleImportTransitionsFolder = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: { name: string; url: string }[] = [];
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            if (isSupportedVideoFile(file) || isSupportedImageFile(file)) {
              files.push({ name: file.name, url: URL.createObjectURL(file) });
            }
          }
        }
        setCustomTransitions(prev => [...prev, ...files]);
      } catch (e) {
        console.error("Dir picker error, using input fallback", e);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      (input as any).webkitdirectory = true;
      (input as any).directory = true;
      input.multiple = true;
      input.onchange = (e: any) => {
        const filesList = Array.from(e.target.files || []) as File[];
        const loaded = filesList
          .filter(file => isSupportedVideoFile(file) || isSupportedImageFile(file))
          .map(file => ({ name: file.name, url: URL.createObjectURL(file) }));
        setCustomTransitions(prev => [...prev, ...loaded]);
      };
      input.click();
    }
  };

  // Audio timeline track drag handler
  const handleAudioTimelineDrag = (e: React.PointerEvent<any>, trackId: string, initialStart: number) => {
    if (!timelineTrackRef.current) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const handlePointerMove = (moveEv: PointerEvent) => {
      const deltaX = moveEv.clientX - startX;
      const deltaSeconds = (deltaX / rect.width) * Math.max(timelineDuration, 5);
      let newStart = Math.max(0, initialStart + deltaSeconds);
      
      // Apply magnetic snapping
      newStart = getMagneticTime(newStart, trackId);
      
      updateAudioTrack(trackId, { timelineStart: Number(newStart.toFixed(2)) });
    };
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Find active base clip, transition clips, and active overlays at playbackTime
  const getPlaybackState = (time: number) => {
    if (videoClips.length === 0) return null;

    const seqClips = videoClips.filter(c => c.placementMode !== 'overlay');
    const overlayClips = videoClips.filter(c => c.placementMode === 'overlay');

    let activeBaseClip: VideoClip | null = null;
    let activeBaseClipIndex = -1;
    let baseLocalTime = 0;
    let nextBaseClip: VideoClip | null = null;
    let nextBaseClipLocalTime = 0;
    let inTransition = false;
    let transitionProgress = 0;
    let transitionType: 'none' | 'fade' | 'slide-left' | 'zoom-in' | 'blur' | 'camera-open' | 'camera-close' | 'blocks' = 'none';

    // 1. Calculate sequential base playback
    if (seqClips.length > 0) {
      let elapsed = 0;
      let found = false;
      for (let i = 0; i < seqClips.length; i++) {
        const clip = seqClips[i];
        const trimmedDur = getClipPlayDuration(clip);
        const nextClip = seqClips[i + 1] || null;
        const transDur = (i < seqClips.length - 1 && clip.transitionType !== 'none') 
          ? (clip.transitionDuration / 1000) 
          : 0;
        
        const clipStart = elapsed;
        const clipEnd = elapsed + trimmedDur;
        const transStart = clipEnd - transDur;

        if (time >= clipStart && time <= clipEnd) {
          activeBaseClip = clip;
          activeBaseClipIndex = i;
          
          const playOffset = time - clipStart;
          const { sourceTime } = getClipSourceTimeAndSpeed(clip, playOffset);
          baseLocalTime = sourceTime;

          if (nextClip && time >= transStart && transDur > 0) {
            const transProgress = (time - transStart) / transDur;
            nextBaseClip = nextClip;
            
            const nextPlayOffset = time - transStart;
            const { sourceTime: nextSourceTime } = getClipSourceTimeAndSpeed(nextClip, nextPlayOffset);
            nextBaseClipLocalTime = nextSourceTime;
            
            inTransition = true;
            transitionProgress = Math.min(Math.max(transProgress, 0), 1);
            transitionType = clip.transitionType;
          }
          found = true;
          break;
        }

        elapsed += trimmedDur - transDur;
      }

      if (!found) {
        // Playback beyond last clip: clamp to end
        const lastIdx = seqClips.length - 1;
        const lastClip = seqClips[lastIdx];
        activeBaseClip = lastClip;
        activeBaseClipIndex = lastIdx;
        baseLocalTime = lastClip.endTrim;
      }
    }

    // 2. Find active overlay layers
    const activeOverlays = overlayClips.filter(clip => {
      const start = clip.timelineStart || 0;
      const dur = getClipPlayDuration(clip);
      return time >= start && time <= (start + dur);
    }).map(clip => {
      const playOffset = time - (clip.timelineStart || 0);
      const { sourceTime } = getClipSourceTimeAndSpeed(clip, playOffset);
      return { clip, localTime: sourceTime };
    });

    return {
      activeBaseClip,
      activeBaseClipIndex,
      baseLocalTime,
      nextBaseClip,
      nextBaseClipLocalTime,
      inTransition,
      transitionProgress,
      transitionType,
      activeOverlays
    };
  };

  const currentPlayback = getPlaybackState(playbackTime);
  const selectedClip = videoClips.find(c => c.id === selectedClipId);

  // Sync background audio players
  useEffect(() => {
    audioTracks.forEach((track) => {
      let player = audioPlayersRef.current[track.id];
      if (!player) {
        player = new Audio(track.url);
        player.loop = false;
        audioPlayersRef.current[track.id] = player;
      }
      
      player.volume = (track.volume / 100) * (masterMusicVolume / 100);
      
      const trackEnd = track.timelineStart + track.duration;
      const isActive = isPlaying && playbackTime >= track.timelineStart && playbackTime <= trackEnd;
      
      if (isActive) {
        const expectedTime = track.startTrim + (playbackTime - track.timelineStart);
        if (Math.abs(player.currentTime - expectedTime) > 0.25) {
          player.currentTime = expectedTime;
        }
        if (player.paused) {
          player.play().catch(() => {});
        }
      } else {
        if (!player.paused) {
          player.pause();
        }
      }
    });

    // Clean deleted tracks
    Object.keys(audioPlayersRef.current).forEach((id) => {
      if (!audioTracks.some(t => t.id === id)) {
        audioPlayersRef.current[id].pause();
        delete audioPlayersRef.current[id];
      }
    });
  }, [isPlaying, playbackTime, audioTracks, masterMusicVolume]);

  // Handle active video node media seek / play sync (both base sequential and overlays)
  useEffect(() => {
    if (!currentPlayback) return;
    
    const { activeBaseClip, baseLocalTime, nextBaseClip, nextBaseClipLocalTime, inTransition } = currentPlayback;

    // Direct active base video properties sync
    if (activeBaseClip && activeBaseClip.type === 'video' && videoRef.current) {
      const vid = videoRef.current;
      vid.volume = (activeBaseClip.volume / 100) * (masterAmbientVolume / 100);
      
      if (Math.abs(vid.currentTime - baseLocalTime) > 0.25) {
        vid.currentTime = baseLocalTime;
      }

      if (isPlaying) {
        if (vid.paused) vid.play().catch(() => {});
      } else {
        if (!vid.paused) vid.pause();
      }
    }

    // Sync next transition clip video
    if (inTransition && nextBaseClip && nextBaseClip.type === 'video' && nextVideoRef.current) {
      const nextVid = nextVideoRef.current;
      nextVid.volume = (nextBaseClip.volume / 100) * (masterAmbientVolume / 100);
      
      if (Math.abs(nextVid.currentTime - nextBaseClipLocalTime) > 0.25) {
        nextVid.currentTime = nextBaseClipLocalTime;
      }

      if (isPlaying) {
        if (nextVid.paused) nextVid.play().catch(() => {});
      } else {
        if (!nextVid.paused) nextVid.pause();
      }
    }

    // Sync all active overlay video elements in the DOM
    const overlayVideos = document.querySelectorAll('video[data-overlay-clip-id]');
    overlayVideos.forEach((vidEl) => {
      const videoHtml = vidEl as HTMLVideoElement;
      const clipId = videoHtml.getAttribute('data-overlay-clip-id');
      const localTimeStr = videoHtml.getAttribute('data-local-time');
      if (!clipId || !localTimeStr) return;

      const localTime = parseFloat(localTimeStr);
      const clip = videoClips.find(c => c.id === clipId);
      if (!clip) return;

      videoHtml.volume = (clip.volume / 100) * (masterAmbientVolume / 100);
      
      if (Math.abs(videoHtml.currentTime - localTime) > 0.25) {
        videoHtml.currentTime = localTime;
      }
      
      if (isPlaying) {
        if (videoHtml.paused) videoHtml.play().catch(() => {});
      } else {
        if (!videoHtml.paused) videoHtml.pause();
      }
    });
  }, [isPlaying, playbackTime, currentPlayback, videoClips, masterAmbientVolume]);

  // Timeline playback ticking clock
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const tick = () => {
      if (!isPlaying) return;

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      if (timelineDuration > 0) {
        setPlaybackTime((prev) => {
          const next = prev + delta;
          if (next >= timelineDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }
      animId = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      lastTime = performance.now();
      animId = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(animId);
  }, [isPlaying, timelineDuration, setPlaybackTime, setIsPlaying]);

  // Drag-and-drop & resize handles handlers
  const handlePreviewPointerDown = (e: React.PointerEvent, handleType: 'move' | 'tl' | 'tr' | 'bl' | 'br') => {
    if (!selectedClip || !previewContainerRef.current) return;
    
    e.stopPropagation();
    
    const container = previewContainerRef.current;
    const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
    const scaleFactor = container.offsetWidth / dims.w;

    resizeInfoRef.current = {
      handle: handleType,
      initialPointer: { x: e.clientX, y: e.clientY },
      initialClipLayout: {
        x: selectedClip.x !== undefined ? selectedClip.x : 0,
        y: selectedClip.y !== undefined ? selectedClip.y : 0,
        width: selectedClip.width !== undefined ? selectedClip.width : dims.w,
        height: selectedClip.height !== undefined ? selectedClip.height : dims.h
      },
      scaleFactor
    };

    window.addEventListener('pointermove', handlePreviewPointerMove);
    window.addEventListener('pointerup', handlePreviewPointerUp);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePreviewPointerMove = (e: PointerEvent) => {
    const info = resizeInfoRef.current;
    if (!info.handle || !selectedClipId) return;

    const dx = (e.clientX - info.initialPointer.x) / info.scaleFactor;
    const dy = (e.clientY - info.initialPointer.y) / info.scaleFactor;

    const layout = info.initialClipLayout;
    const lockAspect = aspectRatioLock || e.shiftKey;

    if (info.handle === 'move') {
      updateClip(selectedClipId, {
        x: Math.round(layout.x + dx),
        y: Math.round(layout.y + dy)
      });
    } else if (info.handle === 'br') {
      const newWidth = Math.max(20, layout.width + dx);
      let newHeight = Math.max(20, layout.height + dy);
      if (lockAspect) {
        const aspectRatio = layout.width / layout.height;
        newHeight = newWidth / aspectRatio;
      }
      updateClip(selectedClipId, {
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    } else if (info.handle === 'bl') {
      const newWidth = Math.max(20, layout.width - dx);
      let newHeight = Math.max(20, layout.height + dy);
      if (lockAspect) {
        const aspectRatio = layout.width / layout.height;
        newHeight = newWidth / aspectRatio;
      }
      const actualDx = newWidth - layout.width;
      updateClip(selectedClipId, {
        x: Math.round(layout.x - actualDx),
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    } else if (info.handle === 'tr') {
      const newWidth = Math.max(20, layout.width + dx);
      let newHeight = Math.max(20, layout.height - dy);
      if (lockAspect) {
        const aspectRatio = layout.width / layout.height;
        newHeight = newWidth / aspectRatio;
      }
      const actualDy = newHeight - layout.height;
      updateClip(selectedClipId, {
        y: Math.round(layout.y - actualDy),
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    } else if (info.handle === 'tl') {
      const newWidth = Math.max(20, layout.width - dx);
      let newHeight = Math.max(20, layout.height - dy);
      if (lockAspect) {
        const aspectRatio = layout.width / layout.height;
        newHeight = newWidth / aspectRatio;
      }
      const actualDx = newWidth - layout.width;
      const actualDy = newHeight - layout.height;
      updateClip(selectedClipId, {
        x: Math.round(layout.x - actualDx),
        y: Math.round(layout.y - actualDy),
        width: Math.round(newWidth),
        height: Math.round(newHeight)
      });
    }
  };

  const handlePreviewPointerUp = () => {
    resizeInfoRef.current.handle = null;
    window.removeEventListener('pointermove', handlePreviewPointerMove);
    window.removeEventListener('pointerup', handlePreviewPointerUp);
  };

  // Video Split / Cut Logic
  const handleSplitClip = () => {
    if (videoClips.length === 0) return;
    
    // If we have a selected clip, try to split that one first
    const selected = videoClips.find(c => c.id === selectedClipId);
    if (selected) {
      if (selected.placementMode === 'overlay') {
        const start = selected.timelineStart || 0;
        const dur = selected.endTrim - selected.startTrim;
        if (playbackTime > start && playbackTime < start + dur) {
          const relativeTime = playbackTime - start;
          const splitPoint = selected.startTrim + relativeTime;
          
          const clip1 = {
            ...selected,
            endTrim: splitPoint
          };
          
          const id2 = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const clip2: VideoClip = {
            ...selected,
            id: id2,
            startTrim: splitPoint,
            timelineStart: playbackTime
          };

          setVideoClips(prev => prev.map(c => c.id === selected.id ? clip1 : c).concat(clip2));
          setSelectedClipId(clip1.id);
          return;
        }
      } else {
        // Find it in sequential list
        const seqClips = videoClips.filter(c => c.placementMode !== 'overlay');
        let elapsed = 0;
        for (let i = 0; i < seqClips.length; i++) {
          const clip = seqClips[i];
          const trimmedDur = clip.endTrim - clip.startTrim;
          const clipStart = elapsed;
          const clipEnd = elapsed + trimmedDur;
          const transDur = (i < seqClips.length - 1 && clip.transitionType !== 'none') 
            ? (clip.transitionDuration / 1000) 
            : 0;

          if (clip.id === selected.id && playbackTime > clipStart && playbackTime < clipEnd) {
            const relativeTime = playbackTime - clipStart;
            const splitPoint = clip.startTrim + relativeTime;
            
            const clip1 = {
              ...clip,
              endTrim: splitPoint
            };
            
            const id2 = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const clip2: VideoClip = {
              ...clip,
              id: id2,
              startTrim: splitPoint,
            };

            // Replace in global list
            const newClips = [...videoClips];
            const originalIndex = videoClips.findIndex(c => c.id === clip.id);
            newClips.splice(originalIndex, 1, clip1, clip2);
            
            setVideoClips(newClips);
            setSelectedClipId(clip1.id);
            return;
          }
          elapsed += trimmedDur - transDur;
        }
      }
    }

    // Default split logic: find active sequential clip at playbackTime
    const seqClips = videoClips.filter(c => c.placementMode !== 'overlay');
    let elapsed = 0;
    for (let i = 0; i < seqClips.length; i++) {
      const clip = seqClips[i];
      const trimmedDur = clip.endTrim - clip.startTrim;
      const clipStart = elapsed;
      const clipEnd = elapsed + trimmedDur;
      const transDur = (i < seqClips.length - 1 && clip.transitionType !== 'none') 
        ? (clip.transitionDuration / 1000) 
        : 0;

      if (playbackTime > clipStart && playbackTime < clipEnd) {
        const relativeTime = playbackTime - clipStart;
        const splitPoint = clip.startTrim + relativeTime;
        
        const clip1 = {
          ...clip,
          endTrim: splitPoint
        };
        
        const id2 = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const clip2: VideoClip = {
          ...clip,
          id: id2,
          startTrim: splitPoint,
        };

        const newClips = [...videoClips];
        const originalIndex = videoClips.findIndex(c => c.id === clip.id);
        newClips.splice(originalIndex, 1, clip1, clip2);
        
        setVideoClips(newClips);
        setSelectedClipId(clip1.id);
        break;
      }
      elapsed += trimmedDur - transDur;
    }
  };

  // Keyboard Split & Hotkeys Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events when user is focusing an input or textarea
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      
      const key = e.key.toLowerCase();
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierPressed = isMac ? e.metaKey : e.ctrlKey;

      // 1. Play / Pause (Space)
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
        return;
      }

      // 2. Split clip (S or C)
      if (key === 's' || key === 'c') {
        e.preventDefault();
        handleSplitClip();
        return;
      }

      // 3. Delete Selected clip/audio (Delete or Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedClipId) {
          deleteClip(selectedClipId);
        } else if (selectedAudioId) {
          deleteAudioTrack(selectedAudioId);
        }
        return;
      }

      // 4. Duplicate (Ctrl + D)
      if (modifierPressed && key === 'd') {
        e.preventDefault();
        if (selectedClipId) {
          duplicateClip(selectedClipId);
        }
        return;
      }

      // 5. Copy (Ctrl + C)
      if (modifierPressed && key === 'c') {
        e.preventDefault();
        if (selectedClipId) {
          copyClip(selectedClipId);
        }
        return;
      }

      // 6. Paste (Ctrl + V)
      if (modifierPressed && key === 'v') {
        e.preventDefault();
        pasteClip();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoClips, selectedClipId, selectedAudioId, playbackTime, isPlaying]);

  // Voiceover Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const tempAudio = document.createElement('audio');
        tempAudio.src = audioUrl;
        tempAudio.onloadedmetadata = () => {
          addAudioTrack({
            url: audioUrl,
            name: `Voz en off (${new Date().toLocaleTimeString()})`,
            duration: tempAudio.duration || 5,
            startTrim: 0,
            volume: 100,
            timelineStart: playbackTime
          });
        };
      };

      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (err) {
      alert("No se pudo acceder al micrófono para voz en off: " + err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };



  // Upload zones handlers
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach((file) => {
      const isVideo = isSupportedVideoFile(file);
      const isImage = isSupportedImageFile(file);
      
      if (isVideo) {
        const tempVid = document.createElement('video');
        tempVid.preload = 'metadata';
        tempVid.src = URL.createObjectURL(file);
        tempVid.onloadedmetadata = () => {
          addVideoClip({
            type: 'video',
            url: tempVid.src,
            name: file.name,
            duration: tempVid.duration || 5,
            startTrim: 0,
            endTrim: tempVid.duration || 5,
            volume: 100,
            placementMode: addMode
          });
        };
      } else if (isImage) {
        addVideoClip({
          type: 'image',
          url: URL.createObjectURL(file),
          name: file.name,
          duration: 3,
          startTrim: 0,
          endTrim: 3,
          volume: 0,
          placementMode: addMode
        });
      }
    });
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const tempAudio = document.createElement('audio');
      tempAudio.preload = 'metadata';
      tempAudio.src = URL.createObjectURL(file);
      tempAudio.onloadedmetadata = () => {
        addAudioTrack({
          url: tempAudio.src,
          name: file.name,
          duration: tempAudio.duration || 10,
          startTrim: 0,
          volume: 100,
          timelineStart: 0
        });
      };
    });
  };

  // Compile triggered
  const handleExportVideo = async () => {
    if (videoClips.length === 0) {
      alert('La pista de video está vacía.');
      return;
    }

    setIsPlaying(false);
    setIsExporting(true);
    setExportProgress(2);
    setExportLogs('Cargando el motor de renderizado local WebAssembly (sin dependencias CDN)...\n');

    try {
      if (!exportEngineRef.current) {
        exportEngineRef.current = new VideoExportEngine();
      }

      await exportEngineRef.current.init(
        (log) => setExportLogs((prev) => prev + log + '\n'),
        (prog) => setExportProgress(prog)
      );

      setExportLogs((prev) => prev + 'Motor local cargado correctamente. Iniciando procesamiento...\n');
      
      const seqClips = videoClips.filter(c => c.placementMode !== 'overlay');
      const adjustments = videoClips.filter(c => c.type === 'adjustment');
      const effects = videoClips.filter(c => c.type === 'effect');
      
      // Compute sequential timeline positions
      const seqTimeRanges: Record<string, { start: number; end: number }> = {};
      let elapsed = 0;
      for (let i = 0; i < seqClips.length; i++) {
        const clip = seqClips[i];
        const clipDuration = getClipPlayDuration(clip);
        const transDur = (i < seqClips.length - 1 && clip.transitionType !== 'none') 
          ? (clip.transitionDuration / 1000) 
          : 0;
        seqTimeRanges[clip.id] = {
          start: elapsed,
          end: elapsed + clipDuration
        };
        elapsed += clipDuration - transDur;
      }

      // Pre-render kinetic text layers and merge filters from overlapping adjustments/effects
      const processedClips = videoClips
        .filter(c => c.type !== 'adjustment' && c.type !== 'effect')
        .map((clip) => {
          let clipStart = 0;
          let clipEnd = 0;
          if (clip.placementMode === 'overlay') {
            clipStart = clip.timelineStart || 0;
            clipEnd = clipStart + getClipPlayDuration(clip);
          } else {
            const range = seqTimeRanges[clip.id];
            if (range) {
              clipStart = range.start;
              clipEnd = range.end;
            }
          }

          let mergedBrightness = clip.brightness;
          let mergedContrast = clip.contrast;
          let mergedSaturate = clip.saturate;
          let mergedBlur = clip.blur;
          let mergedGrayscale = clip.grayscale;
          let mergedSepia = clip.sepia;
          let mergedHueRotate = clip.hueRotate;
          let mergedOpacity = clip.opacity;
          let improveImage = clip.improveImage;
          let zoomEffect = clip.zoomEffect;
          let effectPreset = clip.effectPreset;

          adjustments.forEach((adj) => {
            const adjStart = adj.timelineStart || 0;
            const adjEnd = adjStart + getClipPlayDuration(adj);
            if (clipStart < adjEnd && clipEnd > adjStart) {
              mergedBrightness = Number((mergedBrightness * (adj.brightness / 100)).toFixed(2));
              mergedContrast = Number((mergedContrast * (adj.contrast / 100)).toFixed(2));
              mergedSaturate = Number((mergedSaturate * (adj.saturate / 100)).toFixed(2));
              mergedBlur = Math.max(mergedBlur, adj.blur);
              mergedGrayscale = Math.max(mergedGrayscale, adj.grayscale);
              mergedSepia = Math.max(mergedSepia, adj.sepia);
              mergedHueRotate = (mergedHueRotate + adj.hueRotate) % 360;
              mergedOpacity = Number((mergedOpacity * (adj.opacity / 100)).toFixed(2));
              if (adj.improveImage) improveImage = true;
            }
          });

          effects.forEach((eff) => {
            const effStart = eff.timelineStart || 0;
            const effEnd = effStart + getClipPlayDuration(eff);
            if (clipStart < effEnd && clipEnd > effStart) {
              if (eff.effectPreset) effectPreset = eff.effectPreset;
              if (eff.zoomEffect && eff.zoomEffect !== 'none') zoomEffect = eff.zoomEffect;
            }
          });

          if (clip.type === 'text') {
            const pngUrl = renderTextClipToDataUrl(clip);
            return {
              ...clip,
              type: 'image' as const,
              url: pngUrl,
              brightness: mergedBrightness,
              contrast: mergedContrast,
              saturate: mergedSaturate,
              blur: mergedBlur,
              grayscale: mergedGrayscale,
              sepia: mergedSepia,
              hueRotate: mergedHueRotate,
              opacity: mergedOpacity,
              improveImage,
              zoomEffect,
              effectPreset
            };
          }

          return {
            ...clip,
            brightness: mergedBrightness,
            contrast: mergedContrast,
            saturate: mergedSaturate,
            blur: mergedBlur,
            grayscale: mergedGrayscale,
            sepia: mergedSepia,
            hueRotate: mergedHueRotate,
            opacity: mergedOpacity,
            improveImage,
            zoomEffect,
            effectPreset
          };
        });

      const blob = await exportEngineRef.current.compile(
        processedClips,
        audioTracks,
        format,
        masterAmbientVolume,
        masterMusicVolume,
        (prog) => setExportProgress(prog),
        (log) => setExportLogs((prev) => prev + log + '\n'),
        exportQuality
      );

      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Structura-Video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      setExportLogs((prev) => prev + 'Compilación exitosa. ¡Descarga completada!\n');
    } catch (e: any) {
      const errorMsg = e instanceof Error ? e.message : (typeof e === 'string' ? e : (e?.message || JSON.stringify(e) || 'Error desconocido'));
      setExportLogs((prev) => prev + `\nERROR EN COMPILACIÓN: ${errorMsg}\n`);
      alert(`Fallo en exportación: ${errorMsg}`);
    }
  };

  // Get connected filter values from nodesList leading to output
  const getNodalFiltersCSS = () => {
    const activeNodeTypes = new Set<string>();
    const nodeValues: Record<string, number> = {};
    
    nodesList.forEach(n => {
      nodeValues[n.id] = n.value;
    });

    const visited = new Set<string>();
    const queue = ['output'];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const incoming = nodeConnections.filter(conn => conn.toId === currentId);
      incoming.forEach(conn => {
        const fromNode = nodesList.find(n => n.id === conn.fromId);
        if (fromNode) {
          activeNodeTypes.add(fromNode.id);
          queue.push(conn.fromId);
        }
      });
    }

    let filterStr = '';
    
    // 1. Saturation
    if (activeNodeTypes.has('saturate')) {
      filterStr += ` saturate(${nodeValues['saturate'] ?? 100}%)`;
    }
    
    // 2. Bloom (increases brightness and contrast slightly)
    if (activeNodeTypes.has('bloom')) {
      const bVal = nodeValues['bloom'] ?? 50;
      filterStr += ` brightness(${100 + bVal * 0.2}%) contrast(${100 + bVal * 0.1}%)`;
    }

    // 3. Glow (soft highlight glow)
    if (activeNodeTypes.has('glow')) {
      const gVal = nodeValues['glow'] ?? 40;
      filterStr += ` brightness(${100 + gVal * 0.3}%)`;
    }

    return filterStr;
  };

  // Get CSS visual filter string for preview
  const getFilterCSS = (clip: VideoClip) => {
    const b = clip.brightness;
    const c = clip.contrast;
    const s = clip.saturate;
    const blurPx = clip.blur;
    const gray = clip.grayscale;
    const sepiaVal = clip.sepia;
    const hueDeg = clip.hueRotate;
    const op = clip.opacity;

    let filterString = `brightness(${b}%) contrast(${c}%) saturate(${s}%) opacity(${op}%)`;
    if (blurPx > 0) filterString += ` blur(${blurPx}px)`;
    if (gray > 0) filterString += ` grayscale(${gray}%)`;
    if (sepiaVal > 0) filterString += ` sepia(${sepiaVal}%)`;
    if (hueDeg > 0) filterString += ` hue-rotate(${hueDeg}deg)`;
    
    if (clip.improveImage) {
      filterString += ` contrast(108%) saturate(110%)`;
    }

    // Apply real-time effects node graph filters!
    filterString += getNodalFiltersCSS();

    return filterString;
  };

  // Render real-time scopes monitor (Parade, Waveform, Vectorscope, Histogram)
  useEffect(() => {
    if (!showScopes) return;
    let animId: number;

    const draw = () => {
      // 1. WAVEFORM
      if (waveformCanvasRef.current) {
        const canvas = waveformCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.fillStyle = '#090B10';
          ctx.fillRect(0, 0, w, h);
          
          // Draw grid lines
          ctx.strokeStyle = '#232A36';
          ctx.lineWidth = 1;
          for (let i = 1; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(0, (h / 5) * i);
            ctx.lineTo(w, (h / 5) * i);
            ctx.stroke();
          }

          // Draw active waveform signal traces
          ctx.strokeStyle = 'rgba(123, 92, 255, 0.45)'; // Theme color principal (#7B5CFF)
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          const baseHeight = h * 0.5;
          const speedFactor = isPlaying ? 0.015 : 0.002;
          for (let x = 0; x < w; x += 1.5) {
            const noiseVal = Math.sin(x * 0.08 + performance.now() * speedFactor) * 12 + 
                             Math.cos(x * 0.03 - performance.now() * speedFactor * 0.5) * 8 +
                             (Math.random() * 4 - 2);
            
            // Adjust depending on active playing clip's brightness
            const brightAdj = selectedClip ? (selectedClip.brightness - 100) * 0.25 : 0;
            const y = baseHeight - noiseVal - brightAdj;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // 2. VECTORSCOPE
      if (vectorscopeCanvasRef.current) {
        const canvas = vectorscopeCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const cx = w / 2;
          const cy = h / 2;
          const r = Math.min(cx, cy) * 0.8;
          
          ctx.fillStyle = '#090B10';
          ctx.fillRect(0, 0, w, h);

          // Grid circle
          ctx.strokeStyle = '#232A36';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
          ctx.stroke();

          // Lines
          ctx.beginPath();
          ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
          ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
          ctx.stroke();

          // Draw vector trace (constantly moving slightly)
          ctx.strokeStyle = 'rgba(0, 200, 255, 0.6)'; // Theme color secundario (#00C8FF)
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          const time = performance.now() * 0.0015;
          const satMultiplier = selectedClip ? (selectedClip.saturate / 100) : 1;
          
          for (let i = 0; i < 40; i++) {
            const angle = time + (i * 0.16);
            const dist = r * 0.45 * satMultiplier * (Math.sin(time * 0.5 + i * 0.1) * 0.6 + 0.4 + Math.random() * 0.15);
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }

      // 3. HISTOGRAM
      if (histogramCanvasRef.current) {
        const canvas = histogramCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.fillStyle = '#090B10';
          ctx.fillRect(0, 0, w, h);

          const timeVal = performance.now() * 0.001;
          const drawHistogramChannel = (color: string, offset: number) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let x = 0; x < w; x += 2) {
              const y = h - (Math.sin(x * 0.02 + offset + timeVal) * (h * 0.25) + 
                           Math.cos(x * 0.01 - timeVal * 0.4) * (h * 0.2) + 
                           (h * 0.3) + Math.random() * 3);
              ctx.lineTo(x, Math.max(0, y));
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fill();
          };

          ctx.globalCompositeOperation = 'screen';
          drawHistogramChannel('rgba(255, 77, 109, 0.4)', 0);      // Red
          drawHistogramChannel('rgba(0, 217, 126, 0.4)', Math.PI / 3);  // Green
          drawHistogramChannel('rgba(0, 200, 255, 0.4)', (2 * Math.PI) / 3); // Blue
          ctx.globalCompositeOperation = 'source-over';
        }
      }

      // 4. RGB PARADE
      if (rgbParadeCanvasRef.current) {
        const canvas = rgbParadeCanvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.fillStyle = '#090B10';
          ctx.fillRect(0, 0, w, h);

          const chW = w / 3;
          const colors = ['rgba(255, 77, 109, 0.5)', 'rgba(0, 217, 126, 0.5)', 'rgba(0, 200, 255, 0.5)'];
          
          ctx.strokeStyle = '#232A36';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(chW, 0); ctx.lineTo(chW, h);
          ctx.moveTo(chW * 2, 0); ctx.lineTo(chW * 2, h);
          ctx.stroke();

          const baseSpeed = isPlaying ? 0.02 : 0.003;
          for (let c = 0; c < 3; c++) {
            ctx.strokeStyle = colors[c];
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            const startX = c * chW;
            const endX = startX + chW;
            
            for (let x = startX; x < endX; x += 1.5) {
              const relX = x - startX;
              const noise = (Math.sin(relX * 0.15 + performance.now() * baseSpeed + c) * 10) + 
                            (Math.cos(relX * 0.05 - performance.now() * baseSpeed * 0.8) * 8) +
                            (Math.random() * 3);
              const y = (h / 2) + noise + (Math.cos(relX * 0.03) * 12);
              if (x === startX) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [showScopes, isPlaying, selectedClip]);

  // Automatic slideshow builder based on photos and chosen theme
  const generateAutoSlideshow = () => {
    const photos = slideshowPhotos.length > 0 ? slideshowPhotos : PRESET_IMAGES.map(img => img.url);
    
    let musicUrl = '/proxy-soundhelix/examples/mp3/SoundHelix-Song-1.mp3';
    let musicName = 'Fondo Romance';

    if (slideshowTheme === 'bodas') {
      musicUrl = '/proxy-soundhelix/examples/mp3/SoundHelix-Song-1.mp3';
      musicName = 'Romantic Nuptials Waltz';
    } else if (slideshowTheme === 'viajes') {
      musicUrl = '/proxy-soundhelix/examples/mp3/SoundHelix-Song-3.mp3';
      musicName = 'Travel Uplifting Adventure';
    } else if (slideshowTheme === 'deportes') {
      musicUrl = '/proxy-soundhelix/examples/mp3/SoundHelix-Song-8.mp3';
      musicName = 'Energizing Synth Parade';
    } else if (slideshowTheme === 'cyberpunk') {
      musicUrl = '/proxy-soundhelix/examples/mp3/SoundHelix-Song-4.mp3';
      musicName = 'Cyberpunk Tokyo Synthwave';
    } else if (slideshowTheme === 'corporate') {
      musicUrl = '/proxy-soundhelix/examples/mp3/SoundHelix-Song-6.mp3';
      musicName = 'Corporate Success Ambience';
    }

    setVideoClips([]);
    setAudioTracks([]);

    const newClips: VideoClip[] = [];
    const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };

    photos.forEach((photoUrl, index) => {
      const clipId = `clip_slide_${Date.now()}_${index}`;
      
      let b = 100, c = 100, s = 100, se = 0, hDeg = 0;
      if (slideshowTheme === 'bodas') {
        b = 108; c = 92; s = 105; se = 15;
      } else if (slideshowTheme === 'cyberpunk') {
        c = 125; s = 145; hDeg = 120;
      } else if (slideshowTheme === 'viajes') {
        b = 102; c = 105; s = 125;
      } else if (slideshowTheme === 'corporate') {
        b = 100; c = 108; s = 95;
      }

      const zoomScale = slideshowTheme === 'viajes' || slideshowTheme === 'bodas' ? 120 : 100;

      const clip: VideoClip = {
        id: clipId,
        type: 'image',
        url: photoUrl,
        name: `Foto ${index + 1} (${slideshowTheme})`,
        duration: slideshowDuration,
        startTrim: 0,
        endTrim: slideshowDuration,
        volume: 0,
        placementMode: 'sequence',
        timelineStart: 0,
        
        x: 0,
        y: 0,
        width: dims.w,
        height: dims.h,
        scale: zoomScale,
        fitMode: 'cover',
        
        transitionType: slideshowTransition,
        transitionDuration: 800,
        
        speedMode: 'constant',
        constantSpeed: 1.0,
        curvePoints: [1.0, 1.0, 1.0, 1.0, 1.0],
        
        brightness: b,
        contrast: c,
        saturate: s,
        grayscale: 0,
        blur: 0,
        sepia: se,
        hueRotate: hDeg,
        opacity: 100,
        improveSound: false,
        improveImage: true
      };

      newClips.push(clip);
    });

    setVideoClips(newClips);

    const transitionAdj = (newClips.length - 1) * 0.8;
    const totalDuration = newClips.length * slideshowDuration - transitionAdj;

    addAudioTrack({
      url: musicUrl,
      name: musicName,
      duration: Math.max(totalDuration, 5),
      startTrim: 0,
      volume: 85,
      timelineStart: 0
    });

    setPlaybackTime(0);
    setShowSlideshowModal(false);
  };

  // Node dragging handlers
  const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNodeId(nodeId);
    
    const node = nodesList.find(n => n.id === nodeId);
    if (!node) return;

    nodeOffsetRef.current = {
      x: e.clientX - node.x,
      y: e.clientY - node.y
    };

    const handlePointerMove = (moveEv: PointerEvent) => {
      const nx = moveEv.clientX - nodeOffsetRef.current.x;
      const ny = moveEv.clientY - nodeOffsetRef.current.y;
      
      setNodesList(prev => prev.map(n => n.id === nodeId ? { ...n, x: Math.max(0, nx), y: Math.max(0, ny) } : n));
    };

    const handlePointerUp = () => {
      setDraggingNodeId(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Connect pins handlers
  const handlePinPointerDown = (e: React.PointerEvent, nodeId: string, pin: string, type: 'in' | 'out') => {
    e.stopPropagation();
    
    const node = nodesList.find(n => n.id === nodeId);
    if (!node) return;

    const px = type === 'out' ? node.x + 180 : node.x;
    const py = node.y + 50;

    setDraggingWire({
      fromId: nodeId,
      fromPin: pin,
      startX: px,
      startY: py,
      currentX: px,
      currentY: py
    });

    const handlePointerMove = (moveEv: PointerEvent) => {
      const container = document.getElementById('node-graph-board');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const curX = moveEv.clientX - rect.left;
      const curY = moveEv.clientY - rect.top;

      setDraggingWire(prev => prev ? { ...prev, currentX: curX, currentY: curY } : null);
    };

    const handlePointerUp = () => {
      setDraggingWire(null);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePinPointerUp = (e: React.PointerEvent, toNodeId: string, toPin: string) => {
    e.stopPropagation();
    if (!draggingWire) return;
    if (draggingWire.fromId === toNodeId) return;

    const newConn = {
      fromId: draggingWire.fromId,
      fromPin: draggingWire.fromPin,
      toId: toNodeId,
      toPin: toPin
    };

    setNodeConnections(prev => {
      const exists = prev.some(c => c.fromId === newConn.fromId && c.toId === newConn.toId);
      if (exists) return prev;
      return [...prev, newConn];
    });

    setDraggingWire(null);
  };

  // Compute transition overlays styles
  const getTransitionStyle = (progress: number, type: string, isNext: boolean): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    if (type === 'fade') {
      styles.opacity = isNext ? progress : 1 - progress;
    } else if (type === 'slide-left') {
      styles.transform = isNext 
        ? `translateX(${(1 - progress) * 100}%)` 
        : `translateX(${-progress * 100}%)`;
    } else if (type === 'zoom-in') {
      styles.opacity = isNext ? progress : 1 - progress;
      styles.transform = isNext 
        ? `scale(${0.8 + progress * 0.2})` 
        : `scale(${1 + progress * 0.2})`;
    } else if (type === 'blur') {
      styles.opacity = isNext ? progress : 1 - progress;
      styles.filter = isNext 
        ? `blur(${(1 - progress) * 20}px)` 
        : `blur(${progress * 20}px)`;
    } else if (type === 'camera-open') {
      styles.clipPath = isNext 
        ? `circle(${progress * 100}% at 50% 50%)` 
        : 'none';
      styles.zIndex = isNext ? 20 : 10;
    } else if (type === 'camera-close') {
      styles.clipPath = isNext 
        ? 'none' 
        : `circle(${(1 - progress) * 100}% at 50% 50%)`;
      styles.zIndex = isNext ? 10 : 20;
    } else if (type === 'blocks') {
      styles.opacity = isNext ? progress : 1 - progress;
      styles.transform = isNext ? 'scale(1)' : `scale(${1 - progress * 0.08})`;
    }
    return styles;
  };



  return (
    <div className="flex flex-1 overflow-hidden bg-[#030304] select-none text-white font-sans">
      
      {/* 1. TIMELINE BUILD WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* UPPER ROW: MEDIA & PREVIEW PLAYER */}
        <div className="flex-1 flex overflow-hidden border-b border-white/5">
          {showLeftSidebar && (
            <VideoLeftSidebar
              leftSidebarTab={leftSidebarTab}
              setLeftSidebarTab={setLeftSidebarTab}
              photoSearchQuery={photoSearchQuery}
              setPhotoSearchQuery={setPhotoSearchQuery}
              photoSearchResults={photoSearchResults}
              isSearchingPhotos={isSearchingPhotos}
              handleSearchPhotos={handleSearchPhotos}
              iconSearchQuery={iconSearchQuery}
              setIconSearchQuery={setIconSearchQuery}
              iconSearchResults={iconSearchResults}
              isSearchingIcons={isSearchingIcons}
              handleSearchIcons={handleSearchIcons}
              handleAddIcon={handleAddIcon}
              customTransitions={customTransitions}
              setCustomTransitions={setCustomTransitions}
              handleImportTransitionsFolder={handleImportTransitionsFolder}
              activeEffectCategory={activeEffectCategory}
              setActiveEffectCategory={setActiveEffectCategory}
              addMode={addMode}
              setAddMode={setAddMode}
              newTemplateName={newTemplateName}
              setNewTemplateName={setNewTemplateName}
              handleMediaUpload={handleMediaUpload}
              handleAudioUpload={handleAudioUpload}
            />
          )}

          <VideoPlayer
            workspaceLayout={workspaceLayout}
            setWorkspaceLayout={setWorkspaceLayout}
            showLeftSidebar={showLeftSidebar}
            setShowLeftSidebar={setShowLeftSidebar}
            showTimeline={showTimeline}
            setShowTimeline={setShowTimeline}
            showRightSidebar={showRightSidebar}
            setShowRightSidebar={setShowRightSidebar}
            showScopes={showScopes}
            setShowScopes={setShowScopes}
            setShowSlideshowModal={setShowSlideshowModal}
            playerDimensions={playerDimensions}
            previewContainerRef={previewContainerRef}
            viewportParentRef={viewportParentRef}
            videoRef={videoRef}
            nextVideoRef={nextVideoRef}
            setContextMenu={setContextMenu}
            currentPlayback={currentPlayback}
            containerScale={containerScale}
            handlePreviewPointerDown={handlePreviewPointerDown}
            getFilterCSS={getFilterCSS}
            getTransitionStyle={getTransitionStyle}
            waveformCanvasRef={waveformCanvasRef}
            vectorscopeCanvasRef={vectorscopeCanvasRef}
            histogramCanvasRef={histogramCanvasRef}
            rgbParadeCanvasRef={rgbParadeCanvasRef}
            nodesList={nodesList}
            nodeConnections={nodeConnections}
            setNodesList={setNodesList}
            setNodeConnections={setNodeConnections}
            draggingNodeId={draggingNodeId}
            draggingWire={draggingWire}
            setDraggingWire={setDraggingWire}
            handleNodePointerDown={handleNodePointerDown}
            handlePinPointerDown={handlePinPointerDown}
            handlePinPointerUp={handlePinPointerUp}
            timelineDuration={timelineDuration}
          />
        </div>

        {showTimeline && (
          <VideoTimeline
            timelineHeight={timelineHeight}
            handleTimelineHeightResize={handleTimelineHeightResize}
            handleSplitClip={handleSplitClip}
            isRecording={isRecording}
            startRecording={startRecording}
            stopRecording={stopRecording}
            timelineTrackRef={timelineTrackRef}
            handleTimelineScrub={handleTimelineScrub}
            timelineDuration={timelineDuration}
            setContextMenu={setContextMenu}
            handleOverlayTimelineDrag={handleOverlayTimelineDrag}
            handleAudioTimelineDrag={handleAudioTimelineDrag}
            handleTimelineResize={handleTimelineResize}
            nodesList={nodesList}
            nodeConnections={nodeConnections}
          />
        )}
      </div>

      {showRightSidebar && (
        <VideoInspector
          handleExportVideo={handleExportVideo}
          exportQuality={exportQuality}
          setExportQuality={setExportQuality}
          timelineDuration={timelineDuration}
          aspectRatioLock={aspectRatioLock}
          setAspectRatioLock={setAspectRatioLock}
        />
      )}

      {/* EXPORT COMPILATION MODAL */}
      {isExporting && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-white select-text">
          <div className="bg-[#09090b] border border-white/10 max-w-[550px] w-full rounded-2xl shadow-2xl p-6 flex flex-col gap-5 max-h-[85vh]">
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-emerald-400 tracking-wider flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                Compilando Video
              </h3>
              <span className="text-xs text-gray-500 font-bold font-mono">{exportProgress}%</span>
            </div>

            {/* Percentage Bar */}
            <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>

            {/* Logger Text Terminal */}
            <div className="flex-1 min-h-[160px] bg-black p-4 rounded-xl border border-white/5 text-[9px] font-mono text-gray-400 overflow-y-auto max-h-[300px] custom-scrollbar">
              <pre className="whitespace-pre-wrap">{exportLogs}</pre>
            </div>

            {/* Modal close/download */}
            <div className="flex gap-2">
              <button 
                onClick={() => setIsExporting(false)}
                disabled={exportProgress < 100 && !exportLogs.includes('ERROR')}
                className="flex-1 py-3 bg-white text-black hover:bg-gray-200 transition-all font-bold text-xs rounded-xl disabled:opacity-40 cursor-pointer text-center"
              >
                {exportProgress >= 100 ? 'Listo' : 'Cerrar Ventana'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 3.5. AUTO-SLIDESHOW CREATOR MODAL */}
      {showSlideshowModal && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-white select-none">
          <div className="bg-[#11151E] border border-[#232A36] max-w-[600px] w-full rounded-2xl shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-[#232A36] pb-3">
              <h3 className="text-sm font-black uppercase text-[#00D97E] tracking-wider flex items-center gap-2">
                <span>🪄</span> Creador de Slideshow Automático
              </h3>
              <button 
                onClick={() => setShowSlideshowModal(false)}
                className="text-gray-400 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
              
              {/* Tema select */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-400 uppercase font-black block">Tema de Slideshow</label>
                <select 
                  value={slideshowTheme}
                  onChange={(e) => setSlideshowTheme(e.target.value as any)}
                  className="w-full bg-[#090B10] border border-[#232A36] p-2.5 rounded-lg text-xs outline-none focus:border-[#7B5CFF]"
                >
                  <option value="viajes">Viajes & Aventuras (Filtro vivo, alegre, tempo medio)</option>
                  <option value="bodas">Bodas & Bodegones (Filtro cálido, suave, tempo lento)</option>
                  <option value="deportes">Deportes & Acción (Filtro contrastado, tempo rápido)</option>
                  <option value="cyberpunk">Cyberpunk & Nocturno (Filtro saturado, neon beats)</option>
                  <option value="corporate">Presentaciones de Negocio (Filtro formal, música motivacional)</option>
                </select>
              </div>

              {/* Duración select */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 uppercase font-black block">Duración Diapositiva (s)</label>
                  <input 
                    type="number"
                    min="2"
                    max="10"
                    value={slideshowDuration}
                    onChange={(e) => setSlideshowDuration(Number(e.target.value))}
                    className="w-full bg-[#090B10] border border-[#232A36] p-2.5 rounded-lg text-xs outline-none focus:border-[#7B5CFF]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 uppercase font-black block">Transición</label>
                  <select 
                    value={slideshowTransition}
                    onChange={(e) => setSlideshowTransition(e.target.value as any)}
                    className="w-full bg-[#090B10] border border-[#232A36] p-2.5 rounded-lg text-xs outline-none focus:border-[#7B5CFF]"
                  >
                    <option value="fade">Disolver (Fade)</option>
                    <option value="zoom-in">Zoom (Ken Burns)</option>
                    <option value="slide-left">Desplazar lateral</option>
                    <option value="blur">Desenfoque (Blur)</option>
                    <option value="blocks">Grilla de bloques</option>
                  </select>
                </div>
              </div>

              {/* Stock Selector Grid */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase font-black block">
                  Selecciona Fotos de la Galería ({slideshowPhotos.length} seleccionadas)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_IMAGES.map((img) => {
                    const isSelected = slideshowPhotos.includes(img.url);
                    return (
                      <div 
                        key={img.name}
                        onClick={() => {
                          if (isSelected) {
                            setSlideshowPhotos(prev => prev.filter(url => url !== img.url));
                          } else {
                            setSlideshowPhotos(prev => [...prev, img.url]);
                          }
                        }}
                        className={`relative aspect-video rounded-xl overflow-hidden border cursor-pointer group transition-all ${
                          isSelected ? 'border-[#00D97E] ring-2 ring-[#00D97E]/30' : 'border-[#232A36] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          {isSelected && (
                            <span className="text-white text-xs bg-[#00D97E] w-5 h-5 rounded-full flex items-center justify-center font-bold">✓</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <div className="flex gap-3 pt-3 border-t border-[#232A36]">
              <button 
                onClick={() => setShowSlideshowModal(false)}
                className="flex-1 py-3 bg-[#161B25] hover:bg-[#232A36] transition-all font-bold text-xs rounded-xl border border-[#232A36] text-gray-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={generateAutoSlideshow}
                disabled={slideshowPhotos.length === 0}
                className="flex-1 py-3 bg-[#00D97E] hover:bg-[#00D97E]/90 transition-all font-bold text-xs rounded-xl text-[#090B10] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Generar Slideshow
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. CONTEXT MENU POPUP */}
      {contextMenu && (
        <div 
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed bg-[#09090b]/95 backdrop-blur-xl border border-white/10 rounded-xl py-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.7)] z-[9999] w-48 text-[11px] text-white flex flex-col font-sans select-none"
        >
          {contextMenu.type === 'clip' && (
            <>
              <button 
                onClick={() => { handleSplitClip(); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-emerald-600 transition-colors flex justify-between items-center cursor-pointer font-semibold"
              >
                <span>Dividir Clip</span>
                <span className="text-gray-400 font-mono text-[9px]">S / C</span>
              </button>
              <button 
                onClick={() => { duplicateClip(contextMenu.clipId!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-emerald-600 transition-colors flex justify-between items-center cursor-pointer font-semibold"
              >
                <span>Duplicar</span>
                <span className="text-gray-400 font-mono text-[9px]">Ctrl+D</span>
              </button>
              <button 
                onClick={() => { copyClip(contextMenu.clipId!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-emerald-600 transition-colors flex justify-between items-center cursor-pointer font-semibold"
              >
                <span>Copiar</span>
                <span className="text-gray-400 font-mono text-[9px]">Ctrl+C</span>
              </button>
              <button 
                onClick={() => {
                  const clip = videoClips.find(c => c.id === contextMenu.clipId);
                  if (clip) {
                    const newMode = clip.placementMode === 'overlay' ? 'sequence' : 'overlay';
                    updateClip(clip.id, { placementMode: newMode });
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-emerald-600 transition-colors flex justify-between items-center border-b border-white/5 cursor-pointer font-semibold"
              >
                <span>Mover a {videoClips.find(c => c.id === contextMenu.clipId)?.placementMode === 'overlay' ? 'Pista Principal' : 'Superposición'}</span>
              </button>
              {videoClips.find(c => c.id === contextMenu.clipId)?.placementMode === 'overlay' && (
                <>
                  <button 
                    onClick={() => { moveOverlayDepth(contextMenu.clipId!, 'front'); setContextMenu(null); }}
                    className="w-full text-left px-4 py-2 hover:bg-emerald-600 transition-colors cursor-pointer font-semibold"
                  >
                    Traer al frente
                  </button>
                  <button 
                    onClick={() => { moveOverlayDepth(contextMenu.clipId!, 'back'); setContextMenu(null); }}
                    className="w-full text-left px-4 py-2 hover:bg-emerald-600 transition-colors border-b border-white/5 cursor-pointer font-semibold"
                  >
                    Enviar al fondo
                  </button>
                </>
              )}
              <button 
                onClick={() => { deleteClip(contextMenu.clipId!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-red-600 text-red-100 transition-colors flex justify-between items-center cursor-pointer font-bold mt-1"
              >
                <span>Eliminar Clip</span>
                <span className="text-red-300/60 font-mono text-[9px]">Del</span>
              </button>
            </>
          )}

          {contextMenu.type === 'audio' && (
            <>
              <button 
                onClick={() => { deleteAudioTrack(contextMenu.audioId!); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-red-600 text-red-100 transition-colors flex justify-between items-center cursor-pointer font-bold mt-1"
              >
                <span>Eliminar Audio</span>
                <span className="text-red-300/60 font-mono text-[9px]">Del</span>
              </button>
            </>
          )}

          {contextMenu.type === 'canvas' && (
            <>
              <button 
                onClick={() => {
                  const formatDims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                  addVideoClip({
                    type: 'text',
                    url: '',
                    name: 'Texto Animado',
                    duration: 4,
                    startTrim: 0,
                    endTrim: 4,
                    volume: 0,
                    placementMode: 'overlay',
                    textContent: 'TEXTO ANIMADO',
                    textColor: '#ffffff',
                    textFontSize: 48,
                    textFontFamily: 'Montserrat',
                    textEffect: 'none',
                    x: Math.round((formatDims.w - 500) / 2),
                    y: Math.round((formatDims.h - 150) / 2),
                    width: 500,
                    height: 150
                  } as any);
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-emerald-600 transition-colors cursor-pointer font-semibold border-b border-white/5"
              >
                Añadir Texto Animado
              </button>
              <button 
                onClick={() => { pasteClip(); setContextMenu(null); }}
                disabled={!copiedClipRef.current}
                className="w-full text-left px-4 py-2 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex justify-between items-center cursor-pointer font-semibold"
              >
                <span>Pegar Clip</span>
                <span className="text-gray-400 font-mono text-[9px]">Ctrl+V</span>
              </button>
              <button 
                onClick={() => { setIsPlaying(!isPlaying); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-emerald-600 transition-colors flex justify-between items-center cursor-pointer font-semibold"
              >
                <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
                <span className="text-gray-400 font-mono text-[9px]">Espacio</span>
              </button>
            </>
          )}

          {contextMenu.type === 'timeline' && (
            <>
              <button 
                onClick={() => { handleSplitClip(); setContextMenu(null); }}
                className="w-full text-left px-4 py-2 hover:bg-emerald-600 transition-colors flex justify-between items-center cursor-pointer font-semibold border-b border-white/5"
              >
                <span>Dividir en Playhead</span>
                <span className="text-gray-400 font-mono text-[9px]">S / C</span>
              </button>
              <button 
                onClick={() => { pasteClip(); setContextMenu(null); }}
                disabled={!copiedClipRef.current}
                className="w-full text-left px-4 py-2 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-transparent transition-colors flex justify-between items-center cursor-pointer font-semibold"
              >
                <span>Pegar Clip aquí</span>
                <span className="text-gray-400 font-mono text-[9px]">Ctrl+V</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
