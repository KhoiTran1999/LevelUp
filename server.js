import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import aiHandler from './api/ai.js';
import syncHandler from './api/sync.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// API Routes
app.all('/api/ai', (req, res) => aiHandler(req, res));
app.all('/api/sync', (req, res) => syncHandler(req, res));

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

app.listen(PORT, () => {
  console.log(`\n⚔️ LevelUp RPG Guild is running at http://localhost:${PORT}`);
  console.log(`⚡ AI Arbiter Model: ${process.env.CUSTOM_AI_MODEL || 'gpt-4o-mini'}`);
  console.log(`🛡️ Redis Cloud: ${process.env.REDIS_URL ? 'Connected' : 'Offline'}\n`);
});
