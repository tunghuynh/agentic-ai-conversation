// --- Dynamic Platform Configuration Manager ---
// All platforms (including defaults from platforms.js) are stored in chrome.storage.local.
// platforms.js serves as the factory-default template, loaded on first install or reset.
// Users can add, edit, or remove ANY platform — no distinction between built-in and custom.

const PlatformConfigManager = (() => {
  const STORAGE_KEY = 'configured_platforms';
  const INIT_FLAG_KEY = 'platforms_initialized';

  // In-memory cache of all configured platforms
  let allPlatforms = [];

  /**
   * Load platforms from storage.
   * On first run (no data in storage), seeds from PLATFORMS (platforms.js).
   */
  async function load() {
    const initialized = await _readFlag();
    if (!initialized) {
      // First install — seed storage with factory defaults
      await _writeStorage(_cloneDefaults());
      await _writeFlag(true);
    }
    allPlatforms = await _readStorage();
    // Fallback: if storage is somehow empty, re-seed
    if (allPlatforms.length === 0) {
      allPlatforms = _cloneDefaults();
      await _writeStorage(allPlatforms);
    }
    return allPlatforms;
  }

  /** Get all configured platforms */
  function getAll() {
    return allPlatforms;
  }

  /** Add a new platform */
  async function add(platform) {
    _validatePlatform(platform);
    if (allPlatforms.some(p => p.id === platform.id)) {
      throw new Error(`Platform ID "${platform.id}" already exists.`);
    }
    allPlatforms.push(platform);
    await _writeStorage(allPlatforms);
    return platform;
  }

  /** Update a platform by ID */
  async function update(id, changes) {
    const idx = allPlatforms.findIndex(p => p.id === id);
    if (idx === -1) throw new Error(`Platform "${id}" not found.`);
    allPlatforms[idx] = { ...allPlatforms[idx], ...changes, id };
    _validatePlatform(allPlatforms[idx]);
    await _writeStorage(allPlatforms);
    return allPlatforms[idx];
  }

  /** Remove a platform by ID */
  async function remove(id) {
    allPlatforms = allPlatforms.filter(p => p.id !== id);
    await _writeStorage(allPlatforms);
  }

  /** Reset to factory defaults — replaces all platforms with PLATFORMS from platforms.js */
  async function resetToDefault() {
    allPlatforms = _cloneDefaults();
    await _writeStorage(allPlatforms);
  }

  /** Generate a default open URL from the first urlPattern */
  function defaultUrlFromPattern(pattern) {
    return pattern.replace(/^\*:\/\//, 'https://').replace(/\/\*$/, '/');
  }

  // --- Internal helpers ---

  /** Deep clone PLATFORMS array to avoid mutating the original */
  function _cloneDefaults() {
    return JSON.parse(JSON.stringify(PLATFORMS));
  }

  function _validatePlatform(p) {
    if (!p.id || typeof p.id !== 'string') throw new Error('Platform must have a string id.');
    if (!p.name || typeof p.name !== 'string') throw new Error('Platform must have a string name.');
    if (!Array.isArray(p.urlPatterns) || p.urlPatterns.length === 0) {
      throw new Error('Platform must have at least one urlPattern.');
    }
    if (!p.selectors || !Array.isArray(p.selectors.input) || !Array.isArray(p.selectors.response)) {
      throw new Error('Platform must have selectors.input and selectors.response arrays.');
    }
    if (!Array.isArray(p.selectors.sendBtn)) p.selectors.sendBtn = [];
    if (!Array.isArray(p.selectors.generatingSignal)) p.selectors.generatingSignal = [];
    if (!p.iconSrc) p.iconSrc = '';
  }

  async function _readStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const data = await chrome.storage.local.get([STORAGE_KEY]);
      return data[STORAGE_KEY] || [];
    }
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }

  async function _writeStorage(platforms) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [STORAGE_KEY]: platforms });
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(platforms));
    }
  }

  async function _readFlag() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const data = await chrome.storage.local.get([INIT_FLAG_KEY]);
      return !!data[INIT_FLAG_KEY];
    }
    return !!localStorage.getItem(INIT_FLAG_KEY);
  }

  async function _writeFlag(value) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [INIT_FLAG_KEY]: value });
    } else {
      localStorage.setItem(INIT_FLAG_KEY, value ? '1' : '');
    }
  }

  return { load, getAll, add, update, remove, resetToDefault, defaultUrlFromPattern };
})();
