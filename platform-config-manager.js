// --- Dynamic Platform Configuration Manager ---
// Manages user-defined custom AI platforms stored in chrome.storage.local.
// Custom platforms are merged with built-in PLATFORMS at runtime.
// Each custom platform has the same structure as entries in platforms.js.

const PlatformConfigManager = (() => {
  const STORAGE_KEY = 'custom_platforms';

  // Merged list: built-in PLATFORMS + user-defined custom platforms
  let allPlatforms = [...PLATFORMS];

  /** Load custom platforms from storage and merge with built-in list */
  async function load() {
    const customs = await _readStorage();
    allPlatforms = [...PLATFORMS, ...customs];
    return allPlatforms;
  }

  /** Get all platforms (built-in + custom) */
  function getAll() {
    return allPlatforms;
  }

  /** Get only custom (user-defined) platforms */
  async function getCustom() {
    return _readStorage();
  }

  /** Add a new custom platform. Returns the created platform object. */
  async function add(platform) {
    _validatePlatform(platform);
    const customs = await _readStorage();
    if (customs.some(p => p.id === platform.id) || PLATFORMS.some(p => p.id === platform.id)) {
      throw new Error(`Platform ID "${platform.id}" already exists.`);
    }
    platform._custom = true; // mark as user-defined
    customs.push(platform);
    await _writeStorage(customs);
    allPlatforms = [...PLATFORMS, ...customs];
    return platform;
  }

  /** Update an existing custom platform by ID. Cannot update built-in platforms. */
  async function update(id, changes) {
    if (PLATFORMS.some(p => p.id === id)) {
      throw new Error(`Cannot edit built-in platform "${id}".`);
    }
    const customs = await _readStorage();
    const idx = customs.findIndex(p => p.id === id);
    if (idx === -1) throw new Error(`Custom platform "${id}" not found.`);
    customs[idx] = { ...customs[idx], ...changes, id, _custom: true };
    _validatePlatform(customs[idx]);
    await _writeStorage(customs);
    allPlatforms = [...PLATFORMS, ...customs];
    return customs[idx];
  }

  /** Remove a custom platform by ID. Cannot remove built-in platforms. */
  async function remove(id) {
    if (PLATFORMS.some(p => p.id === id)) {
      throw new Error(`Cannot remove built-in platform "${id}".`);
    }
    let customs = await _readStorage();
    customs = customs.filter(p => p.id !== id);
    await _writeStorage(customs);
    allPlatforms = [...PLATFORMS, ...customs];
  }

  /** Generate a default open URL from the first urlPattern */
  function defaultUrlFromPattern(pattern) {
    // Convert "*://www.example.com/*" → "https://www.example.com/"
    return pattern.replace(/^\*:\/\//, 'https://').replace(/\/\*$/, '/');
  }

  // --- Internal helpers ---

  function _validatePlatform(p) {
    if (!p.id || typeof p.id !== 'string') throw new Error('Platform must have a string id.');
    if (!p.name || typeof p.name !== 'string') throw new Error('Platform must have a string name.');
    if (!Array.isArray(p.urlPatterns) || p.urlPatterns.length === 0) {
      throw new Error('Platform must have at least one urlPattern.');
    }
    if (!p.selectors || !Array.isArray(p.selectors.input) || !Array.isArray(p.selectors.response)) {
      throw new Error('Platform must have selectors.input and selectors.response arrays.');
    }
    // Ensure sendBtn and generatingSignal arrays exist (can be empty)
    if (!Array.isArray(p.selectors.sendBtn)) p.selectors.sendBtn = [];
    if (!Array.isArray(p.selectors.generatingSignal)) p.selectors.generatingSignal = [];
    // Default icon if none provided
    if (!p.iconSrc) p.iconSrc = '';
  }

  async function _readStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const data = await chrome.storage.local.get([STORAGE_KEY]);
      return data[STORAGE_KEY] || [];
    }
    // Fallback to localStorage for non-extension contexts
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  async function _writeStorage(customs) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [STORAGE_KEY]: customs });
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customs));
    }
  }

  return { load, getAll, getCustom, add, update, remove, defaultUrlFromPattern };
})();
