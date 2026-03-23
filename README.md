<div align="center">
<img width="200" height="100" alt="GHBanner" src="https://vibexai.net/logo/logo-lc-dark.svg" />

# Agentic AI Conversation

**Multi-AI discussion workspace in your Chrome sidebar**

Let multiple AI chatbots debate, discuss, and collaborate — all orchestrated from one panel.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://github.com/tunghuynh/agentic-ai-conversation)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

## What is this?

A Chrome Extension that connects to multiple AI chat platforms simultaneously and orchestrates conversations between them. Open ChatGPT, Claude, Gemini, and others in separate tabs — this extension injects messages and collects responses automatically.

**Two conversation modes:**
- **Debate Mode** — AIs argue, counter, and reach consensus through structured rounds
- **Free Mode** — Open-ended continuous conversation without round limits

## Supported AI Platforms

| Platform | Status |
|---|---|
| ChatGPT | Built-in |
| Claude | Built-in |
| Gemini | Built-in |
| Grok | Built-in |
| Perplexity | Built-in |
| DeepSeek | Built-in |
| Qwen | Built-in |
| Kimi | Built-in |
| Genspark | Built-in |
| **Any AI** | Add via Custom Platform |

> Add any AI chat platform by defining URL patterns and CSS selectors — no code changes needed.

## Features

- **Multi-AI Orchestration** — Automated turn-taking across 2-9+ AI agents
- **Debate & Free Modes** — Structured debate with consensus, or open-ended discussion
- **Dynamic Platform Config** — Add/edit/remove AI platforms at runtime via UI
- **Conversation History** — Save, load, and manage past conversations
- **Export to Markdown** — Download any conversation as `.md` file
- **Dark/Light Theme** — Full theme support with auto-detection
- **XSS Protection** — HTML sanitization on all AI responses
- **Enhanced Markdown** — Tables, code blocks, syntax highlighting, blockquotes, links
- **One-Click Open All** — Open all AI platform tabs simultaneously

## Tech Stack

| Layer | Technology |
|---|---|
| Platform | Chrome Extension (Manifest V3) |
| UI | Vanilla JS + Tailwind CSS v4 |
| Icons | Lucide Icons |
| Syntax Highlighting | Custom lightweight highlighter |
| Storage | Chrome Storage API (`chrome.storage.local`) |
| AI Interaction | Content Script injection via `chrome.scripting` |
| Build | Tailwind CLI (`npx @tailwindcss/cli`) |

## Project Structure

```
├── manifest.json              # Extension manifest (MV3)
├── index.html                 # Side panel UI
├── src/
│   ├── input.css              # Tailwind source
│   ├── output.css             # Compiled Tailwind CSS
│   ├── script.js              # State, DOM refs, core actions, init
│   ├── platforms.js           # Factory-default AI platform definitions
│   ├── platform-config-manager.js # Dynamic platform CRUD (storage)
│   ├── orchestrator.js        # Conversation loop & context building
│   ├── ui-renderer.js         # DOM rendering (tabs, messages, controls)
│   ├── event-handlers.js      # User interaction bindings
│   ├── markdown-parser.js     # Markdown → HTML with tables, code blocks
│   ├── sanitize-html.js       # XSS sanitization whitelist
│   ├── chat-history-manager.js # Conversation save/load/export
│   ├── syntax-highlight.js    # Code syntax highlighting
│   └── background.js          # Service worker (side panel setup)
├── vendor/
│   ├── lucide.min.js          # Lucide icon library
│   └── tailwind-config.js     # Tailwind CDN play config
└── assets/                    # Icons and images
```

## Getting Started

### Install from source

1. Clone the repository:
   ```bash
   git clone https://github.com/tunghuynh/agentic-ai-conversation.git
   ```
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select the cloned folder
5. Click the extension icon → opens the side panel

### Usage

1. Open AI chat tabs (ChatGPT, Claude, Gemini, etc.) in your browser
2. Click **Scan** to detect open AI tabs
3. Select which AIs should participate
4. Type a topic and hit **Send** — the AIs will discuss autonomously
5. Use **Pause/Stop** to take control anytime

### Add a Custom AI Platform

1. Go to **Platforms** section in the sidebar
2. Click **Add**
3. Fill in the form fields:

| Field | Description | Example |
|---|---|---|
| **Platform ID** | Unique lowercase identifier | `my-ai` |
| **Display Name** | Name shown in the UI | `My AI` |
| **URL Pattern** | Chrome match pattern for the AI's website | `*://my-ai.com/*` |
| **Icon URL** | *(optional)* URL or data URI for the platform icon | `https://my-ai.com/icon.svg` |
| **Input Selector(s)** | CSS selectors for the chat input box (comma-separated) | `textarea, div[contenteditable="true"]` |
| **Send Button Selector(s)** | *(optional)* CSS selectors for the send button | `button[type="submit"]` |
| **Response Selector(s)** | CSS selectors for the AI response container | `.markdown, .response-content` |
| **Generating Signal Selector(s)** | *(optional)* CSS selector for the stop/loading button (visible only while AI is streaming) | `button[aria-label="Stop"]` |

4. Click **Save** — the platform is immediately available for scanning and chatting

**How to find CSS selectors:**
1. Open the AI chat website in Chrome
2. Right-click the input box → **Inspect**
3. In DevTools, note the element's tag, class, or ID (e.g. `textarea.chat-input`)
4. Repeat for the send button, response area, and stop button
5. Use multiple selectors separated by commas as fallbacks

### Rebuild CSS

```bash
npx @tailwindcss/cli -i src/input.css -o src/output.css
```

## Powered by

<a href="https://tunghuynh.net">Tùng Huynh</a> · <a href="https://vibexai.net">VibexAI</a>

## License

MIT
