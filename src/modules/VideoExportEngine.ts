import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import type { VideoClip, AudioTrack, CanvasFormat } from '../types';

// Standard video settings for compilation
const VIDEO_FPS = 30;
const AUDIO_SAMPLE_RATE = 44100;

function getClipPlayDuration(clip: VideoClip): number {
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
}

function getAtempoFilter(speed: number): string {
  if (speed === 1.0) return 'atempo=1.0';
  let parts: string[] = [];
  let remaining = speed;
  while (remaining > 2.0) {
    parts.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    parts.push('atempo=0.5');
    remaining /= 0.5;
  }
  if (remaining !== 1.0) {
    parts.push(`atempo=${remaining.toFixed(3)}`);
  }
  return parts.join(',');
}

// Mapping of canvas format to dimensions
const RESOLUTION_MAP: Record<CanvasFormat, { w: number; h: number }> = {
  '1:1': { w: 1080, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '16:9': { w: 1920, h: 1080 },
  '3:1': { w: 1500, h: 500 },
};

function inferFileExtension(url: string, fallback: string) {
  const clean = url.toLowerCase().split('?')[0].split('#')[0];
  const match = clean.match(/\.([a-z0-9]+)$/i);
  return match ? match[1] : fallback;
}

/**
 * Helper to fetch a Blob URL and convert it to a Uint8Array for FFmpeg MEMFS.
 */
async function fetchFileBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith('data:')) {
    const parts = url.split(',');
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return u8arr;
  }

  let fetchUrl = url;
  if (url.startsWith('https://www.soundhelix.com/')) {
    fetchUrl = url.replace('https://www.soundhelix.com/', '/proxy-soundhelix/');
  }

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    if (url.startsWith('http') && !url.includes(window.location.host)) {
      try {
        console.warn(`Fetch failed for ${url}, trying via CORS proxy...`);
        const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const response = await fetch(corsProxyUrl);
        if (!response.ok) throw new Error(`CORS proxy HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      } catch (proxyErr) {
        throw new Error(`No se pudo cargar el archivo desde ${url} debido a restricciones de seguridad (CORS).`);
      }
    }
    throw err;
  }
}

async function createEsmWrapperBlobUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar el core de FFmpeg (${response.status}).`);
  }

  const source = await response.text();
  const wrappedSource = `${source}\nexport default createFFmpegCore;\n`;
  return URL.createObjectURL(
    new Blob([wrappedSource], { type: 'text/javascript' })
  );
}

/**
 * Main WebAssembly Video Compilation Engine
 */
export class VideoExportEngine {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  /**
   * Initializes FFmpeg WASM from the unpkg CDN.
   */
  async init(onLog?: (message: string) => void, onProgress?: (progress: number) => void) {
    if (this.isLoaded && this.ffmpeg) return;

    if (!this.ffmpeg) {
      this.ffmpeg = new FFmpeg();
    }

    if (onLog) {
      this.ffmpeg.on('log', ({ message }) => {
        onLog(message);
      });
    }

    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.min(Math.round(progress * 100), 99)); // Cap at 99 until download
      });
    }

    let base = '/';
    try {
      base = (import.meta as any).env.BASE_URL || '/';
    } catch (e) {
      base = '/';
    }
    let normalizedBase = base.endsWith('/') ? base : base + '/';
    
    // Automatically detect GitHub Pages subdirectory if base is still '/'
    if (normalizedBase === '/' && window.location.hostname.endsWith('.github.io')) {
      const pathParts = window.location.pathname.split('/');
      if (pathParts.length > 1 && pathParts[1]) {
        normalizedBase = `/${pathParts[1]}/`;
      }
    }

    const baseURL = window.location.origin + normalizedBase;
    const coreURL = await createEsmWrapperBlobUrl(`${baseURL}ffmpeg/ffmpeg-core.js`);
    const wasmURL = await toBlobURL(`${baseURL}ffmpeg/ffmpeg-core.wasm`, 'application/wasm');

    await this.ffmpeg.load({
      coreURL,
      wasmURL,
    });

    this.isLoaded = true;
  }

  /**
   * Compiles the video timeline into an MP4 file.
   */
  async compile(
    clips: VideoClip[],
    audioTracks: AudioTrack[],
    format: CanvasFormat,
    masterAmbientVolume: number,
    masterMusicVolume: number,
    onProgress: (percent: number) => void,
    onLog?: (msg: string) => void,
    quality?: '720p' | '1080p' | '4k'
  ): Promise<Blob> {
    if (!this.isLoaded || !this.ffmpeg) {
      throw new Error('FFmpeg engine is not initialized. Call init() first.');
    }

    const ffmpeg = this.ffmpeg;
    const baseRes = RESOLUTION_MAP[format] || RESOLUTION_MAP['9:16'];
    
    let scaleRatio = 1.0;
    if (quality === '720p') {
      scaleRatio = 720 / 1080;
    } else if (quality === '4k') {
      scaleRatio = 2160 / 1080;
    } else if (quality === 'whatsapp') {
      scaleRatio = 720 / 1080; // Limit to 720p for WhatsApp to maintain efficiency
    }
    
    const w = Math.round((baseRes.w * scaleRatio) / 2) * 2;
    const h = Math.round((baseRes.h * scaleRatio) / 2) * 2;

    // Calculate duration for bitrate targeting
    let totalDuration = 0.1;
    const seqClips = clips.filter(c => c.placementMode !== 'overlay');
    seqClips.forEach(c => totalDuration += getClipPlayDuration(c));
    const overlayClips = clips.filter(c => c.placementMode === 'overlay');
    overlayClips.forEach(o => {
      const end = (o.timelineStart || 0) + getClipPlayDuration(o);
      if (end > totalDuration) totalDuration = end;
    });

    onProgress(5); // Start progress indicator

    // Base video codec args
    let vCodecArgs = ['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23'];
    if (quality === 'whatsapp') {
      // Target 60MB (60 * 1024 * 1024 * 8 bits)
      const targetSizeBytes = 60 * 1024 * 1024;
      const targetBitrateKbps = Math.floor((targetSizeBytes * 8) / (totalDuration * 1000));
      // Cap bitrate between 1000kbps and 5000kbps for WhatsApp
      const bitrate = Math.min(Math.max(targetBitrateKbps, 1000), 5000);
      onLog?.(`Optimizando para WhatsApp: Bitrate objetivo ${bitrate} kbps para una duración de ${totalDuration.toFixed(1)}s`);
      vCodecArgs = ['-c:v', 'libx264', '-preset', 'medium', '-b:v', `${bitrate}k`, '-maxrate', `${bitrate}k`, '-bufsize', `${bitrate * 2}k`];
    }

    // Clean MEMFS directory of any previous files
    try {
      const dirContents = await ffmpeg.listDir('/');
      for (const item of dirContents) {
        if (!item.isDir) {
          await ffmpeg.deleteFile(item.name);
        }
      }
    } catch (e) {
      console.log('Memo files cleanup skipped:', e);
    }

    // Reuseable clip preprocessor helper function
    const preprocessClip = async (clip: VideoClip, i: number, prefix: string) => {
      onLog?.(`Preparando clip ${clip.name} (${clip.placementMode || 'sequence'})...`);
      
      const fileBytes = await fetchFileBytes(clip.url);
      const isGif = clip.type === 'image' && (
        clip.url.toLowerCase().split('?')[0].endsWith('.gif') || 
        clip.url.toLowerCase().includes('.gif?') || 
        clip.url.toLowerCase().includes('/gif')
      );
      const ext = isGif ? 'gif' : (clip.type === 'image' ? inferFileExtension(clip.url, 'png') : inferFileExtension(clip.url, 'mp4'));
      const inputFilename = `${prefix}_input_${i}.${ext}`;
      await ffmpeg.writeFile(inputFilename, fileBytes);

      const playDuration = getClipPlayDuration(clip);
      const outputFilename = `${prefix}_processed_${i}.mp4`;

      // Extract position and sizing layout coordinates scaled by scaleRatio
      const cWidth = (clip.width !== undefined ? clip.width : baseRes.w) * scaleRatio;
      const cHeight = (clip.height !== undefined ? clip.height : baseRes.h) * scaleRatio;
      const cX = (clip.x !== undefined ? clip.x : 0) * scaleRatio;
      const cY = (clip.y !== undefined ? clip.y : 0) * scaleRatio;
      const scaleFactor = (clip.scale || 100) / 100;
      
      const finalW = Math.round((cWidth * scaleFactor) / 2) * 2;
      const finalH = Math.round((cHeight * scaleFactor) / 2) * 2;
      // Zoom centered offset
      const finalX = Math.round(cX + (cWidth - finalW) / 2);
      const finalY = Math.round(cY + (cHeight - finalH) / 2);

      // Brightness, Contrast, Saturation
      const fBrightness = (clip.brightness / 100) - 1.0;
      const fContrast = clip.contrast / 100;
      const fSaturation = clip.saturate / 100;
      const fOpacity = clip.opacity / 100;
      const brightnessVal = fOpacity !== 1.0 ? fBrightness + (fOpacity - 1.0) * 0.5 : fBrightness;

      const isOverlay = clip.placementMode === 'overlay';

      const getFitFilter = () => {
        const mode = clip.fitMode || 'contain';
        const posX = clip.objectPositionX !== undefined ? clip.objectPositionX : 50;
        const posY = clip.objectPositionY !== undefined ? clip.objectPositionY : 50;
        
        if (mode === 'contain') {
          return [
            `scale=w=${finalW}:h=${finalH}:force_original_aspect_ratio=decrease`,
            `pad=w=${finalW}:h=${finalH}:x=(ow-iw)/2:y=(oh-ih)/2:color=black`,
            `setsar=1`
          ];
        } else if (mode === 'cover') {
          return [
            `scale=w=${finalW}:h=${finalH}:force_original_aspect_ratio=increase`,
            `crop=w=${finalW}:h=${finalH}:x=(iw-ow)*${(posX / 100).toFixed(3)}:y=(ih-oh)*${(posY / 100).toFixed(3)}`,
            `setsar=1`
          ];
        } else {
          return [
            `scale=${finalW}:${finalH}`,
            `setsar=1`
          ];
        }
      };

      // Base visual filters helper
      const getBaseVf = () => {
        let vfParts = [...getFitFilter()];
        vfParts.push(`eq=brightness=${brightnessVal}:contrast=${fContrast}:saturation=${fSaturation}`);
        if (clip.grayscale > 0) vfParts.push(`hue=s=${1.0 - (clip.grayscale / 100)}`);
        if (clip.sepia > 0) {
          const sepiaFactor = clip.sepia / 100;
          const rMix = `${1.0 - sepiaFactor * 0.607}:${sepiaFactor * 0.769}:${sepiaFactor * 0.189}`;
          const gMix = `${sepiaFactor * 0.349}:${1.0 - sepiaFactor * 0.314}:${sepiaFactor * 0.168}`;
          const bMix = `${sepiaFactor * 0.272}:${sepiaFactor * 0.534}:${1.0 - sepiaFactor * 0.869}`;
          vfParts.push(`colorchannelmixer=${rMix}:0:${gMix}:0:${bMix}`);
        }
        if (clip.hueRotate > 0) vfParts.push(`hue=h=${clip.hueRotate}`);
        if (clip.blur > 0) vfParts.push(`gblur=sigma=${(clip.blur / 20) * 10 + 1}`);
        if (clip.improveImage) vfParts.push('unsharp=5:5:1.0:5:5:0.0', 'eq=contrast=1.08:saturation=1.1');
        if (clip.zoomEffect === 'zoom-in') {
          vfParts.push(`zoompan=z='min(zoom+0.0015,1.20)':d=${Math.ceil(playDuration * VIDEO_FPS)}:s=${finalW}x${finalH}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`);
        } else if (clip.zoomEffect === 'zoom-out') {
          vfParts.push(`zoompan=z='max(1.20-0.0015*on,1.0)':d=${Math.ceil(playDuration * VIDEO_FPS)}:s=${finalW}x${finalH}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`);
        }
        vfParts.push('format=yuv420p');
        return vfParts.join(',');
      };

      if (clip.type === 'image') {
        // Image to video translation: use loop option and generate dummy stereo sound
        const vfString = `${getBaseVf()}[vid];color=c=black:s=${w}x${h}[bg];[bg][vid]overlay=x=${finalX}:y=${finalY}:eof_action=pass`;
        
        const inputArgs = isGif 
          ? ['-ignore_loop', '0', '-i', inputFilename] 
          : ['-loop', '1', '-framerate', `${VIDEO_FPS}`, '-i', inputFilename];

        await ffmpeg.exec([
          '-y',
          ...inputArgs,
          '-f', 'lavfi',
          '-i', `anullsrc=r=${AUDIO_SAMPLE_RATE}:cl=stereo`,
          '-t', `${playDuration.toFixed(3)}`,
          '-vf', vfString,
          ...vCodecArgs,
          '-r', `${VIDEO_FPS}`,
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-shortest',
          outputFilename
        ]);
      } else {
        // Video preprocessing
        if (clip.speedMode === 'curve') {
          // Dynamic speed curve: slice clip into 5 segments and speed-adjust them
          const pts = clip.curvePoints || [1, 1, 1, 1, 1];
          const origDur = clip.endTrim - clip.startTrim;
          const deltaD = origDur / 5;
          
          const segmentFiles: string[] = [];
          for (let j = 0; j < 5; j++) {
            const segmentStart = clip.startTrim + j * deltaD;
            const segmentEnd = clip.startTrim + (j + 1) * deltaD;
            const speed = pts[j] || 1.0;
            const segmentFilename = `${prefix}_clip_${i}_seg_${j}.mp4`;
            segmentFiles.push(segmentFilename);
            
            let segVfParts = [...getFitFilter()];
            segVfParts.push(`eq=brightness=${brightnessVal}:contrast=${fContrast}:saturation=${fSaturation}`);
            if (clip.grayscale > 0) segVfParts.push(`hue=s=${1.0 - (clip.grayscale / 100)}`);
            if (clip.sepia > 0) {
              const sepiaFactor = clip.sepia / 100;
              const rMix = `${1.0 - sepiaFactor * 0.607}:${sepiaFactor * 0.769}:${sepiaFactor * 0.189}`;
              const gMix = `${sepiaFactor * 0.349}:${1.0 - sepiaFactor * 0.314}:${sepiaFactor * 0.168}`;
              const bMix = `${sepiaFactor * 0.272}:${sepiaFactor * 0.534}:${1.0 - sepiaFactor * 0.869}`;
              segVfParts.push(`colorchannelmixer=${rMix}:0:${gMix}:0:${bMix}`);
            }
            if (clip.hueRotate > 0) segVfParts.push(`hue=h=${clip.hueRotate}`);
            if (clip.blur > 0) segVfParts.push(`gblur=sigma=${(clip.blur / 20) * 10 + 1}`);
            if (clip.improveImage) segVfParts.push('unsharp=5:5:1.0:5:5:0.0', 'eq=contrast=1.08:saturation=1.1');
            
            // Speed adjustments
            segVfParts.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
            segVfParts.push('format=yuv420p');
            
            let segAfParts = [`volume=${((clip.volume / 100) * (masterAmbientVolume / 100)).toFixed(4)}`];
            if (clip.improveSound) segAfParts.push('afftdn');
            segAfParts.push(getAtempoFilter(speed));
            
            const vfSeg = isOverlay
              ? `${segVfParts.join(',')}`
              : `${segVfParts.join(',')}[vid];color=c=black:s=${w}x${h}[bg];[bg][vid]overlay=x=${finalX}:y=${finalY}:eof_action=pass`;
            
            onLog?.(`Clip ${clip.name}: procesando velocidad segmento ${j + 1}/5 (${speed.toFixed(2)}x)...`);
            await ffmpeg.exec([
              '-y',
              '-ss', `${segmentStart.toFixed(3)}`,
              '-to', `${segmentEnd.toFixed(3)}`,
              '-i', inputFilename,
              '-vf', vfSeg,
              '-af', segAfParts.join(','),
              ...vCodecArgs,
              '-r', `${VIDEO_FPS}`,
              '-pix_fmt', 'yuv420p',
              '-c:a', 'aac',
              '-ar', `${AUDIO_SAMPLE_RATE}`,
              '-ac', '2',
              segmentFilename
            ]);
          }
          
          // Concatenate the 5 segments into a single file
          let concatText = '';
          for (const fn of segmentFiles) {
            concatText += `file ${fn}\n`;
          }
          const listFilename = `${prefix}_concat_clip_${i}.txt`;
          await ffmpeg.writeFile(listFilename, concatText);
          await ffmpeg.exec([
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', listFilename,
            '-c', 'copy',
            outputFilename
          ]);
          
          // Clean MEMFS segment files
          await ffmpeg.deleteFile(listFilename);
          for (const fn of segmentFiles) {
            await ffmpeg.deleteFile(fn);
          }
        } else {
          // Constant speed or default
          const speed = clip.constantSpeed || 1.0;
          let vfParts = [...getFitFilter()];
          vfParts.push(`eq=brightness=${brightnessVal}:contrast=${fContrast}:saturation=${fSaturation}`);
          if (clip.grayscale > 0) vfParts.push(`hue=s=${1.0 - (clip.grayscale / 100)}`);
          if (clip.sepia > 0) {
            const sepiaFactor = clip.sepia / 100;
            const rMix = `${1.0 - sepiaFactor * 0.607}:${sepiaFactor * 0.769}:${sepiaFactor * 0.189}`;
            const gMix = `${sepiaFactor * 0.349}:${1.0 - sepiaFactor * 0.314}:${sepiaFactor * 0.168}`;
            const bMix = `${sepiaFactor * 0.272}:${sepiaFactor * 0.534}:${1.0 - sepiaFactor * 0.869}`;
            vfParts.push(`colorchannelmixer=${rMix}:0:${gMix}:0:${bMix}`);
          }
          if (clip.hueRotate > 0) vfParts.push(`hue=h=${clip.hueRotate}`);
          if (clip.blur > 0) vfParts.push(`gblur=sigma=${(clip.blur / 20) * 10 + 1}`);
          if (clip.improveImage) vfParts.push('unsharp=5:5:1.0:5:5:0.0', 'eq=contrast=1.08:saturation=1.1');
          if (clip.zoomEffect === 'zoom-in') {
            vfParts.push(`zoompan=z='min(zoom+0.0015,1.20)':d=${Math.ceil(playDuration * VIDEO_FPS)}:s=${finalW}x${finalH}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`);
          } else if (clip.zoomEffect === 'zoom-out') {
            vfParts.push(`zoompan=z='max(1.20-0.0015*on,1.0)':d=${Math.ceil(playDuration * VIDEO_FPS)}:s=${finalW}x${finalH}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`);
          }
          
          if (speed !== 1.0) {
            vfParts.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
          }
          vfParts.push('format=yuv420p');

          let afParts = [`volume=${((clip.volume / 100) * (masterAmbientVolume / 100)).toFixed(4)}`];
          if (clip.improveSound) afParts.push('afftdn');
          if (speed !== 1.0) afParts.push(getAtempoFilter(speed));

          const vfString = isOverlay
            ? vfParts.join(',')
            : `${vfParts.join(',')}[vid];color=c=black:s=${w}x${h}[bg];[bg][vid]overlay=x=${finalX}:y=${finalY}:eof_action=pass`;

          await ffmpeg.exec([
            '-y',
            '-ss', `${clip.startTrim.toFixed(3)}`,
            '-to', `${clip.endTrim.toFixed(3)}`,
            '-i', inputFilename,
            '-vf', vfString,
            '-af', afParts.join(','),
            ...vCodecArgs,
            '-r', `${VIDEO_FPS}`,
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-ar', `${AUDIO_SAMPLE_RATE}`,
            '-ac', '2',
            outputFilename
          ]);
        }
      }

      // Cleanup raw input file
      await ffmpeg.deleteFile(inputFilename);
      return outputFilename;
    };

    // Separate sequential vs overlays
    const sequenceClips = clips.filter(c => c.placementMode !== 'overlay');
    const overlayClips = clips.filter(c => c.placementMode === 'overlay');

    // Pre-process sequence base clips
    const processedClips: string[] = [];
    const clipDurations: number[] = [];

    for (let i = 0; i < sequenceClips.length; i++) {
      const clip = sequenceClips[i];
      const outFn = await preprocessClip(clip, i, 'seq');
      processedClips.push(outFn);
      clipDurations.push(getClipPlayDuration(clip));
    }

    onProgress(40);

    // Concatenate sequence base clips with transitions
    let finalClipFile = 'temp_joined.mp4';
    
    if (sequenceClips.length === 0) {
      // If no sequence clips, create a solid black backdrop video of total overlay duration
      let maxOverlayDur = 5;
      for (const o of overlayClips) {
        const d = (o.timelineStart || 0) + getClipPlayDuration(o);
        if (d > maxOverlayDur) maxOverlayDur = d;
      }
      onLog?.(`Creando lienzo de fondo negro de ${maxOverlayDur.toFixed(1)} segundos...`);
      await ffmpeg.exec([
        '-y',
        '-f', 'lavfi', '-i', `color=c=black:s=${w}x${h}:d=${maxOverlayDur.toFixed(3)}:r=${VIDEO_FPS}`,
        '-f', 'lavfi', '-i', `anullsrc=r=${AUDIO_SAMPLE_RATE}:cl=stereo`,
        '-t', `${maxOverlayDur.toFixed(3)}`,
        ...vCodecArgs, '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-shortest',
        finalClipFile
      ]);
    } else if (sequenceClips.length === 1) {
      finalClipFile = processedClips[0];
    } else {
      const hasTransitions = sequenceClips.some(c => c.transitionType !== 'none' && c.transitionDuration > 0);
      
      if (!hasTransitions) {
        onLog?.('Uniendo clips de base secuencialmente...');
        let concatText = '';
        for (const fn of processedClips) {
          concatText += `file ${fn}\n`;
        }
        await ffmpeg.writeFile('concat_list.txt', concatText);
        await ffmpeg.exec([
          '-y',
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat_list.txt',
          '-c', 'copy',
          finalClipFile
        ]);
        await ffmpeg.deleteFile('concat_list.txt');
      } else {
        // Crossfaded concat using filter_complex
        onLog?.('Compilando transiciones secuenciales...');
        let filterComplex = '';
        let lastVideoOut = 'v0';
        let lastAudioOut = 'a0';
        let currentOffset = clipDurations[0];
        
        let inputArgs: string[] = [];
        for (let i = 0; i < processedClips.length; i++) {
          inputArgs.push('-i', processedClips[i]);
        }

        filterComplex += `[0:v][1:v]`;
        const clipTransition = sequenceClips[0].transitionType;
        const transDurSeconds = sequenceClips[0].transitionDuration / 1000;
        
        const transNameMap: Record<string, string> = {
          'fade': 'fade',
          'slide-left': 'slideleft',
          'zoom-in': 'zoomin',
          'blur': 'fade',
          'camera-open': 'circleopen',
          'camera-close': 'circleclose',
          'blocks': 'blocks'
        };
        
        const ffmpegTransName = transNameMap[clipTransition] || 'fade';
        const offset = currentOffset - transDurSeconds;
        
        filterComplex += `xfade=transition=${ffmpegTransName}:duration=${transDurSeconds}:offset=${offset}[vtemp1]; `;
        filterComplex += `[0:a][1:a]acrossfade=d=${transDurSeconds}[atemp1]`;
        
        lastVideoOut = 'vtemp1';
        lastAudioOut = 'atemp1';
        currentOffset = (currentOffset + clipDurations[1]) - transDurSeconds;

        for (let i = 2; i < sequenceClips.length; i++) {
          const nextTrans = sequenceClips[i - 1].transitionType;
          const nextTransDur = sequenceClips[i - 1].transitionDuration / 1000;
          const nextFFmpegTransName = transNameMap[nextTrans] || 'fade';
          const nextOffset = currentOffset - nextTransDur;

          filterComplex += `; [${lastVideoOut}][${i}:v]xfade=transition=${nextFFmpegTransName}:duration=${nextTransDur}:offset=${nextOffset}[vtemp${i}]; `;
          filterComplex += `[${lastAudioOut}][${i}:a]acrossfade=d=${nextTransDur}[atemp${i}]`;
          
          lastVideoOut = `vtemp${i}`;
          lastAudioOut = `atemp${i}`;
          currentOffset = (currentOffset + clipDurations[i]) - nextTransDur;
        }

        await ffmpeg.exec([
          '-y',
          ...inputArgs,
          '-filter_complex', filterComplex,
          '-map', `[${lastVideoOut}]`,
          '-map', `[${lastAudioOut}]`,
          ...vCodecArgs,
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-r', `${VIDEO_FPS}`,
          finalClipFile
        ]);
      }
    }

    onProgress(60);

    // Pre-process overlay clips
    const processedOverlays: {
      filename: string;
      timelineStart: number;
      timelineEnd: number;
      x: number;
      y: number;
      width: number;
      height: number;
      type: 'video' | 'image';
      clip: VideoClip;
      finalW: number;
      finalH: number;
    }[] = [];

    for (let j = 0; j < overlayClips.length; j++) {
      const clip = overlayClips[j];
      const playDur = getClipPlayDuration(clip);

      const cWidth = (clip.width !== undefined ? clip.width : baseRes.w) * scaleRatio;
      const cHeight = (clip.height !== undefined ? clip.height : baseRes.h) * scaleRatio;
      const cX = (clip.x !== undefined ? clip.x : 0) * scaleRatio;
      const cY = (clip.y !== undefined ? clip.y : 0) * scaleRatio;
      const scaleFactor = (clip.scale || 100) / 100;
      
      const finalW = Math.round((cWidth * scaleFactor) / 2) * 2;
      const finalH = Math.round((cHeight * scaleFactor) / 2) * 2;
      const finalX = Math.round(cX + (cWidth - finalW) / 2);
      const finalY = Math.round(cY + (cHeight - finalH) / 2);

      if (clip.type === 'image') {
        onLog?.(`Preparando imagen superpuesta ${clip.name}...`);
        const fileBytes = await fetchFileBytes(clip.url);
        const imgFilename = `overlay_img_${j}.png`;
        await ffmpeg.writeFile(imgFilename, fileBytes);
        
        processedOverlays.push({
          filename: imgFilename,
          timelineStart: clip.timelineStart || 0,
          timelineEnd: (clip.timelineStart || 0) + playDur,
          x: finalX,
          y: finalY,
          width: finalW,
          height: finalH,
          type: 'image',
          clip,
          finalW,
          finalH
        });
      } else {
        const outFn = await preprocessClip(clip, j, 'overlay');
        processedOverlays.push({
          filename: outFn,
          timelineStart: clip.timelineStart || 0,
          timelineEnd: (clip.timelineStart || 0) + playDur,
          x: finalX,
          y: finalY,
          width: finalW,
          height: finalH,
          type: 'video',
          clip,
          finalW,
          finalH
        });
      }
    }

    onProgress(70);

    // Composite overlays onto base sequential video
    let finalOverlayedVideo = 'temp_joined_overlayed.mp4';
    if (processedOverlays.length === 0) {
      finalOverlayedVideo = finalClipFile;
    } else {
      onLog?.('Componiendo superposiciones PIP sobre el lienzo...');
      const overlayInputs = ['-i', finalClipFile];
      let filterComplexVideo = '';
      
      // First, define prepared streams for all overlays
      for (let j = 0; j < processedOverlays.length; j++) {
        const overlay = processedOverlays[j];
        overlayInputs.push('-i', overlay.filename);
        
        const inputIdx = j + 1; // 0 is finalClipFile
        
        if (overlay.type === 'image') {
          const clip = overlay.clip;
          
          // Brightness, Contrast, Saturation
          const fBrightness = (clip.brightness / 100) - 1.0;
          const fContrast = clip.contrast / 100;
          const fSaturation = clip.saturate / 100;
          const fOpacity = clip.opacity / 100;
          const brightnessVal = fOpacity !== 1.0 ? fBrightness + (fOpacity - 1.0) * 0.5 : fBrightness;
          
          let imgVf = `scale=${overlay.finalW}:${overlay.finalH},setsar=1`;
          imgVf += `,eq=brightness=${brightnessVal}:contrast=${fContrast}:saturation=${fSaturation}`;
          if (clip.grayscale > 0) imgVf += `,hue=s=${1.0 - (clip.grayscale / 100)}`;
          if (clip.sepia > 0) {
            const sepiaFactor = clip.sepia / 100;
            const rMix = `${1.0 - sepiaFactor * 0.607}:${sepiaFactor * 0.769}:${sepiaFactor * 0.189}`;
            const gMix = `${sepiaFactor * 0.349}:${1.0 - sepiaFactor * 0.314}:${sepiaFactor * 0.168}`;
            const bMix = `${sepiaFactor * 0.272}:${sepiaFactor * 0.534}:${1.0 - sepiaFactor * 0.869}`;
            imgVf += `,colorchannelmixer=${rMix}:0:${gMix}:0:${bMix}`;
          }
          if (clip.hueRotate > 0) imgVf += `,hue=h=${clip.hueRotate}`;
          if (clip.blur > 0) imgVf += `,gblur=sigma=${(clip.blur / 20) * 10 + 1}`;
          if (clip.improveImage) imgVf += `,unsharp=5:5:1.0:5:5:0.0,eq=contrast=1.08:saturation=1.1`;
          
          // Apply opacity scale on alpha and format as rgba to preserve transparency
          imgVf += `,format=rgba,colorchannelmixer=aa=${fOpacity}`;
          
          filterComplexVideo += `[${inputIdx}:v]${imgVf}[ov_prepared_${j}]; `;
        } else {
          // Delay the video overlay
          filterComplexVideo += `[${inputIdx}:v]setpts=PTS+${overlay.timelineStart.toFixed(3)}/TB[ov_prepared_${j}]; `;
        }
      }
      
      // Chain the overlays onto the base sequential video
      let currentStream = '[0:v]';
      for (let j = 0; j < processedOverlays.length; j++) {
        const overlay = processedOverlays[j];
        const nextStream = `v_over_${j}`;
        
        filterComplexVideo += `${currentStream}[ov_prepared_${j}]overlay=x=${overlay.x}:y=${overlay.y}:enable='between(t,${overlay.timelineStart.toFixed(3)},${overlay.timelineEnd.toFixed(3)})':eof_action=pass`;
        
        if (j === processedOverlays.length - 1) {
          filterComplexVideo += `[final_v]`;
        } else {
          filterComplexVideo += `[${nextStream}]; `;
          currentStream = `[${nextStream}]`;
        }
      }
      
      await ffmpeg.exec([
        '-y',
        ...overlayInputs,
        '-filter_complex', filterComplexVideo,
        '-map', '[final_v]',
        '-map', '0:a',
        ...vCodecArgs,
        '-pix_fmt', 'yuv420p',
        '-c:a', 'copy',
        finalOverlayedVideo
      ]);
    }

    onProgress(80);

    // Mix all background audio + pre-processed overlay videos' audio
    let finalOutputFile = 'output_final.mp4';
    const mixAudioInputs: { filename: string; startTrim: number; duration: number; timelineStart: number; volume: number; isPreprocessed: boolean }[] = [];
    
    // Add background audio tracks
    for (let j = 0; j < audioTracks.length; j++) {
      const track = audioTracks[j];
      const audioInputFilename = `bg_audio_${j}.${inferFileExtension(track.url, 'mp3')}`;
      const trackBytes = await fetchFileBytes(track.url);
      await ffmpeg.writeFile(audioInputFilename, trackBytes);
      
      mixAudioInputs.push({
        filename: audioInputFilename,
        startTrim: track.startTrim,
        duration: track.duration,
        timelineStart: track.timelineStart,
        volume: track.volume * (masterMusicVolume / 100),
        isPreprocessed: false
      });
    }

    // Add overlay video audio
    for (let j = 0; j < overlayClips.length; j++) {
      const clip = overlayClips[j];
      if (clip.type === 'video' && clip.volume > 0) {
        mixAudioInputs.push({
          filename: `overlay_processed_${j}.mp4`,
          startTrim: 0,
          duration: getClipPlayDuration(clip),
          timelineStart: clip.timelineStart || 0,
          volume: 100, // already applied in preprocessClip
          isPreprocessed: true
        });
      }
    }

    if (mixAudioInputs.length === 0) {
      await ffmpeg.exec([
        '-y',
        '-i', finalOverlayedVideo,
        '-c', 'copy',
        finalOutputFile
      ]);
    } else {
      onLog?.('Mezclando pistas de música de fondo, voz en off y sonido PIP...');
      
      const audioInputs: string[] = ['-i', finalOverlayedVideo];
      let filterComplexAudio = '';
      
      for (let k = 0; k < mixAudioInputs.length; k++) {
        const input = mixAudioInputs[k];
        audioInputs.push('-i', input.filename);
        
        const delayMs = Math.round(input.timelineStart * 1000);
        const inputIdx = k + 1; // 0 is finalOverlayedVideo
        
        if (input.isPreprocessed) {
          filterComplexAudio += `[${inputIdx}:a]adelay=${delayMs}|${delayMs}[bg_${k}]; `;
        } else {
          filterComplexAudio += `[${inputIdx}:a]atrim=start=${input.startTrim}:duration=${input.duration},asetpts=PTS-STARTPTS,volume=${input.volume / 100},adelay=${delayMs}|${delayMs}[bg_${k}]; `;
        }
      }
      
      const mixInputs = Array.from({ length: mixAudioInputs.length }, (_, idx) => `[bg_${idx}]`).join('');
      filterComplexAudio += `[0:a]volume=1.0[main_a]; [main_a]${mixInputs}amix=inputs=${mixAudioInputs.length + 1}:duration=first:dropout_transition=0[mixed_a]`;
      
      await ffmpeg.exec([
        '-y',
        ...audioInputs,
        '-filter_complex', filterComplexAudio,
        '-map', '0:v',
        '-map', '[mixed_a]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-ar', `${AUDIO_SAMPLE_RATE}`,
        finalOutputFile
      ]);
    }

    onProgress(95);

    // Read final file and cleanup
    onLog?.('Renderizado completo. Preparando descarga...');
    const finalData = await ffmpeg.readFile(finalOutputFile);
    const compiledBlob = new Blob([finalData as any], { type: 'video/mp4' });
    
    // Delete all files in MEMFS
    try {
      const dirContents = await ffmpeg.listDir('/');
      for (const item of dirContents) {
        if (!item.isDir) {
          await ffmpeg.deleteFile(item.name);
        }
      }
    } catch (e) {
      console.log('Cleanup failed:', e);
    }

    onProgress(100);
    return compiledBlob;
  }
}
