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

// --- Storage ---
function saveState() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ ai_workspace_state: state });
  }
}

// --- Tab Scanning ---
async function scanTabs() {
  if (typeof chrome === 'undefined' || !chrome.tabs) return;

  state.tabs.forEach(t => { t.connected = false; t.tabId = null; });

  for (const platform of PLATFORMS) {
    for (const urlPattern of platform.urlPatterns) {
      const tabs = await chrome.tabs.query({ url: urlPattern });
      if (tabs && tabs.length > 0) {
        const tabObj = state.tabs.find(t => t.id === platform.id);
        if (tabObj && !tabObj.connected) {
          tabObj.connected = true;
          tabObj.tabId = tabs[0].id;
          break;
        }
      }
    }
  }

  state.activeMembers = state.activeMembers.filter(id => state.tabs.find(t => t.id === id)?.connected);
  saveState();
  render();
}

// --- AI Interaction via Content Scripts ---
async function getAIResponse(member, userMessage, previousResponse = '', timeoutSecs = null) {
  if (!member.tabId) return "[System]: Tab not found.";

  const platform = PLATFORMS.find(p => p.id === member.id);
  if (!platform) return `[Error]: No platform config for ${member.name}.`;

  const effectiveTimeout = timeoutSecs ?? state.config.responseTimeout ?? 20;

  // Activate AI tab — background tabs have throttled JS
  try {
    await chrome.tabs.update(member.tabId, { active: true });
    await new Promise(r => setTimeout(r, 300));
  } catch { /* proceed anyway */ }

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

// Injected into AI web page via executeScript
async function interactWithAI(platformId, message, selectors, responseTimeout, previousResponse) {
  return new Promise((resolve) => {
    try {
      const inputEl = selectors.input.map(s => document.querySelector(s)).find(el => el !== null);
      if (!inputEl) return resolve("[Error]: Could not find input box on the page.");

      // Insert text — React-compatible native value setter
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
        const isBtnReady = (btn) => btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true';

        const attemptSend = (retries = 0) => {
          const btn = selectors.sendBtn.map(s => document.querySelector(s)).find(el => el !== null);
          if (isBtnReady(btn)) {
            btn.click();
          } else if (btn && retries < 20) {
            setTimeout(() => attemptSend(retries + 1), 100);
            return;
          } else {
            inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
          }

          // --- Response Polling (2-layer completion detection) ---
          const POLL_INTERVAL_MS = 500;
          const STABLE_REQUIRED = 3;
          const MIN_WAIT_TICKS = 8;
          const maxAttempts = (responseTimeout || 20) * (1000 / POLL_INTERVAL_MS);
          let attempts = 0;
          let previousText = '';
          let stableCount = 0;
          const knownPrevious = (previousResponse || '').trim();
          const generatingSignals = (selectors.generatingSignal || []);

          const isStillGenerating = () => {
            for (const sel of generatingSignals) {
              try {
                const el = document.querySelector(sel);
                if (el && el.offsetParent !== null) return true;
              } catch { /* skip */ }
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

            if (responseText && responseText === previousText) {
              stableCount++;
            } else {
              stableCount = 0;
            }
            previousText = responseText;

            const isTextStable = stableCount >= STABLE_REQUIRED;
            const isNewContent = attempts <= MIN_WAIT_TICKS
              ? (!knownPrevious || responseText.trim() !== knownPrevious)
              : true;
            const generatingDone = !isStillGenerating();

            if (isTextStable && isNewContent && generatingDone) {
              clearInterval(checkResponse);
              resolve(responseText);
            } else if (attempts > maxAttempts) {
              clearInterval(checkResponse);
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
  for (const url of AI_TAB_URLS) {
    await chrome.tabs.create({ url, active: false });
  }
  setTimeout(() => scanTabs(), 1500);
}

function handleClear() {
  if (confirm('Are you sure you want to clear the conversation?')) {
    orchestratorActive = false;
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
    timestamp: Date.now()
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

  if (state.status === 'idle' && state.activeMembers.length > 0) {
    runOrchestrator();
  }

  sendButton.disabled = !chatInput.value.trim();
}

// --- Initialization ---
async function init() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    const data = await chrome.storage.local.get(['ai_workspace_state']);
    if (data.ai_workspace_state) {
      const savedState = data.ai_workspace_state;
      state.theme = savedState.theme || state.theme;
      state.activeMembers = savedState.activeMembers || state.activeMembers;
      state.config = { ...state.config, ...savedState.config };
      state.messages = (savedState.messages || state.messages).map(m => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    }
  }

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
  refreshIcons();
}

// --- Start App ---
init();
