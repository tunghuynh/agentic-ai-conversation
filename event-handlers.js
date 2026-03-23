// --- Event Handlers ---
// All user interactions: button clicks, slider changes, form submissions, keyboard shortcuts.

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

  // --- Save & Download Chat ---
  const saveChatBtn = document.getElementById('save-chat-btn');
  if (saveChatBtn) {
    saveChatBtn.onclick = () => {
      const humanMsgs = state.messages.filter(m => m.senderType === 'human');
      if (humanMsgs.length === 0) return;
      const title = humanMsgs[0]?.text?.slice(0, 60) || 'conversation';
      const md = ChatHistoryManager.toMarkdown(state.messages, title);
      const safeTitle = title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, '').trim().replace(/\s+/g, '-').slice(0, 40);
      ChatHistoryManager.downloadMarkdown(md, `${safeTitle || 'conversation'}.md`);
    };
  }

  // --- Conversation History ---
  setupHistoryEvents();

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

  // --- Slider Controls ---
  maxLengthSlider.oninput = (e) => {
    state.config.maxLength = parseInt(e.target.value);
    maxLengthValue.textContent = state.config.maxLength;
  };
  maxLengthSlider.onchange = () => { saveState(); };

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

  // --- Scan Tabs Button ---
  if (scanTabsBtn) {
    scanTabsBtn.onclick = async () => {
      scanTabsBtn.disabled = true;
      scanTabsBtn.classList.add('scanning');
      await scanTabs();
      scanTabsBtn.classList.remove('scanning');
      scanTabsBtn.disabled = false;
    };
  }

  // --- Mode Toggle ---
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

  // --- How to Use Modal ---
  const openHowTo = () => { howtoModal.classList.remove('hidden'); refreshIcons(); };
  const closeHowTo = () => howtoModal.classList.add('hidden');
  howtoBtn.onclick = openHowTo;
  howtoClose.onclick = closeHowTo;
  howtoGotIt.onclick = closeHowTo;
  howtoOverlay.onclick = closeHowTo;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeHowTo(); });

  // --- Delegated Chat Clicks (copy button + how-to in empty state) ---
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

  // --- Responsive Layout ---
  window.onresize = () => {
    const landscape = window.innerWidth > window.innerHeight;
    if (landscape !== state.isLandscape) {
      state.isLandscape = landscape;
      state.sidebarOpen = landscape;
      updateSidebarUI();
    }
  };

  // --- Custom Platform Modal ---
  setupCustomPlatformEvents();
}

// --- Custom Platform CRUD Events ---
function setupCustomPlatformEvents() {
  const modal = document.getElementById('platform-modal');
  const modalTitle = document.getElementById('platform-modal-title');
  const overlay = document.getElementById('platform-modal-overlay');
  const closeBtn = document.getElementById('platform-modal-close');
  const cancelBtn = document.getElementById('platform-modal-cancel');
  const saveBtn = document.getElementById('platform-modal-save');
  const addBtn = document.getElementById('add-platform-btn');
  const listEl = document.getElementById('custom-platforms-list');

  const openModal = (editMode = false) => {
    modalTitle.innerHTML = editMode
      ? '<i data-lucide="pencil" class="w-5 h-5 text-emerald-500"></i> Edit Custom Platform'
      : '<i data-lucide="puzzle" class="w-5 h-5 text-emerald-500"></i> Add Custom Platform';
    document.getElementById('pf-id').disabled = editMode;
    modal.classList.remove('hidden');
    refreshIcons();
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    document.getElementById('platform-form').reset();
    document.getElementById('pf-edit-id').value = '';
    document.getElementById('pf-id').disabled = false;
  };

  const splitSelectors = (str) => str.split(',').map(s => s.trim()).filter(Boolean);

  if (addBtn) addBtn.onclick = () => openModal(false);
  if (closeBtn) closeBtn.onclick = closeModal;
  if (cancelBtn) cancelBtn.onclick = closeModal;
  if (overlay) overlay.onclick = closeModal;

  // Reset to default platforms
  const resetBtn = document.getElementById('reset-platforms-btn');
  if (resetBtn) {
    resetBtn.onclick = async () => {
      if (!confirm('Remove all custom platforms and reset to defaults?')) return;
      await PlatformConfigManager.resetToDefault();
      await renderCustomPlatforms();
      await scanTabs();
    };
  }

  // Edit / Delete delegated clicks
  if (listEl) {
    listEl.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.edit-platform-btn');
      const deleteBtn = e.target.closest('.delete-platform-btn');

      if (editBtn) {
        const id = editBtn.dataset.id;
        const customs = await PlatformConfigManager.getCustom();
        const p = customs.find(c => c.id === id);
        if (!p) return;
        document.getElementById('pf-edit-id').value = p.id;
        document.getElementById('pf-id').value = p.id;
        document.getElementById('pf-name').value = p.name;
        document.getElementById('pf-url').value = p.urlPatterns.join(', ');
        document.getElementById('pf-icon').value = p.iconSrc || '';
        document.getElementById('pf-input').value = (p.selectors.input || []).join(', ');
        document.getElementById('pf-send').value = (p.selectors.sendBtn || []).join(', ');
        document.getElementById('pf-response').value = (p.selectors.response || []).join(', ');
        document.getElementById('pf-signal').value = (p.selectors.generatingSignal || []).join(', ');
        openModal(true);
      }

      if (deleteBtn) {
        const id = deleteBtn.dataset.id;
        if (!confirm(`Remove custom platform "${id}"?`)) return;
        try {
          await PlatformConfigManager.remove(id);
          await renderCustomPlatforms();
          await scanTabs();
        } catch (err) { alert(err.message); }
      }
    });
  }

  // Save
  if (saveBtn) {
    saveBtn.onclick = async () => {
      const editId = document.getElementById('pf-edit-id').value;
      const platform = {
        id: document.getElementById('pf-id').value.trim().toLowerCase().replace(/\s+/g, '-'),
        name: document.getElementById('pf-name').value.trim(),
        iconSrc: document.getElementById('pf-icon').value.trim(),
        urlPatterns: splitSelectors(document.getElementById('pf-url').value),
        selectors: {
          input: splitSelectors(document.getElementById('pf-input').value),
          sendBtn: splitSelectors(document.getElementById('pf-send').value),
          response: splitSelectors(document.getElementById('pf-response').value),
          generatingSignal: splitSelectors(document.getElementById('pf-signal').value),
        },
      };

      try {
        if (editId) {
          await PlatformConfigManager.update(editId, platform);
        } else {
          await PlatformConfigManager.add(platform);
        }
        closeModal();
        await renderCustomPlatforms();
        await scanTabs();
      } catch (err) {
        alert(err.message);
      }
    };
  }
}

// --- Conversation History Events ---
function setupHistoryEvents() {
  const historyBtn = document.getElementById('history-btn');
  const historyModal = document.getElementById('history-modal');
  const historyClose = document.getElementById('history-close');
  const historyOverlay = document.getElementById('history-overlay');
  const historyList = document.getElementById('history-list');
  const historyEmpty = document.getElementById('history-empty');

  const closeHistory = () => historyModal.classList.add('hidden');

  const openHistory = async () => {
    historyModal.classList.remove('hidden');
    const conversations = await ChatHistoryManager.listConversations();
    historyList.innerHTML = '';

    if (conversations.length === 0) {
      historyEmpty.classList.remove('hidden');
      historyList.classList.add('hidden');
    } else {
      historyEmpty.classList.add('hidden');
      historyList.classList.remove('hidden');

      for (const conv of conversations) {
        const el = document.createElement('div');
        el.className = 'flex items-center justify-between p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors cursor-pointer';
        const date = new Date(conv.createdAt);
        const dateStr = isNaN(date) ? '' : date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        el.innerHTML = `
          <div class="min-w-0 flex-1">
            <div class="text-xs font-medium truncate">${escHtml(conv.title)}</div>
            <div class="text-[10px] text-gray-400 mt-0.5">${dateStr} · ${conv.messageCount} messages</div>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0 ml-2">
            <button class="history-load-btn p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500" data-id="${conv.id}" title="Load">
              <i data-lucide="upload" class="w-3.5 h-3.5"></i>
            </button>
            <button class="history-delete-btn p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500" data-id="${conv.id}" title="Delete">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `;
        historyList.appendChild(el);
      }
    }
    refreshIcons();
  };

  if (historyBtn) historyBtn.onclick = openHistory;
  if (historyClose) historyClose.onclick = closeHistory;
  if (historyOverlay) historyOverlay.onclick = closeHistory;

  // Delegated clicks for load / delete
  if (historyList) {
    historyList.addEventListener('click', async (e) => {
      const loadBtn = e.target.closest('.history-load-btn');
      const deleteBtn = e.target.closest('.history-delete-btn');

      if (loadBtn) {
        const conv = await ChatHistoryManager.loadConversation(loadBtn.dataset.id);
        if (!conv) return;
        // Save current conversation before loading
        const hasContent = state.messages.some(m => m.senderType === 'human' || m.senderType === 'ai');
        if (hasContent) {
          await ChatHistoryManager.saveConversation(state.messages);
        }
        orchestratorActive = false;
        state.messages = conv.messages;
        state.status = 'idle';
        saveState();
        render();
        closeHistory();
      }

      if (deleteBtn) {
        if (!confirm('Delete this conversation?')) return;
        await ChatHistoryManager.deleteConversation(deleteBtn.dataset.id);
        openHistory(); // refresh list
      }
    });
  }
}

