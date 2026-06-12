import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore, CANVAS_DIMENSIONS } from '../stores/editorStore';
import type { VideoClip } from '../types';
import { VideoExportEngine } from '../modules/VideoExportEngine';
import { 
  Play, Pause, Trash2, Volume2, Sparkles, Music, 
  Upload, RefreshCw, Scissors, Sliders, Film, Mic, MicOff,
  Copy, Save, Link, ArrowLeft, ArrowRight, Plus, Search
} from 'lucide-react';

// Local proxy resolver to bypass COEP/CORS blocks on localhost
const getSafeUrl = (url: string): string => {
  if (url && url.startsWith('https://assets.mixkit.co/')) {
    return url.replace('https://assets.mixkit.co/', '/proxy-mixkit/');
  }
  return url;
};

// Stock media presets
const PRESET_VIDEOS = [
  { name: 'Crypto Charts Loop', url: '/proxy-mixkit/videos/preview/mixkit-financial-charts-on-a-computer-monitor-43187-large.mp4', type: 'video' },
  { name: 'Office Work Charts', url: '/proxy-mixkit/videos/preview/mixkit-business-charts-on-a-computer-screen-40742-large.mp4', type: 'video' },
  { name: 'Abstract Cyber Lines', url: '/proxy-mixkit/videos/preview/mixkit-abstract-glowing-digital-lines-background-loop-42289-large.mp4', type: 'video' },
  { name: 'Bitcoin Concept', url: '/proxy-mixkit/videos/preview/mixkit-bitcoin-crypto-currency-concept-42231-large.mp4', type: 'video' },
  { name: 'Confetti Overlay', url: '/proxy-mixkit/videos/preview/mixkit-confetti-falling-on-a-black-background-34271-large.mp4', type: 'video' },
  { name: 'Light Leaks Loop', url: '/proxy-mixkit/videos/preview/mixkit-light-leaks-leak-leak-loop-42211-large.mp4', type: 'video' },
  { name: 'Analog Glitch', url: '/proxy-mixkit/videos/preview/mixkit-analog-glitch-screen-effect-43063-large.mp4', type: 'video' },
  { name: 'Sparks and Flames', url: '/proxy-mixkit/videos/preview/mixkit-sparks-and-flames-of-a-bonfire-43058-large.mp4', type: 'video' },
  { name: 'Floating Hearts', url: '/proxy-mixkit/videos/preview/mixkit-social-media-like-hearts-floating-42250-large.mp4', type: 'video' },
  { name: 'Particle Wave', url: '/proxy-mixkit/videos/preview/mixkit-abstract-digital-particle-wave-background-42284-large.mp4', type: 'video' },
  { name: 'Magical Fireflies', url: '/proxy-mixkit/videos/preview/mixkit-magical-fireflies-in-a-dark-forest-43029-large.mp4', type: 'video' }
];

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

export default function VideoCompositor() {
  const {
    format,
    videoClips,
    audioTracks,
    selectedClipId,
    selectedAudioId,
    playbackTime,
    isPlaying,
    savedVideoTemplates,
    setVideoClips,
    setAudioTracks,
    setSelectedClipId,
    setSelectedAudioId,
    setPlaybackTime,
    setIsPlaying,
    addVideoClip,
    updateClip,
    deleteClip,
    reorderClips,
    applyEffectsToAllClips,
    addAudioTrack,
    updateAudioTrack,
    deleteAudioTrack,
    saveVideoTemplate,
    loadVideoTemplate,
    deleteVideoTemplate,
    masterAmbientVolume,
    masterMusicVolume,
    setMasterAmbientVolume,
    setMasterMusicVolume,
    nodesList,
    nodeConnections,
    setNodesList,
    setNodeConnections
  } = useEditorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
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

  const [exportQuality, setExportQuality] = useState<'720p' | '1080p' | '4k'>('1080p');
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

    if (clip.textEffect === 'neon') {
      ctx.shadowColor = clip.textColor || '#10b981';
      ctx.shadowBlur = 15;
    } else if (clip.textEffect === 'shadow') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
    }

    const lines = text.split('\n');
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    let startY = y - (totalHeight / 2) + (lineHeight / 2);

    lines.forEach((line) => {
      ctx.fillText(line, x, startY);
      startY += lineHeight;
    });

    return canvas.toDataURL('image/png');
  };

  // Auto-close context menu on click
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

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
      const newStart = Math.max(0, Math.min(maxDur - clipPlayDur, initialStart + deltaSec));
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
    e: React.PointerEvent<HTMLDivElement>, 
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
            const newTimelineStart = Math.max(0, initialTimelineStart + deltaSec);
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
            
            updateClip(id, { endTrim: Number(newEndTrim.toFixed(2)) });
          }
        } else {
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
  const [leftSidebarTab, setLeftSidebarTab] = useState<'presets' | 'search-photos' | 'search-icons' | 'text-effects'>('presets');
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

  // Drag and resize tracking ref
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
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isExtractingYoutube, setIsExtractingYoutube] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

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
  const selectedAudio = audioTracks.find(a => a.id === selectedAudioId);

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

  // YouTube audio extraction via Cobalt API with fallbacks
  const handleExtractYoutube = async () => {
    if (!youtubeUrl.trim()) return;
    setIsExtractingYoutube(true);
    
    const instances = [
      "https://api.cobalt.tools",
      "https://co.wuk.sh",
      "https://cobalt.hyper.rip",
      "https://cobalt.shrunky.de",
      "https://cobalt.v0.wtf",
      "https://cobalt-api.kwiatekniebieski.pl",
      "https://cobalt.m3rayyan.my.id"
    ];

    let success = false;
    let lastError = "";

    for (const baseInstance of instances) {
      // Try both root / and /api/json paths
      const paths = ["/api/json", "/"];
      for (const path of paths) {
        const url = `${baseInstance}${path}`;
        try {
          console.log(`Trying Cobalt instance: ${url}`);
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify({
              url: youtubeUrl.trim(),
              downloadMode: "audio",
              audioFormat: "mp3",
              audioBitrate: "128"
            })
          });

          if (!response.ok) {
            continue; // try next path/instance
          }

          const data = await response.json();
          const streamUrl = data.url || data.stream;
          if (streamUrl) {
            const tempAudio = document.createElement('audio');
            tempAudio.preload = 'metadata';
            tempAudio.src = streamUrl;
            
            // Wait for metadata to load to get accurate duration
            await new Promise<void>((resolve, reject) => {
              tempAudio.onloadedmetadata = () => resolve();
              tempAudio.onerror = () => reject(new Error("Failed to load audio metadata"));
              // Safety timeout of 5 seconds
              setTimeout(() => resolve(), 5000);
            });

            addAudioTrack({
              url: streamUrl,
              name: `Música de YouTube (${baseInstance.replace("https://", "")})`,
              duration: tempAudio.duration || 180, // Fallback to 3 minutes if duration unavailable
              startTrim: 0,
              volume: 100,
              timelineStart: playbackTime
            });

            setYoutubeUrl('');
            alert("¡Audio de YouTube extraído y agregado con éxito!");
            success = true;
            break;
          }
        } catch (err: any) {
          console.warn(`Failed with instance ${url}: ${err.message}`);
          lastError = err.message;
        }
      }
      if (success) break;
    }

    if (!success) {
      alert("Error al extraer audio de YouTube: Ninguna de las instancias públicas de Cobalt respondió con éxito.\nError: " + lastError + "\nInténtalo de nuevo o usa una canción local.");
    }
    setIsExtractingYoutube(false);
  };

  // Upload zones handlers
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
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
      
      // Pre-render any kinetic text layers to high-quality transparent PNGs
      const processedClips = videoClips.map((clip) => {
        if (clip.type === 'text') {
          const pngUrl = renderTextClipToDataUrl(clip);
          return {
            ...clip,
            type: 'image' as const, // Compile as a transparent overlay image
            url: pngUrl
          };
        }
        return clip;
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
      setExportLogs((prev) => prev + `\nERROR EN COMPILACIÓN: ${e.message}\n`);
      alert(`Fallo en exportación: ${e.message}`);
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
    
    let musicUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    let musicName = 'Fondo Romance';

    if (slideshowTheme === 'bodas') {
      musicUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      musicName = 'Romantic Nuptials Waltz';
    } else if (slideshowTheme === 'viajes') {
      musicUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3';
      musicName = 'Travel Uplifting Adventure';
    } else if (slideshowTheme === 'deportes') {
      musicUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3';
      musicName = 'Energizing Synth Parade';
    } else if (slideshowTheme === 'cyberpunk') {
      musicUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3';
      musicName = 'Cyberpunk Tokyo Synthwave';
    } else if (slideshowTheme === 'corporate') {
      musicUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3';
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

  const titleClips = videoClips.filter(c => c.placementMode === 'overlay' && c.type === 'text');
  const mediaOverlayClips = videoClips.filter(c => c.placementMode === 'overlay' && c.type !== 'text');
  const baseClips = videoClips.filter(c => c.placementMode !== 'overlay');
  
  const voiceTracks = audioTracks.filter(t => t.name.toLowerCase().includes('voz') || t.name.toLowerCase().includes('grabación') || t.name.toLowerCase().includes('off'));
  const fxTracks = audioTracks.filter(t => t.name.toLowerCase().includes('fx') || t.name.toLowerCase().includes('efecto'));
  const musicTracks = audioTracks.filter(t => !t.name.toLowerCase().includes('voz') && !t.name.toLowerCase().includes('grabación') && !t.name.toLowerCase().includes('off') && !t.name.toLowerCase().includes('fx') && !t.name.toLowerCase().includes('efecto'));

  return (
    <div className="flex flex-1 overflow-hidden bg-[#030304] select-none text-white font-sans">
      
      {/* 1. TIMELINE BUILD WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* UPPER ROW: MEDIA & PREVIEW PLAYER */}
        <div className="flex-1 flex overflow-hidden border-b border-white/5">
          
          {/* MEDIA LIST ASSETS LIBRARY */}
          <div className="w-[320px] bg-[#09090b] p-4 border-r border-white/5 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar">
            
            {/* MODO DE INSERCION */}
            <div className="space-y-2">
              <span className="text-[10px] text-gray-500 uppercase font-black block">Modo de Inserción</span>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
                <button 
                  onClick={() => setAddMode('sequence')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${addMode === 'sequence' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Pista Principal
                </button>
                <button 
                  onClick={() => setAddMode('overlay')}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${addMode === 'overlay' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                  Superposición (PIP)
                </button>
              </div>
            </div>

            {/* TABS DE SELECCION */}
            <div className="flex bg-black/60 p-1 rounded-xl border border-white/5 gap-0.5 shrink-0 overflow-x-auto custom-scrollbar">
              <button 
                onClick={() => setLeftSidebarTab('presets')}
                className={`flex-1 py-1.5 px-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center cursor-pointer whitespace-nowrap ${leftSidebarTab === 'presets' ? 'bg-[#1e1e24] text-emerald-400 border border-white/5' : 'text-gray-400 hover:text-white'}`}
              >
                Colección
              </button>
              <button 
                onClick={() => setLeftSidebarTab('search-photos')}
                className={`flex-1 py-1.5 px-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center cursor-pointer whitespace-nowrap ${leftSidebarTab === 'search-photos' ? 'bg-[#1e1e24] text-emerald-400 border border-white/5' : 'text-gray-400 hover:text-white'}`}
              >
                Fotos
              </button>
              <button 
                onClick={() => setLeftSidebarTab('search-icons')}
                className={`flex-1 py-1.5 px-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center cursor-pointer whitespace-nowrap ${leftSidebarTab === 'search-icons' ? 'bg-[#1e1e24] text-emerald-400 border border-white/5' : 'text-gray-400 hover:text-white'}`}
              >
                Iconos
              </button>
              <button 
                onClick={() => setLeftSidebarTab('text-effects')}
                className={`flex-1 py-1.5 px-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center cursor-pointer whitespace-nowrap ${leftSidebarTab === 'text-effects' ? 'bg-[#1e1e24] text-emerald-400 border border-white/5' : 'text-gray-400 hover:text-white'}`}
              >
                Textos FX
              </button>
            </div>

            {leftSidebarTab === 'presets' && (
              <>
                {/* Template Save Area */}
                <div className="bg-[#121215] p-3 rounded-xl border border-white/5 space-y-2.5">
                  <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                    <Save size={12} />
                    <span>Guardar Plantilla</span>
                  </span>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Nombre plantilla..."
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      className="flex-1 bg-black p-1.5 rounded text-[11px] outline-none border border-white/5 focus:border-emerald-500 text-white"
                    />
                    <button 
                      onClick={() => {
                        saveVideoTemplate(newTemplateName);
                        setNewTemplateName('');
                        alert("Plantilla de video guardada localmente");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded transition-all cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                </div>

                {/* Saved Templates List */}
                {savedVideoTemplates.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-gray-500 uppercase font-black">Plantillas Guardadas</span>
                    <div className="space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar pr-1">
                      {savedVideoTemplates.map((tpl, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 hover:border-white/10"
                        >
                          <button 
                            onClick={() => loadVideoTemplate(tpl)}
                            className="text-[10px] font-semibold text-gray-300 hover:text-emerald-400 truncate text-left flex-1 cursor-pointer"
                          >
                            🗂️ {tpl.name}
                          </button>
                          <button 
                            onClick={() => deleteVideoTemplate(i)}
                            className="text-red-500/80 hover:text-red-500 p-0.5 cursor-pointer"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cobalt YouTube Downloader Zone */}
                <div className="bg-[#121215] p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase flex items-center gap-1.5">
                    <Link size={12} />
                    <span>Música de YouTube</span>
                  </span>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="Pegar enlace YouTube..."
                      value={youtubeUrl}
                      onChange={e => setYoutubeUrl(e.target.value)}
                      className="flex-1 bg-black p-1.5 rounded text-[11px] outline-none border border-white/5 focus:border-blue-500 text-white"
                    />
                    <button 
                      onClick={handleExtractYoutube}
                      disabled={isExtractingYoutube}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[10px] font-bold px-3 py-1.5 rounded transition-all cursor-pointer"
                    >
                      {isExtractingYoutube ? '...' : 'Extraer'}
                    </button>
                  </div>
                </div>

                {/* Presets catalog */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase font-black block">Presets de Stock</span>
                  
                  {/* Presets videos */}
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase block mb-1">Videos Predeterminados</span>
                    <div className="grid grid-cols-3 gap-1.5">
                       {PRESET_VIDEOS.map((vid, idx) => (
                        <div 
                          key={idx}
                          onClick={() => addVideoClip({
                            type: 'video',
                            url: vid.url,
                            name: vid.name,
                            duration: 15,
                            startTrim: 0,
                            endTrim: 10,
                            volume: 100,
                            placementMode: addMode
                          })}
                          className="aspect-video rounded bg-black border border-white/5 hover:border-emerald-500 transition-all cursor-pointer overflow-hidden relative group/preset"
                        >
                          <video src={vid.url} className="w-full h-full object-cover opacity-50" muted />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/preset:opacity-100 transition-opacity">
                            <Plus size={14} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Presets images */}
                  <div className="mt-2">
                    <span className="text-[9px] text-gray-400 uppercase block mb-1">Imágenes Predeterminadas</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PRESET_IMAGES.map((img, idx) => (
                        <div 
                          key={idx}
                          onClick={() => addVideoClip({
                            type: 'image',
                            url: img.url,
                            name: img.name,
                            duration: 3,
                            startTrim: 0,
                            endTrim: 3,
                            volume: 0,
                            placementMode: addMode
                          })}
                          className="aspect-video rounded bg-black border border-white/5 hover:border-emerald-500 transition-all cursor-pointer overflow-hidden relative group/preset"
                        >
                          <img src={img.url} alt="preset" className="w-full h-full object-cover opacity-50" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/preset:opacity-100 transition-opacity">
                            <Plus size={14} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Custom file imports zone */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase font-black block">Importar Archivos Locales</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-2 rounded-xl border border-white/10 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload size={12} /> Media
                    </button>
                    <button 
                      onClick={() => audioInputRef.current?.click()}
                      className="flex-1 py-2 rounded-xl border border-white/10 hover:border-blue-500 hover:bg-blue-500/5 transition-all text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Music size={12} /> Música
                    </button>
                  </div>
                </div>
              </>
            )}

            {leftSidebarTab === 'search-photos' && (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <span className="text-[10px] text-gray-500 uppercase font-black block">Buscador de Fotos de Alta Calidad</span>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Ej. 'cripto', 'abstracto', 'oficina'..."
                    value={photoSearchQuery}
                    onChange={e => setPhotoSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchPhotos()}
                    className="flex-1 bg-black p-2 rounded-lg text-xs outline-none border border-white/5 focus:border-emerald-500 text-white"
                  />
                  <button 
                    onClick={handleSearchPhotos}
                    disabled={isSearchingPhotos}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-2 rounded-lg transition-all flex items-center justify-center shrink-0 w-8 h-8 cursor-pointer"
                  >
                    {isSearchingPhotos ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
                  {photoSearchResults.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-600 italic">
                      Ingresa una palabra clave y presiona buscar para cargar imágenes desde Unsplash.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5 pb-2">
                      {photoSearchResults.map((photo) => (
                        <div 
                          key={photo.id}
                          onClick={() => addVideoClip({
                            type: 'image',
                            url: photo.urls.regular,
                            name: photo.alt_description || 'Foto Unsplash',
                            duration: 3,
                            startTrim: 0,
                            endTrim: 3,
                            volume: 0,
                            placementMode: addMode
                          })}
                          className="aspect-video rounded bg-black border border-white/5 hover:border-emerald-500 transition-all cursor-pointer overflow-hidden relative group/search-item"
                          title={photo.description || photo.alt_description || "Haga clic para añadir"}
                        >
                          <img src={photo.urls.thumb || photo.urls.small} alt="search result" className="w-full h-full object-cover opacity-50 group-hover/search-item:opacity-80 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/search-item:opacity-100 transition-opacity">
                            <Plus size={14} className="text-white" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {leftSidebarTab === 'search-icons' && (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <span className="text-[10px] text-gray-500 uppercase font-black block">Buscador de Iconos Vectoriales (SVG)</span>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Ej. 'rocket', 'chart', 'arrow', 'star'..."
                    value={iconSearchQuery}
                    onChange={e => setIconSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchIcons()}
                    className="flex-1 bg-black p-2 rounded-lg text-xs outline-none border border-white/5 focus:border-emerald-500 text-white"
                  />
                  <button 
                    onClick={handleSearchIcons}
                    disabled={isSearchingIcons}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-2 rounded-lg transition-all flex items-center justify-center shrink-0 w-8 h-8 cursor-pointer"
                  >
                    {isSearchingIcons ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
                  {iconSearchResults.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-600 italic">
                      Ingresa una palabra clave en inglés (ej. 'star', 'arrow', 'rocket') para cargar iconos vectoriales.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 pb-2">
                      {iconSearchResults.map((iconFullName) => {
                        const parts = iconFullName.split(':');
                        const prefix = parts[0] || 'lucide';
                        const name = parts[1] || '';
                        const svgUrl = `https://api.iconify.design/${prefix}/${name}.svg?color=white`;
                        return (
                          <div 
                            key={iconFullName}
                            onClick={() => handleAddIcon(iconFullName)}
                            className="aspect-square rounded-xl bg-[#121215] border border-white/5 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all cursor-pointer flex items-center justify-center p-2 relative group/icon-item"
                            title={`Añadir icono: ${name}`}
                          >
                            <img src={svgUrl} alt={name} className="w-8 h-8 opacity-75 group-hover/icon-item:opacity-100 group-hover/icon-item:scale-110 transition-all filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                            <div className="absolute top-0 right-0 bg-emerald-500 rounded-bl-lg rounded-tr-xl p-0.5 opacity-0 group-hover/icon-item:opacity-100 transition-opacity">
                              <Plus size={8} className="text-white" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {leftSidebarTab === 'text-effects' && (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                <div className="bg-[#121215] p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase block">Estilos de Texto</span>
                  <p className="text-[9px] text-gray-500">Añade textos preestablecidos con movimiento cinético y efectos visuales modernos.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar space-y-2.5 pb-4">
                  {[
                    { name: 'Clásico Limpio', effect: 'none', desc: 'Estilo clásico minimalista, estático.' },
                    { name: 'Sombra Suave', effect: 'shadow', desc: 'Sombra difuminada para mejor contraste.' },
                    { name: 'Brillo Neón', effect: 'neon', desc: 'Efecto de luz de neón vibrante pulsante.' },
                    { name: 'Ciber Glitch', effect: 'glitch', desc: 'Efecto de aberración cromática distorsionada.' },
                    { name: 'Typewriter', effect: 'typing', desc: 'Animación estilo máquina de escribir.' },
                    { name: 'Zoom Suave', effect: 'fade-zoom', desc: 'Desvanecimiento suave con zoom progresivo.' },
                    { name: 'Bote Pop', effect: 'bounce', desc: 'Aparición elástica con rebote de escala.' },
                  ].map((preset) => (
                    <button 
                      key={preset.effect}
                      onClick={() => {
                        const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                        addVideoClip({
                          type: 'text',
                          url: '', // rendered dynamically in compile
                          name: `Texto: ${preset.name}`,
                          duration: 4,
                          startTrim: 0,
                          endTrim: 4,
                          volume: 0,
                          placementMode: 'overlay', // Text is always overlay
                          textContent: preset.name.toUpperCase(),
                          textColor: preset.effect === 'neon' ? '#10b981' : '#ffffff',
                          textFontSize: 54,
                          textFontFamily: 'Montserrat',
                          textEffect: preset.effect as any,
                          x: Math.round((dims.w - 600) / 2),
                          y: Math.round((dims.h - 150) / 2),
                          width: 600,
                          height: 150
                        });
                      }}
                      className="w-full text-left p-3 bg-[#0d0d11]/80 hover:bg-[#15151b] border border-white/5 hover:border-emerald-500/30 rounded-xl transition-all flex flex-col gap-1.5 cursor-pointer relative overflow-hidden group"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`font-bold text-xs ${preset.effect === 'neon' ? 'text-emerald-400 drop-shadow-[0_0_4px_#10b981]' : 'text-white'}`}>
                          {preset.name}
                        </span>
                        <Plus size={12} className="text-gray-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <span className="text-[9px] text-gray-500 font-medium leading-relaxed">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              accept="video/*,image/*" 
              multiple 
              className="hidden" 
              onChange={handleMediaUpload} 
            />
            <input 
              type="file" 
              ref={audioInputRef} 
              accept="audio/*" 
              multiple 
              className="hidden" 
              onChange={handleAudioUpload} 
            />

            {/* Clips list */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between pb-1.5">
                <span className="text-[10px] text-gray-400 uppercase font-black">Línea de Tiempo ({videoClips.length})</span>
              </div>
              
              {videoClips.length === 0 && (
                <div className="py-8 text-center border border-dashed border-white/5 rounded-xl text-gray-600 text-xs flex flex-col items-center gap-2">
                  <Film size={18} className="opacity-30" />
                  <span>Sin recursos agregados</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {videoClips.map((clip) => (
                  <div 
                    key={clip.id} 
                    onClick={() => setSelectedClipId(clip.id)}
                    className={`relative aspect-video rounded-lg bg-black border overflow-hidden cursor-pointer group/card transition-all ${
                      selectedClipId === clip.id ? 'border-emerald-500 shadow-md shadow-emerald-500/10' : 'border-white/10'
                    }`}
                  >
                    {clip.type === 'video' ? (
                      <video src={clip.url} className="w-full h-full object-cover opacity-60 pointer-events-none" />
                    ) : (
                      <img src={clip.url} alt="clip preview" className="w-full h-full object-cover opacity-60 pointer-events-none" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 flex flex-col justify-between">
                      <span className="text-[8px] bg-black/60 px-1 rounded-sm self-start font-mono">
                        {clip.type === 'video' ? '📽️' : '🖼️'}
                      </span>
                      <span className="text-[9px] font-medium truncate block max-w-full text-gray-300">
                        {clip.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PLAYER VIEWPORT SECTION */}
          <div className="flex-1 bg-[#090B10] flex flex-col p-6 relative overflow-hidden">
            
            {/* Viewport Control Toolbar */}
            <div className="w-full flex items-center justify-between pb-4 border-b border-[#232A36] mb-4 shrink-0">
              <div className="flex gap-2">
                <button 
                  onClick={() => setWorkspaceLayout('standard')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    workspaceLayout === 'standard' 
                      ? 'bg-[#7B5CFF] text-white shadow-[0_0_15px_rgba(123,92,255,0.4)]' 
                      : 'bg-[#161B25] text-gray-400 hover:text-white border border-[#232A36]'
                  }`}
                >
                  <span>Monitor</span> Monitor Standard
                </button>
                <button 
                  onClick={() => setWorkspaceLayout('node-graph')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    workspaceLayout === 'node-graph' 
                      ? 'bg-[#7B5CFF] text-white shadow-[0_0_15px_rgba(123,92,255,0.4)]' 
                      : 'bg-[#161B25] text-gray-400 hover:text-white border border-[#232A36]'
                  }`}
                >
                  <span>⚡</span> Nodal Effects Graph
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => setShowScopes(!showScopes)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    showScopes 
                      ? 'bg-[#00C8FF]/20 text-[#00C8FF] border border-[#00C8FF]/40' 
                      : 'bg-[#161B25] text-gray-400 hover:text-white border border-[#232A36]'
                  }`}
                >
                  <span>📊</span> Scopes Diagnósticos
                </button>
                <button 
                  onClick={() => setShowSlideshowModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00D97E] text-[#090B10] hover:bg-[#00D97E]/95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🪄</span> Slideshow Automático
                </button>
              </div>
            </div>

            {/* Viewport Workspace content */}
            {workspaceLayout === 'standard' ? (
              <div className="flex-1 w-full flex items-center justify-center gap-6 overflow-hidden">
                
                {/* Standard Preview Player Monitor */}
                <div 
                  ref={previewContainerRef}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      type: 'canvas'
                    });
                  }}
                  className="relative aspect-video max-w-[650px] w-full max-h-[48vh] h-full shadow-[0_0_80px_rgba(0,0,0,0.9)] bg-neutral-950 overflow-hidden ring-1 ring-white/10 rounded-2xl flex items-center justify-center shrink"
                  style={{
                    aspectRatio: format === '9:16' ? '9/16' : format === '16:9' ? '16/9' : format === '1:1' ? '1/1' : '3/1',
                    maxHeight: format === '9:16' ? '60vh' : '48vh',
                    height: '100%'
                  }}
                >
                  {/* Solid black canvas background */}
                  <div className="absolute inset-0 bg-[#050505] w-full h-full" />

                  {videoClips.length > 0 && currentPlayback ? (
                    <div className="absolute inset-0 w-full h-full">
                      
                      {/* 1. RENDER ACTIVE BASE CLIP */}
                      {currentPlayback.activeBaseClip && (() => {
                        const clip = currentPlayback.activeBaseClip;
                        const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                        
                        const cW = clip.width !== undefined ? clip.width : dims.w;
                        const cH = clip.height !== undefined ? clip.height : dims.h;
                        const cX = clip.x !== undefined ? clip.x : 0;
                        const cY = clip.y !== undefined ? clip.y : 0;

                        const style: React.CSSProperties = {
                          position: 'absolute',
                          left: `${cX * containerScale}px`,
                          top: `${cY * containerScale}px`,
                          width: `${cW * containerScale}px`,
                          height: `${cH * containerScale}px`,
                          filter: getFilterCSS(clip),
                          transform: `scale(${(clip.scale || 100) / 100})`,
                          zIndex: 10,
                          ...(currentPlayback.inTransition 
                            ? getTransitionStyle(currentPlayback.transitionProgress, currentPlayback.transitionType, false)
                            : {})
                        };

                        const isSelected = selectedClipId === clip.id;

                        return (
                          <div 
                            style={style}
                            className={`group/player-layer touch-none ${
                              isSelected ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'hover:ring-1 hover:ring-white/30'
                            }`}
                            onPointerDown={(e) => {
                              setSelectedClipId(clip.id);
                              handlePreviewPointerDown(e, 'move');
                            }}
                          >
                            {clip.type === 'video' ? (
                              <video 
                                ref={videoRef}
                                src={getSafeUrl(clip.url)}
                                className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                                playsInline
                                muted
                              />
                            ) : clip.type === 'text' ? (
                              <div 
                                className={`w-full h-full flex items-center justify-center p-4 text-center font-bold break-words select-none leading-normal ${
                                  clip.textEffect === 'glitch' ? 'animate-glitch' :
                                  clip.textEffect === 'typing' ? 'animate-typing' :
                                  clip.textEffect === 'neon' ? 'animate-neon' :
                                  clip.textEffect === 'fade-zoom' ? 'animate-fade-zoom' :
                                  clip.textEffect === 'bounce' ? 'animate-bounce' : ''
                                }`}
                                style={{
                                  color: clip.textColor || '#ffffff',
                                  fontSize: `${(clip.textFontSize || 40) * containerScale}px`,
                                  fontFamily: clip.textFontFamily || 'Montserrat',
                                  textShadow: clip.textEffect === 'shadow' ? '3px 3px 6px rgba(0,0,0,0.8)' : undefined,
                                  whiteSpace: 'pre-wrap'
                                }}
                              >
                                {clip.textContent || 'Texto'}
                              </div>
                            ) : (
                              <img 
                                src={getSafeUrl(clip.url)}
                                alt="active preview"
                                className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                              />
                            )}

                            {/* Drag resize corner handles */}
                            {isSelected && (
                              <>
                                <div 
                                  onPointerDown={(e) => handlePreviewPointerDown(e, 'tl')}
                                  className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -top-1.5 -left-1.5 cursor-nwse-resize z-50 shadow-md active:scale-125 transition-transform"
                                />
                                <div 
                                  onPointerDown={(e) => handlePreviewPointerDown(e, 'tr')}
                                  className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -top-1.5 -right-1.5 cursor-nesw-resize z-50 shadow-md active:scale-125 transition-transform"
                                />
                                <div 
                                  onPointerDown={(e) => handlePreviewPointerDown(e, 'bl')}
                                  className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -left-1.5 cursor-nesw-resize z-50 shadow-md active:scale-125 transition-transform"
                                />
                                <div 
                                  onPointerDown={(e) => handlePreviewPointerDown(e, 'br')}
                                  className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -right-1.5 cursor-nwse-resize z-50 shadow-md active:scale-125 transition-transform"
                                />
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* 2. RENDER TRANSITION BASE CLIP */}
                      {currentPlayback.inTransition && currentPlayback.nextBaseClip && (() => {
                        const clip = currentPlayback.nextBaseClip;
                        const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                        
                        const cW = clip.width !== undefined ? clip.width : dims.w;
                        const cH = clip.height !== undefined ? clip.height : dims.h;
                        const cX = clip.x !== undefined ? clip.x : 0;
                        const cY = clip.y !== undefined ? clip.y : 0;

                        const style: React.CSSProperties = {
                          position: 'absolute',
                          left: `${cX * containerScale}px`,
                          top: `${cY * containerScale}px`,
                          width: `${cW * containerScale}px`,
                          height: `${cH * containerScale}px`,
                          filter: getFilterCSS(clip),
                          transform: `scale(${(clip.scale || 100) / 100})`,
                          zIndex: 9,
                          ...getTransitionStyle(currentPlayback.transitionProgress, currentPlayback.transitionType, true)
                        };

                        return (
                          <div style={style} className="pointer-events-none">
                            {clip.type === 'video' ? (
                              <video 
                                ref={nextVideoRef}
                                src={getSafeUrl(clip.url)}
                                className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                                playsInline
                                muted
                              />
                            ) : clip.type === 'text' ? (
                              <div 
                                className={`w-full h-full flex items-center justify-center p-4 text-center font-bold break-words select-none leading-normal ${
                                  clip.textEffect === 'glitch' ? 'animate-glitch' :
                                  clip.textEffect === 'typing' ? 'animate-typing' :
                                  clip.textEffect === 'neon' ? 'animate-neon' :
                                  clip.textEffect === 'fade-zoom' ? 'animate-fade-zoom' :
                                  clip.textEffect === 'bounce' ? 'animate-bounce' : ''
                                }`}
                                style={{
                                  color: clip.textColor || '#ffffff',
                                  fontSize: `${(clip.textFontSize || 40) * containerScale}px`,
                                  fontFamily: clip.textFontFamily || 'Montserrat',
                                  textShadow: clip.textEffect === 'shadow' ? '3px 3px 6px rgba(0,0,0,0.8)' : undefined,
                                  whiteSpace: 'pre-wrap'
                                }}
                              >
                                {clip.textContent || 'Texto'}
                              </div>
                            ) : (
                              <img 
                                src={getSafeUrl(clip.url)}
                                alt="next transition preview"
                                className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                              />
                            )}
                          </div>
                        );
                      })()}

                      {/* 3. RENDER ACTIVE OVERLAY CLIPS (layered on top) */}
                      {currentPlayback.activeOverlays.map(({ clip, localTime }) => {
                        const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                        
                        const cW = clip.width !== undefined ? clip.width : dims.w;
                        const cH = clip.height !== undefined ? clip.height : dims.h;
                        const cX = clip.x !== undefined ? clip.x : 0;
                        const cY = clip.y !== undefined ? clip.y : 0;

                        const style: React.CSSProperties = {
                          position: 'absolute',
                          left: `${cX * containerScale}px`,
                          top: `${cY * containerScale}px`,
                          width: `${cW * containerScale}px`,
                          height: `${cH * containerScale}px`,
                          filter: getFilterCSS(clip),
                          transform: `scale(${(clip.scale || 100) / 100})`,
                          zIndex: 20
                        };

                        const isSelected = selectedClipId === clip.id;

                        return (
                          <div 
                            key={clip.id}
                            style={style}
                            className={`group/player-layer touch-none ${
                              isSelected ? 'ring-2 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'hover:ring-1 hover:ring-white/30'
                            }`}
                            onPointerDown={(e) => {
                              setSelectedClipId(clip.id);
                              handlePreviewPointerDown(e, 'move');
                            }}
                          >
                            {clip.type === 'video' ? (
                              <video 
                                data-overlay-clip-id={clip.id}
                                data-local-time={localTime}
                                src={getSafeUrl(clip.url)}
                                className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                                playsInline
                                muted
                              />
                            ) : clip.type === 'text' ? (
                              <div 
                                className={`w-full h-full flex items-center justify-center p-4 text-center font-bold break-words select-none leading-normal ${
                                  clip.textEffect === 'glitch' ? 'animate-glitch' :
                                  clip.textEffect === 'typing' ? 'animate-typing' :
                                  clip.textEffect === 'neon' ? 'animate-neon' :
                                  clip.textEffect === 'fade-zoom' ? 'animate-fade-zoom' :
                                  clip.textEffect === 'bounce' ? 'animate-bounce' : ''
                                }`}
                                style={{
                                  color: clip.textColor || '#ffffff',
                                  fontSize: `${(clip.textFontSize || 40) * containerScale}px`,
                                  fontFamily: clip.textFontFamily || 'Montserrat',
                                  textShadow: clip.textEffect === 'shadow' ? '3px 3px 6px rgba(0,0,0,0.8)' : undefined,
                                  whiteSpace: 'pre-wrap'
                                }}
                              >
                                {clip.textContent || 'Texto'}
                              </div>
                            ) : (
                              <img 
                                src={getSafeUrl(clip.url)}
                                alt="overlay preview"
                                className={`w-full h-full pointer-events-none object-${clip.fitMode || 'cover'}`}
                              />
                            )}

                            {/* Drag resize corner handles */}
                            {isSelected && (
                              <>
                                <div 
                                  onPointerDown={(e) => handlePreviewPointerDown(e, 'tl')}
                                  className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -top-1.5 -left-1.5 cursor-nwse-resize z-50 shadow-md active:scale-125 transition-transform"
                                />
                                <div 
                                  onPointerDown={(e) => handlePreviewPointerDown(e, 'tr')}
                                  className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -top-1.5 -right-1.5 cursor-nesw-resize z-50 shadow-md active:scale-125 transition-transform"
                                />
                                <div 
                                  onPointerDown={(e) => handlePreviewPointerDown(e, 'bl')}
                                  className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -left-1.5 cursor-nesw-resize z-50 shadow-md active:scale-125 transition-transform"
                                />
                                <div 
                                  onPointerDown={(e) => handlePreviewPointerDown(e, 'br')}
                                  className="absolute w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full -bottom-1.5 -right-1.5 cursor-nwse-resize z-50 shadow-md active:scale-125 transition-transform"
                                />
                              </>
                            )}
                          </div>
                        );
                      })}

                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center text-gray-600 gap-3">
                      <span className="text-4xl opacity-30">🎬</span>
                      <p className="text-xs">Sube y añade videos o fotos en el panel izquierdo.</p>
                    </div>
                  )}
                </div>

                {/* Scopes Side Panel */}
                {showScopes && (
                  <div className="w-[280px] h-full max-h-[48vh] bg-[#11151E] border border-[#232A36] rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar shrink-0">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block border-b border-[#232A36] pb-1.5 flex items-center gap-1.5">
                      <span>📊</span> Scopes Diagnósticos
                    </span>
                    <div className="grid grid-cols-2 gap-2 flex-1 min-h-[200px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-mono text-gray-500 uppercase">Waveform</span>
                        <canvas ref={waveformCanvasRef} className="w-full aspect-[4/3] rounded-lg border border-[#232A36] bg-[#090B10]" width={150} height={110} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-mono text-gray-500 uppercase">Vectorscope</span>
                        <canvas ref={vectorscopeCanvasRef} className="w-full aspect-[4/3] rounded-lg border border-[#232A36] bg-[#090B10]" width={150} height={110} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-mono text-gray-500 uppercase">Histogram</span>
                        <canvas ref={histogramCanvasRef} className="w-full aspect-[4/3] rounded-lg border border-[#232A36] bg-[#090B10]" width={150} height={110} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-mono text-gray-500 uppercase">RGB Parade</span>
                        <canvas ref={rgbParadeCanvasRef} className="w-full aspect-[4/3] rounded-lg border border-[#232A36] bg-[#090B10]" width={150} height={110} />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              /* Nodal split layout */
              <div className="flex-1 w-full flex flex-col gap-4 overflow-hidden h-full">
                
                {/* Upper scaled-down player */}
                <div className="h-[35%] flex items-center justify-center gap-6 relative shrink-0">
                  <div 
                    ref={previewContainerRef}
                    className="relative aspect-video max-h-full h-full shadow-[0_0_40px_rgba(0,0,0,0.9)] bg-neutral-950 overflow-hidden ring-1 ring-white/10 rounded-xl flex items-center justify-center"
                    style={{
                      aspectRatio: format === '9:16' ? '9/16' : format === '16:9' ? '16/9' : format === '1:1' ? '1/1' : '3/1',
                    }}
                  >
                    <div className="absolute inset-0 bg-[#050505] w-full h-full" />
                    
                    {videoClips.length > 0 && currentPlayback ? (
                      <div className="absolute inset-0 w-full h-full">
                        {/* Scaled preview */}
                        {currentPlayback.activeBaseClip && (() => {
                          const clip = currentPlayback.activeBaseClip;
                          const dims = CANVAS_DIMENSIONS[format] || { w: 1080, h: 1920 };
                          
                          const cW = clip.width !== undefined ? clip.width : dims.w;
                          const cH = clip.height !== undefined ? clip.height : dims.h;
                          const cX = clip.x !== undefined ? clip.x : 0;
                          const cY = clip.y !== undefined ? clip.y : 0;

                          const style: React.CSSProperties = {
                            position: 'absolute',
                            left: `${cX * containerScale}px`,
                            top: `${cY * containerScale}px`,
                            width: `${cW * containerScale}px`,
                            height: `${cH * containerScale}px`,
                            filter: getFilterCSS(clip),
                            transform: `scale(${(clip.scale || 100) / 100})`,
                            zIndex: 10,
                          };

                          return (
                            <div style={style} className="w-full h-full">
                              {clip.type === 'video' ? (
                                <video src={getSafeUrl(clip.url)} className="w-full h-full object-cover" muted />
                              ) : (
                                <img src={getSafeUrl(clip.url)} alt="preview" className="w-full h-full object-cover" />
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-600">Línea vacía</span>
                    )}
                  </div>

                  {showScopes && (
                    <div className="w-[220px] h-full bg-[#11151E] border border-[#232A36] rounded-xl p-2 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar shrink-0 justify-center">
                      <div className="grid grid-cols-2 gap-1">
                        <canvas ref={waveformCanvasRef} className="w-full aspect-[4/3] rounded border border-[#232A36] bg-[#090B10]" width={100} height={75} />
                        <canvas ref={vectorscopeCanvasRef} className="w-full aspect-[4/3] rounded border border-[#232A36] bg-[#090B10]" width={100} height={75} />
                        <canvas ref={histogramCanvasRef} className="w-full aspect-[4/3] rounded border border-[#232A36] bg-[#090B10]" width={100} height={75} />
                        <canvas ref={rgbParadeCanvasRef} className="w-full aspect-[4/3] rounded border border-[#232A36] bg-[#090B10]" width={100} height={75} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Lower Nodal Editor board workspace */}
                <div className="flex-1 bg-[#11151E] border border-[#232A36] rounded-2xl relative overflow-hidden flex flex-col min-h-[240px]">
                  
                  <div className="px-4 py-2 border-b border-[#232A36] bg-[#161B25] flex justify-between items-center shrink-0">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      🔗 Vision Pro Effects Graph (Arrastra conexiones entre pines)
                    </span>
                    <span className="text-[8px] text-gray-500 font-bold">
                      *Haz clic en un cable para borrar la conexión
                    </span>
                  </div>

                  {/* Nodal Editor Canvas Board */}
                  <div 
                    id="node-graph-board" 
                    className="flex-1 relative overflow-hidden bg-[#090B10] bg-dot-grid w-full h-full"
                    onPointerUp={() => setDraggingWire(null)}
                  >
                    
                    {/* SVG connection wires */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                      {nodeConnections.map((conn, idx) => {
                        const fromNode = nodesList.find(n => n.id === conn.fromId);
                        const toNode = nodesList.find(n => n.id === conn.toId);
                        if (!fromNode || !toNode) return null;

                        const x1 = fromNode.x + 180;
                        const y1 = fromNode.y + 50;
                        const x2 = toNode.x;
                        const y2 = toNode.y + 50;

                        const dx = Math.abs(x2 - x1) * 0.5;
                        const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                        return (
                          <g key={idx}>
                            <path 
                              d={pathD} 
                              fill="none" 
                              stroke="rgba(123, 92, 255, 0.6)" 
                              strokeWidth="4" 
                              className="hover:stroke-red-500 cursor-pointer pointer-events-auto transition-colors"
                              onClick={() => {
                                setNodeConnections(prev => prev.filter((_, cIdx) => cIdx !== idx));
                              }}
                            >
                              <title>Haz clic para borrar conexión</title>
                            </path>
                            <path 
                              d={pathD} 
                              fill="none" 
                              stroke="#00C8FF" 
                              strokeWidth="1.5" 
                              className="pointer-events-none"
                            />
                          </g>
                        );
                      })}
                      
                      {draggingWire && (() => {
                        const dx = Math.abs(draggingWire.currentX - draggingWire.startX) * 0.5;
                        const pathD = `M ${draggingWire.startX} ${draggingWire.startY} C ${draggingWire.startX + dx} ${draggingWire.startY}, ${draggingWire.currentX - dx} ${draggingWire.currentY}, ${draggingWire.currentX} ${draggingWire.currentY}`;
                        return (
                          <path 
                            d={pathD} 
                            fill="none" 
                            stroke="rgba(0, 219, 126, 0.8)" 
                            strokeWidth="2.5" 
                            strokeDasharray="4 4"
                            className="pointer-events-none"
                          />
                        );
                      })()}
                    </svg>

                    {/* Nodes mapping */}
                    {nodesList.map(node => (
                      <div 
                        key={node.id}
                        style={{ left: `${node.x}px`, top: `${node.y}px` }}
                        className={`absolute w-[180px] h-[100px] bg-[#11151E]/95 border rounded-xl flex flex-col p-2.5 shadow-xl select-none z-20 group/node cursor-grab active:cursor-grabbing hover:border-[#7B5CFF] transition-all ${
                          node.id === draggingNodeId ? 'opacity-40 border-[#7B5CFF] scale-95 shadow-2xl' : 'border-[#232A36]'
                        }`}
                        onPointerDown={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.getAttribute('data-nodrag')) return;
                          handleNodePointerDown(e, node.id);
                        }}
                      >
                        <div className="flex items-center justify-between border-b border-[#232A36] pb-1 mb-2">
                          <span className="text-[10px] font-black uppercase text-gray-300 tracking-wider truncate w-[100px]">{node.label}</span>
                          <span className="text-[8px] bg-[#232A36] text-gray-500 px-1 rounded font-mono font-bold uppercase">{node.type}</span>
                        </div>

                        {node.type === 'filter' ? (
                          <div className="flex-1 flex flex-col justify-center gap-1" data-nodrag="true">
                            <div className="flex justify-between text-[8px] text-gray-500 font-mono">
                              <span>Intensidad</span>
                              <span>{node.value}%</span>
                            </div>
                            <input 
                              type="range"
                              min="0"
                              max="200"
                              value={node.value}
                              onChange={(e) => {
                                const newVal = Number(e.target.value);
                                setNodesList(prev => prev.map(n => n.id === node.id ? { ...n, value: newVal } : n));
                              }}
                              className="w-full accent-[#7B5CFF] h-1 cursor-pointer rounded bg-[#232A36]"
                              data-nodrag="true"
                            />
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center">
                            <span className="text-[8px] text-gray-600 font-medium italic">
                              {node.type === 'input' ? '📥 Input original' : '📺 Render final'}
                            </span>
                          </div>
                        )}

                        {node.type !== 'input' && (
                          <div 
                            className="absolute -left-2 top-[calc(50%-6px)] w-3.5 h-3.5 bg-[#090B10] border-2 border-[#232A36] rounded-full hover:border-[#00C8FF] hover:bg-[#00C8FF] transition-all cursor-crosshair z-30 flex items-center justify-center group-hover/node:scale-110"
                            data-nodrag="true"
                            onPointerUp={(e) => handlePinPointerUp(e, node.id, 'in')}
                            title="Conectar entrada"
                          >
                            <div className="w-1 bg-[#232A36] rounded-full" />
                          </div>
                        )}

                        {node.type !== 'output' && (
                          <div 
                            className="absolute -right-2 top-[calc(50%-6px)] w-3.5 h-3.5 bg-[#090B10] border-2 border-[#232A36] rounded-full hover:border-[#00D97E] hover:bg-[#00D97E] transition-all cursor-crosshair z-30 flex items-center justify-center group-hover/node:scale-110"
                            data-nodrag="true"
                            onPointerDown={(e) => handlePinPointerDown(e, node.id, 'out', 'out')}
                            title="Arrastrar conexión"
                          >
                            <div className="w-1 bg-[#232A36] rounded-full" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Playback HUD controls */}
            <div className="mt-6 flex items-center justify-between w-full max-w-[500px] bg-[#09090b] px-6 py-2 rounded-xl ring-1 ring-white/5 gap-4 self-center shrink-0">
              <div className="flex gap-4 items-center">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={videoClips.length === 0}
                  className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-40 transition-all cursor-pointer shadow-lg"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </button>
                <button 
                  onClick={() => { setVideoClips([]); setAudioTracks([]); setPlaybackTime(0); setIsPlaying(false); }}
                  className="text-[10px] font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Limpiar Todo
                </button>
              </div>

              {/* Counter status */}
              <div className="text-xs font-mono text-gray-400 flex items-center gap-1.5">
                <span className="text-white font-bold">{playbackTime.toFixed(1)}s</span>
                <span className="opacity-30">/</span>
                <span>{timelineDuration.toFixed(1)}s</span>
              </div>
            </div>

          </div>
        </div>

        {/* BOTTOM TIMELINE CONTROLLER */}
        <div className="h-64 bg-[#09090b] flex flex-col shrink-0">
          
          {/* Timeline header track labels & zoom ruler */}
          <div className="h-10 border-b border-white/5 flex items-center text-[10px] text-gray-500 tracking-wider font-mono">
            <div className="w-[120px] px-5 font-bold uppercase shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
              <span>Pistas</span>
              <div className="flex gap-1">
                {/* Scissors cut split button */}
                <button 
                  onClick={handleSplitClip}
                  disabled={videoClips.length === 0}
                  className="p-1 hover:text-white text-gray-500 disabled:opacity-30 transition-colors"
                  title="Dividir clip en el cursor (Tecla S)"
                >
                  <Scissors size={12} />
                </button>
                
                {/* Real-time Mic Voiceover Recorder */}
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-1 transition-colors ${
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
            <div className="h-12 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/30 shrink-0">
              <div className="w-[120px] px-5 font-bold text-[10px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
                <span>V5 Ajustes</span>
              </div>
              <div className="flex-1 h-full px-2 flex items-center relative">
                {nodesList.length > 0 && nodeConnections.length > 0 ? (
                  <div className="h-[75%] rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center px-3 text-[10px] text-indigo-300 font-bold w-full max-w-[280px]">
                    🎛️ Ajustes de Color Globales (Nodal)
                  </div>
                ) : (
                  <span className="text-[9px] text-gray-600 italic ml-2">Sin efectos aplicados</span>
                )}
              </div>
            </div>

            {/* V4: TITULOS TRACK */}
            <div className="h-12 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/20 shrink-0">
              <div className="w-[120px] px-5 font-bold text-[10px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
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
                      className={`h-[75%] rounded-lg border flex flex-col justify-center px-3 cursor-pointer absolute shrink-0 transition-shadow select-none group/timeline-overlay overflow-hidden ${
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
                        <span className="text-[9px] font-bold truncate block">{clip.name}</span>
                        <span className="text-[7px] text-gray-400 font-mono shrink-0">{clipDuration.toFixed(1)}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* V3: EFECTOS TRACK */}
            <div className="h-12 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/30 shrink-0">
              <div className="w-[120px] px-5 font-bold text-[10px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
                <span>V3 Efectos</span>
              </div>
              <div className="flex-1 h-full px-2 flex items-center relative">
                {nodesList.length > 0 && nodeConnections.length > 0 ? (
                  <div className="h-[75%] rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center px-3 text-[10px] text-pink-300 font-bold w-full max-w-[200px]">
                    ✨ Filtro Nodal Conectado
                  </div>
                ) : (
                  <span className="text-[9px] text-gray-600 italic ml-2">Sin efectos especiales</span>
                )}
              </div>
            </div>

            {/* V2: SUPERPOSICIONES TRACK */}
            <div className="h-16 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/20 shrink-0">
              <div className="w-[120px] px-5 font-bold text-[10px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
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
                      className={`h-[75%] rounded-lg border flex flex-col justify-between p-2 cursor-pointer absolute shrink-0 transition-shadow select-none group/timeline-overlay overflow-hidden ${
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
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[9px] font-bold truncate block">{clip.name}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}
                          className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors z-20"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[7px] text-gray-400 font-mono">
                        <span>{clip.type === 'video' ? '🎬 PIP' : '🖼️ PIP'}</span>
                        <span>{clipDuration.toFixed(1)}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* V1: VIDEO PRINCIPAL TRACK */}
            <div className="h-16 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/30 shrink-0">
              <div className="w-[120px] px-5 font-bold text-[10px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
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
                        className={`h-[75%] rounded-lg border flex flex-col justify-between p-2 cursor-pointer shrink-0 transition-all relative overflow-hidden ${
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
                        <div className="flex justify-between items-center gap-1">
                          <span className="text-[9px] font-bold truncate block">{clip.name}</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}
                            className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors z-20"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                        <div className="flex justify-between items-center text-[7px] text-gray-400 font-mono">
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
            <div className="h-12 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/20 shrink-0">
              <div className="w-[120px] px-5 font-bold text-[10px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
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
                      className={`h-[75%] rounded-lg border flex flex-col justify-between p-1.5 cursor-pointer absolute shrink-0 transition-all overflow-hidden ${
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
                            className="absolute left-0 top-0 bottom-0 w-2 bg-blue-500/60 cursor-ew-resize hover:bg-blue-400 z-10 rounded-l" 
                            onPointerDown={(e) => handleTimelineResize(e, track.id, 'left', 'audio')}
                          />
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 bg-blue-500/60 cursor-ew-resize hover:bg-blue-400 z-10 rounded-r" 
                            onPointerDown={(e) => handleTimelineResize(e, track.id, 'right', 'audio')}
                          />
                        </>
                      )}
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[9px] font-bold truncate block">🎵 {track.name}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteAudioTrack(track.id); }}
                          className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors z-20"
                        >
                          <Trash2 size={8} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[7px] text-gray-400 font-mono">
                        <span>Vol: {track.volume}%</span>
                        <span>{track.duration.toFixed(1)}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* A2: EFECTOS DE SONIDO TRACK */}
            <div className="h-12 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/30 shrink-0">
              <div className="w-[120px] px-5 font-bold text-[10px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
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
                      className={`h-[75%] rounded-lg border flex flex-col justify-between p-1.5 cursor-pointer absolute shrink-0 transition-all overflow-hidden ${
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
                            className="absolute left-0 top-0 bottom-0 w-2 bg-yellow-500/60 cursor-ew-resize hover:bg-yellow-400 z-10 rounded-l" 
                            onPointerDown={(e) => handleTimelineResize(e, track.id, 'left', 'audio')}
                          />
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 bg-yellow-500/60 cursor-ew-resize hover:bg-yellow-400 z-10 rounded-r" 
                            onPointerDown={(e) => handleTimelineResize(e, track.id, 'right', 'audio')}
                          />
                        </>
                      )}
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[9px] font-bold truncate block">⚡ {track.name}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteAudioTrack(track.id); }}
                          className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors z-20"
                        >
                          <Trash2 size={8} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[7px] text-gray-400 font-mono">
                        <span>Vol: {track.volume}%</span>
                        <span>{track.duration.toFixed(1)}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* A3: VOZ EN OFF TRACK */}
            <div className="h-12 border-b border-white/5 flex items-center relative min-w-0 bg-[#070709]/20 shrink-0">
              <div className="w-[120px] px-5 font-bold text-[10px] text-gray-500 uppercase tracking-wider shrink-0 border-r border-white/5 h-full flex items-center bg-[#070709] justify-between">
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
                      className={`h-[75%] rounded-lg border flex flex-col justify-between p-1.5 cursor-pointer absolute shrink-0 transition-all overflow-hidden ${
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
                            className="absolute left-0 top-0 bottom-0 w-2 bg-red-500/60 cursor-ew-resize hover:bg-red-400 z-10 rounded-l" 
                            onPointerDown={(e) => handleTimelineResize(e, track.id, 'left', 'audio')}
                          />
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-2 bg-red-500/60 cursor-ew-resize hover:bg-red-400 z-10 rounded-r" 
                            onPointerDown={(e) => handleTimelineResize(e, track.id, 'right', 'audio')}
                          />
                        </>
                      )}
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[9px] font-bold truncate block">🎙️ {track.name}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteAudioTrack(track.id); }}
                          className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors z-20"
                        >
                          <Trash2 size={8} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-[7px] text-gray-400 font-mono">
                        <span>Vol: {track.volume}%</span>
                        <span>{track.duration.toFixed(1)}s</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* 2. PROPERTIES CONTROLS INSPECTOR SIDEBAR */}
      <div className="w-[340px] bg-[#09090b] border-l border-white/5 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
        
        {/* Header Tab */}
        <div className="p-4 border-b border-white/5 bg-[#050507] shrink-0">
          <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase flex items-center gap-1.5">
            <Sliders size={12} className="text-emerald-400" />
            <span>Inspector Pro</span>
          </span>
        </div>

        {/* Details Area */}
        <div className="p-5 flex-1 space-y-6">
          
          {/* A. Selected Video/Image clip inspector */}
          {selectedClip && (
            <div className="space-y-6 animate-fade-in">
              
              {/* Context header */}
              <div className="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-center justify-between">
                <div>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider block mb-1">
                    {selectedClip.type === 'video' ? 'Clip de Video' : 'Fotografía'}
                  </span>
                  <span className="text-xs font-bold text-white truncate block max-w-[200px]" title={selectedClip.name}>
                    {selectedClip.name}
                  </span>
                </div>
                
                {/* Reordering shifts */}
                <div className="flex gap-1">
                  <button 
                    onClick={() => {
                      const idx = videoClips.findIndex(c => c.id === selectedClipId);
                      if (idx > 0) reorderClips(idx, idx - 1);
                    }}
                    className="p-1 hover:bg-white/10 rounded text-xs"
                    title="Mover a la izquierda"
                  >
                    <ArrowLeft size={12} />
                  </button>
                  <button 
                    onClick={() => {
                      const idx = videoClips.findIndex(c => c.id === selectedClipId);
                      if (idx < videoClips.length - 1) reorderClips(idx, idx + 1);
                    }}
                    className="p-1 hover:bg-white/10 rounded text-xs"
                    title="Mover a la derecha"
                  >
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>

              {/* TRACK PLACEMENT SETTINGS */}
              <div className="space-y-3 p-4 bg-white/2 rounded-xl border border-white/5">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Ubicación de Pista</span>
                <div className="space-y-2.5">
                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1">Tipo de Pista</span>
                    <select 
                      value={selectedClip.placementMode || 'sequence'}
                      onChange={e => {
                        const mode = e.target.value as 'sequence' | 'overlay';
                        updateClip(selectedClip.id, { 
                          placementMode: mode,
                          timelineStart: mode === 'overlay' ? playbackTime : 0 
                        });
                      }}
                      className="w-full bg-black p-2.5 rounded-lg text-xs ring-1 ring-white/10 outline-none focus:ring-emerald-500"
                    >
                      <option value="sequence">Pista Principal (Secuencial)</option>
                      <option value="overlay">Superposición (Capa PIP)</option>
                    </select>
                  </div>

                  {selectedClip.placementMode === 'overlay' && (
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-1">Tiempo de Inicio en la Línea (segundos)</span>
                      <input 
                        type="number"
                        min="0"
                        max={Math.max(timelineDuration, 5)}
                        step="0.1"
                        value={selectedClip.timelineStart || 0}
                        onChange={e => updateClip(selectedClip.id, { timelineStart: Number(e.target.value) })}
                        className="w-full bg-black p-2 rounded-lg text-xs ring-1 ring-white/10 outline-none text-white focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SPEED CURVES & TIME REMAPPING */}
              {selectedClip.type === 'video' && (
                <div className="space-y-3 p-4 bg-white/2 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} className="text-yellow-400 animate-pulse" />
                    <span>Curvas de Velocidad</span>
                  </span>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-1">Modo de Velocidad</span>
                      <select 
                        value={selectedClip.speedMode || 'constant'}
                        onChange={e => updateClip(selectedClip.id, { speedMode: e.target.value as 'constant' | 'curve' })}
                        className="w-full bg-black p-2.5 rounded-lg text-xs ring-1 ring-white/10 outline-none focus:ring-emerald-500"
                      >
                        <option value="constant">Velocidad Constante</option>
                        <option value="curve">Curva de Velocidad (Dínamica)</option>
                      </select>
                    </div>

                    {selectedClip.speedMode === 'curve' ? (
                      <div className="space-y-3 pt-1">
                        <div>
                          <span className="text-[9px] text-gray-500 block mb-1">Ajuste / Preset</span>
                          <select 
                            value={selectedClip.speedCurvePreset || 'none'}
                            onChange={e => {
                              const preset = e.target.value as any;
                              let points = [1, 1, 1, 1, 1];
                              if (preset === 'bullet') points = [2.0, 2.0, 0.5, 2.0, 2.0];
                              else if (preset === 'montage') points = [0.5, 1.5, 3.0, 1.5, 0.5];
                              else if (preset === 'hero') points = [1.0, 1.0, 0.25, 1.0, 1.0];
                              else if (preset === 'jump') points = [3.0, 0.25, 3.0, 1.0, 1.0];
                              
                              updateClip(selectedClip.id, { 
                                speedCurvePreset: preset,
                                curvePoints: points
                              });
                            }}
                            className="w-full bg-black p-2.5 rounded-lg text-xs ring-1 ring-white/10 outline-none focus:ring-emerald-500"
                          >
                            <option value="none">Plana (1x sin cambios)</option>
                            <option value="bullet">Bullet Time (Rápido - Lento - Rápido)</option>
                            <option value="montage">Montaje (Lento - Rápido - Lento)</option>
                            <option value="hero">Héroe (Normal - Cámara Lenta - Normal)</option>
                            <option value="jump">Jump Cut (Rápido - Lento - Rápido - Normal)</option>
                            <option value="custom">Personalizado (Manual)</option>
                          </select>
                        </div>

                        {/* 5 keypoints sliders */}
                        <div className="space-y-2 pt-1 border-t border-white/5">
                          <span className="text-[9px] text-gray-400 uppercase font-black block mb-1">Ajustar Puntos de Curva</span>
                          {(() => {
                            const pts = selectedClip.curvePoints || [1, 1, 1, 1, 1];
                            const labels = ['Inicio (0%)', 'Cuarto (25%)', 'Medio (50%)', 'Tres Cuartos (75%)', 'Fin (100%)'];
                            return pts.map((val, idx) => (
                              <div key={idx} className="space-y-0.5 font-sans">
                                <div className="flex justify-between text-[9px] text-gray-500">
                                  <span>{labels[idx]}</span>
                                  <span className="font-bold text-gray-300 font-mono">{val.toFixed(2)}x</span>
                                </div>
                                <input 
                                  type="range"
                                  min="0.25"
                                  max="4"
                                  step="0.05"
                                  value={val}
                                  onChange={e => {
                                    const newPts = [...pts];
                                    newPts[idx] = Number(e.target.value);
                                    updateClip(selectedClip.id, { 
                                      curvePoints: newPts,
                                      speedCurvePreset: 'custom'
                                    });
                                  }}
                                  className="w-full accent-yellow-400 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                                />
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex justify-between text-[10px] text-gray-400 uppercase font-black">
                          <span>Multiplicador de Velocidad</span>
                          <span className="font-mono">{(selectedClip.constantSpeed || 1.0).toFixed(2)}x</span>
                        </div>
                        <input 
                          type="range"
                          min="0.25"
                          max="4"
                          step="0.05"
                          value={selectedClip.constantSpeed || 1.0}
                          onChange={e => updateClip(selectedClip.id, { constantSpeed: Number(e.target.value) })}
                          className="w-full accent-emerald-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[8px] text-gray-600 font-mono">
                          <span>Cámara Lenta (0.25x)</span>
                          <span>Normal (1x)</span>
                          <span>Cámara Rápida (4x)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Global visual filters replication */}
              <button 
                onClick={() => {
                  applyEffectsToAllClips(selectedClip.id);
                  alert("¡Efectos visuales y mejoras aplicadas a todos los clips de la cinta!");
                }}
                className="w-full py-2.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy size={12} /> Aplicar Efectos a Todo
              </button>

              {/* A1. TRIM SETTINGS (scissors) */}
              <div className="space-y-3 p-4 bg-white/2 rounded-xl border border-white/5">
                <span className="text-[10px] font-black tracking-widest uppercase text-gray-400 flex items-center gap-1.5">
                  <Scissors size={12} className="text-emerald-400" />
                  <span>Recortar Duración</span>
                </span>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Corte Inicio</span>
                      <span className="font-mono">{selectedClip.startTrim.toFixed(1)}s</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max={selectedClip.endTrim}
                      step="0.1"
                      value={selectedClip.startTrim}
                      onChange={e => updateClip(selectedClip.id, { startTrim: Number(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Corte Fin</span>
                      <span className="font-mono">{selectedClip.endTrim.toFixed(1)}s</span>
                    </div>
                    <input 
                      type="range"
                      min={selectedClip.startTrim}
                      max={selectedClip.duration}
                      step="0.1"
                      value={selectedClip.endTrim}
                      onChange={e => updateClip(selectedClip.id, { endTrim: Number(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded text-center">
                    Duración Resultante: {(selectedClip.endTrim - selectedClip.startTrim).toFixed(1)}s
                  </div>
                </div>
              </div>

              {/* SPECIAL TEXT PROPERTIES */}
              {selectedClip.type === 'text' && (
                <div className="p-4 bg-[#0a0a0f] rounded-xl border border-white/5 space-y-4">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider block">Propiedades de Texto</span>
                  
                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1">Contenido de Texto</span>
                    <textarea 
                      value={selectedClip.textContent || ''}
                      onChange={e => updateClip(selectedClip.id, { textContent: e.target.value })}
                      rows={3}
                      className="w-full bg-black p-2 rounded-lg text-xs border border-white/10 text-white outline-none focus:border-emerald-500 resize-none font-medium"
                      placeholder="Escribe el texto aquí..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-1">Tamaño de Fuente</span>
                      <input 
                        type="number"
                        min="10"
                        max="200"
                        value={selectedClip.textFontSize || 40}
                        onChange={e => updateClip(selectedClip.id, { textFontSize: Number(e.target.value) })}
                        className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-emerald-500 text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-1">Color de Texto</span>
                      <div className="flex gap-2 items-center">
                        <input 
                          type="color"
                          value={selectedClip.textColor || '#ffffff'}
                          onChange={e => updateClip(selectedClip.id, { textColor: e.target.value })}
                          className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                        />
                        <input 
                          type="text"
                          value={selectedClip.textColor || '#ffffff'}
                          onChange={e => updateClip(selectedClip.id, { textColor: e.target.value })}
                          className="w-full bg-black p-1 text-[10px] rounded border border-white/10 font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1 font-medium">Tipografía</span>
                    <select 
                      value={selectedClip.textFontFamily || 'Montserrat'}
                      onChange={e => updateClip(selectedClip.id, { textFontFamily: e.target.value })}
                      className="w-full bg-black p-2 rounded text-xs border border-white/10 text-white outline-none focus:border-emerald-500"
                    >
                      <option value="Montserrat">Montserrat (Moderno)</option>
                      <option value="Bebas Neue">Bebas Neue (Impacto)</option>
                      <option value="Playfair Display">Playfair Display (Elegante)</option>
                      <option value="sans-serif">System Sans</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1 font-medium">Estilo / Animación Kinetic</span>
                    <select 
                      value={selectedClip.textEffect || 'none'}
                      onChange={e => updateClip(selectedClip.id, { textEffect: e.target.value as any })}
                      className="w-full bg-black p-2 rounded text-xs border border-white/10 text-white outline-none focus:border-emerald-500"
                    >
                      <option value="none">Estático Simple</option>
                      <option value="shadow">Estático con Sombra</option>
                      <option value="neon">Pulsación de Neón Glow</option>
                      <option value="glitch">Glitch Cibernético</option>
                      <option value="typing">Máquina de Escribir (Reveal)</option>
                      <option value="fade-zoom">Desvanecimiento Suave (Ken Burns)</option>
                      <option value="bounce">Bote Elástico (Pop In)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Manual layout adjustment properties */}
              <div className="p-4 bg-white/2 rounded-xl border border-white/5 space-y-3">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Diseño & Encuadre</span>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1">Posición X (px)</span>
                    <input 
                      type="number"
                      value={selectedClip.x !== undefined ? selectedClip.x : 0}
                      onChange={e => updateClip(selectedClip.id, { x: Number(e.target.value) })}
                      className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1">Posición Y (px)</span>
                    <input 
                      type="number"
                      value={selectedClip.y !== undefined ? selectedClip.y : 0}
                      onChange={e => updateClip(selectedClip.id, { y: Number(e.target.value) })}
                      className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1 font-medium">Ancho (px)</span>
                    <input 
                      type="number"
                      value={selectedClip.width !== undefined ? selectedClip.width : (CANVAS_DIMENSIONS[format]?.w || 1080)}
                      onChange={e => updateClip(selectedClip.id, { width: Number(e.target.value) })}
                      className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1 font-medium">Alto (px)</span>
                    <input 
                      type="number"
                      value={selectedClip.height !== undefined ? selectedClip.height : (CANVAS_DIMENSIONS[format]?.h || 1920)}
                      onChange={e => updateClip(selectedClip.id, { height: Number(e.target.value) })}
                      className="w-full bg-black p-2 rounded border border-white/10 text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="col-span-2 flex items-center justify-between py-1 border-t border-white/5 mt-1">
                    <span className="text-[10px] text-gray-400">Bloquear aspecto al escalar</span>
                    <input 
                      type="checkbox"
                      checked={aspectRatioLock}
                      onChange={e => setAspectRatioLock(e.target.checked)}
                      className="accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </div>

                  <div className="col-span-2">
                    <span className="text-[9px] text-gray-500 block mb-1 font-medium">Ajuste de Escala (Fit Mode)</span>
                    <select 
                      value={selectedClip.fitMode || 'cover'}
                      onChange={e => updateClip(selectedClip.id, { fitMode: e.target.value as any })}
                      className="w-full bg-black p-2 rounded text-xs border border-white/10 text-white outline-none focus:border-emerald-500"
                    >
                      <option value="cover">Rellenar (Cover - Corta para rellenar)</option>
                      <option value="contain">Ajustar (Contain - Muestra completo con bordes)</option>
                      <option value="fill">Estirar (Fill - Deformación libre)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex justify-between text-[10px] text-gray-400 uppercase font-black">
                    <span>Escala / Zoom</span>
                    <span className="font-mono">{selectedClip.scale || 100}%</span>
                  </div>
                  <input 
                    type="range"
                    min="50"
                    max="200"
                    value={selectedClip.scale || 100}
                    onChange={e => updateClip(selectedClip.id, { scale: Number(e.target.value) })}
                    className="w-full accent-emerald-500 cursor-pointer mt-1"
                  />
                </div>
              </div>

              {/* A2. VISUAL FX FILTERS */}
              <div className="space-y-3 p-4 bg-[#050507] rounded-xl border border-white/5">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Filtros Rápidos</span>
                <div className="grid grid-cols-2 gap-1.5 pb-2 border-b border-white/5">
                  {[
                    { name: 'Original', b: 100, c: 100, s: 100, bl: 0, g: 0, se: 0, h: 0 },
                    { name: 'Cinemático', b: 105, c: 115, s: 105, bl: 0, g: 0, se: 10, h: 0 },
                    { name: 'VHS Retro', b: 100, c: 110, s: 80, bl: 0.5, g: 0, se: 20, h: 0 },
                    { name: 'Cyberpunk', b: 100, c: 115, s: 150, bl: 0, g: 0, se: 0, h: 120 },
                    { name: 'Noir (B&N)', b: 95, c: 120, s: 100, bl: 0, g: 100, se: 0, h: 0 },
                    { name: 'Cálido', b: 100, c: 100, s: 110, bl: 0, g: 0, se: 30, h: 0 },
                    { name: 'Frío', b: 100, c: 100, s: 105, bl: 0, g: 0, se: 0, h: 200 }
                  ].map((filter) => (
                    <button
                      key={filter.name}
                      onClick={() => {
                        updateClip(selectedClip.id, {
                          brightness: filter.b,
                          contrast: filter.c,
                          saturate: filter.s,
                          blur: filter.bl,
                          grayscale: filter.g,
                          sepia: filter.se,
                          hueRotate: filter.h
                        });
                      }}
                      className="py-1.5 px-2 bg-white/5 hover:bg-emerald-600/20 hover:text-emerald-400 border border-white/5 rounded text-[10px] text-gray-300 font-semibold cursor-pointer text-center transition-colors truncate"
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>

                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block pt-2">Ajuste Manual</span>
                
                <div className="space-y-4">
                  {[
                    { label: 'Brillo', prop: 'brightness', min: 0, max: 200 },
                    { label: 'Contraste', prop: 'contrast', min: 0, max: 200 },
                    { label: 'Saturación', prop: 'saturate', min: 0, max: 200 },
                    { label: 'Desenfoque', prop: 'blur', min: 0, max: 20 },
                    { label: 'Blanco & Negro', prop: 'grayscale', min: 0, max: 100 },
                    { label: 'Sepia', prop: 'sepia', min: 0, max: 100 },
                    { label: 'Tono (Giro)', prop: 'hueRotate', min: 0, max: 360 },
                    { label: 'Opacidad', prop: 'opacity', min: 0, max: 100 }
                  ].map(({ label, prop, min, max }) => (
                    <div key={prop}>
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{label}</span>
                        <span>{(selectedClip as any)[prop]}</span>
                      </div>
                      <input 
                        type="range"
                        min={min}
                        max={max}
                        value={(selectedClip as any)[prop]}
                        onChange={e => updateClip(selectedClip.id, { [prop]: Number(e.target.value) })}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* A3. TRANSITIONS SETTINGS */}
              <div className="space-y-3 p-4 bg-[#050507] rounded-xl border border-white/5">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Transiciones Rápidas</span>
                
                <div className="grid grid-cols-3 gap-1.5 pb-2 border-b border-white/5">
                  {[
                    { name: 'Corte', type: 'none', dur: 0 },
                    { name: 'Disolver', type: 'fade', dur: 500 },
                    { name: 'Iris Abrir', type: 'camera-open', dur: 800 },
                    { name: 'Iris Cerrar', type: 'camera-close', dur: 800 },
                    { name: 'Bloques', type: 'blocks', dur: 600 },
                    { name: 'Desenfoque', type: 'blur', dur: 500 },
                  ].map((trans) => (
                    <button
                      key={trans.name}
                      onClick={() => {
                        updateClip(selectedClip.id, {
                          transitionType: trans.type as any,
                          transitionDuration: trans.dur
                        });
                      }}
                      className={`py-1.5 px-1 border rounded text-[10px] font-semibold cursor-pointer text-center transition-colors truncate ${
                        selectedClip.transitionType === trans.type
                          ? 'border-emerald-500 bg-emerald-600/10 text-emerald-400'
                          : 'border-white/5 bg-white/5 hover:bg-emerald-600/20 text-gray-300'
                      }`}
                    >
                      {trans.name}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <span className="text-[9px] text-gray-500 block mb-1">Efecto (Manual)</span>
                    <select 
                      value={selectedClip.transitionType}
                      onChange={e => updateClip(selectedClip.id, { transitionType: e.target.value as any })}
                      className="w-full bg-black p-2.5 rounded-lg text-xs ring-1 ring-white/10 outline-none focus:ring-emerald-500"
                    >
                      <option value="none">Corte Recto (Ninguno)</option>
                      <option value="fade">Disolvencia (Fade)</option>
                      <option value="slide-left">Slide Lateral</option>
                      <option value="zoom-in">Zoom In (Ken Burns)</option>
                      <option value="blur">Desenfoque (Blur)</option>
                      <option value="camera-open">Apertura de Cámara (Iris)</option>
                      <option value="camera-close">Cierre de Cámara (Iris)</option>
                      <option value="blocks">Aparición de Bloques (Grilla)</option>
                    </select>
                  </div>

                  {selectedClip.transitionType !== 'none' && (
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-1">Duración (ms)</span>
                      <input 
                        type="number"
                        min="100"
                        max="2000"
                        step="100"
                        value={selectedClip.transitionDuration}
                        onChange={e => updateClip(selectedClip.id, { transitionDuration: Number(e.target.value) })}
                        className="w-full bg-black p-2 rounded-lg text-xs ring-1 ring-white/10 outline-none text-white focus:ring-emerald-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* A4. AUDIO CONTROLS */}
              {selectedClip.type === 'video' && (
                <div className="space-y-3 p-4 bg-white/2 rounded-xl border border-white/5">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                    <Volume2 size={12} className="text-emerald-400" />
                    <span>Volumen Original Clip</span>
                  </span>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range"
                      min="0"
                      max="200"
                      value={selectedClip.volume}
                      onChange={e => updateClip(selectedClip.id, { volume: Number(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-[10px] font-bold font-mono text-gray-400 shrink-0 w-8">{selectedClip.volume}%</span>
                  </div>
                </div>
              )}

              {/* A5. PREMIUM ENHANCEMENTS */}
              <div className="space-y-3 p-4 bg-gradient-to-r from-emerald-950/20 to-black rounded-xl border border-emerald-500/20">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles size={12} />
                  <span>Mejoras WASM / Inteligentes</span>
                </span>
                
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-gray-300 hover:text-white">
                    <input 
                      type="checkbox"
                      checked={selectedClip.improveSound}
                      onChange={e => updateClip(selectedClip.id, { improveSound: e.target.checked })}
                      className="w-4 h-4 rounded border-white/10 bg-black accent-emerald-500"
                    />
                    <span>Mejorar Sonido (Denoise)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-gray-300 hover:text-white">
                    <input 
                      type="checkbox"
                      checked={selectedClip.improveImage}
                      onChange={e => updateClip(selectedClip.id, { improveImage: e.target.checked })}
                      className="w-4 h-4 rounded border-white/10 bg-black accent-emerald-500"
                    />
                    <span>Mejorar Imagen (Nitidez)</span>
                  </label>
                </div>
              </div>

              {/* Delete Clip */}
              <button 
                onClick={() => deleteClip(selectedClip.id)}
                className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
              >
                Eliminar Clip de la Línea
              </button>
            </div>
          )}

          {/* B. Selected Background Audio Track Inspector */}
          {selectedAudio && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-3.5 bg-blue-500/5 rounded-xl border border-blue-500/10">
                <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider block mb-1">
                  Música de Fondo
                </span>
                <span className="text-xs font-bold text-white truncate block" title={selectedAudio.name}>
                  {selectedAudio.name}
                </span>
              </div>

              {/* Volume Slider */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-[10px] text-gray-400 uppercase font-black">
                  <span>Volumen Mezcla</span>
                  <span className="font-mono">{selectedAudio.volume}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="200"
                  value={selectedAudio.volume}
                  onChange={e => updateAudioTrack(selectedAudio.id, { volume: Number(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Timeline Start Position Offset */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-[10px] text-gray-400 uppercase font-black">
                  <span>Posición de Inicio</span>
                  <span className="font-mono">{selectedAudio.timelineStart.toFixed(1)}s</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max={Math.max(timelineDuration, 5)}
                  step="0.1"
                  value={selectedAudio.timelineStart}
                  onChange={e => updateAudioTrack(selectedAudio.id, { timelineStart: Number(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              {/* Audio Trim length */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-[10px] text-gray-400 uppercase font-black">
                  <span>Duración Pista</span>
                  <span className="font-mono">{selectedAudio.duration.toFixed(1)}s</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="60"
                  step="0.5"
                  value={selectedAudio.duration}
                  onChange={e => updateAudioTrack(selectedAudio.id, { duration: Number(e.target.value) })}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <button 
                onClick={() => deleteAudioTrack(selectedAudio.id)}
                className="w-full py-3 rounded-xl bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
              >
                Eliminar Música de Fondo
              </button>
            </div>
          )}

          {/* Empty select guide - Render Audio Mixer */}
          {!selectedClip && !selectedAudio && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-3 bg-white/2 border border-white/5 rounded-xl text-center text-gray-400">
                <span className="text-[10px] font-bold block mb-1">💡 CONSEJO</span>
                <p className="text-[10px] text-gray-500">Haz clic en cualquier clip o pista de música en la línea de tiempo para editar sus propiedades individuales.</p>
              </div>

              {/* GLOBAL MIXER AREA */}
              <div className="space-y-4">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Volume2 size={12} className="text-emerald-400" />
                  <span>Mezclador de Audio Global</span>
                </span>

                {/* Master Volume Controls */}
                <div className="space-y-3 bg-gradient-to-br from-emerald-950/20 to-blue-950/20 p-3 rounded-xl border border-white/10">
                  <span className="text-[9px] text-gray-300 font-bold uppercase tracking-wider block mb-1">Controles Generales</span>
                  
                  {/* Master Ambient Volume */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-emerald-400 font-semibold">🔊 Sonido Ambiente General</span>
                      <span className="font-mono text-gray-400">{masterAmbientVolume}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="200"
                      value={masterAmbientVolume}
                      onChange={e => setMasterAmbientVolume(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Master Music Volume */}
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-blue-400 font-semibold">🎵 Música / Voz en Off General</span>
                      <span className="font-mono text-gray-400">{masterMusicVolume}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="200"
                      value={masterMusicVolume}
                      onChange={e => setMasterMusicVolume(Number(e.target.value))}
                      className="w-full accent-blue-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Original clips (ambient sound) mixer list */}
                <div className="space-y-3">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block">Sonido Ambiente (Video Clips)</span>
                  {videoClips.filter(c => c.type === 'video').length === 0 ? (
                    <span className="text-[10px] text-gray-600 italic block">No hay clips de video en la línea de tiempo.</span>
                  ) : (
                    <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
                      {videoClips.filter(c => c.type === 'video').map(clip => (
                        <div key={clip.id} className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-300 truncate w-36" title={clip.name}>{clip.name}</span>
                            <span className="font-mono text-gray-500">{clip.volume}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="range"
                              min="0"
                              max="200"
                              value={clip.volume}
                              onChange={e => updateClip(clip.id, { volume: Number(e.target.value) })}
                              className="w-full accent-emerald-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Background music & Voiceover mixer list */}
                <div className="space-y-3">
                  <span className="text-[9px] text-gray-400 uppercase font-bold block">Pistas de Música / Voz en Off</span>
                  {audioTracks.length === 0 ? (
                    <span className="text-[10px] text-gray-600 italic block">No hay pistas de música agregadas.</span>
                  ) : (
                    <div className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
                      {audioTracks.map(track => (
                        <div key={track.id} className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-300 truncate w-36" title={track.name}>🎵 {track.name}</span>
                            <span className="font-mono text-gray-500">{track.volume}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="range"
                              min="0"
                              max="200"
                              value={track.volume}
                              onChange={e => updateAudioTrack(track.id, { volume: Number(e.target.value) })}
                              className="w-full accent-blue-500 cursor-pointer"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FIXED EXPORT FOOTER */}
        <div className="p-5 border-t border-white/5 bg-[#050507] shrink-0 space-y-4">
          <div className="space-y-1.5">
            <span className="text-[9px] text-gray-400 uppercase font-bold block">Calidad de Exportación</span>
            <div className="grid grid-cols-3 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5">
              {(['720p', '1080p', '4k'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setExportQuality(q)}
                  className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                    exportQuality === q
                      ? 'bg-blue-600/25 text-blue-400 border border-blue-500/30'
                      : 'text-gray-400 border border-transparent hover:bg-white/5'
                  }`}
                >
                  {q === '720p' && '720p (Rápido)'}
                  {q === '1080p' && '1080p (HD)'}
                  {q === '4k' && '4K (Ultra HD)'}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleExportVideo}
            disabled={videoClips.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-sm cursor-pointer"
          >
            <span>🎬</span>
            <span>Exportar Video WASM</span>
          </button>
        </div>
      </div>

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
