(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const assetCanvas = document.getElementById('assetCanvas');
  const assetCtx = assetCanvas.getContext('2d');

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
    editMode: document.getElementById('editMode'),
    semanticPanel: document.getElementById('semanticPanel'),
    assetPanel: document.getElementById('assetPanel'),
    activeLayer: document.getElementById('activeLayer'),
    brushSize: document.getElementById('brushSize'),
    palette: document.getElementById('palette'),
    assetLayer: document.getElementById('assetLayer'),
    assetSelect: document.getElementById('assetSelect'),
    sourceTileSize: document.getElementById('sourceTileSize'),
    sourceSnapX: document.getElementById('sourceSnapX'),
    sourceSnapY: document.getElementById('sourceSnapY'),
    reloadAssetsBtn: document.getElementById('reloadAssetsBtn'),
    assetEraserBtn: document.getElementById('assetEraserBtn'),
    assetInfo: document.getElementById('assetInfo'),
    layerVisibility: document.getElementById('layerVisibility'),
    assetVisibility: document.getElementById('assetVisibility'),
    showAllBtn: document.getElementById('showAllBtn'),
    soloBtn: document.getElementById('soloBtn'),
    showGrid: document.getElementById('showGrid'),
    dimSemanticWhenAssets: document.getElementById('dimSemanticWhenAssets'),
    eraserBtn: document.getElementById('eraserBtn'),
    clearLayerBtn: document.getElementById('clearLayerBtn'),
    saveBtn: document.getElementById('saveBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    statusLine: document.getElementById('statusLine'),
    fileHud: document.getElementById('fileHud'),
    modeHud: document.getElementById('modeHud'),
    selectedHud: document.getElementById('selectedHud'),
    tileHud: document.getElementById('tileHud'),
    zoomHud: document.getElementById('zoomHud')
  };

  const LAYER_ORDER = ['ground', 'structures', 'objects', 'markers'];
  const ASSET_LAYER_ORDER = ['ground', 'structures', 'objects'];
  const LAYER_LABELS = {
    ground: 'Ground',
    structures: 'Structures',
    objects: 'Objects',
    markers: 'Markers'
  };
  const ASSET_LAYER_LABELS = {
    ground: 'Asset Ground',
    structures: 'Asset Structures',
    objects: 'Asset Objects'
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
    editMode: 'semantic',
    activeLayer: 'ground',
    selected: 'indoor_floor',
    visibility: { ground: true, structures: true, objects: true, markers: true },
    assetVisibility: { ground: true, structures: true, objects: true },
    assetLayer: 'ground',
    assets: [],
    assetImage: null,
    assetImagePath: null,
    assetImageInfo: null,
    selectedAsset: null,
    assetCanvasScale: 1,
    imageCache: new Map(),
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
    renderAssetVisibility();
    await Promise.all([refreshMaps(), refreshAssets()]);
    requestAnimationFrame(draw);
  }

  function setupUi() {
    els.refreshBtn.addEventListener('click', refreshMaps);
    els.loadBtn.addEventListener('click', () => loadSelectedMap());
    els.mapSelect.addEventListener('dblclick', () => loadSelectedMap());
    els.editMode.addEventListener('change', () => {
      state.editMode = els.editMode.value;
      els.semanticPanel.hidden = state.editMode !== 'semantic';
      els.assetPanel.hidden = state.editMode !== 'asset';
      setStatus(state.editMode === 'asset' ? 'Asset Tile Paint mode selected.' : 'Semantic Paint mode selected.');
      updateHud();
    });
    els.activeLayer.addEventListener('change', () => {
      state.activeLayer = els.activeLayer.value;
      if (!PALETTES[state.activeLayer].some((item) => item.id === state.selected)) {
        state.selected = PALETTES[state.activeLayer][0]?.id || null;
      }
      renderPalette();
      renderVisibility();
      setStatus(`Active semantic layer: ${LAYER_LABELS[state.activeLayer]}`);
    });
    els.assetLayer.addEventListener('change', () => {
      state.assetLayer = els.assetLayer.value;
      renderAssetVisibility();
      setStatus(`Active asset layer: ${ASSET_LAYER_LABELS[state.assetLayer]}`);
      updateHud();
    });
    els.showAllBtn.addEventListener('click', () => {
      for (const layer of LAYER_ORDER) state.visibility[layer] = true;
      for (const layer of ASSET_LAYER_ORDER) state.assetVisibility[layer] = true;
      renderVisibility();
      renderAssetVisibility();
      setStatus('All semantic and asset layers visible.');
    });
    els.soloBtn.addEventListener('click', () => {
      if (state.editMode === 'asset') {
        for (const layer of LAYER_ORDER) state.visibility[layer] = false;
        state.visibility.markers = true;
        for (const layer of ASSET_LAYER_ORDER) state.assetVisibility[layer] = layer === state.assetLayer;
        renderVisibility();
        renderAssetVisibility();
        setStatus(`Showing only ${ASSET_LAYER_LABELS[state.assetLayer]} plus markers.`);
      } else {
        for (const layer of LAYER_ORDER) state.visibility[layer] = layer === state.activeLayer;
        for (const layer of ASSET_LAYER_ORDER) state.assetVisibility[layer] = false;
        renderVisibility();
        renderAssetVisibility();
        setStatus(`Showing only ${LAYER_LABELS[state.activeLayer]}.`);
      }
    });
    els.eraserBtn.addEventListener('click', () => {
      state.selected = null;
      renderPalette();
      updateHud();
      setStatus('Semantic eraser selected.');
    });
    els.assetEraserBtn.addEventListener('click', () => {
      state.selectedAsset = null;
      updateAssetInfo();
      updateHud();
      drawAssetPicker();
      setStatus('Asset eraser selected.');
    });
    els.clearLayerBtn.addEventListener('click', () => clearLayer());
    els.saveBtn.addEventListener('click', saveCurrentMap);
    els.downloadBtn.addEventListener('click', downloadCurrentMap);
    els.mapId.addEventListener('input', markDirty);
    els.displayName.addEventListener('input', markDirty);
    els.reloadAssetsBtn.addEventListener('click', refreshAssets);
    els.assetSelect.addEventListener('change', () => loadSelectedAssetImage());
    els.sourceTileSize.addEventListener('input', () => { drawAssetPicker(); updateAssetInfo(); });
    els.sourceSnapX.addEventListener('input', () => { drawAssetPicker(); updateAssetInfo(); });
    els.sourceSnapY.addEventListener('input', () => { drawAssetPicker(); updateAssetInfo(); });
    assetCanvas.addEventListener('click', selectAssetTileFromCanvas);
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
        const assetText = map.hasAssetLayers ? ' +assetLayers' : '';
        option.textContent = map.error
          ? `${map.fileName} - ERROR: ${map.error}`
          : `${map.displayName || map.mapId || map.fileName}${assetText} (${map.fileName})`;
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

  async function refreshAssets() {
    try {
      const result = await api('/api/assets');
      state.assets = result.assets || [];
      els.assetSelect.innerHTML = '';
      for (const asset of state.assets) {
        const option = document.createElement('option');
        option.value = asset.path;
        option.textContent = `${asset.path} (${asset.width}×${asset.height})`;
        option.dataset.tileSize = asset.suggestedTileSize || 32;
        els.assetSelect.appendChild(option);
      }
      if (state.assets.length) {
        const preferred = state.assets.find((asset) => asset.path.includes('TopDownHouse_FloorsAndWalls')) || state.assets[0];
        els.assetSelect.value = preferred.path;
        els.sourceTileSize.value = preferred.suggestedTileSize || 32;
        await loadSelectedAssetImage();
      }
      setStatus(`Found ${state.assets.length} PNG asset file(s).`);
    } catch (error) {
      setStatus(`Could not list assets: ${error.message}`);
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

  async function loadSelectedAssetImage() {
    const path = els.assetSelect.value;
    if (!path) return;
    const info = state.assets.find((asset) => asset.path === path) || null;
    state.assetImagePath = path;
    state.assetImageInfo = info;
    const option = [...els.assetSelect.options].find((opt) => opt.value === path);
    if (option?.dataset.tileSize) els.sourceTileSize.value = option.dataset.tileSize;
    try {
      const image = await loadImage(path);
      state.assetImage = image;
      state.selectedAsset = null;
      drawAssetPicker();
      updateAssetInfo();
      setStatus(`Loaded asset sheet: ${path}`);
    } catch (error) {
      setStatus(`Could not load asset sheet: ${error.message}`);
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
    normalizeAssetLayers(map);
    return map;
  }

  function normalizeAssetLayers(map) {
    map.assetTileFormat = map.assetTileFormat || 'lulus_asset_tile_layers_v1';
    map.assetLayerOrder = ['ground', 'structures', 'objects'];
    map.assetLayers = map.assetLayers || {};
    for (const layer of ASSET_LAYER_ORDER) {
      if (!Array.isArray(map.assetLayers[layer])) map.assetLayers[layer] = makeEmptyLayer(map.width, map.height);
      map.assetLayers[layer] = normalizeAssetLayer(map.assetLayers[layer], map.width, map.height);
    }
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

  function normalizeAssetLayer(layer, width, height) {
    const out = makeEmptyLayer(width, height);
    for (let y = 0; y < Math.min(height, layer.length); y += 1) {
      const row = Array.isArray(layer[y]) ? layer[y] : [];
      for (let x = 0; x < Math.min(width, row.length); x += 1) {
        const cell = row[x];
        out[y][x] = normalizeAssetCell(cell);
      }
    }
    return out;
  }

  function normalizeAssetCell(cell) {
    if (!cell || typeof cell !== 'object') return null;
    if (typeof cell.assetPath !== 'string') return null;
    const sx = Number(cell.sx);
    const sy = Number(cell.sy);
    const sw = Number(cell.sw);
    const sh = Number(cell.sh);
    if (![sx, sy, sw, sh].every(Number.isFinite)) return null;
    return {
      assetPath: cell.assetPath,
      sx: Math.max(0, Math.round(sx)),
      sy: Math.max(0, Math.round(sy)),
      sw: Math.max(1, Math.round(sw)),
      sh: Math.max(1, Math.round(sh))
    };
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

  function renderAssetVisibility() {
    els.assetVisibility.innerHTML = '';
    for (const layer of ASSET_LAYER_ORDER) {
      const row = document.createElement('label');
      row.className = `visibility-row${layer === state.assetLayer ? ' active-layer' : ''}`;
      row.innerHTML = `<input type="checkbox" ${state.assetVisibility[layer] ? 'checked' : ''}/><span>${ASSET_LAYER_LABELS[layer]}</span>`;
      const input = row.querySelector('input');
      input.addEventListener('change', () => {
        state.assetVisibility[layer] = input.checked;
        setStatus(`${ASSET_LAYER_LABELS[layer]} visibility ${input.checked ? 'on' : 'off'}.`);
      });
      els.assetVisibility.appendChild(row);
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawAssetPicker();
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
    if (state.editMode === 'asset') {
      const value = state.pointer.mode === 'erase' ? null : state.selectedAsset;
      paintAssetAt(tile.x, tile.y, value);
    } else {
      const value = state.pointer.mode === 'erase' ? null : state.selected;
      paintSemanticAt(tile.x, tile.y, value);
    }
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

  function paintSemanticAt(tx, ty, value) {
    const size = Number(els.brushSize.value || 1);
    const offset = Math.floor(size / 2);
    for (let y = ty - offset; y < ty - offset + size; y += 1) {
      for (let x = tx - offset; x < tx - offset + size; x += 1) {
        if (inBounds(x, y)) state.map.layers[state.activeLayer][y][x] = value;
      }
    }
    markDirty();
  }

  function paintAssetAt(tx, ty, value) {
    const size = Number(els.brushSize.value || 1);
    const offset = Math.floor(size / 2);
    normalizeAssetLayers(state.map);
    for (let y = ty - offset; y < ty - offset + size; y += 1) {
      for (let x = tx - offset; x < tx - offset + size; x += 1) {
        if (inBounds(x, y)) state.map.assetLayers[state.assetLayer][y][x] = value ? { ...value } : null;
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
      drawSemanticLayers();
      drawAssetLayers();
      if (els.showGrid.checked) drawGrid();
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

  function anyAssetLayerVisible() {
    return ASSET_LAYER_ORDER.some((layer) => state.assetVisibility[layer]);
  }

  function drawSemanticLayers() {
    const tile = state.map.gameTileSizePx;
    const dim = els.dimSemanticWhenAssets.checked && anyAssetLayerVisible();
    for (const layer of LAYER_ORDER) {
      if (!state.visibility[layer]) continue;
      const baseAlpha = layer === 'ground' ? 0.78 : layer === 'structures' ? 0.84 : layer === 'objects' ? 0.9 : 0.78;
      const alpha = dim && layer !== 'markers' ? baseAlpha * 0.38 : baseAlpha;
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

  function drawAssetLayers() {
    if (!state.map.assetLayers) return;
    const tile = state.map.gameTileSizePx;
    for (const layer of ASSET_LAYER_ORDER) {
      if (!state.assetVisibility[layer]) continue;
      const rows = state.map.assetLayers[layer];
      if (!rows) continue;
      for (let y = 0; y < state.map.height; y += 1) {
        for (let x = 0; x < state.map.width; x += 1) {
          const cell = rows[y][x];
          if (!cell) continue;
          const image = getCachedImage(cell.assetPath);
          if (image?.complete) {
            ctx.drawImage(image, cell.sx, cell.sy, cell.sw, cell.sh, x * tile, y * tile, tile, tile);
          } else {
            ctx.fillStyle = '#00eaff';
            ctx.fillRect(x * tile, y * tile, tile, tile);
          }
          if (state.editMode === 'asset' && layer === state.assetLayer) {
            ctx.strokeStyle = 'rgba(255,255,255,.4)';
            ctx.lineWidth = 1 / state.zoom;
            ctx.strokeRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
          }
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

  function drawAssetPicker() {
    const rect = assetCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    assetCanvas.width = Math.floor(rect.width * dpr);
    assetCanvas.height = Math.floor(rect.height * dpr);
    assetCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    assetCtx.clearRect(0, 0, rect.width, rect.height);
    assetCtx.fillStyle = '#08111d';
    assetCtx.fillRect(0, 0, rect.width, rect.height);
    if (!state.assetImage) {
      assetCtx.fillStyle = '#9db2c8';
      assetCtx.font = '13px Segoe UI, Arial, sans-serif';
      assetCtx.fillText('No asset sheet loaded.', 12, 24);
      return;
    }

    const padding = 8;
    const scale = Math.min((rect.width - padding * 2) / state.assetImage.width, (rect.height - padding * 2) / state.assetImage.height, 4);
    state.assetCanvasScale = Math.max(0.1, scale);
    const drawW = state.assetImage.width * state.assetCanvasScale;
    const drawH = state.assetImage.height * state.assetCanvasScale;
    assetCtx.imageSmoothingEnabled = false;
    assetCtx.drawImage(state.assetImage, padding, padding, drawW, drawH);

    const tile = getSourceTileSize();
    const snapX = getSnapX();
    const snapY = getSnapY();
    assetCtx.save();
    assetCtx.strokeStyle = 'rgba(255,255,255,.35)';
    assetCtx.lineWidth = 1;
    for (let x = snapX; x <= state.assetImage.width; x += tile) {
      const px = padding + x * state.assetCanvasScale;
      assetCtx.beginPath(); assetCtx.moveTo(px, padding); assetCtx.lineTo(px, padding + drawH); assetCtx.stroke();
    }
    for (let y = snapY; y <= state.assetImage.height; y += tile) {
      const py = padding + y * state.assetCanvasScale;
      assetCtx.beginPath(); assetCtx.moveTo(padding, py); assetCtx.lineTo(padding + drawW, py); assetCtx.stroke();
    }
    if (state.selectedAsset && state.selectedAsset.assetPath === state.assetImagePath) {
      assetCtx.strokeStyle = '#fff200';
      assetCtx.lineWidth = 3;
      assetCtx.strokeRect(
        padding + state.selectedAsset.sx * state.assetCanvasScale,
        padding + state.selectedAsset.sy * state.assetCanvasScale,
        state.selectedAsset.sw * state.assetCanvasScale,
        state.selectedAsset.sh * state.assetCanvasScale
      );
    }
    assetCtx.restore();
  }

  function selectAssetTileFromCanvas(event) {
    if (!state.assetImage || !state.assetImagePath) return;
    const rect = assetCanvas.getBoundingClientRect();
    const padding = 8;
    const ix = (event.clientX - rect.left - padding) / state.assetCanvasScale;
    const iy = (event.clientY - rect.top - padding) / state.assetCanvasScale;
    if (ix < 0 || iy < 0 || ix >= state.assetImage.width || iy >= state.assetImage.height) return;
    const tile = getSourceTileSize();
    const snapX = getSnapX();
    const snapY = getSnapY();
    const sx = snapX + Math.floor((ix - snapX) / tile) * tile;
    const sy = snapY + Math.floor((iy - snapY) / tile) * tile;
    if (sx < 0 || sy < 0 || sx + tile > state.assetImage.width || sy + tile > state.assetImage.height) return;
    state.selectedAsset = { assetPath: state.assetImagePath, sx, sy, sw: tile, sh: tile };
    updateAssetInfo();
    updateHud();
    drawAssetPicker();
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
    normalizeAssetLayers(state.map);
    state.map.assetTileFormat = 'lulus_asset_tile_layers_v1';
    state.map.assetLayerOrder = [...ASSET_LAYER_ORDER];
  }

  function downloadCurrentMap() {
    if (!state.map) return;
    syncMapFormIntoData();
    const blob = new Blob([JSON.stringify(state.map, null, 2) + '\n'], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.map.mapId || 'map'}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(a.href);
    a.remove();
    setStatus('Downloaded a copy. Project file was not changed.');
  }

  function clearLayer() {
    if (!state.map) return;
    if (state.editMode === 'asset') {
      if (!confirm(`Clear the entire ${ASSET_LAYER_LABELS[state.assetLayer]} layer?`)) return;
      normalizeAssetLayers(state.map);
      state.map.assetLayers[state.assetLayer] = makeEmptyLayer(state.map.width, state.map.height);
      markDirty();
      setStatus(`Cleared ${ASSET_LAYER_LABELS[state.assetLayer]}.`);
      return;
    }
    if (!confirm(`Clear the entire ${LAYER_LABELS[state.activeLayer]} layer?`)) return;
    state.map.layers[state.activeLayer] = makeEmptyLayer(state.map.width, state.map.height);
    markDirty();
    setStatus(`Cleared ${LAYER_LABELS[state.activeLayer]} layer.`);
  }

  function updateAssetInfo() {
    if (!state.assetImagePath) {
      els.assetInfo.textContent = 'No asset sheet selected.';
      return;
    }
    if (!state.selectedAsset) {
      els.assetInfo.textContent = `Sheet: ${state.assetImagePath}\nClick a tile in the sheet preview, or use Asset Eraser.`;
      return;
    }
    els.assetInfo.textContent = `Selected asset tile\n${state.selectedAsset.assetPath}\nsx:${state.selectedAsset.sx} sy:${state.selectedAsset.sy} sw:${state.selectedAsset.sw} sh:${state.selectedAsset.sh}`;
  }

  function getSourceTileSize() {
    return clamp(Math.round(Number(els.sourceTileSize.value || 32)), 1, 256);
  }
  function getSnapX() { return clamp(Math.round(Number(els.sourceSnapX.value || 0)), 0, 256); }
  function getSnapY() { return clamp(Math.round(Number(els.sourceSnapY.value || 0)), 0, 256); }

  function getCachedImage(path) {
    if (!path) return null;
    if (state.imageCache.has(path)) return state.imageCache.get(path);
    const img = new Image();
    img.onload = () => {};
    img.onerror = () => setStatus(`Could not preview asset tile image: ${path}`);
    img.src = `/api/project-asset?path=${encodeURIComponent(path)}`;
    state.imageCache.set(path, img);
    return img;
  }

  function loadImage(path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        state.imageCache.set(path, img);
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Image failed to load: ${path}`));
      img.src = `/api/project-asset?path=${encodeURIComponent(path)}`;
    });
  }

  function markDirty() { state.dirty = true; }
  function setStatus(message) { els.statusLine.textContent = message; }

  function updateHud() {
    const semanticId = state.selected || 'erase';
    const semanticLabel = state.selected ? (labelById[state.selected] || state.selected) : 'Eraser';
    const assetLabel = state.selectedAsset ? `${state.selectedAsset.assetPath.split('/').pop()} @ ${state.selectedAsset.sx},${state.selectedAsset.sy}` : 'Asset Eraser / none selected';
    els.fileHud.textContent = `${state.fileName || 'No map loaded'}${state.dirty ? ' *unsaved*' : ''}`;
    els.modeHud.textContent = `Mode: ${state.editMode}`;
    els.selectedHud.textContent = state.editMode === 'asset'
      ? `Selected: ${assetLabel} / ${ASSET_LAYER_LABELS[state.assetLayer]}`
      : `Selected: ${semanticLabel} / ${semanticId} / ${LAYER_LABELS[state.activeLayer]}`;
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
