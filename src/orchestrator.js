// --- Orchestrator ---
// Core conversation loop: manages AI turn-taking, context building, and mode logic.

// Maximum timeout for Free mode (1 hour = 3600 seconds)
const FREE_MODE_TIMEOUT_SECS = 3600;

let currentRound = 0;
let orchestratorActive = false;

async function runOrchestrator() {
  if (orchestratorActive) return; // prevent concurrent invocation
  if (state.activeMembers.length === 0) return;

  orchestratorActive = true;
  currentRound = 0;
  setStatus('running');

  const isFreeMode = state.config.conversationMode === 'free';

  // Free mode: no round limit — runs until user stops
  // Debate mode: bounded by maxRounds
  const roundLimit = isFreeMode ? Infinity : state.config.maxRounds;

  while (orchestratorActive && currentRound < roundLimit) {
    for (const memberId of state.activeMembers) {
      if (!orchestratorActive) break;

      const member = state.tabs.find(t => t.id === memberId);
      if (!member || !member.connected) continue;

      const prompt = buildPromptForMember(member, isFreeMode);
      const waitingPillEl = showWaitingPill(member, isFreeMode);

      // Capture last known response from this AI to detect genuinely new responses
      const prevAiMsg = [...state.messages].reverse().find(m => m.senderType === 'ai' && m.sender === member.name);
      const previousResponse = prevAiMsg?.text || '';

      const effectiveTimeout = isFreeMode ? FREE_MODE_TIMEOUT_SECS : state.config.responseTimeout;
      const responseText = await getAIResponse(member, prompt, previousResponse, effectiveTimeout);

      if (waitingPillEl._countdownInterval) clearInterval(waitingPillEl._countdownInterval);
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
  if (orchestratorActive && !isFreeMode) {
    addMessage('System', 'system', `Reached maximum rounds (${state.config.maxRounds}). Discussion paused.`);
    setStatus('paused');
  }
  orchestratorActive = false;
}

// --- Context & Prompt Building ---
// Builds the prompt sent to each AI member based on conversation history and mode.
function buildPromptForMember(member, isFreeMode) {
  // Collect last N messages from each OTHER active AI for context
  const MSGS_PER_AI = 2;
  const otherAiMsgs = state.activeMembers
    .filter(id => id !== member.id)
    .flatMap(id => {
      const tab = state.tabs.find(t => t.id === id);
      if (!tab) return [];
      return state.messages
        .filter(m => m.senderType === 'ai' && m.sender === tab.name)
        .slice(-MSGS_PER_AI);
    })
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Anchor with original question so AIs never lose context
  const latestHumanMsg = [...state.messages].reverse().find(m => m.senderType === 'human');
  const topicLine = latestHumanMsg ? `[Topic] ${latestHumanMsg.sender}: ${latestHumanMsg.text}` : '';

  if (isFreeMode) {
    return buildFreePrompt(member, otherAiMsgs, topicLine);
  }
  return buildDebatePrompt(member, otherAiMsgs, topicLine);
}

function buildFreePrompt(member, otherAiMsgs, topicLine) {
  if (otherAiMsgs.length === 0) {
    const context = state.messages
      .filter(m => m.sender !== member.name && m.senderType !== 'system')
      .slice(-5)
      .map(m => `${m.sender}: ${m.text}`)
      .join('\n');
    return `Context:\n${context}`;
  }

  const othersContext = otherAiMsgs.map(m => `${m.sender}: ${m.text}`).join('\n\n---\n\n');
  const context = [topicLine, othersContext].filter(Boolean).join('\n\n---\n\n');
  return `Context:\n${context}\n\n[Instruction: ${state.config.debateInstruction}]`;
}

function buildDebatePrompt(member, otherAiMsgs, topicLine) {
  let context;

  if (otherAiMsgs.length === 0) {
    context = state.messages
      .filter(m => m.sender !== member.name && m.senderType !== 'system')
      .slice(-5)
      .map(m => `${m.sender}: ${m.text}`)
      .join('\n');
  } else {
    const instruction = currentRound < state.config.maxDebateTurns
      ? state.config.debateInstruction
      : state.config.consensusInstruction;
    const othersContext = otherAiMsgs.map(m => `${m.sender}: ${m.text}`).join('\n\n---\n\n');
    const fullContext = [topicLine, othersContext].filter(Boolean).join('\n\n---\n\n');
    context = `[Instruction: ${instruction}]\n\n${fullContext}`;
  }

  return `Context:\n${context}\n\nRespond as ${member.name}. Keep response under ${state.config.maxLength} words.`;
}

// --- Waiting Pill UI ---
// Shows a temporary "waiting for AI" indicator in the chat; returns the DOM element for cleanup.
function showWaitingPill(member, isFreeMode) {
  const waitingPillEl = document.createElement('div');
  waitingPillEl.className = 'flex justify-center my-4';
  const waitingInner = document.createElement('div');
  waitingInner.className = 'bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 text-[11px] px-3 py-1 rounded-full font-medium border border-gray-200 dark:border-gray-700/50 text-center max-w-[80%]';
  waitingPillEl.appendChild(waitingInner);
  chatHistory.appendChild(waitingPillEl);
  chatHistory.scrollTop = chatHistory.scrollHeight;

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
    waitingPillEl._countdownInterval = countdownInterval;
  }

  return waitingPillEl;
}
