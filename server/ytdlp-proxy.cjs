/**
 * yt-dlp Proxy Server — Editor Marketing
 * 
 * Ejecutar: node server/ytdlp-proxy.cjs
 * Requiere: yt-dlp instalado en el sistema
 */

const http = require('http');
const { execFile, spawn } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');
const os = require('os');

const PORT = 3001;
const execFileAsync = promisify(execFile);

// Directory to store downloads permanently
const DOWNLOADS_DIR = path.join(__dirname, '..', 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Detect yt-dlp binary location
async function findYtDlp() {
  const candidates = ['yt-dlp', 'yt_dlp', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp', `${os.homedir()}/.local/bin/yt-dlp`];
  for (const cmd of candidates) {
    try {
      await execFileAsync(cmd, ['--version']);
      return cmd;
    } catch (_) { /* try next */ }
  }
  return null;
}

// Bypasses bot detection by scanning browser cookies and utilizing Node.js JS runtime
async function detectBestArgs(ytdlp, url) {
  // Common args for all attempts - Optimized for maximum possible quality (4K/8K)
  const commonArgs = [
    '--no-check-certificate',
    '--no-playlist',
    '--js-runtimes', 'node',
    '--remote-components', 'ejs:github',
    '--extractor-args', 'youtube:player-client=ios,web,android,mweb',
    '--format-sort', 'res:4320,vcodec:vp9.2,quality', // Force up to 8K and prefer VP9.2
  ];

  // 1. Check if a local cookies.txt file exists in the project root directory
  const localCookiesPath = path.join(__dirname, '..', 'cookies.txt');
  if (fs.existsSync(localCookiesPath)) {
    console.log(`[yt-dlp] ¡Encontrado archivo local cookies.txt! Usando para la descarga.`);
    return [
      ...commonArgs,
      '--cookies', localCookiesPath
    ];
  }

  const browsers = ['chrome', 'firefox', 'brave', 'chromium', 'opera', 'edge'];
  
  for (const browser of browsers) {
    try {
      const testArgs = [
        ...commonArgs,
        '--cookies-from-browser', browser,
        '--get-filename',
        url
      ];
      console.log(`[yt-dlp] Probando cookies de navegador: ${browser}...`);
      await execFileAsync(ytdlp, testArgs);
      console.log(`[yt-dlp] ¡Éxito! Usando cookies de ${browser}.`);
      return [
        ...commonArgs,
        '--cookies-from-browser', browser
      ];
    } catch (err) {
      // Failed, try next
    }
  }

  // Fallback to purely client-spoofing and js-runtimes without cookies
  console.log(`[yt-dlp] No se encontraron cookies de navegador válidas. Usando extractor spoofing agresivo sin cookies.`);
  return [
    ...commonArgs,
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    '--referer', 'https://www.google.com/',
    '--add-header', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    '--add-header', 'Accept-Language: es-ES,es;q=0.9,en;q=0.8',
  ];
}

// CORS headers for all responses
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

const server = http.createServer(async (req, res) => {
  setCors(res);

  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'yt-dlp-proxy' }));
    return;
  }

  // GET /downloads - List all downloaded files
  if (req.method === 'GET' && req.url === '/downloads') {
    try {
      const files = fs.readdirSync(DOWNLOADS_DIR)
        .filter(filename => filename.endsWith('.mp3') || filename.endsWith('.mp4'))
        .map(filename => {
          const filePath = path.join(DOWNLOADS_DIR, filename);
          const stat = fs.statSync(filePath);
          const isAudio = filename.endsWith('.mp3');
          return {
            filename,
            name: filename.replace(/^yt_[^_]+_/, '').replace(/\.(mp3|mp4)$/, ''),
            size: stat.size,
            type: isAudio ? 'audio' : 'video',
            url: `http://localhost:3001/download/${encodeURIComponent(filename)}`
          };
        });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(files));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET or DELETE /download/<filename>
  if (req.url.startsWith('/download/')) {
    try {
      const filename = decodeURIComponent(req.url.replace(/^\/download\//, ''));
      const safeFilename = path.basename(filename);
      const filePath = path.join(DOWNLOADS_DIR, safeFilename);

      if (req.method === 'DELETE') {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
        }
        return;
      }

      if (req.method === 'GET') {
        if (!fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
          return;
        }

        const stat = fs.statSync(filePath);
        const isAudio = safeFilename.endsWith('.mp3');
        res.writeHead(200, {
          'Content-Type': isAudio ? 'audio/mpeg' : 'video/mp4',
          'Content-Length': stat.size,
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin'
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
  }

  // POST /open-folder - Open downloads folder in file explorer
  if (req.method === 'POST' && req.url === '/open-folder') {
    try {
      const { exec } = require('child_process');
      let cmd = '';
      if (process.platform === 'win32') {
        cmd = `explorer "${DOWNLOADS_DIR}"`;
      } else if (process.platform === 'darwin') {
        cmd = `open "${DOWNLOADS_DIR}"`;
      } else {
        cmd = `xdg-open "${DOWNLOADS_DIR}"`;
      }
      exec(cmd);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Helper parser function for VTT subtitles
  function parseVttTime(timeStr) {
    const parts = timeStr.trim().split(':');
    let hrs = 0, mins = 0, secs = 0;
    if (parts.length === 3) {
      hrs = parseFloat(parts[0]);
      mins = parseFloat(parts[1]);
      secs = parseFloat(parts[2]);
    } else if (parts.length === 2) {
      mins = parseFloat(parts[0]);
      secs = parseFloat(parts[1]);
    }
    return hrs * 3600 + mins * 60 + secs;
  }

  function parseVtt(content) {
    const lines = content.replace(/\r\n/g, '\n').split('\n');
    const cues = [];
    let currentCue = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (currentCue) {
          cues.push(currentCue);
          currentCue = null;
        }
        continue;
      }

      if (line.includes('-->')) {
        const match = line.match(/([\d:.]+)\s+-->\s+([\d:.]+)/);
        if (match) {
          currentCue = {
            start: parseVttTime(match[1]),
            end: parseVttTime(match[2]),
            text: ''
          };
        }
      } else if (currentCue) {
        const cleanText = line.replace(/<[^>]+>/g, '').trim();
        if (cleanText) {
          currentCue.text = currentCue.text ? currentCue.text + '\n' + cleanText : cleanText;
        }
      }
    }
    if (currentCue) cues.push(currentCue);
    return cues;
  }

  // POST /yt-subtitles - Fetch and parse subtitles from YouTube
  if (req.method === 'POST' && req.url === '/yt-subtitles') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { url, lang = 'es' } = JSON.parse(body);
        if (!url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        const ytdlp = await findYtDlp();
        if (!ytdlp) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'yt-dlp no encontrado.' }));
          return;
        }

        const bestArgs = await detectBestArgs(ytdlp, url);
        const tempSubDir = path.join(os.tmpdir(), `yt_subs_${Date.now()}`);
        fs.mkdirSync(tempSubDir, { recursive: true });

        const outputPattern = path.join(tempSubDir, 'subtitles');

        console.log(`[yt-dlp] Fetching subtitles to temp dir: ${tempSubDir}`);
        await new Promise((resolve, reject) => {
          const proc = spawn(ytdlp, [
            '--no-playlist',
            ...bestArgs,
            '--write-auto-subs',
            '--write-subs',
            '--skip-download',
            '--sub-lang', `${lang},en`,
            '--sub-format', 'vtt',
            '--output', outputPattern,
            url
          ]);

          let stderr = '';
          proc.stderr.on('data', d => stderr += d);
          proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
          });
        });

        const files = fs.readdirSync(tempSubDir);
        const vttFile = files.find(f => f.endsWith('.vtt'));

        if (!vttFile) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, subtitles: [] }));
          return;
        }

        const vttPath = path.join(tempSubDir, vttFile);
        const vttContent = fs.readFileSync(vttPath, 'utf8');
        const parsed = parseVtt(vttContent);

        try {
          fs.rmSync(tempSubDir, { recursive: true, force: true });
        } catch (_) {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, subtitles: parsed }));
      } catch (err) {
        console.error('[yt-dlp] Subtitles Error:', err.message);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    });
    return;
  }

  // POST /yt-audio - Download YouTube audio with NDJSON streaming progress
  if (req.method === 'POST' && req.url === '/yt-audio') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { url } = JSON.parse(body);
        if (!url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        const ytdlp = await findYtDlp();
        if (!ytdlp) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'yt-dlp no encontrado.' }));
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        const sendProgress = (data) => {
          res.write(JSON.stringify(data) + '\n');
        };

        const bestArgs = await detectBestArgs(ytdlp, url);

        // Get expected filename
        let filename = `yt_audio_${Date.now()}.mp3`;
        try {
          const { stdout } = await execFileAsync(ytdlp, [
            '--no-playlist',
            ...bestArgs,
            '--output', 'yt_%(id)s_%(title).100s.%(ext)s',
            '--get-filename',
            url
          ]);
          filename = stdout.trim().replace(/\.[^.]+$/, '.mp3');
        } catch (_) {}

        console.log(`[yt-dlp] Downloading audio to: ${filename}`);

        await new Promise((resolve, reject) => {
          const proc = spawn(ytdlp, [
            '--no-playlist',
            ...bestArgs,
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', '128K',
            '--no-post-overwrites',
            '--output', path.join(DOWNLOADS_DIR, filename),
            url
          ]);

          proc.stdout.on('data', data => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
              if (line.includes('[download]') || line.includes('[Merger]')) {
                console.log(`[yt-dlp] ${line.trim()}`);
                const percentMatch = line.match(/(\d+(\.\d+)?)%/);
                if (percentMatch) {
                  const percent = parseFloat(percentMatch[1]);
                  const speedMatch = line.match(/at\s+([^\s]+)/);
                  const etaMatch = line.match(/ETA\s+([^\s]+)/);
                  sendProgress({
                    type: 'progress',
                    percent,
                    speed: speedMatch ? speedMatch[1] : '',
                    eta: etaMatch ? etaMatch[1] : ''
                  });
                }
              }
            }
          });

          let stderr = '';
          proc.stderr.on('data', d => stderr += d);
          proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
          });
        });

        sendProgress({
          type: 'complete',
          success: true,
          file: {
            filename,
            name: filename.replace(/^yt_[^_]+_/, '').replace(/\.mp3$/, ''),
            type: 'audio',
            url: `http://localhost:3001/download/${encodeURIComponent(filename)}`
          }
        });
        res.end();

      } catch (err) {
        console.error('[yt-dlp] Error:', err.message);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    });
    return;
  }

  // POST /yt-video - Download YouTube video with NDJSON streaming progress
  if (req.method === 'POST' && req.url === '/yt-video') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { url, quality = '720p' } = JSON.parse(body);
        if (!url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing url parameter' }));
          return;
        }

        const ytdlp = await findYtDlp();
        if (!ytdlp) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'yt-dlp no encontrado.' }));
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        const sendProgress = (data) => {
          res.write(JSON.stringify(data) + '\n');
        };

        const bestArgs = await detectBestArgs(ytdlp, url);
        const formatSelection = 'bestvideo+bestaudio/best';

        // Get expected filename
        let filename = `yt_video_${Date.now()}.mp4`;
        try {
          const { stdout } = await execFileAsync(ytdlp, [
            ...bestArgs,
            '-f', formatSelection,
            '--merge-output-format', 'mp4',
            '--output', 'yt_%(id)s_%(title).100s.%(ext)s',
            '--get-filename',
            url
          ]);
          filename = stdout.trim().replace(/\.[^.]+$/, '.mp4');
        } catch (_) {}

        console.log(`[yt-dlp] Downloading video to: ${filename}`);

        await new Promise((resolve, reject) => {
          const proc = spawn(ytdlp, [
            ...bestArgs,
            '--concurrent-fragments', '10',
            '-f', formatSelection,
            '--merge-output-format', 'mp4',
            '--no-post-overwrites',
            '--output', path.join(DOWNLOADS_DIR, filename),
            url
          ]);

          proc.stdout.on('data', data => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
              if (line.includes('[download]') || line.includes('[Merger]')) {
                console.log(`[yt-dlp] ${line.trim()}`);
                const percentMatch = line.match(/(\d+(\.\d+)?)%/);
                if (percentMatch) {
                  const percent = parseFloat(percentMatch[1]);
                  const speedMatch = line.match(/at\s+([^\s]+)/);
                  const etaMatch = line.match(/ETA\s+([^\s]+)/);
                  sendProgress({
                    type: 'progress',
                    percent,
                    speed: speedMatch ? speedMatch[1] : '',
                    eta: etaMatch ? etaMatch[1] : ''
                  });
                }
              }
            }
          });

          let stderr = '';
          proc.stderr.on('data', d => stderr += d);
          proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
          });
        });

        sendProgress({
          type: 'complete',
          success: true,
          file: {
            filename,
            name: filename.replace(/^yt_[^_]+_/, '').replace(/\.mp4$/, ''),
            type: 'video',
            url: `http://localhost:3001/download/${encodeURIComponent(filename)}`
          }
        });
        res.end();

      } catch (err) {
        console.error('[yt-dlp] Error:', err.message);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', async () => {
  const ytdlp = await findYtDlp();
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   Editor Marketing — yt-dlp Proxy    ║');
  console.log(`║   Puerto: http://localhost:${PORT}       ║`);
  console.log(`║   yt-dlp: ${ytdlp ? `✅ ${ytdlp}` : '❌ NO ENCONTRADO'}`.padEnd(42) + '║');
  console.log(`║   Calidad: Máxima (4K/1080p VP9)     ║`);
  console.log(`║   Cookies: Browser / cookies.txt     ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log('Listo para recibir peticiones del editor...');
});
