// --- Constants & State ---
// Tabs are derived from PLATFORMS config (defined in platforms.js)
const INITIAL_TABS = PLATFORMS.map(p => ({ id: p.id, name: p.name, iconSrc: p.iconSrc, connected: false, tabId: null }));

let state = {
  theme: 'dark',
  status: 'idle', // 'idle' | 'running' | 'paused'
  tabs: INITIAL_TABS,
  activeMembers: ['chatgpt', 'claude'],
  messages: [
    {
      id: 'sys-1',
      sender: 'System',
      senderType: 'system',
      text: 'Workspace initialized. Select AI members and configure the prompt to begin.',
      timestamp: Date.now()
    }
  ],
  config: {
    maxLength: 50,
    maxRounds: 7,
    maxDebateTurns: 5,
    responseTimeout: 20,
    debateInstruction: "Take on the role of a participant in a debate with critical thinking skills; engage in argumentation to arrive at a final answer that everyone can agree on. Continue to argue your point if you do not agree with the other party's opinion, or agree with them to reach a common conclusion if you find their perspective valid in a debate. After analyzing, only present your own conclusion on the issue; do not claim it is 'our conclusion' if there has been no agreement from the other parties or if you are the only one involved. After all parties have agreed on the final opinion, lock it in using the sentence format 'chúng tôi đã thống nhất rằng: xxxxx'. Only repeat that exact sentence concisely, without adding anything else. No matter what questions are asked afterward, only repeat the locked conclusion using that exact format. Response in Vietnamese",
    consensusInstruction: 'Stop debating. Synthesize the above arguments and provide the final unified solution strictly concisely. Response in Vietnamese',
    conversationMode: 'debate', // 'debate' | 'free'
  },
  sidebarOpen: window.innerWidth > window.innerHeight,
  isLandscape: window.innerWidth > window.innerHeight
};

// --- DOM Elements ---
const chatHistory = document.getElementById('chat-history');
const tabsList = document.getElementById('tabs-list');
const maxLengthSlider = document.getElementById('max-length-slider');
const maxLengthValue = document.getElementById('max-length-value');
const scanTabsBtn = document.getElementById('scan-tabs-btn');
const noTabsMsg = document.getElementById('no-tabs-msg');
const maxRoundsSlider = document.getElementById('max-rounds-slider');
const maxRoundsValue = document.getElementById('max-rounds-value');
const maxDebateTurnsSlider = document.getElementById('max-debate-turns-slider');
const maxDebateTurnsValue = document.getElementById('max-debate-turns-value');
const responseTimeoutSlider = document.getElementById('response-timeout-slider');
const responseTimeoutValue = document.getElementById('response-timeout-value');
const debateInstructionInput = document.getElementById('debate-instruction');
const consensusInstructionInput = document.getElementById('consensus-instruction');
const controlsContainer = document.getElementById('controls-container');
const statusPing = document.getElementById('status-ping');
const statusDot = document.getElementById('status-dot');
const chatInput = document.getElementById('chat-input');
const chatForm = document.getElementById('chat-form');
const sendButton = document.getElementById('send-button');
const toggleThemeBtn = document.getElementById('toggle-theme');
const themeIcon = document.getElementById('theme-icon');
const clearChatBtn = document.getElementById('clear-chat');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const howtoModal = document.getElementById('howto-modal');
const howtoBtn = document.getElementById('howto-btn');
const howtoClose = document.getElementById('howto-close');
const howtoGotIt = document.getElementById('howto-got-it');
const howtoOverlay = document.getElementById('howto-overlay');

// --- Initialization ---
async function init() {
  // Load from storage if available (Chrome Extension API)
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const data = await chrome.storage.local.get(['ai_workspace_state']);
    if (data.ai_workspace_state) {
      const savedState = data.ai_workspace_state;
      state.theme = savedState.theme || state.theme;
      state.activeMembers = savedState.activeMembers || state.activeMembers;
      state.config = { ...state.config, ...savedState.config };
      // Convert saved timestamps back to Date objects
      state.messages = (savedState.messages || state.messages).map(m => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    }
  }

  // Set initial values
  maxLengthSlider.value = state.config.maxLength;
  maxLengthValue.textContent = state.config.maxLength;
  maxRoundsSlider.value = state.config.maxRounds;
  maxRoundsValue.textContent = state.config.maxRounds;
  maxDebateTurnsSlider.value = state.config.maxDebateTurns;
  maxDebateTurnsValue.textContent = state.config.maxDebateTurns;
  responseTimeoutSlider.value = state.config.responseTimeout;
  responseTimeoutValue.textContent = state.config.responseTimeout;
  debateInstructionInput.value = state.config.debateInstruction;
  consensusInstructionInput.value = state.config.consensusInstruction;
  updateModeUI();
  
  updateTheme();
  updateSidebarUI();
  await scanTabs();
  render();
  setupEventListeners();
  
  // Initial icons
  refreshIcons();
}

function refreshIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// --- Markdown Helpers ---
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseMarkdown(text) {
  if (!text) return '';
  const blocks = [];

  // Extract fenced code blocks first to protect them; capture language for syntax highlighting
  let html = text.replace(/```([\w]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = blocks.length;
    const trimmed = code.trim();
    const highlighted = Highlighter.highlight(trimmed, lang);
    const langLabel = escHtml(lang || 'code');
    blocks.push(
      `<div class="code-block my-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">` +
      `<div class="flex items-center justify-between px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 select-none">` +
      `<span class="text-[10px] font-mono text-gray-500 dark:text-gray-400">${langLabel}</span>` +
      `<button class="copy-btn text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer">Copy</button>` +
      `</div>` +
      `<pre class="bg-gray-50 dark:bg-gray-900 p-3 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre"><code>${highlighted}</code></pre>` +
      `</div>`
    );
    return `\x00BLOCK${i}\x00`;
  });

  // Escape remaining HTML
  html = escHtml(html);

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs font-mono">$1</code>');
  // Bold
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  // Headers → bold block
  html = html.replace(/^#{1,3} (.+)$/gm, '<div class="font-semibold mt-1.5 mb-0.5">$1</div>');
  // Unordered list items
  html = html.replace(/^[*\-•] (.+)$/gm, '<div class="flex gap-1.5 ml-2"><span>•</span><span>$1</span></div>');
  // Ordered list items
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-1.5 ml-2"><span>$1.</span><span>$2</span></div>');
  // Newlines → line breaks
  html = html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');

  // Restore code blocks
  blocks.forEach((b, i) => { html = html.replace(`\x00BLOCK${i}\x00`, b); });
  return html;
}

// --- Render Logic ---
function render() {
  renderTabs();
  renderMessages();
  renderControls();
  updateStatusUI();
  updateSidebarUI();
}

function renderTabs() {
  tabsList.innerHTML = '';
  
  const connectedTabs = state.tabs.filter(t => t.connected);
  
  if (connectedTabs.length === 0) {
    noTabsMsg.classList.remove('hidden');
  } else {
    noTabsMsg.classList.add('hidden');
  }

  state.tabs.forEach(tab => {
    if (!tab.connected) return; // Only show connected tabs for now
    
    const isActive = state.activeMembers.includes(tab.id);
    const tabEl = document.createElement('div');
    tabEl.className = `
      flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all
      ${isActive 
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-sm' 
          : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'}
    `;
    
    tabEl.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 shadow-sm overflow-hidden p-1 border border-gray-100 dark:border-gray-700">
          <img src="${tab.iconSrc}" alt="${tab.name}" class="w-5 h-5 object-contain">
        </div>
        <div>
          <div class="font-medium text-sm">${tab.name}</div>
          <div class="text-xs text-emerald-600 dark:text-emerald-400">
            Ready
          </div>
        </div>
      </div>
      <div class="w-5 h-5 rounded-md flex items-center justify-center border ${
        isActive 
          ? 'bg-indigo-500 border-indigo-500 text-white' 
          : 'border-gray-300 dark:border-gray-600 text-transparent'
      }">
        <i data-lucide="check-square" class="w-3.5 h-3.5"></i>
      </div>
    `;
    
    tabEl.onclick = () => toggleMember(tab.id);
    tabsList.appendChild(tabEl);
  });
  
  refreshIcons();
}

function renderMessages() {
  chatHistory.innerHTML = '';

  // Show empty state when there are no human/AI messages yet
  const hasConversation = state.messages.some(m => m.senderType === 'human' || m.senderType === 'ai');
  if (!hasConversation) {
    chatHistory.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center px-6 gap-4 select-none">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center">
          <i data-lucide="sparkles" class="w-7 h-7 text-indigo-500"></i>
        </div>
        <div class="space-y-1">
          <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">No conversation yet</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-[220px]">Select AI agents from the sidebar and send a message to begin a multi-AI discussion.</p>
        </div>
        <button class="howto-open-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
          <i data-lucide="circle-help" class="w-3.5 h-3.5"></i>
          How to use
        </button>
      </div>
    `;
    refreshIcons();
    return;
  }

  state.messages.forEach(msg => {
    const isHuman = msg.senderType === 'human';
    const isSystem = msg.senderType === 'system';
    const senderTab = state.tabs.find(t => t.name === msg.sender);
    
    if (isSystem) {
      const sysEl = document.createElement('div');
      sysEl.className = "flex justify-center my-4";
      // Use textContent (not innerHTML) to avoid XSS from unexpected system message content
      const sysInner = document.createElement('div');
      sysInner.className = "bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 text-[11px] px-3 py-1 rounded-full font-medium border border-gray-200 dark:border-gray-700/50 text-center max-w-[80%]";
      sysInner.textContent = msg.text;
      sysEl.appendChild(sysInner);
      chatHistory.appendChild(sysEl);
      return;
    }

    const msgEl = document.createElement('div');
    msgEl.className = `flex gap-3 max-w-[90%] ${isHuman ? 'ml-auto flex-row-reverse' : 'mr-auto'}`;
    
    const avatarInner = isHuman
      ? '<i data-lucide="user" class="w-4 h-4"></i>'
      : (senderTab?.iconSrc
          ? `<img src="${senderTab.iconSrc}" alt="${msg.sender}" class="w-5 h-5 object-contain">`
          : '<i data-lucide="bot-message-square" class="w-4 h-4"></i>');

    const avatarClass = isHuman
      ? 'bg-indigo-600 text-white'
      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700';

    const bubbleContent = isHuman ? escHtml(msg.text) : parseMarkdown(msg.text);

    msgEl.innerHTML = `
      <div class="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm overflow-hidden p-1 ${avatarClass}">
        ${avatarInner}
      </div>
      <div class="flex flex-col ${isHuman ? 'items-end' : 'items-start'}">
        <div class="flex items-baseline gap-1.5 mb-1 px-1">
          <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">${msg.sender}</span>
          <span class="text-[9px] text-gray-400 dark:text-gray-500">${(() => { try { const d = new Date(msg.timestamp); return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } })()}</span>
        </div>
        <div class="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isHuman ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm'}">
          ${bubbleContent}
        </div>
      </div>
    `;
    chatHistory.appendChild(msgEl);
  });
  
  // Scroll to bottom
  chatHistory.scrollTop = chatHistory.scrollHeight;
  refreshIcons();
}

function renderControls() {
  controlsContainer.innerHTML = '';
  if (state.status === 'idle') {
    const startBtn = document.createElement('button');
    startBtn.className = "flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors shadow-sm";
    startBtn.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5"></i> Start';
    startBtn.onclick = handleStart;
    controlsContainer.appendChild(startBtn);
  } else {
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = `flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors shadow-sm ${state.status === 'paused' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'btn-amber'}`;
    playPauseBtn.innerHTML = state.status === 'paused' ? '<i data-lucide="play" class="w-3.5 h-3.5"></i>' : '<i data-lucide="pause" class="w-3.5 h-3.5"></i>';
    playPauseBtn.onclick = state.status === 'paused' ? () => setStatus('running') : handlePause;

    const stopBtn = document.createElement('button');
    stopBtn.className = "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors shadow-sm btn-red";
    stopBtn.innerHTML = '<i data-lucide="square" class="w-3.5 h-3.5"></i>';
    stopBtn.onclick = handleStop;
    
    controlsContainer.appendChild(playPauseBtn);
    controlsContainer.appendChild(stopBtn);
  }

  // "Open all AI tabs" button — always visible next to Start/Stop controls
  const openAllBtn = document.createElement('button');
  openAllBtn.className = "flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors shadow-sm";
  openAllBtn.innerHTML = '<i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>';
  openAllBtn.title = 'Open all 8 AI tabs';
  openAllBtn.onclick = openAllAITabs;
  controlsContainer.appendChild(openAllBtn);

  refreshIcons();
}

function updateStatusUI() {
  if (state.status === 'running') {
    statusPing.classList.remove('hidden');
    statusDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
  } else if (state.status === 'paused') {
    statusPing.classList.add('hidden');
    statusDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500';
  } else {
    statusPing.classList.add('hidden');
    statusDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-gray-400';
  }
}

function updateSidebarUI() {
  const isLandscape = state.isLandscape;
  const sidebarOpen = state.sidebarOpen;

  // Update sidebar classes
  sidebar.className = `
    ${isLandscape ? 'relative' : 'absolute top-0 left-0 bottom-0 z-30 shadow-2xl'}
    ${sidebarOpen ? (isLandscape ? 'w-80' : 'translate-x-0 w-[85%] max-w-[320px]') : (isLandscape ? 'w-0' : '-translate-x-full w-[85%] max-w-[320px]')} 
    flex-shrink-0 border-r border-gray-200 dark:border-gray-800 
    bg-gray-50 dark:bg-gray-900 transition-all duration-300 ease-in-out
    flex flex-col overflow-hidden
  `;

  // Update overlay
  if (!isLandscape && sidebarOpen) {
    sidebarOverlay.classList.remove('hidden');
  } else {
    sidebarOverlay.classList.add('hidden');
  }

  // Update close button visibility (only in portrait/mobile mode)
  if (!isLandscape) {
    closeSidebarBtn.classList.remove('hidden');
  } else {
    closeSidebarBtn.classList.add('hidden');
  }

  // Open button is always visible — it's the primary sidebar toggle in all layouts
  openSidebarBtn.classList.remove('hidden');
}

function updateTheme() {
  if (state.theme === 'dark') {
    document.documentElement.classList.add('dark');
    themeIcon.setAttribute('data-lucide', 'sun');
  } else {
    document.documentElement.classList.remove('dark');
    themeIcon.setAttribute('data-lucide', 'moon');
  }
  refreshIcons();
}

function updateModeUI() {
  const isFree = state.config.conversationMode === 'free';
  const debateBtn = document.getElementById('mode-debate-btn');
  const freeBtn = document.getElementById('mode-free-btn');
  const debateControls = document.getElementById('debate-controls');
  if (!debateBtn || !freeBtn) return;

  // Toggle active styles on the pills
  if (isFree) {
    freeBtn.className = 'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-500 text-white shadow-sm transition-all';
    debateBtn.className = 'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all';
  } else {
    debateBtn.className = 'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white shadow-sm transition-all';
    freeBtn.className = 'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all';
  }

  // Dim debate-only controls in free mode
  if (debateControls) {
    debateControls.style.opacity = isFree ? '0.4' : '1';
    debateControls.style.pointerEvents = isFree ? 'none' : '';
  }
}

// --- Storage Logic ---
function saveState() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ ai_workspace_state: state });
  }
}

// --- Tab Scanning ---
async function scanTabs() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;

  // Reset connections
  state.tabs.forEach(t => { t.connected = false; t.tabId = null; });

  // Use PLATFORMS config (platforms.js) — no hardcoded list needed here
  for (const platform of PLATFORMS) {
    for (const urlPattern of platform.urlPatterns) {
      const tabs = await chrome.tabs.query({ url: urlPattern });
      if (tabs && tabs.length > 0) {
        const tabObj = state.tabs.find(t => t.id === platform.id);
        if (tabObj && !tabObj.connected) {
          tabObj.connected = true;
          tabObj.tabId = tabs[0].id;
          break; // first matching URL pattern wins
        }
      }
    }
  }

  // Remove members that are no longer connected
  state.activeMembers = state.activeMembers.filter(id => state.tabs.find(t => t.id === id)?.connected);

  saveState();
  render();
}

// --- AI Interaction via Content Scripts ---
async function getAIResponse(member, userMessage, previousResponse = '', timeoutSecs = null) {
  if (!member.tabId) return "[System]: Tab not found.";

  const platform = PLATFORMS.find(p => p.id === member.id);
  if (!platform) return `[Error]: No platform config for ${member.name}.`;

  // Resolve effective timeout — caller can override (e.g. Free mode uses unlimited timeout)
  const effectiveTimeout = timeoutSecs ?? state.config.responseTimeout ?? 20;

  // Activate the AI tab — background tabs have throttled JS and may block DOM interactions
  try {
    await chrome.tabs.update(member.tabId, { active: true });
    await new Promise(r => setTimeout(r, 300)); // wait for focus
  } catch { /* proceed anyway if tab activation fails */ }

  return new Promise((resolve) => {
    chrome.scripting.executeScript({
      target: { tabId: member.tabId },
      func: interactWithAI,
      args: [member.id, userMessage, platform.selectors, effectiveTimeout, previousResponse]
    }, (results) => {
      if (chrome.runtime.lastError) {
        resolve(`[Error]: Could not communicate with ${member.name} tab.`);
        return;
      }
      resolve(results?.[0]?.result || `[Error]: No response from ${member.name}.`);
    });
  });
}

// This function runs in the context of the AI's web page (injected via executeScript)
// selectors: { input: string[], sendBtn: string[], response: string[] } — from platforms.js config
// previousResponse: the last known response text from this AI — used to detect when a NEW response has arrived
async function interactWithAI(platformId, message, selectors, responseTimeout, previousResponse) {
  return new Promise((resolve) => {
    try {
      // Find first available input element (send button is re-queried on each attempt inside attemptSend)
      const inputEl = selectors.input.map(s => document.querySelector(s)).find(el => el !== null);

      if (!inputEl) {
        return resolve("[Error]: Could not find input box on the page.");
      }

      // Insert text — React-compatible native value setter for controlled inputs
      if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(inputEl, message); else inputEl.value = message;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (inputEl.isContentEditable) {
        inputEl.focus();
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, message);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Click send after brief delay for frameworks to process input
      setTimeout(() => {
        // Re-query button on each attempt: React/ProseMirror may re-render and create new DOM nodes,
        // making the original sendBtnEl reference stale. Also check aria-disabled (used by Claude).
        const isBtnReady = (btn) => btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true';

        const attemptSend = (retries = 0) => {
          const btn = selectors.sendBtn.map(s => document.querySelector(s)).find(el => el !== null);
          if (isBtnReady(btn)) {
            btn.click();
          } else if (btn && retries < 20) {
            // Button found but disabled — wait for framework to enable it (100ms × 20 = 2s max)
            setTimeout(() => attemptSend(retries + 1), 100);
            return;
          } else {
            // No button found or still disabled after 2s — fall back to Enter key
            inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
          }

          // --- Response Polling (2-layer completion detection) ---
          //
          // Layer 1 – Stability: text must be unchanged for STABLE_REQUIRED consecutive
          //           intervals (default 3 × 500ms = 1.5s). This guards against brief
          //           mid-stream pauses that previously caused premature resolve.
          //
          // Layer 2 – Generating signal: if the platform exposes a stop/cancel button
          //           (selectors.generatingSignal), that element must be GONE before we
          //           resolve. It is only present while the AI is actively streaming.
          //
          // Timeout safety: if maxAttempts is exceeded we resolve anyway so the
          //           orchestrator is never stuck waiting forever.
          const POLL_INTERVAL_MS = 500;
          const STABLE_REQUIRED = 3; // consecutive stable ticks = 1.5s of no change
          const MIN_WAIT_TICKS = 8;  // first 4s (8×500ms): only accept genuinely new content (guards stale DOM)
          const maxAttempts = (responseTimeout || 20) * (1000 / POLL_INTERVAL_MS);
          let attempts = 0;
          let previousText = '';
          let stableCount = 0;
          const knownPrevious = (previousResponse || '').trim();
          const generatingSignals = (selectors.generatingSignal || []);

          /** Returns true while any generating-signal element is visible in DOM */
          const isStillGenerating = () => {
            for (const sel of generatingSignals) {
              try {
                const el = document.querySelector(sel);
                // offsetParent is null for hidden/display:none elements
                if (el && el.offsetParent !== null) return true;
              } catch { /* invalid selector — skip */ }
            }
            return false;
          };

          const checkResponse = setInterval(() => {
            attempts++;
            let responseText = '';
            for (const sel of selectors.response) {
              const els = document.querySelectorAll(sel);
              if (els.length > 0) { responseText = els[els.length - 1].innerText; break; }
            }

            // Track consecutive stable ticks
            if (responseText && responseText === previousText) {
              stableCount++;
            } else {
              stableCount = 0; // text changed or empty — reset counter
            }
            previousText = responseText;

            const isTextStable = stableCount >= STABLE_REQUIRED;
            const isNewContent = attempts <= MIN_WAIT_TICKS
              ? (!knownPrevious || responseText.trim() !== knownPrevious) // strict in first 4s: avoid stale DOM
              : true; // after 4s, accept any stable response (AI may legitimately give same answer)
            const generatingDone = !isStillGenerating();

            if (isTextStable && isNewContent && generatingDone) {
              clearInterval(checkResponse);
              resolve(responseText);
            } else if (attempts > maxAttempts) {
              clearInterval(checkResponse);
              // Timeout — return best available response rather than hanging forever
              resolve(responseText || `[Error]: No response received from ${platformId}.`);
            }
          }, POLL_INTERVAL_MS);
        };

        attemptSend();
      }, 500);

    } catch (err) {
      resolve(`[Error]: ${err.message}`);
    }
  });
}

// --- Orchestration Logic ---
let currentRound = 0;
let orchestratorActive = false;

async function runOrchestrator() {
  if (orchestratorActive) return; // prevent concurrent invocation (e.g. double-click Start)
  if (state.activeMembers.length === 0) return;

  orchestratorActive = true;
  currentRound = 0;
  setStatus('running');

  // currentRound (incremented once per full while-loop iteration) drives debate→consensus
  // transition. Using it directly instead of a separate debateTurn counter ensures the
  // threshold matches the UI label regardless of how many AIs are active.
  const isFreeMode = state.config.conversationMode === 'free';

  // Free mode: no round limit — runs indefinitely until user stops it
  // Debate mode: bounded by maxRounds
  const roundLimit = isFreeMode ? Infinity : state.config.maxRounds;

  while (orchestratorActive && currentRound < roundLimit) {
    for (const memberId of state.activeMembers) {
      if (!orchestratorActive) break;

      const member = state.tabs.find(t => t.id === memberId);
      if (!member || !member.connected) continue;

      // --- Build per-AI context (robust for 2–8 AIs) ---
      //
      // Design rationale:
      //   • We collect the last MSGS_PER_AI messages from each OTHER active AI
      //     (not just 1) so the receiving AI sees the PROGRESSION of each opponent's
      //     argument, not only their most recent snapshot.
      //   • Using per-AI slicing (not a global slice) GUARANTEES that every active AI
      //     is represented even if one AI responded much earlier than others.
      //   • Messages are then sorted chronologically so the context reads naturally
      //     as a conversation thread.
      //   • Edge cases handled:
      //       - AI hasn't spoken yet → no messages for that AI → skipped gracefully
      //       - Tab not found (disconnected) → skipped gracefully
      //       - 1 message if AI has only spoken once (slice(-2) degrades to slice(-1))
      //       - Works identically for 2 AIs (1 M×2 = 2 msgs) or 8 AIs (7×2 = 14 msgs)
      const MSGS_PER_AI = 2; // last N messages per other AI — balances context vs. length
      const otherAiMsgs = state.activeMembers
        .filter(id => id !== member.id)
        .flatMap(id => {
          const tab = state.tabs.find(t => t.id === id);
          if (!tab) return []; // tab disconnected — skip silently
          return state.messages
            .filter(m => m.senderType === 'ai' && m.sender === tab.name)
            .slice(-MSGS_PER_AI); // last MSGS_PER_AI from this specific AI
        })
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // chronological order

      let context;
      let prompt;

      // Always anchor subsequent rounds with the original question so AIs never lose context.
      // We use the most recent human message as the "topic" line.
      const latestHumanMsg = [...state.messages].reverse().find(m => m.senderType === 'human');
      const topicLine = latestHumanMsg ? `[Topic] ${latestHumanMsg.sender}: ${latestHumanMsg.text}` : '';

      if (isFreeMode) {
        // Free mode — Debate Instruction applies, but no word limit, no consensus, no round tracking
        if (otherAiMsgs.length === 0) {
          // First turn: use recent messages as context; exclude system messages
          context = state.messages
            .filter(m => m.sender !== member.name && m.senderType !== 'system')
            .slice(-5)
            .map(m => `${m.sender}: ${m.text}`)
            .join('\n');
          prompt = `Context:\n${context}`;
        } else {
          // Include topic anchor + last response from each other AI
          const othersContext = otherAiMsgs.map(m => `${m.sender}: ${m.text}`).join('\n\n---\n\n');
          context = [topicLine, othersContext].filter(Boolean).join('\n\n---\n\n');
          prompt = `Context:\n${context}\n\n[Instruction: ${state.config.debateInstruction}]`;
        }
      } else {
        // Debate mode — apply instructions and word limit
        if (otherAiMsgs.length === 0) {
          // First round — no other AI has responded yet; use recent messages as context
          // Exclude system messages to avoid polluting the AI's context with UI notifications
          context = state.messages
            .filter(m => m.sender !== member.name && m.senderType !== 'system')
            .slice(-5)
            .map(m => `${m.sender}: ${m.text}`)
            .join('\n');
        } else {
          // Debate/consensus turn — currentRound tracks which phase we're in.
          // 1 round = all active members have responded once, so threshold is stable
          // regardless of how many AIs are participating.
          const instruction = currentRound < state.config.maxDebateTurns
            ? state.config.debateInstruction
            : state.config.consensusInstruction;
          // Include topic anchor + last response from each other AI
          const othersContext = otherAiMsgs.map(m => `${m.sender}: ${m.text}`).join('\n\n---\n\n');
          const fullContext = [topicLine, othersContext].filter(Boolean).join('\n\n---\n\n');
          context = `[Instruction: ${instruction}]\n\n${fullContext}`;
        }
        prompt = `Context:\n${context}\n\nRespond as ${member.name}. Keep response under ${state.config.maxLength} words.`;

      }

      // Waiting pill injected directly into DOM — bypasses state.messages, saveState(), and render()
      // This is both safer (no pop() needed) and more efficient (O(1) vs O(n) full re-render)
      const waitingPillEl = document.createElement('div');
      waitingPillEl.className = 'flex justify-center my-4';
      const waitingInner = document.createElement('div');
      waitingInner.className = 'bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 text-[11px] px-3 py-1 rounded-full font-medium border border-gray-200 dark:border-gray-700/50 text-center max-w-[80%]';
      waitingPillEl.appendChild(waitingInner);
      chatHistory.appendChild(waitingPillEl);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      // Countdown — update only the waiting pill text; no re-render needed
      // Free mode has no meaningful timeout, so show a neutral label
      if (isFreeMode) {
        waitingInner.textContent = `Waiting for ${member.name}...`;
      } else {
        let remaining = state.config.responseTimeout;
        waitingInner.textContent = `Waiting for ${member.name}... ${remaining}s`;
        const countdownInterval = setInterval(() => {
          remaining--;
          waitingInner.textContent = remaining > 0
            ? `Waiting for ${member.name}... ${remaining}s`
            : `Waiting for ${member.name}... timing out`;
        }, 1000);
        // Store ref for cleanup after getAIResponse
        waitingPillEl._countdownInterval = countdownInterval;
      }

      // Capture the last known response from this AI BEFORE calling, so interactWithAI
      // can detect when a genuinely NEW response has been generated (prevents resolving with stale DOM content)
      const prevAiMsg = [...state.messages].reverse().find(m => m.senderType === 'ai' && m.sender === member.name);
      const previousResponse = prevAiMsg?.text || '';

      const responseText = await getAIResponse(
        member, prompt, previousResponse,
        isFreeMode ? 999999 : state.config.responseTimeout // Free mode = no timeout
      );
      if (waitingPillEl._countdownInterval) clearInterval(waitingPillEl._countdownInterval);

      // Remove the waiting pill safely via direct DOM removal — no state mutation, no pop()
      waitingPillEl.remove();

      if (!orchestratorActive) {
        render();
        break;
      }

      addMessage(member.name, 'ai', responseText);

      // Delay between turns (0.5s)
      await new Promise(r => setTimeout(r, 500));
    }
    currentRound++;
  }
  
  // Only Debate mode auto-pauses after reaching maxRounds
  // Free mode runs until user manually stops it
  if (orchestratorActive && !isFreeMode) {
    addMessage('System', 'system', `Reached maximum rounds (${state.config.maxRounds}). Discussion paused.`);
    setStatus('paused');
  }
  orchestratorActive = false;
}

// --- Actions ---
function toggleMember(id) {
  if (state.activeMembers.includes(id)) {
    state.activeMembers = state.activeMembers.filter(m => m !== id);
  } else {
    state.activeMembers.push(id);
  }
  saveState();
  render();
}

function setStatus(status) {
  state.status = status;
  render();
}

function handleStart() {
  if (state.activeMembers.length < 1) {
    alert("Please select at least 1 AI member to start a discussion.");
    return;
  }
  
  runOrchestrator();
}

function handlePause() {
  orchestratorActive = false;
  setStatus('paused');
  addMessage('System', 'system', 'Discussion paused.');
}

function handleStop() {
  orchestratorActive = false;
  setStatus('idle');
  addMessage('System', 'system', 'Discussion ended.');
}

// --- Open All AI Tabs ---
// Opens all 8 supported AI platforms in background tabs, then re-scans to detect them.
const AI_TAB_URLS = [
  'https://chatgpt.com/',
  'https://claude.ai/new',
  'https://gemini.google.com/app',
  'https://grok.com/',
  'https://www.perplexity.ai/',
  'https://chat.deepseek.com/',
  'https://chat.qwen.ai/',
  'https://www.kimi.com/',
];

async function openAllAITabs() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;
  // Open all tabs in background (active: false) so focus stays on extension panel
  for (const url of AI_TAB_URLS) {
    await chrome.tabs.create({ url, active: false });
  }
  // Auto-scan after a short delay to let tabs initialize
  setTimeout(() => scanTabs(), 1500);
}

function handleClear() {
  if (confirm('Are you sure you want to clear the conversation?')) {
    orchestratorActive = false; // stop any in-flight orchestrator loop before clearing
    state.messages = [{
      id: Date.now().toString(),
      sender: 'System',
      senderType: 'system',
      text: 'Conversation cleared.',
      timestamp: new Date()
    }];
    state.status = 'idle';
    saveState();
    render();
  }
}

function addMessage(sender, senderType, text) {
  state.messages.push({
    id: Date.now().toString(),
    sender,
    senderType,
    text,
    timestamp: Date.now()   // store as ms number — JSON-safe, avoids Invalid Date on reload
  });
  saveState();
  render();
}

async function handleSendMessage(e) {
  e?.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  
  addMessage('You', 'human', text);
  chatInput.value = '';
  sendButton.disabled = true;
  
  // If running, the orchestrator will pick it up on the next turn.
  // If idle, start the orchestrator with this message.
  if (state.status === 'idle' && state.activeMembers.length > 0) {
    runOrchestrator();
  }

  // Reflect cleared input state: input was just cleared so button should be disabled
  // until user types again (oninput event will re-enable when there's content)
  sendButton.disabled = !chatInput.value.trim();
}

// --- Event Listeners ---
function setupEventListeners() {
  chatInput.oninput = () => {
    sendButton.disabled = !chatInput.value.trim();
  };
  
  chatInput.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  chatForm.onsubmit = handleSendMessage;
  
  toggleThemeBtn.onclick = () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    updateTheme();
    saveState();
  };
  
  clearChatBtn.onclick = handleClear;
  
  openSidebarBtn.onclick = () => {
    state.sidebarOpen = true;
    updateSidebarUI();
  };
  
  closeSidebarBtn.onclick = () => {
    state.sidebarOpen = false;
    updateSidebarUI();
  };
  
  sidebarOverlay.onclick = () => {
    state.sidebarOpen = false;
    updateSidebarUI();
  };
  
  maxLengthSlider.oninput = (e) => {
    state.config.maxLength = parseInt(e.target.value);
    maxLengthValue.textContent = state.config.maxLength;
  };
  
  maxLengthSlider.onchange = () => {
    saveState();
  };

  maxRoundsSlider.oninput = (e) => {
    state.config.maxRounds = parseInt(e.target.value);
    maxRoundsValue.textContent = state.config.maxRounds;
  };
  maxRoundsSlider.onchange = () => { saveState(); };

  responseTimeoutSlider.oninput = (e) => {
    state.config.responseTimeout = parseInt(e.target.value);
    responseTimeoutValue.textContent = state.config.responseTimeout;
  };
  responseTimeoutSlider.onchange = () => { saveState(); };

  maxDebateTurnsSlider.oninput = (e) => {
    state.config.maxDebateTurns = parseInt(e.target.value);
    maxDebateTurnsValue.textContent = state.config.maxDebateTurns;
  };
  maxDebateTurnsSlider.onchange = () => { saveState(); };

  debateInstructionInput.onchange = (e) => {
    state.config.debateInstruction = e.target.value;
    saveState();
  };

  consensusInstructionInput.onchange = (e) => {
    state.config.consensusInstruction = e.target.value;
    saveState();
  };

  if (scanTabsBtn) {
    scanTabsBtn.onclick = async () => {
      scanTabsBtn.disabled = true;
      scanTabsBtn.classList.add('scanning');
      await scanTabs();
      scanTabsBtn.classList.remove('scanning');
      scanTabsBtn.disabled = false;
    };
  }

  // Mode toggle buttons
  const debateModeBtn = document.getElementById('mode-debate-btn');
  const freeModeBtn = document.getElementById('mode-free-btn');
  if (debateModeBtn) {
    debateModeBtn.onclick = () => {
      state.config.conversationMode = 'debate';
      updateModeUI();
      saveState();
    };
  }
  if (freeModeBtn) {
    freeModeBtn.onclick = () => {
      state.config.conversationMode = 'free';
      updateModeUI();
      saveState();
    };
  }

  // How to Use modal open/close
  const openHowTo = () => { howtoModal.classList.remove('hidden'); refreshIcons(); };
  const closeHowTo = () => howtoModal.classList.add('hidden');
  howtoBtn.onclick = openHowTo;
  howtoClose.onclick = closeHowTo;
  howtoGotIt.onclick = closeHowTo;
  howtoOverlay.onclick = closeHowTo;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeHowTo(); });

  // Delegated clicks inside chat history (copy button + how-to button in empty state)
  chatHistory.addEventListener('click', e => {
    if (e.target.closest('.howto-open-btn')) { openHowTo(); return; }
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;
    const codeEl = btn.closest('.code-block')?.querySelector('pre > code');
    if (!codeEl) return;
    const text = codeEl.textContent || '';
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }).catch(() => {
      // Fallback for environments without Clipboard API
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* silent */ }
      document.body.removeChild(ta);
    });
  });

  window.onresize = () => {
    const landscape = window.innerWidth > window.innerHeight;
    if (landscape !== state.isLandscape) {
      state.isLandscape = landscape;
      state.sidebarOpen = landscape;
      updateSidebarUI();
    }
  };
}

// --- Start App ---
init();
