import { createServer } from 'node:http';
import { readFile, writeFile, readdir, mkdir, copyFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, extname, join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const EDITOR_ROOT = __dirname;
const BACKUP_DIR = join(EDITOR_ROOT, 'backups');
const DEFAULT_PORT = Number(process.env.LULUS_MAP_EDITOR_PORT || 5187);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

const SKIP_DIRS = new Set(['.git', '.codex', 'node_modules', 'tools', 'dist']);

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload, null, 2));
}

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(text);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function assertInsideProject(fullPath) {
  const rel = relative(PROJECT_ROOT, fullPath);
  if (rel.startsWith('..') || rel === '..' || rel.includes(`..${sep}`) || resolve(fullPath) === PROJECT_ROOT) {
    throw new Error('Path is outside the project root.');
  }
}

function safeProjectRelativePath(input) {
  const raw = String(input || '').replace(/\\/g, '/');
  if (!raw || raw.startsWith('/') || raw.includes('\0')) throw new Error('Invalid project asset path.');
  const fullPath = resolve(PROJECT_ROOT, raw);
  assertInsideProject(fullPath);
  return relative(PROJECT_ROOT, fullPath).replace(/\\/g, '/');
}

function safeMapFileName(fileName) {
  const safe = basename(String(fileName || ''));
  if (!safe || safe !== fileName || !safe.endsWith('.semantic_tilemap.json')) {
    throw new Error('Invalid map filename. Expected a root-level *.semantic_tilemap.json file.');
  }
  return safe;
}

function mapPathFromFileName(fileName) {
  const safe = safeMapFileName(fileName);
  return join(PROJECT_ROOT, safe);
}

function validateSemanticMap(map) {
  if (!map || typeof map !== 'object') throw new Error('Map payload must be an object.');
  const width = Number(map.width);
  const height = Number(map.height);
  if (!Number.isInteger(width) || width <= 0) throw new Error('Map width must be a positive integer.');
  if (!Number.isInteger(height) || height <= 0) throw new Error('Map height must be a positive integer.');
  if (!map.layers || typeof map.layers !== 'object') throw new Error('Map is missing layers.');
  for (const layer of ['ground', 'structures', 'objects', 'markers']) {
    const rows = map.layers[layer];
    if (!Array.isArray(rows)) throw new Error(`Map is missing required layer: ${layer}.`);
    if (rows.length !== height) throw new Error(`${layer} layer has ${rows.length} rows; expected ${height}.`);
    rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) throw new Error(`${layer} row ${rowIndex} is not an array.`);
      if (row.length !== width) throw new Error(`${layer} row ${rowIndex} has ${row.length} cells; expected ${width}.`);
      row.forEach((cell, cellIndex) => {
        if (cell !== null && typeof cell !== 'string') {
          throw new Error(`${layer} row ${rowIndex}, cell ${cellIndex} must be null or a string.`);
        }
      });
    });
  }

  if (map.assetLayers !== undefined) validateAssetLayers(map.assetLayers, width, height);
}

function validateAssetLayers(assetLayers, width, height) {
  if (!assetLayers || typeof assetLayers !== 'object') throw new Error('assetLayers must be an object when present.');
  for (const layer of ['ground', 'structures', 'objects']) {
    const rows = assetLayers[layer];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) throw new Error(`assetLayers.${layer} must be an array.`);
    if (rows.length !== height) throw new Error(`assetLayers.${layer} has ${rows.length} rows; expected ${height}.`);
    rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) throw new Error(`assetLayers.${layer} row ${rowIndex} is not an array.`);
      if (row.length !== width) throw new Error(`assetLayers.${layer} row ${rowIndex} has ${row.length} cells; expected ${width}.`);
      row.forEach((cell, cellIndex) => {
        if (cell === null) return;
        if (!cell || typeof cell !== 'object') throw new Error(`assetLayers.${layer} row ${rowIndex}, cell ${cellIndex} must be null or an object.`);
        if (typeof cell.assetPath !== 'string') throw new Error(`assetLayers.${layer} row ${rowIndex}, cell ${cellIndex} is missing assetPath.`);
        safeProjectRelativePath(cell.assetPath);
        for (const key of ['sx', 'sy', 'sw', 'sh']) {
          if (!Number.isInteger(Number(cell[key])) || Number(cell[key]) < 0) {
            throw new Error(`assetLayers.${layer} row ${rowIndex}, cell ${cellIndex} has invalid ${key}.`);
          }
        }
      });
    });
  }
}

async function listMaps() {
  const entries = await readdir(PROJECT_ROOT, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.semantic_tilemap.json'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const maps = [];
  for (const fileName of files) {
    try {
      const raw = JSON.parse(await readFile(join(PROJECT_ROOT, fileName), 'utf8'));
      maps.push({
        fileName,
        mapId: raw.mapId || raw.mapName || fileName.replace('.semantic_tilemap.json', ''),
        displayName: raw.displayName || raw.mapName || raw.mapId || fileName,
        width: raw.width,
        height: raw.height,
        gameTileSizePx: raw.gameTileSizePx,
        version: raw.version || null,
        hasAssetLayers: Boolean(raw.assetLayers)
      });
    } catch (error) {
      maps.push({ fileName, error: error.message });
    }
  }
  return maps;
}

async function listPngAssets() {
  const results = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = relative(PROJECT_ROOT, full).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.png')) continue;
      // Avoid Mac metadata files and screenshots/docs by default. The user can move assets into source/public folders if needed.
      if (entry.name.startsWith('._') || rel.startsWith('docs/')) continue;
      const dimensions = await readPngDimensions(full).catch(() => null);
      if (!dimensions) continue;
      results.push({
        path: rel,
        name: entry.name,
        width: dimensions.width,
        height: dimensions.height,
        suggestedTileSize: suggestTileSize(rel, dimensions.width, dimensions.height)
      });
    }
  }
  await walk(PROJECT_ROOT);
  results.sort((a, b) => scoreAssetPath(a.path) - scoreAssetPath(b.path) || a.path.localeCompare(b.path));
  return results;
}

function scoreAssetPath(path) {
  if (path.startsWith('public/assets/top-down-retro-interior/')) return 0;
  if (path.startsWith('Top-Down_Retro_Interior/')) return 1;
  if (path.startsWith('public/assets/city/')) return 2;
  if (path.startsWith('City Prop') || path.startsWith('modern pixel')) return 3;
  if (path.includes('/Tiles/')) return 4;
  if (path.startsWith('public/assets/')) return 5;
  return 20;
}

function suggestTileSize(path, width, height) {
  if (path.includes('TopDownHouse') || path.includes('top-down-retro-interior')) return 16;
  if (width % 32 === 0 && height % 32 === 0) return 32;
  if (width % 16 === 0 && height % 16 === 0) return 16;
  return 32;
}

async function readPngDimensions(fullPath) {
  const buffer = await readFile(fullPath);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error('not png');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, version: '1.1', projectRoot: PROJECT_ROOT, editorRoot: EDITOR_ROOT });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/maps') {
    sendJson(res, 200, { projectRoot: PROJECT_ROOT, maps: await listMaps() });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/assets') {
    sendJson(res, 200, { projectRoot: PROJECT_ROOT, assets: await listPngAssets() });
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/project-asset') {
    const rel = safeProjectRelativePath(url.searchParams.get('path'));
    const fullPath = join(PROJECT_ROOT, rel);
    const ext = extname(fullPath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) throw new Error('Only image assets can be served.');
    const info = await stat(fullPath);
    if (!info.isFile()) throw new Error('Asset is not a file.');
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
    res.end(await readFile(fullPath));
    return true;
  }

  if (req.method === 'GET' && url.pathname === '/api/map') {
    const fileName = safeMapFileName(url.searchParams.get('file'));
    const fullPath = mapPathFromFileName(fileName);
    const map = JSON.parse(await readFile(fullPath, 'utf8'));
    sendJson(res, 200, { fileName, map });
    return true;
  }

  if (req.method === 'POST' && url.pathname === '/api/map/save') {
    const body = await readJsonBody(req);
    const fileName = safeMapFileName(body.fileName);
    const fullPath = mapPathFromFileName(fileName);
    if (!existsSync(fullPath)) throw new Error(`Cannot save missing map file: ${fileName}`);
    validateSemanticMap(body.map);

    await mkdir(BACKUP_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${fileName}.${timestamp}.bak.json`;
    const backupPath = join(BACKUP_DIR, backupFileName);
    await copyFile(fullPath, backupPath);

    const map = body.map;
    if (!map.format) map.format = 'semantic_tilemap_builder_v2';
    if (!map.version) map.version = '2.3';
    if (!Array.isArray(map.layerOrder)) map.layerOrder = ['ground', 'structures', 'objects', 'markers'];
    if (!map.mapId && map.mapName) map.mapId = map.mapName;
    if (!map.mapName && map.mapId) map.mapName = map.mapId;
    if (!map.displayName) map.displayName = map.mapId || map.mapName || fileName;
    if (map.assetLayers) {
      map.assetTileFormat = map.assetTileFormat || 'lulus_asset_tile_layers_v1';
      map.assetLayerOrder = ['ground', 'structures', 'objects'];
    }

    await writeFile(fullPath, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
    sendJson(res, 200, { ok: true, fileName, backupFileName, savedAt: new Date().toISOString() });
    return true;
  }

  return false;
}

async function serveStatic(req, res, url) {
  let requested = decodeURIComponent(url.pathname);
  if (requested === '/') requested = '/index.html';
  const fullPath = resolve(EDITOR_ROOT, `.${requested}`);
  if (!fullPath.startsWith(EDITOR_ROOT)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  try {
    const info = await stat(fullPath);
    if (!info.isFile()) throw new Error('not a file');
    const ext = extname(fullPath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
    res.end(await readFile(fullPath));
  } catch {
    sendText(res, 404, 'Not found');
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      const handled = await handleApi(req, res, url);
      if (!handled) sendJson(res, 404, { error: 'Unknown API route.' });
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(DEFAULT_PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${DEFAULT_PORT}`;
  console.log('=========================================');
  console.log('Lulu\'s Tale Project Map Editor v1.1');
  console.log(`Project root: ${PROJECT_ROOT}`);
  console.log(`Editor URL:   ${url}`);
  console.log('Close this window to stop the editor.');
  console.log('=========================================');
  openBrowser(url);
});

server.on('error', (error) => {
  console.error('Could not start map editor server:', error.message);
  console.error(`Try changing the port with: set LULUS_MAP_EDITOR_PORT=5190`);
  process.exit(1);
});

function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
  child.unref();
}
