(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const els = {
    mapSelect: document.getElementById('mapSelect'),
    refreshBtn: document.getElementById('refreshBtn'),
    loadBtn: document.getElementById('loadBtn'),
    mapId: document.getElementById('mapId'),
    displayName: document.getElementById('displayName'),
    width: document.getElementById('width'),
    height: document.getElementById('height'),
    tileSize: document.getElementById('tileSize'),
    projectRootHint: document.getElementById('projectRootHint'),
    activeLayer: document.getElementById('activeLayer'),
    brushSize: document.getElementById('brushSize'),
    palette: document.getElementById('palette'),
    layerVisibility: document.getElementById('layerVisibility'),
    showAllBtn: document.getElementById('showAllBtn'),
    soloBtn: document.getElementById('soloBtn'),
    eraserBtn: document.getElementById('eraserBtn'),
    clearLayerBtn: document.getElementById('clearLayerBtn'),
    saveBtn: document.getElementById('saveBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    statusLine: document.getElementById('statusLine'),
    fileHud: document.getElementById('fileHud'),
    selectedHud: document.getElementById('selectedHud'),
    tileHud: document.getElementById('tileHud'),
    zoomHud: document.getElementById('zoomHud')
  };

  const LAYER_ORDER = ['ground', 'structures', 'objects', 'markers'];
  const LAYER_LABELS = {
    ground: 'Ground',
    structures: 'Structures',
    objects: 'Objects',
    markers: 'Markers'
  };

  const PALETTES = {
    ground: [
      { id: 'indoor_floor', label: 'Indoor Floor', color: '#c9b99a' },
      { id: 'street', label: 'Street', color: '#3f3f46' },
      { id: 'sidewalk', label: 'Sidewalk', color: '#d8dee9' },
      { id: 'grass', label: 'Grass', color: '#22c55e' },
      { id: 'parking_lot', label: 'Parking Lot', color: '#64748b' },
      { id: 'crosswalk', label: 'Crosswalk', color: '#fef08a' }
    ],
    structures: [
      { id: 'exterior_wall', label: 'Exterior Wall', color: '#2563eb' },
      { id: 'interior_wall', label: 'Interior Wall', color: '#111827' },
      { id: 'doorway', label: 'Doorway', color: '#f97316' },
      { id: 'entrance_exit', label: 'Entrance / Exit', color: '#facc15' },
      { id: 'window', label: 'Window', color: '#38bdf8' },
      { id: 'collision_block', label: 'Collision Block', color: '#020617' },
      { id: 'player_apartment_building', label: 'Player Apt Building', color: '#8b5cf6' },
      { id: 'charles_jr_building', label: 'Charles Jr Building', color: '#f97316' },
      { id: 'apartment_building', label: 'Apartment Building', color: '#6366f1' },
      { id: 'building_shell', label: 'Building Shell', color: '#7c3aed' },
      { id: 'fence', label: 'Fence', color: '#78350f' }
    ],
    objects: [
      { id: 'bed', label: 'Bed', color: '#a855f7' },
      { id: 'couch', label: 'Couch', color: '#ef4444' },
      { id: 'table', label: 'Table', color: '#92400e' },
      { id: 'dining_table', label: 'Dining Table', color: '#b45309' },
      { id: 'booth_seat', label: 'Booth Seat', color: '#dc2626' },
      { id: 'cashier_counter', label: 'Cashier Counter', color: '#0f766e' },
      { id: 'refrigerator', label: 'Refrigerator', color: '#67e8f9' },
      { id: 'stove', label: 'Stove', color: '#334155' },
      { id: 'sink', label: 'Sink', color: '#94a3b8' },
      { id: 'counter_top', label: 'Counter Top', color: '#14b8a6' },
      { id: 'dog_bowl', label: 'Dog Bowl', color: '#fbbf24' },
      { id: 'dog_bed', label: 'Dog Bed', color: '#f59e0b' },
      { id: 'tree', label: 'Tree', color: '#166534' },
      { id: 'bush', label: 'Bush', color: '#65a30d' },
      { id: 'furniture_appliance', label: 'Furniture / Appliance', color: '#f472b6' }
    ],
    markers: [
      { id: 'player_spawn', label: 'Player Spawn', color: '#ffffff' },
      { id: 'player_door', label: 'Player Door', color: '#38bdf8' },
      { id: 'charles_jr_door', label: 'Charles Jr Door', color: '#fb923c' },
      { id: 'transition_to_home', label: 'Transition to Home', color: '#22d3ee' },
      { id: 'transition_to_charles_jr', label: 'Transition to Charles Jr', color: '#f59e0b' },
      { id: 'npc_spawn', label: 'NPC Spawn', color: '#fde68a' },
      { id: 'cashier_spawn', label: 'Cashier Spawn', color: '#fb7185' },
      { id: 'dog_spawn', label: 'Dog Spawn', color: '#84cc16' },
      { id: 'dog_interaction', label: 'Dog Interaction', color: '#bef264' },
      { id: 'entrance_exit', label: 'Entrance / Exit', color: '#facc15' },
      { id: 'order_interaction', label: 'Order Interaction', color: '#f97316' },
      { id: 'walkable_area', label: 'Walkable Area', color: '#86efac' },
      { id: 'seating_area', label: 'Seating Area', color: '#c084fc' },
      { id: 'event_zone', label: 'Event Zone', color: '#ff2d55' },
      { id: 'interior_door', label: 'Interior Door', color: '#06b6d4' },
      { id: 'save_point', label: 'Save Point', color: '#22d3ee' },
      { id: 'bed_interaction', label: 'Bed Interaction', color: '#c084fc' },
      { id: 'fridge_interaction', label: 'Fridge Interaction', color: '#7dd3fc' },
      { id: 'interaction_point', label: 'Interaction Point', color: '#f59e0b' },
      { id: 'kitchen_zone', label: 'Kitchen Zone', color: '#2dd4bf' },
      { id: 'room_zone', label: 'Room Zone', color: '#a78bfa' }
    ]
  };

  const colorById = {};
  const labelById = {};
  for (const items of Object.values(PALETTES)) {
    for (const item of items) {
      colorById[item.id] = item.color;
      labelById[item.id] = item.label;
    }
  }

  const state = {
    maps: [],
    fileName: null,
    map: null,
    activeLayer: 'ground',
    selected: 'indoor_floor',
    visibility: { ground: true, structures: true, objects: true, markers: true },
    zoom: 1,
    panX: 0,
    panY: 0,
    pointer: { down: false, mode: null, lastX: 0, lastY: 0 },
    dirty: false
  };

  async function api(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    if (!response.ok) {
      const message = data?.error || text || response.statusText;
      throw new Error(message);
    }
    return data;
  }

  async function init() {
    setupUi();
    setupCanvas();
    populateLayerSelect();
    renderPalette();
    renderVisibility();
    await refreshMaps();
    requestAnimationFrame(draw);
  }

  function setupUi() {
    els.refreshBtn.addEventListener('click', refreshMaps);
    els.loadBtn.addEventListener('click', () => loadSelectedMap());
    els.mapSelect.addEventListener('dblclick', () => loadSelectedMap());
    els.activeLayer.addEventListener('change', () => {
      state.activeLayer = els.activeLayer.value;
      if (!PALETTES[state.activeLayer].some((item) => item.id === state.selected)) {
        state.selected = PALETTES[state.activeLayer][0]?.id || null;
      }
      renderPalette();
      renderVisibility();
      setStatus(`Active layer: ${LAYER_LABELS[state.activeLayer]}`);
    });
    els.showAllBtn.addEventListener('click', () => {
      for (const layer of LAYER_ORDER) state.visibility[layer] = true;
      renderVisibility();
      setStatus('All layers visible.');
    });
    els.soloBtn.addEventListener('click', () => {
      for (const layer of LAYER_ORDER) state.visibility[layer] = layer === state.activeLayer;
      renderVisibility();
      setStatus(`Showing only ${LAYER_LABELS[state.activeLayer]}.`);
    });
    els.eraserBtn.addEventListener('click', () => {
      state.selected = null;
      renderPalette();
      updateHud();
      setStatus('Eraser selected.');
    });
    els.clearLayerBtn.addEventListener('click', () => clearLayer());
    els.saveBtn.addEventListener('click', saveCurrentMap);
    els.downloadBtn.addEventListener('click', downloadCurrentMap);
    els.mapId.addEventListener('input', markDirty);
    els.displayName.addEventListener('input', markDirty);
  }

  function setupCanvas() {
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousedown', pointerDown);
    canvas.addEventListener('mousemove', pointerMove);
    window.addEventListener('mouseup', pointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    resizeCanvas();
  }

  async function refreshMaps() {
    try {
      const result = await api('/api/maps');
      state.maps = result.maps || [];
      els.projectRootHint.textContent = `Project root: ${result.projectRoot}`;
      els.mapSelect.innerHTML = '';
      for (const map of state.maps) {
        const option = document.createElement('option');
        option.value = map.fileName;
        option.textContent = map.error
          ? `${map.fileName} - ERROR: ${map.error}`
          : `${map.displayName || map.mapId || map.fileName} (${map.fileName})`;
        els.mapSelect.appendChild(option);
      }
      setStatus(`Found ${state.maps.length} semantic map file(s).`);
      if (!state.fileName && state.maps.length) {
        els.mapSelect.value = state.maps[0].fileName;
      }
    } catch (error) {
      setStatus(`Could not list maps: ${error.message}`);
    }
  }

  async function loadSelectedMap() {
    const fileName = els.mapSelect.value;
    if (!fileName) return;
    if (state.dirty && !confirm('Current map has unsaved changes. Load another map anyway?')) return;
    try {
      const result = await api(`/api/map?file=${encodeURIComponent(fileName)}`);
      state.fileName = result.fileName;
      state.map = normalizeLoadedMap(result.map);
      state.dirty = false;
      updateMapForm();
      centerMap();
      setStatus(`Loaded ${state.fileName}.`);
    } catch (error) {
      setStatus(`Could not load map: ${error.message}`);
    }
  }

  function normalizeLoadedMap(map) {
    const width = Number(map.width);
    const height = Number(map.height);
    map.width = width;
    map.height = height;
    map.gameTileSizePx = Number(map.gameTileSizePx || 32);
    map.layers = map.layers || {};
    for (const layer of LAYER_ORDER) {
      if (!Array.isArray(map.layers[layer])) {
        map.layers[layer] = makeEmptyLayer(width, height);
      }
      map.layers[layer] = normalizeLayer(map.layers[layer], width, height);
    }
    if (!Array.isArray(map.layerOrder)) map.layerOrder = [...LAYER_ORDER];
    if (!map.mapId && map.mapName) map.mapId = map.mapName;
    if (!map.displayName) map.displayName = map.mapId || map.mapName || state.fileName || 'Untitled Map';
    return map;
  }

  function normalizeLayer(layer, width, height) {
    const out = makeEmptyLayer(width, height);
    for (let y = 0; y < Math.min(height, layer.length); y += 1) {
      const row = Array.isArray(layer[y]) ? layer[y] : [];
      for (let x = 0; x < Math.min(width, row.length); x += 1) {
        out[y][x] = row[x] === undefined ? null : row[x];
      }
    }
    return out;
  }

  function makeEmptyLayer(width, height) {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => null));
  }

  function updateMapForm() {
    const map = state.map;
    if (!map) return;
    els.mapId.value = map.mapId || map.mapName || '';
    els.displayName.value = map.displayName || '';
    els.width.value = map.width;
    els.height.value = map.height;
    els.tileSize.value = map.gameTileSizePx;
    els.fileHud.textContent = state.fileName || 'No map loaded';
    updateHud();
  }

  function populateLayerSelect() {
    els.activeLayer.innerHTML = '';
    for (const layer of LAYER_ORDER) {
      const option = document.createElement('option');
      option.value = layer;
      option.textContent = LAYER_LABELS[layer];
      els.activeLayer.appendChild(option);
    }
    els.activeLayer.value = state.activeLayer;
  }

  function renderPalette() {
    const items = PALETTES[state.activeLayer] || [];
    els.palette.innerHTML = '';
    for (const item of items) {
      const button = document.createElement('button');
      button.className = `tile-btn${state.selected === item.id ? ' active' : ''}`;
      button.title = item.id;
      button.innerHTML = `<span class="swatch" style="background:${item.color}"></span><span>${item.label}</span>`;
      button.addEventListener('click', () => {
        state.selected = item.id;
        renderPalette();
        updateHud();
      });
      els.palette.appendChild(button);
    }
    updateHud();
  }

  function renderVisibility() {
    els.layerVisibility.innerHTML = '';
    for (const layer of LAYER_ORDER) {
      const row = document.createElement('label');
      row.className = `visibility-row${layer === state.activeLayer ? ' active-layer' : ''}`;
      row.innerHTML = `<input type="checkbox" ${state.visibility[layer] ? 'checked' : ''}/><span>${LAYER_LABELS[layer]}</span>`;
      const input = row.querySelector('input');
      input.addEventListener('change', () => {
        state.visibility[layer] = input.checked;
        setStatus(`${LAYER_LABELS[layer]} visibility ${input.checked ? 'on' : 'off'}.`);
      });
      els.layerVisibility.appendChild(row);
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function mapPixelW() { return state.map ? state.map.width * state.map.gameTileSizePx : 1; }
  function mapPixelH() { return state.map ? state.map.height * state.map.gameTileSizePx : 1; }

  function centerMap() {
    const rect = canvas.getBoundingClientRect();
    const fit = Math.min((rect.width * 0.82) / mapPixelW(), (rect.height * 0.82) / mapPixelH());
    state.zoom = clamp(fit, 0.05, 12);
    state.panX = (rect.width - mapPixelW() * state.zoom) / 2;
    state.panY = (rect.height - mapPixelH() * state.zoom) / 2;
    updateHud();
  }

  function pointerDown(e) {
    state.pointer.down = true;
    state.pointer.lastX = e.clientX;
    state.pointer.lastY = e.clientY;
    if (e.button === 1 || e.shiftKey) state.pointer.mode = 'pan';
    else if (e.button === 2) state.pointer.mode = 'erase';
    else state.pointer.mode = 'paint';
    handlePointerAction(e);
  }

  function pointerMove(e) {
    const tile = eventToTile(e);
    els.tileHud.textContent = tile && inBounds(tile.x, tile.y) ? `Tile: ${tile.x}, ${tile.y}` : 'Tile: out';
    if (!state.pointer.down) return;
    if (state.pointer.mode === 'pan') {
      state.panX += e.clientX - state.pointer.lastX;
      state.panY += e.clientY - state.pointer.lastY;
      state.pointer.lastX = e.clientX;
      state.pointer.lastY = e.clientY;
      updateHud();
      return;
    }
    handlePointerAction(e);
  }

  function pointerUp() {
    state.pointer.down = false;
    state.pointer.mode = null;
  }

  function handlePointerAction(e) {
    if (!state.map || state.pointer.mode === 'pan') return;
    const tile = eventToTile(e);
    if (!tile || !inBounds(tile.x, tile.y)) return;
    const value = state.pointer.mode === 'erase' ? null : state.selected;
    paintAt(tile.x, tile.y, value);
  }

  function eventToTile(e) {
    if (!state.map) return null;
    const rect = canvas.getBoundingClientRect();
    const wx = (e.clientX - rect.left - state.panX) / state.zoom;
    const wy = (e.clientY - rect.top - state.panY) / state.zoom;
    return {
      x: Math.floor(wx / state.map.gameTileSizePx),
      y: Math.floor(wy / state.map.gameTileSizePx)
    };
  }

  function paintAt(tx, ty, value) {
    const size = Number(els.brushSize.value || 1);
    const offset = Math.floor(size / 2);
    for (let y = ty - offset; y < ty - offset + size; y += 1) {
      for (let x = tx - offset; x < tx - offset + size; x += 1) {
        if (inBounds(x, y)) state.map.layers[state.activeLayer][y][x] = value;
      }
    }
    markDirty();
  }

  function onWheel(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const before = { x: (mx - state.panX) / state.zoom, y: (my - state.panY) / state.zoom };
    state.zoom = clamp(state.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.05, 16);
    state.panX = mx - before.x * state.zoom;
    state.panY = my - before.y * state.zoom;
    updateHud();
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (state.map) {
      ctx.save();
      ctx.translate(state.panX, state.panY);
      ctx.scale(state.zoom, state.zoom);
      ctx.fillStyle = '#101722';
      ctx.fillRect(0, 0, mapPixelW(), mapPixelH());
      drawLayers();
      drawGrid();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / state.zoom;
      ctx.strokeRect(0, 0, mapPixelW(), mapPixelH());
      ctx.restore();
    } else {
      ctx.fillStyle = '#9db2c8';
      ctx.font = '20px Segoe UI, Arial, sans-serif';
      ctx.fillText('Load a semantic map to begin editing.', 36, 52);
    }

    updateHud();
    requestAnimationFrame(draw);
  }

  function drawLayers() {
    const tile = state.map.gameTileSizePx;
    for (const layer of LAYER_ORDER) {
      if (!state.visibility[layer]) continue;
      const alpha = layer === 'ground' ? 0.78 : layer === 'structures' ? 0.84 : layer === 'objects' ? 0.9 : 0.78;
      const rows = state.map.layers[layer];
      for (let y = 0; y < state.map.height; y += 1) {
        for (let x = 0; x < state.map.width; x += 1) {
          const id = rows[y][x];
          if (!id) continue;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = colorById[id] || '#ff00ff';
          ctx.fillRect(x * tile, y * tile, tile, tile);
          ctx.restore();
          if (layer !== 'ground') {
            ctx.strokeStyle = 'rgba(0,0,0,.52)';
            ctx.lineWidth = 1 / state.zoom;
            ctx.strokeRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
          }
          if (layer === 'markers') drawMarkerGlyph(id, x, y, tile);
        }
      }
    }
  }

  function drawMarkerGlyph(id, x, y, tile) {
    const cx = x * tile + tile / 2;
    const cy = y * tile + tile / 2;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#08111d';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 / state.zoom;
    ctx.beginPath();
    ctx.arc(cx, cy, tile * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.max(8, tile * 0.23)}px Segoe UI, Arial, sans-serif`;
    const label = (id || '?').split('_').map((part) => part[0]).join('').slice(0, 3).toUpperCase();
    ctx.fillText(label, cx, cy);
    ctx.restore();
  }

  function drawGrid() {
    const tile = state.map.gameTileSizePx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 1 / state.zoom;
    for (let x = 0; x <= state.map.width; x += 1) {
      ctx.beginPath(); ctx.moveTo(x * tile, 0); ctx.lineTo(x * tile, mapPixelH()); ctx.stroke();
    }
    for (let y = 0; y <= state.map.height; y += 1) {
      ctx.beginPath(); ctx.moveTo(0, y * tile); ctx.lineTo(mapPixelW(), y * tile); ctx.stroke();
    }
    ctx.restore();
  }

  async function saveCurrentMap() {
    if (!state.map || !state.fileName) return;
    try {
      syncMapFormIntoData();
      const result = await api('/api/map/save', {
        method: 'POST',
        body: JSON.stringify({ fileName: state.fileName, map: state.map })
      });
      state.dirty = false;
      setStatus(`Saved ${result.fileName}.\nBackup created: ${result.backupFileName}`);
      await refreshMaps();
      els.mapSelect.value = state.fileName;
    } catch (error) {
      setStatus(`Save failed: ${error.message}`);
    }
  }

  function syncMapFormIntoData() {
    const mapId = safeMapId(els.mapId.value || state.map.mapId || state.map.mapName || 'untitled_map');
    els.mapId.value = mapId;
    state.map.mapId = mapId;
    state.map.mapName = mapId;
    state.map.displayName = (els.displayName.value || '').trim() || mapId;
    state.map.format = state.map.format || 'semantic_tilemap_builder_v2';
    state.map.version = state.map.version || '2.3';
    state.map.layerOrder = [...LAYER_ORDER];
  }

  function downloadCurrentMap() {
    if (!state.map) return;
    syncMapFormIntoData();
    const blob = new Blob([JSON.stringify(state.map, null, 2) + '\n'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.map.mapId || 'map'}.semantic_tilemap.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
    setStatus('Downloaded a copy. Project file was not changed.');
  }

  function clearLayer() {
    if (!state.map) return;
    if (!confirm(`Clear the entire ${LAYER_LABELS[state.activeLayer]} layer?`)) return;
    state.map.layers[state.activeLayer] = makeEmptyLayer(state.map.width, state.map.height);
    markDirty();
    setStatus(`Cleared ${LAYER_LABELS[state.activeLayer]} layer.`);
  }

  function markDirty() {
    state.dirty = true;
  }

  function setStatus(message) {
    els.statusLine.textContent = message;
  }

  function updateHud() {
    const id = state.selected || 'erase';
    const label = state.selected ? (labelById[state.selected] || state.selected) : 'Eraser';
    els.fileHud.textContent = `${state.fileName || 'No map loaded'}${state.dirty ? ' *unsaved*' : ''}`;
    els.selectedHud.textContent = `Selected: ${label} / ${id} / ${LAYER_LABELS[state.activeLayer]}`;
    els.zoomHud.textContent = `Zoom: ${Math.round(state.zoom * 100)}%`;
  }

  function inBounds(x, y) {
    return Boolean(state.map && x >= 0 && y >= 0 && x < state.map.width && y < state.map.height);
  }

  function safeMapId(raw) {
    return String(raw || 'untitled_map').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'untitled_map';
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  init();
})();
