import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';

import aiHandler from './api/ai.js';
import syncHandler, { getRedis } from './api/sync.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// HTTP Response Compression (Gzip / Deflate, skips SSE streams)
app.use(compression({
  filter: (req, res) => {
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024
}));

app.use(express.json({ limit: '10mb' }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// API Routes (Prevent caching for state/financial transactions)
const apiCacheControl = (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  next();
};
app.all('/api/ai', apiCacheControl, (req, res) => aiHandler(req, res));
app.all('/api/sync', apiCacheControl, (req, res) => syncHandler(req, res));

// Force attachment download for extension zip packages
app.get('/download/levelup-shield.zip', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'download', 'levelup-shield.zip');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  res.download(filePath, 'levelup-shield.zip', (err) => {
    if (err && !res.headersSent) {
      res.status(404).send('File not found');
    }
  });
});

// Serve PowerShell 1-line auto installer script
app.get('/install.ps1', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'install.ps1');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(filePath);
});

// Serve static frontend
// ponytail: static asset cache 1h default, 1d immutable for media/icons
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true,
  setHeaders: (res, filePath) => {
    if (/\.(png|svg|ico|webp|jpg|jpeg|gif|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    }
  }
}));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

process.on('uncaughtException', (err) => {
  console.error('Server Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Server Unhandled Rejection:', reason);
});

const server = app.listen(PORT, () => {
  console.log(`\n⚔️ LevelUp RPG Guild is running at http://localhost:${PORT}`);
  console.log(`⚡ AI Models: Brain=${process.env.MODEL_BRAIN || process.env.CUSTOM_AI_MODEL || 'gpt-4o-mini'} (thinking ON) | Worker=${process.env.MODEL_WORKER || process.env.CUSTOM_AI_MODEL || 'gpt-4o-mini'} (thinking OFF)`);
  console.log(`🛡️ Redis Cloud: ${process.env.REDIS_URL ? 'Connected' : 'Offline'}\n`);
});

const gracefulShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    try {
      const redis = getRedis();
      if (redis && typeof redis.quit === 'function') {
        await redis.quit();
      }
    } catch (_) {}
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

