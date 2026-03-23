// --- Chat History Manager ---
// Manages conversation history: save, load, list, delete, and export to markdown.
// Conversations stored in chrome.storage.local under 'conversation_history'.

const ChatHistoryManager = (() => {
  const STORAGE_KEY = 'conversation_history';
  const MAX_CONVERSATIONS = 50;

  /** Save current conversation to history */
  async function saveConversation(messages, title) {
    const conversations = await _readStorage();
    const humanMsgs = messages.filter(m => m.senderType === 'human');
    const autoTitle = title || humanMsgs[0]?.text?.slice(0, 60) || 'Untitled';

    const conversation = {
      id: Date.now().toString(),
      title: autoTitle,
      messages: messages,
      createdAt: Date.now(),
      messageCount: messages.filter(m => m.senderType !== 'system').length,
    };

    conversations.unshift(conversation);
    // Keep only recent conversations
    if (conversations.length > MAX_CONVERSATIONS) conversations.length = MAX_CONVERSATIONS;
    await _writeStorage(conversations);
    return conversation;
  }

  /** Get all saved conversations (metadata only for listing) */
  async function listConversations() {
    const conversations = await _readStorage();
    return conversations.map(c => ({
      id: c.id,
      title: c.title,
      createdAt: c.createdAt,
      messageCount: c.messageCount,
    }));
  }

  /** Load a specific conversation by ID */
  async function loadConversation(id) {
    const conversations = await _readStorage();
    return conversations.find(c => c.id === id) || null;
  }

  /** Delete a conversation by ID */
  async function deleteConversation(id) {
    let conversations = await _readStorage();
    conversations = conversations.filter(c => c.id !== id);
    await _writeStorage(conversations);
  }

  /** Export messages to markdown string */
  function toMarkdown(messages, title) {
    const lines = [];
    lines.push(`# ${title || 'AI Conversation'}`);
    lines.push(`*Exported: ${new Date().toLocaleString()}*`);
    lines.push('');

    for (const msg of messages) {
      if (msg.senderType === 'system') {
        lines.push(`---`);
        lines.push(`*${msg.text}*`);
        lines.push('');
        continue;
      }

      const time = (() => {
        try { const d = new Date(msg.timestamp); return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
        catch { return ''; }
      })();

      lines.push(`### ${msg.sender} ${time ? `(${time})` : ''}`);
      lines.push('');
      lines.push(msg.text);
      lines.push('');
    }

    return lines.join('\n');
  }

  /** Trigger browser download of markdown content */
  function downloadMarkdown(markdownContent, filename) {
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'conversation.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Internal helpers ---
  async function _readStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const data = await chrome.storage.local.get([STORAGE_KEY]);
      return data[STORAGE_KEY] || [];
    }
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }

  async function _writeStorage(conversations) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [STORAGE_KEY]: conversations });
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }
  }

  return { saveConversation, listConversations, loadConversation, deleteConversation, toMarkdown, downloadMarkdown };
})();
