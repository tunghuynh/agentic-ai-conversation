// --- UI Rendering ---
// Handles all DOM rendering: tabs list, chat messages, control buttons, status indicators, sidebar.

function refreshIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// --- Render Logic ---
// Markdown parsing is in markdown-parser.js (escHtml, parseMarkdown, renderMathBlock, etc.)
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
    // Generate platform names dynamically from all registered platforms
    const names = PlatformConfigManager.getAll().map(p => p.name);
    const nameList = names.length > 1
      ? names.slice(0, -1).join(', ') + ', or ' + names[names.length - 1]
      : names[0] || 'a supported AI';
    noTabsMsg.innerHTML = `No supported AI tabs found.<br>Open ${nameList} in your browser.`;
    noTabsMsg.classList.remove('hidden');
  } else {
    noTabsMsg.classList.add('hidden');
  }

  state.tabs.forEach(tab => {
    if (!tab.connected) return; // Only show connected tabs

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
      // Use textContent (not innerHTML) to avoid XSS from system message content
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

  // "Open all AI tabs" button
  const openAllBtn = document.createElement('button');
  openAllBtn.className = "flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-colors shadow-sm";
  openAllBtn.innerHTML = '<i data-lucide="layout-grid" class="w-3.5 h-3.5"></i>';
  const platformCount = PlatformConfigManager.getAll().length;
  openAllBtn.title = `Open all ${platformCount} AI tabs`;
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

  sidebar.className = `
    ${isLandscape ? 'relative' : 'absolute top-0 left-0 bottom-0 z-30 shadow-2xl'}
    ${sidebarOpen ? (isLandscape ? 'w-80' : 'translate-x-0 w-[85%] max-w-[320px]') : (isLandscape ? 'w-0' : '-translate-x-full w-[85%] max-w-[320px]')}
    flex-shrink-0 border-r border-gray-200 dark:border-gray-800
    bg-gray-50 dark:bg-gray-900 transition-all duration-300 ease-in-out
    flex flex-col overflow-hidden
  `;

  if (!isLandscape && sidebarOpen) {
    sidebarOverlay.classList.remove('hidden');
  } else {
    sidebarOverlay.classList.add('hidden');
  }

  if (!isLandscape) {
    closeSidebarBtn.classList.remove('hidden');
  } else {
    closeSidebarBtn.classList.add('hidden');
  }

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

  if (isFree) {
    freeBtn.className = 'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-500 text-white shadow-sm transition-all';
    debateBtn.className = 'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all';
  } else {
    debateBtn.className = 'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white shadow-sm transition-all';
    freeBtn.className = 'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all';
  }

  if (debateControls) {
    debateControls.style.opacity = isFree ? '0.4' : '1';
    debateControls.style.pointerEvents = isFree ? 'none' : '';
  }
}

// --- Configured Platforms UI ---
// Shows ALL platforms (defaults + user-added) — all are editable/removable.
function renderCustomPlatforms() {
  const listEl = document.getElementById('custom-platforms-list');
  const noMsg = document.getElementById('no-custom-msg');
  if (!listEl) return;

  const platforms = PlatformConfigManager.getAll();
  listEl.innerHTML = '';

  if (platforms.length === 0) {
    noMsg?.classList.remove('hidden');
  } else {
    noMsg?.classList.add('hidden');
  }

  platforms.forEach(p => {
    const el = document.createElement('div');
    el.className = 'flex items-center justify-between p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900';
    el.innerHTML = `
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-6 h-6 rounded flex items-center justify-center bg-gray-100 dark:bg-gray-800 overflow-hidden flex-shrink-0">
          ${p.iconSrc ? `<img src="${p.iconSrc}" alt="${p.name}" class="w-4 h-4 object-contain">` : `<i data-lucide="bot" class="w-3.5 h-3.5 text-gray-400"></i>`}
        </div>
        <div class="min-w-0">
          <div class="text-xs font-medium truncate">${p.name}</div>
          <div class="text-[10px] text-gray-400 truncate">${p.urlPatterns[0]}</div>
        </div>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <button class="edit-platform-btn p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-id="${p.id}">
          <i data-lucide="pencil" class="w-3 h-3"></i>
        </button>
        <button class="delete-platform-btn p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500" data-id="${p.id}">
          <i data-lucide="trash-2" class="w-3 h-3"></i>
        </button>
      </div>
    `;
    listEl.appendChild(el);
  });

  refreshIcons();
}
