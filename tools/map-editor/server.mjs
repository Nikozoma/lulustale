import { createServer } from 'node:http';
import { readFile, writeFile, readdir, mkdir, copyFile, stat, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const EDITOR_ROOT = __dirname;
const BACKUP_DIR = join(EDITOR_ROOT, 'backups');
const REPORT_DIR = join(EDITOR_ROOT, 'reports');
const DEFAULT_PORT = Number(process.env.LULUS_MAP_EDITOR_PORT || 5187);
const EDITOR_VERSION = '1.3-vnext';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const SKIP_DIRS = new Set(['.git', '.codex', 'node_modules', 'tools', 'dist', 'backups', 'reports']);
const SEMANTIC_LAYERS = ['ground', 'structures', 'objects', 'markers'];
const VISUAL_LAYERS = ['ground', 'structures', 'objects', 'foreground'];

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
function timestamp() {
  return new Date().toISOString().replace('T', '-').replace(/[:.]/g, '').replace('Z', 'Z');
}
function assertInsideProject(fullPath) {
  const rel = relative(PROJECT_ROOT, fullPath);
  if (rel.startsWith('..') || rel === '..' || rel.includes(`..${sep}`)) throw new Error('Path is outside the project root.');
}
function safeProjectRelativePath(input) {
  const raw = String(input || '').replace(/\\/g, '/');
  if (!raw || raw.startsWith('/') || raw.includes('\0')) throw new Error('Invalid project-relative path.');
  const fullPath = resolve(PROJECT_ROOT, raw);
  assertInsideProject(fullPath);
  return relative(PROJECT_ROOT, fullPath).replace(/\\/g, '/');
}
function safeMapFileName(fileName) {
  const safe = basename(String(fileName || ''));
  if (!safe || safe !== String(fileName || '')) throw new Error('Invalid map filename. Root-level map files only.');
  if (!(safe.endsWith('.semantic_tilemap.json') || ['Home.json', 'Charles.json', 'Overworld.json'].includes(safe))) {
    throw new Error('Invalid map filename. Expected *.semantic_tilemap.json, Home.json, Charles.json, or Overworld.json.');
  }
  return safe;
}
function mapPathFromFileName(fileName) {
  return join(PROJECT_ROOT, safeMapFileName(fileName));
}
function visualFileNameForMap(fileName) {
  const safe = safeMapFileName(fileName);
  const base = safe.endsWith('.semantic_tilemap.json') ? safe.replace('.semantic_tilemap.json', '') : safe.replace(/\.json$/i, '');
  return `${base}.visual.json`;
}
function visualPathFromMapFileName(fileName) {
  return join(PROJECT_ROOT, visualFileNameForMap(fileName));
}
async function fileExists(path) {
  try { await access(path); return true; } catch { return false; }
}
function normalizeMapIdentity(map, fileName) {
  const base = fileName.replace('.semantic_tilemap.json', '').replace(/\.json$/i, '');
  if (!map.mapId && map.mapName) map.mapId = map.mapName;
  if (!map.mapName && map.mapId) map.mapName = map.mapId;
  if (!map.mapId) map.mapId = base;
  if (!map.mapName) map.mapName = map.mapId;
  if (!map.displayName) map.displayName = map.mapName || map.mapId || base;
}
function validateSemanticMap(map) {
  if (!map || typeof map !== 'object') throw new Error('Map payload must be an object.');
  const width = Number(map.width);
  const height = Number(map.height);
  if (!Number.isInteger(width) || width <= 0) throw new Error('Map width must be a positive integer.');
  if (!Number.isInteger(height) || height <= 0) throw new Error('Map height must be a positive integer.');
  if (!map.layers || typeof map.layers !== 'object') throw new Error('Map is missing layers.');
  for (const layer of SEMANTIC_LAYERS) {
    const rows = map.layers[layer];
    if (!Array.isArray(rows)) throw new Error(`Map is missing required layer: ${layer}.`);
    if (rows.length !== height) throw new Error(`${layer} layer has ${rows.length} rows; expected ${height}.`);
    rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) throw new Error(`${layer} row ${rowIndex} is not an array.`);
      if (row.length !== width) throw new Error(`${layer} row ${rowIndex} has ${row.length} cells; expected ${width}.`);
      row.forEach((cell, cellIndex) => {
        if (cell !== null && typeof cell !== 'string') throw new Error(`${layer} row ${rowIndex}, cell ${cellIndex} must be null or a string.`);
      });
    });
  }
}
async function readImageInfo(relPath) {
  const safeRel = safeProjectRelativePath(relPath);
  const full = join(PROJECT_ROOT, safeRel);
  const ext = extname(full).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) throw new Error(`Visual asset path is not an image: ${safeRel}`);
  const info = await stat(full);
  if (!info.isFile()) throw new Error(`Visual asset path is not a file: ${safeRel}`);
  if (ext === '.png') return { path: safeRel, ...(await readPngDimensions(full)) };
  return { path: safeRel, width: Number.MAX_SAFE_INTEGER, height: Number.MAX_SAFE_INTEGER, unknownSize: true };
}
async function validateVisualFile(visual, map, options = {}) {
  if (!visual || typeof visual !== 'object') throw new Error('Visual payload must be an object.');
  if (!Array.isArray(visual.placements)) throw new Error('Visual payload must have placements array.');
  const width = Number(map.width);
  const height = Number(map.height);
  const imageInfoCache = new Map();
  const warnings = [];
  const errors = [];
  for (const [index, p] of visual.placements.entries()) {
    const prefix = `placement[${index}]`;
    if (!p || typeof p !== 'object') { errors.push(`${prefix} must be an object.`); continue; }
    if (!p.id) p.id = `vp_${randomUUID().slice(0, 8)}`;
    const assetPath = typeof p.assetPath === 'string' ? p.assetPath : p.asset?.path;
    if (!assetPath) { errors.push(`${prefix} missing assetPath.`); continue; }
    let info = imageInfoCache.get(assetPath);
    if (!info) {
      try {
        info = await readImageInfo(assetPath);
        imageInfoCache.set(assetPath, info);
      } catch (error) {
        errors.push(`${prefix} asset error: ${error.message}`);
        continue;
      }
    }
    const crop = normalizeCropObject(p.crop ?? p);
    const tile = normalizeTileObject(p.tile ?? p);
    const draw = normalizeDrawObject(p.draw ?? p);
    if (crop.x < 0 || crop.y < 0 || crop.width <= 0 || crop.height <= 0) errors.push(`${prefix} has invalid crop values.`);
    if (!info.unknownSize && (crop.x + crop.width > info.width || crop.y + crop.height > info.height)) {
      errors.push(`${prefix} crop exceeds ${assetPath} bounds (${info.width}×${info.height}).`);
    }
    if (tile.x < 0 || tile.y < 0 || tile.x >= width || tile.y >= height) errors.push(`${prefix} tile position is outside map bounds.`);
    if (draw.widthTiles <= 0 || draw.heightTiles <= 0) errors.push(`${prefix} draw size must be positive.`);
    if (tile.x + draw.widthTiles > width || tile.y + draw.heightTiles > height) warnings.push(`${prefix} draw footprint extends beyond map bounds.`);
    if (!VISUAL_LAYERS.includes(p.drawLayer)) warnings.push(`${prefix} has unknown drawLayer '${p.drawLayer}', will still be preserved.`);
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { ok: true, warnings, assetSheetsUsed: [...imageInfoCache.keys()], placementCount: visual.placements.length, options };
}
function normalizeCropObject(input) {
  return {
    x: Math.round(Number(input.x ?? input.sx ?? 0)),
    y: Math.round(Number(input.y ?? input.sy ?? 0)),
    width: Math.max(1, Math.round(Number(input.width ?? input.sw ?? 32))),
    height: Math.max(1, Math.round(Number(input.height ?? input.sh ?? 32)))
  };
}
function normalizeTileObject(input) {
  return { x: Math.round(Number(input.x ?? input.tileX ?? 0)), y: Math.round(Number(input.y ?? input.tileY ?? 0)) };
}
function normalizeDrawObject(input) {
  return {
    widthTiles: Math.max(0.01, Number(input.widthTiles ?? input.wTiles ?? input.width ?? 1)),
    heightTiles: Math.max(0.01, Number(input.heightTiles ?? input.hTiles ?? input.height ?? 1))
  };
}
async function createBackupIfExists(fullPath, readableName) {
  if (!existsSync(fullPath)) return null;
  await mkdir(BACKUP_DIR, { recursive: true });
  const t = timestamp();
  const backupFileName = `${readableName}.backup-${t}.json`;
  const backupPath = join(BACKUP_DIR, backupFileName);
  await copyFile(fullPath, backupPath);
  return relative(PROJECT_ROOT, backupPath).replace(/\\/g, '/');
}
async function writeReport(report) {
  await mkdir(REPORT_DIR, { recursive: true });
  const safeMap = String(report.mapEdited || 'map').replace(/[^a-z0-9_-]+/gi, '_');
  const fileName = `${safeMap}-report-${timestamp()}.json`;
  const full = join(REPORT_DIR, fileName);
  await writeFile(full, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return relative(PROJECT_ROOT, full).replace(/\\/g, '/');
}
async function listMaps() {
  const entries = await readdir(PROJECT_ROOT, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && (entry.name.endsWith('.semantic_tilemap.json') || ['Home.json', 'Charles.json', 'Overworld.json'].includes(entry.name)))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  const maps = [];
  for (const fileName of files) {
    try {
      const raw = JSON.parse(await readFile(join(PROJECT_ROOT, fileName), 'utf8'));
      normalizeMapIdentity(raw, fileName);
      const visualFileName = visualFileNameForMap(fileName);
      let visualCount = 0;
      const visualPath = join(PROJECT_ROOT, visualFileName);
      if (existsSync(visualPath)) {
        const visual = JSON.parse(await readFile(visualPath, 'utf8'));
        visualCount = Array.isArray(visual.placements) ? visual.placements.length : 0;
      } else if (raw.assetLayers) {
        visualCount = countLegacyAssetLayerCells(raw.assetLayers);
      }
      maps.push({
        fileName,
        visualFileName,
        hasVisualFile: existsSync(visualPath),
        hasLegacyAssetLayers: Boolean(raw.assetLayers),
        visualPlacementCount: visualCount,
        mapId: raw.mapId,
        displayName: raw.displayName,
        width: raw.width,
        height: raw.height,
        gameTileSizePx: raw.gameTileSizePx,
        version: raw.version || null
      });
    } catch (error) {
      maps.push({ fileName, error: error.message });
    }
  }
  return maps;
}
function countLegacyAssetLayerCells(assetLayers) {
  let count = 0;
  for (const layer of ['ground', 'structures', 'objects']) {
    const rows = assetLayers?.[layer];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) if (Array.isArray(row)) for (const cell of row) if (cell) count += 1;
  }
  return count;
}
async function listPngAssets() {
  const assets = [];
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
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;
      if (entry.name.startsWith('._') || rel.startsWith('docs/')) continue;
      let dimensions = null;
      if (ext === '.png') dimensions = await readPngDimensions(full).catch(() => null);
      assets.push({
        path: rel,
        folder: dirname(rel) === '.' ? '(project root)' : dirname(rel),
        name: entry.name,
        width: dimensions?.width || null,
        height: dimensions?.height || null,
        suggestedTileSize: suggestTileSize(rel, dimensions?.width, dimensions?.height)
      });
    }
  }
  await walk(PROJECT_ROOT);
  assets.sort((a, b) => scoreAssetPath(a.path) - scoreAssetPath(b.path) || a.path.localeCompare(b.path));
  const folderMap = new Map();
  for (const asset of assets) folderMap.set(asset.folder, (folderMap.get(asset.folder) || 0) + 1);
  const folders = [...folderMap.entries()].map(([folder, count]) => ({ folder, count })).sort((a, b) => scoreAssetPath(a.folder) - scoreAssetPath(b.folder) || a.folder.localeCompare(b.folder));
  return { assets, folders };
}
function scoreAssetPath(path) {
  if (path.startsWith('public/assets/top-down-retro-interior/')) return 0;
  if (path.startsWith('public/assets/')) return 1;
  if (path.startsWith('Top-Down_Retro_Interior/')) return 2;
  if (path.startsWith('City Prop') || path.startsWith('modern pixel')) return 3;
  if (path.includes('/Tiles/')) return 4;
  return 20;
}
function suggestTileSize(path, width, height) {
  if (path.includes('TopDownHouse') || path.includes('top-down-retro-interior')) return 16;
  if (width && height && width % 32 === 0 && height % 32 === 0) return 32;
  if (width && height && width % 16 === 0 && height % 16 === 0) return 16;
  return 32;
}
async function readPngDimensions(fullPath) {
  const buffer = await readFile(fullPath);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error('not png');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
function legacyAssetLayersToVisualPlacements(map, fileName) {
  const placements = [];
  if (!map.assetLayers) return placements;
  const now = new Date().toISOString();
  for (const layer of ['ground', 'structures', 'objects']) {
    const rows = map.assetLayers[layer];
    if (!Array.isArray(rows)) continue;
    for (let y = 0; y < rows.length; y += 1) {
      const row = rows[y];
      if (!Array.isArray(row)) continue;
      for (let x = 0; x < row.length; x += 1) {
        const cell = row[x];
        if (!cell || typeof cell !== 'object' || !cell.assetPath) continue;
        placements.push({
          id: `legacy_${layer}_${x}_${y}_${placements.length}`,
          label: cell.label || 'legacy asset cell',
          assetPath: cell.assetPath,
          crop: { x: Number(cell.sx || 0), y: Number(cell.sy || 0), width: Number(cell.sw || 32), height: Number(cell.sh || 32) },
          tile: { x, y },
          draw: { widthTiles: 1, heightTiles: 1 },
          anchor: 'top-left',
          drawLayer: layer,
          order: placements.length,
          migratedFrom: 'assetLayers',
          createdAt: now
        });
      }
    }
  }
  return placements;
}
async function readVisualForMap(fileName, map) {
  const visualFileName = visualFileNameForMap(fileName);
  const visualPath = visualPathFromMapFileName(fileName);
  if (existsSync(visualPath)) {
    const visual = JSON.parse(await readFile(visualPath, 'utf8'));
    normalizeVisualFile(visual, map, fileName);
    return { visualFileName, visual, source: 'visual-file' };
  }
  const placements = legacyAssetLayersToVisualPlacements(map, fileName);
  const visual = makeEmptyVisualFile(map, fileName, placements);
  return { visualFileName, visual, source: placements.length ? 'legacy-assetLayers-migrated-in-memory' : 'new-empty-visual-file' };
}
function makeEmptyVisualFile(map, fileName, placements = []) {
  normalizeMapIdentity(map, fileName);
  return {
    format: 'lulus_visual_placements_v1',
    version: '1.0',
    mapFile: fileName,
    mapId: map.mapId,
    displayName: `${map.displayName || map.mapId} Visuals`,
    width: Number(map.width),
    height: Number(map.height),
    gameTileSizePx: Number(map.gameTileSizePx || 32),
    visualLayerOrder: [...VISUAL_LAYERS],
    placements
  };
}
function normalizeVisualFile(visual, map, fileName) {
  const base = makeEmptyVisualFile(map, fileName, []);
  visual.format = visual.format || base.format;
  visual.version = visual.version || base.version;
  visual.mapFile = visual.mapFile || fileName;
  visual.mapId = visual.mapId || base.mapId;
  visual.displayName = visual.displayName || base.displayName;
  visual.width = Number(visual.width || map.width);
  visual.height = Number(visual.height || map.height);
  visual.gameTileSizePx = Number(visual.gameTileSizePx || map.gameTileSizePx || 32);
  visual.visualLayerOrder = Array.isArray(visual.visualLayerOrder) ? visual.visualLayerOrder : [...VISUAL_LAYERS];
  visual.placements = Array.isArray(visual.placements) ? visual.placements.map((p, i) => normalizePlacement(p, i)) : [];
}
function normalizePlacement(p, i) {
  const crop = normalizeCropObject(p.crop ?? p);
  const tile = normalizeTileObject(p.tile ?? p);
  const draw = normalizeDrawObject(p.draw ?? p);
  return {
    id: p.id || `vp_${randomUUID().slice(0, 8)}`,
    label: p.label || '',
    assetPath: p.assetPath || p.asset?.path || '',
    crop,
    tile,
    draw,
    anchor: p.anchor || 'top-left',
    drawLayer: p.drawLayer || 'objects',
    order: Number.isFinite(Number(p.order)) ? Number(p.order) : i,
    notes: p.notes || ''
  };
}
async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true, version: EDITOR_VERSION, projectRoot: PROJECT_ROOT, editorRoot: EDITOR_ROOT });
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/maps') {
    sendJson(res, 200, { projectRoot: PROJECT_ROOT, maps: await listMaps() });
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/assets') {
    sendJson(res, 200, { projectRoot: PROJECT_ROOT, ...(await listPngAssets()) });
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/project-asset') {
    const rel = safeProjectRelativePath(url.searchParams.get('path'));
    const fullPath = join(PROJECT_ROOT, rel);
    const ext = extname(fullPath).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) throw new Error('Only image assets can be served.');
    const info = await stat(fullPath);
    if (!info.isFile()) throw new Error('Asset is not a file.');
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(await readFile(fullPath));
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/api/map') {
    const fileName = safeMapFileName(url.searchParams.get('file'));
    const map = JSON.parse(await readFile(mapPathFromFileName(fileName), 'utf8'));
    normalizeMapIdentity(map, fileName);
    const { visualFileName, visual, source } = await readVisualForMap(fileName, map);
    sendJson(res, 200, { fileName, visualFileName, map, visual, visualSource: source });
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/api/map/save-semantic') {
    const body = await readJsonBody(req);
    const fileName = safeMapFileName(body.fileName);
    const fullPath = mapPathFromFileName(fileName);
    if (!existsSync(fullPath)) throw new Error(`Cannot save missing map file: ${fileName}`);
    validateSemanticMap(body.map);
    const backupFile = await createBackupIfExists(fullPath, fileName.replace(/\.json$/i, ''));
    const map = body.map;
    normalizeMapIdentity(map, fileName);
    if (!map.format) map.format = 'semantic_tilemap_builder_v2';
    if (!map.version) map.version = '2.3';
    if (!Array.isArray(map.layerOrder)) map.layerOrder = SEMANTIC_LAYERS;
    await writeFile(fullPath, `${JSON.stringify(map, null, 2)}\n`, 'utf8');
    const report = {
      type: 'semantic-save',
      savedAt: new Date().toISOString(),
      mapEdited: map.mapId || fileName,
      filesChanged: [fileName],
      backupFilesCreated: backupFile ? [backupFile] : [],
      semanticLayersChanged: true,
      visualPlacementsChanged: false,
      validation: { ok: true }
    };
    const reportFile = await writeReport(report);
    sendJson(res, 200, { ok: true, fileName, backupFile, reportFile, report });
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/api/visual/save') {
    const body = await readJsonBody(req);
    const fileName = safeMapFileName(body.fileName);
    const map = JSON.parse(await readFile(mapPathFromFileName(fileName), 'utf8'));
    normalizeMapIdentity(map, fileName);
    validateSemanticMap(map);
    const visualFileName = visualFileNameForMap(fileName);
    const visualPath = visualPathFromMapFileName(fileName);
    const visual = body.visual;
    normalizeVisualFile(visual, map, fileName);
    const validation = await validateVisualFile(visual, map, { strict: false });
    const backupFile = await createBackupIfExists(visualPath, visualFileName.replace(/\.json$/i, ''));
    await writeFile(visualPath, `${JSON.stringify(visual, null, 2)}\n`, 'utf8');
    const report = {
      type: 'visual-save',
      savedAt: new Date().toISOString(),
      mapEdited: map.mapId || fileName,
      mapFile: fileName,
      visualFile: visualFileName,
      filesChanged: [visualFileName],
      backupFilesCreated: backupFile ? [backupFile] : [],
      assetSheetsUsed: validation.assetSheetsUsed,
      visualPlacementCount: validation.placementCount,
      semanticLayersChanged: false,
      visualPlacementsChanged: true,
      validation: { ok: true, warnings: validation.warnings }
    };
    const reportFile = await writeReport(report);
    sendJson(res, 200, { ok: true, fileName, visualFileName, backupFile, reportFile, report });
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/api/visual/validate') {
    const body = await readJsonBody(req);
    const fileName = safeMapFileName(body.fileName);
    const map = JSON.parse(await readFile(mapPathFromFileName(fileName), 'utf8'));
    normalizeMapIdentity(map, fileName);
    const visual = body.visual;
    normalizeVisualFile(visual, map, fileName);
    sendJson(res, 200, await validateVisualFile(visual, map, { dryRun: true }));
    return true;
  }
  return false;
}
async function serveStatic(req, res, url) {
  let requested = decodeURIComponent(url.pathname);
  if (requested === '/') requested = '/index.html';
  const fullPath = resolve(EDITOR_ROOT, `.${requested}`);
  if (!fullPath.startsWith(EDITOR_ROOT)) { sendText(res, 403, 'Forbidden'); return; }
  try {
    const info = await stat(fullPath);
    if (!info.isFile()) throw new Error('not a file');
    const ext = extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
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
  console.log('================================================');
  console.log(`Lulu's Tale Tile Tool ${EDITOR_VERSION}`);
  console.log(`Project root: ${PROJECT_ROOT}`);
  console.log(`Editor URL:   ${url}`);
  console.log('Close this window to stop the editor.');
  console.log('================================================');
  openBrowser(url);
});
server.on('error', (error) => {
  console.error('Could not start map editor server:', error.message);
  console.error('Try changing the port with: set LULUS_MAP_EDITOR_PORT=5190');
  process.exit(1);
});
function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open';
  const args = platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore' });
  child.unref();
}
