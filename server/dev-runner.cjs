const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidores concurrentes (yt-dlp Proxy + Editor)...');

// Start the yt-dlp proxy server
const proxyPath = path.join(__dirname, 'ytdlp-proxy.cjs');
const proxy = spawn('node', [proxyPath], { stdio: 'inherit' });

// Start the Vite development server
const viteCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const vite = spawn(viteCmd, ['vite'], { stdio: 'inherit', shell: true });

// Handle process termination cleanly
const killAll = () => {
  if (proxy && !proxy.killed) proxy.kill();
  if (vite && !vite.killed) vite.kill();
};

process.on('SIGINT', () => {
  killAll();
  process.exit(0);
});

process.on('exit', () => {
  killAll();
});
