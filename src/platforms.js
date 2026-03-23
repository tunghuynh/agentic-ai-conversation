// Platform configurations
// Add or update platforms here without touching core logic in script.js
const PLATFORMS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    iconSrc: 'assets/chatgpt-icon.svg',
    defaultOpenUrl: 'https://chatgpt.com/',
    urlPatterns: ['*://chatgpt.com/*'],
    selectors: {
      input: ['#prompt-textarea', 'div[contenteditable="true"]'],
      sendBtn: ['button[data-testid="send-button"]'],
      response: ['.markdown'],
      // Visible ONLY while ChatGPT is still generating — disappears when done
      generatingSignal: [
        'button[data-testid="stop-button"]',
        'button[aria-label="Stop streaming"]',
      ],
    },
  },
  {
    id: 'claude',
    name: 'Claude',
    iconSrc: 'assets/claude-ai-icon.svg',
    defaultOpenUrl: 'https://claude.ai/new',
    urlPatterns: ['*://claude.ai/*'],
    selectors: {
      input: [
        'div.ProseMirror[contenteditable="true"]',
        'fieldset div[contenteditable="true"]',
        'div[contenteditable="true"]',
      ],
      sendBtn: [
        'button[aria-label="Send message"]',
        'button[data-testid="send-button"]',
      ],
      response: [
        '[data-testid="assistant-message"] .contents',
        '.standard-markdown',
        '.font-claude-message',
        'div[class*="prose"]',
      ],
      // Claude shows a stop button while streaming
      generatingSignal: [
        'button[aria-label="Stop responding"]',
        'button[aria-label="Stop"]',
      ],
    },
  },
  {
    id: 'gemini',
    name: 'Gemini',
    iconSrc: 'assets/google-gemini-icon.svg',
    defaultOpenUrl: 'https://gemini.google.com/app',
    urlPatterns: ['*://gemini.google.com/*'],
    selectors: {
      input: ['div.ql-editor', 'textarea'],
      sendBtn: ['.send-button', 'button[aria-label="Send message"]'],
      response: ['message-content'],
      // Gemini shows a stop button during generation
      generatingSignal: [
        'button[aria-label="Stop generating"]',
        'button[aria-label="Stop response"]',
        '.stop-button',
      ],
    },
  },
  {
    id: 'grok',
    name: 'Grok',
    iconSrc: 'assets/grok-icon.svg',
    urlPatterns: ['*://grok.com/*', '*://x.com/i/grok*'],
    selectors: {
      input: ['div[contenteditable="true"]', 'textarea'],
      sendBtn: [
        'button[aria-label="Send message"]',
        'button[type="submit"]',
        'button[aria-label="Grok something"]',
      ],
      response: ['.response-content-markdown', '.message-content', '.message-text'],
      // Grok shows a stop button while generating
      generatingSignal: [
        'button[aria-label="Stop generating"]',
        'button[aria-label="Stop"]',
        'button[aria-label="Cancel"]',
      ],
    },
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    iconSrc: 'assets/perplexity-ai-icon.svg',
    urlPatterns: ['*://www.perplexity.ai/*'],
    selectors: {
      input: ['div[contenteditable="true"]', 'textarea[placeholder*="Ask"]', 'textarea'],
      sendBtn: ['button[aria-label="Submit"]', 'button[type="submit"]'],
      response: ['.prose', '[class*="answer"]'],
      // Perplexity shows a stop button during answer generation
      generatingSignal: [
        'button[aria-label="Stop"]',
        'button[aria-label="Stop generating"]',
      ],
    },
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    iconSrc: 'assets/deepseek-icon.svg',
    urlPatterns: ['*://chat.deepseek.com/*'],
    selectors: {
      // DeepSeek uses a textarea with id="chat-input"
      input: ['textarea#chat-input', 'textarea', 'div[contenteditable="true"]'],
      sendBtn: [
        // DeepSeek send button contains a .ds-icon-send icon inside
        'button:has(.ds-icon-send)',
        '.ds-message-input-send-button',
        'button[aria-label="Send Message"]',
        'button[type="submit"]',
      ],
      // DeepSeek wraps final answers in .ds-markdown
      response: ['.ds-markdown', '.ds-message .ds-markdown'],
      // While generating, the send button area shows a stop icon (.ds-icon-stop)
      generatingSignal: [
        'button:has(.ds-icon-stop)',
        '.ds-message-input-stop-button',
        '[class*="stop-button"]',
      ],
    },
  },
  {
    id: 'qwen',
    name: 'Qwen',
    iconSrc: 'assets/qwen-icon.svg',
    urlPatterns: ['*://chat.qwen.ai/*'],
    selectors: {
      // Qwen uses a textarea with class message-input-textarea
      input: ['textarea.message-input-textarea', 'div[contenteditable="true"]', 'textarea'],
      sendBtn: [
        // Qwen's send button uses Alibaba's omni-button component
        'button.omni-button-content-btn',
        'button[aria-label="Send"]',
        'button[type="submit"]',
      ],
      // Qwen assistant messages use the .qwen-markdown class
      response: ['.qwen-markdown', '.qwen-chat-message-assistant .qwen-markdown', '.message-content'],
      // While generating, Qwen shows a stop/cancel button in the input area
      generatingSignal: [
        'button.omni-button-stop',
        'button[aria-label="Stop"]',
        'button[aria-label="Stop generating"]',
      ],
    },
  },
  {
    id: 'kimi',
    name: 'Kimi',
    iconSrc: 'assets/kimi-icon.svg',
    urlPatterns: ['*://www.kimi.com/*'],
    selectors: {
      // Kimi uses a contenteditable div
      input: ['div[contenteditable="true"]', 'textarea', '#chat-input'],
      sendBtn: [
        'button[aria-label="Send"]',
        'button[type="submit"]',
        '[data-testid="send-button"]',
      ],
      // Kimi wraps responses in .segment-content or standard markdown containers
      response: ['.segment-content', '.markdown', '[class*="message-content"]', '[class*="answer"]'],
      // Kimi shows a stop/pause button while generating
      generatingSignal: [
        'button[aria-label="Stop"]',
        'button[aria-label="Stop generating"]',
        '.stop-button',
      ],
    },
  },
  {
    id: 'genspark',
    name: 'Genspark',
    iconSrc: 'assets/genspark-ai.svg',
    urlPatterns: ['*://www.genspark.ai/*'],
    selectors: {
      // Genspark uses a textarea with class search-input / j-search-input
      input: [
        'textarea.j-search-input',
        'textarea.search-input',
        'textarea[name="query"]',
        'textarea',
      ],
      // Genspark has no visible send button — relies on Enter key press.
      // Include fallback selectors in case UI changes add one.
      sendBtn: [
        'div.search-input-container div.enter-icon',
        'button[aria-label="Send"]',
        'button[type="submit"]',
      ],
      // Genspark wraps AI responses in .conversation-statement.assistant with .markdown-viewer
      response: [
        '.conversation-statement.assistant .markdown-viewer',
        '.conversation-statement.assistant',
        '.conversation-content .markdown-viewer',
        '.markdown-viewer',
      ],
      // Genspark dynamically renders stop/loading indicators during streaming
      generatingSignal: [
        'div.search-input-container svg.stop-icon',
        'button[aria-label="Stop"]',
        'button[aria-label="Stop generating"]',
        '.stop-button',
      ],
    },
  },
];
