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
