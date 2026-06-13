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

  // GET /download/<filename> - Serve dynamic static file
  if (req.method === 'GET' && req.url.startsWith('/download/')) {
    try {
      const filename = decodeURIComponent(req.url.replace(/^\/download\//, ''));
      const safeFilename = path.basename(filename);
      const filePath = path.join(DOWNLOADS_DIR, safeFilename);

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
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    }
    return;
  }

  // DELETE /download/<filename> - Delete static download
  if (req.method === 'DELETE' && req.url.startsWith('/download/')) {
    try {
      const filename = decodeURIComponent(req.url.replace(/^\/download\//, ''));
      const safeFilename = path.basename(filename);
      const filePath = path.join(DOWNLOADS_DIR, safeFilename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /yt-audio - Download YouTube audio to folder
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

        // Get expected filename
        let filename = `yt_audio_${Date.now()}.mp3`;
        try {
          const { stdout } = await execFileAsync(ytdlp, [
            '--no-playlist',
            '--extractor-args', 'youtube:player-client=ios',
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
            '--extractor-args', 'youtube:player-client=ios',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', '128K',
            '--no-post-overwrites',
            '--output', path.join(DOWNLOADS_DIR, filename),
            url
          ]);

          let stderr = '';
          proc.stderr.on('data', d => stderr += d);
          proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
          });
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          file: {
            filename,
            name: filename.replace(/^yt_[^_]+_/, '').replace(/\.mp3$/, ''),
            type: 'audio',
            url: `http://localhost:3001/download/${encodeURIComponent(filename)}`
          }
        }));

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

  // POST /yt-video - Download YouTube video to folder
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

        const formatSelection = 'bestvideo+bestaudio/best';

        // Get expected filename
        let filename = `yt_video_${Date.now()}.mp4`;
        try {
          const { stdout } = await execFileAsync(ytdlp, [
            '--no-playlist',
            '--extractor-args', 'youtube:player-client=ios',
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
            '--no-playlist',
            '--extractor-args', 'youtube:player-client=ios',
            '-f', formatSelection,
            '--merge-output-format', 'mp4',
            '--no-post-overwrites',
            '--output', path.join(DOWNLOADS_DIR, filename),
            url
          ]);

          let stderr = '';
          proc.stderr.on('data', d => stderr += d);
          proc.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(stderr || `yt-dlp exited with code ${code}`));
          });
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          file: {
            filename,
            name: filename.replace(/^yt_[^_]+_/, '').replace(/\.mp4$/, ''),
            type: 'video',
            url: `http://localhost:3001/download/${encodeURIComponent(filename)}`
          }
        }));

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
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log('Listo para recibir peticiones del editor...');
});
