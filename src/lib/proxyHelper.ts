import { openDB } from 'idb';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const DB_NAME = 'EditorMarketingDB';
const STORE_NAME = 'proxies';

async function createEsmWrapperBlobUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo cargar el core de FFmpeg (${response.status}).`);
  const source = await response.text();
  const wrappedSource = `${source}\nexport default createFFmpegCore;\n`;
  return URL.createObjectURL(new Blob([wrappedSource], { type: 'text/javascript' }));
}

let ffmpegInstance: FFmpeg | null = null;

const initFFmpeg = async () => {
  if (ffmpegInstance) return ffmpegInstance;
  
  ffmpegInstance = new FFmpeg();
  
  let base = (import.meta as any).env.BASE_URL || '/';
  let normalizedBase = base.endsWith('/') ? base : base + '/';
  if (normalizedBase === '/' && window.location.hostname.endsWith('.github.io')) {
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length > 1 && pathParts[1]) normalizedBase = `/${pathParts[1]}/`;
  }
  const baseURL = window.location.origin + normalizedBase;
  
  const coreURL = await createEsmWrapperBlobUrl(`${baseURL}ffmpeg/ffmpeg-core.js`);
  const wasmURL = await toBlobURL(`${baseURL}ffmpeg/ffmpeg-core.wasm`, 'application/wasm');

  await ffmpegInstance.load({ coreURL, wasmURL });
  return ffmpegInstance;
};

export const generateProxy = async (clipId: string, originalUrl: string, onProgress: (p: number) => void): Promise<string> => {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) { if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME); }
  });
  
  const proxyKey = `proxy_${clipId}`;
  const cached = await db.get(STORE_NAME, proxyKey);
  if (cached) return URL.createObjectURL(cached);

  onProgress(10);
  const ffmpeg = await initFFmpeg();
  
  const response = await fetch(originalUrl);
  const arrayBuffer = await response.arrayBuffer();
  const inputFilename = 'input.mp4';
  const outputFilename = 'proxy.mp4';
  
  await ffmpeg.writeFile(inputFilename, new Uint8Array(arrayBuffer));
  onProgress(30);

  await ffmpeg.exec([
    '-i', inputFilename,
    '-vf', 'scale=w=854:h=480:force_original_aspect_ratio=decrease',
    '-c:v', 'libx264',
    '-crf', '28',
    '-preset', 'ultrafast',
    '-c:a', 'aac',
    '-b:a', '64k',
    outputFilename
  ]);
  onProgress(80);
  
  const data = await ffmpeg.readFile(outputFilename);
  const blob = new Blob([data as any], { type: 'video/mp4' });
  
  await db.put(STORE_NAME, blob, proxyKey);
  
  // Cleanup
  await ffmpeg.deleteFile(inputFilename);
  await ffmpeg.deleteFile(outputFilename);
  
  onProgress(100);
  return URL.createObjectURL(blob);
};
