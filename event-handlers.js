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
}
