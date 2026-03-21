# AI Workspace - Codebase Scout Report

**Date:** 2026-02-24  
**Project:** AI Workspace Sidebar Chrome Extension  
**Report Type:** Full Directory & File Structure Mapping

---

## Project Overview

Multi-AI discussion workspace Chrome extension. Orchestrates conversations between Claude, ChatGPT, Gemini, and Grok platforms. Allows users to send messages to multiple AI models simultaneously and manage group discussions through a browser sidebar panel.

**Tech Stack:**
- Vanilla JavaScript (637 lines main script)
- Tailwind CSS v4.2.0 (responsive design)
- Lucide Icons v4 (383KB minified SVG icon library)
- Chrome Extension Manifest v3
- Vite dev tool (v6.0.0)
- TypeScript v5.9.3 (dev only)

---

## Root Directory Structure

d:\Workspace\ai-workspace/
├── index.html (7.4KB) - Main sidebar HTML
├── script.js (21.6KB) - Core application logic
├── background.js (114B) - Service worker entry
├── manifest.json (462B) - Chrome Extension manifest
├── output.css (63KB) - Compiled Tailwind CSS v4.2.0
├── input.css (442B) - Tailwind input
├── tailwind.config.js (244B) - Tailwind configuration
├── lucide.min.js (383KB) - Icon library
├── assets/ (5 SVG platform icons)
├── docs/ (Documentation)
├── plans/ (Implementation plans)
└── .claude/ (AI framework infrastructure)

---

## Source Files Breakdown

### Core Application Files

| File | Size | Purpose |
|------|------|---------|
| `/index.html` | 7.4KB | Main UI markup. Sidebar + chat area + controls. Dark mode. Lucide icons. |
| `/script.js` | 21.6KB | Core app logic - state, orchestration, AI interaction, events |
| `/background.js` | 114B | Service worker - sets sidePanel behavior |
| `/manifest.json` | 462B | Chrome Extension v3 manifest |

### Styling

| File | Size | Purpose |
|------|------|---------|
| `/input.css` | 442B | Tailwind directives + custom scrollbar |
| `/output.css` | 63KB | Compiled Tailwind CSS v4.2.0 |
| `/tailwind.config.js` | 244B | Tailwind config (gray-950, dark mode) |

### Icons & Assets

| File | Size | Purpose |
|------|------|---------|
| `/lucide.min.js` | 383KB | Lucide icon library for UI |
| `/assets/chatgpt-icon.svg` | SVG | ChatGPT platform icon |
| `/assets/claude-ai-icon.svg` | SVG | Claude AI platform icon |
| `/assets/google-gemini-icon.svg` | SVG | Google Gemini platform icon |
| `/assets/grok-icon.svg` | SVG | Grok platform icon |
| `/assets/perplexity-ai-icon.svg` | SVG | Perplexity AI icon (not integrated) |

---

## Platform Integration Files

### Supported AI Platforms (in manifest.json)

**1. ChatGPT** - *://chatgpt.com/*
   - Input: #prompt-textarea
   - Send: button[data-testid="send-button"]
   - Response: .markdown

**2. Claude AI** - *://claude.ai/*
   - Input: div[contenteditable="true"]
   - Send: button[aria-label="Send Message"]
   - Response: .font-claude-message

**3. Google Gemini** - *://gemini.google.com/*
   - Input: div.ql-editor or textarea
   - Send: .send-button or button[aria-label="Send message"]
   - Response: message-content

**4. Grok** - *://grok.com/* & *://x.com/i/grok*
   - Input: textarea
   - Send: button[aria-label="Grok something"]
   - Response: .message-text

**Planned:** Perplexity AI (icon exists, selectors TBD)

**Location:** /script.js lines 292-430

---

## Key Files by Functionality

### State Management (/script.js lines 1-30)
- State: theme, status, tabs, activeMembers, messages, config, sidebarOpen
- Persistence: Chrome storage.local API

### Message Orchestration (/script.js lines 432-482)
- Function: runOrchestrator(initialMessage)
- Flow: Iterate members > get responses > add to chat > delay 500ms

### AI Response Detection (/script.js lines 345-430)
- Method: DOM injection + content script execution
- Polling: Check response every 500ms, timeout 15 seconds

### UI Rendering (/script.js lines 93-268)
- Functions: renderTabs(), renderMessages(), renderControls(), updateStatusUI()

### Event Handling (/script.js lines 570-637)
- Events: Send, theme toggle, member selection, clear, sidebar toggle

---

## Configuration & Metadata

### Package.json Dependencies
- typescript: ^5.9.3
- vite: ^6.0.0
- Scripts: dev (vite), clean (vite clean)

### MCP Server Configuration (.mcp.json)
- context7: Upstash context API
- human-mcp: Google Gemini API
- chrome-devtools: Browser automation
- memory: Persistent session memory
- sequential-thinking: Reasoning engine

---

## Documentation Files

### In /docs/
- upgrade.md (576B) - TODO list:
  1. Add max response length to AI prompts
  2. Add Perplexity.ai to platforms
  3. Use standard platform icons
  4. Add markdown rendering support (NOT IMPLEMENTED)
  5. Fix Claude response display
  6. Fix Grok message sending
  7. Prevent re-broadcasting AI messages

### In /CLAUDE.md
Framework instructions. Links to ./.claude/rules/:
- primary-workflow.md - Development process
- development-rules.md - Code standards
- orchestration-protocol.md - Subagent delegation
- documentation-management.md - Docs lifecycle

---

## .claude/ Framework Structure

### Agents (.claude/agents/)
Pre-configured subagents: planner, code-reviewer, code-simplifier, tester, docs-manager, debugger, researcher, and 9 others

### Skills (.claude/skills/ - 50+ modules)
- markdown-novel-viewer, ai-multimodal, debugging, sequential-thinking, code-review, frontend-development, databases, payment-integration, chrome-devtools, and 40+ others

### Rules (.claude/rules/)
- primary-workflow.md, development-rules.md, orchestration-protocol.md, documentation-management.md

### Commands (.claude/commands/)
CLI shortcuts: plan, scout, review, cook, test, git, design, docs, fix, bootstrap, integrate

---

## Important Known Issues

1. Markdown rendering NOT IMPLEMENTED - Responses show plain text
2. Claude response display broken - Selector verification needed
3. Grok message sending broken - Selector verification needed
4. Max response length not in prompt - AI models unaware of config
5. Perplexity.ai missing - Icon exists, platform not integrated
6. Message echo issue - Re-sending AI's own messages

---

## Technology Stack Summary

| Component | Version | Size |
|-----------|---------|------|
| Tailwind CSS | v4.2.0 | 63KB |
| Lucide Icons | bundled | 383KB |
| TypeScript | ^5.9.3 | dev |
| Vite | ^6.0.0 | dev |
| Vanilla JS | ES2020+ | 21.6KB |

---

## Unresolved Questions

1. Markdown library choice (marked.js vs markdown-it)?
2. Platform selector resilience strategy?
3. Message echo prevention approach?
4. Perplexity.ai correct selectors?
5. Content script isolation barriers?

---

## Next Development Steps

1. Implement markdown rendering
2. Fix platform selectors (Claude, Grok, Perplexity)
3. Add Perplexity integration
4. Fix message echo - track sender IDs
5. Include maxLength in prompt builders
6. Improve response detection
7. Add UI features (copy, preview, syntax highlighting)

---

**Report Generated:** 2026-02-24 08:43 UTC
**Codebase Size:** ~1.2MB (including libraries)
**Source Code:** ~21.6KB (script.js) + 7.4KB (index.html)
**Config Files:** 7 JSON/JS
