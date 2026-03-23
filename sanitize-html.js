// --- HTML Sanitization ---
// Strips dangerous HTML tags/attributes from AI responses to prevent XSS.
// Allows only safe formatting tags used by parseMarkdown().
const SanitizeHTML = (() => {
  // Tags that parseMarkdown() and KaTeX generate — everything else is stripped
  const ALLOWED_TAGS = new Set([
    // Markdown formatting
    'strong', 'em', 'del', 'code', 'pre', 'br', 'hr', 'div', 'span', 'button', 'img', 'a',
    // Tables
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    // KaTeX math rendering
    'math', 'semantics', 'annotation', 'mrow', 'mi', 'mn', 'mo', 'msub', 'msup',
    'msubsup', 'mfrac', 'msqrt', 'mroot', 'mover', 'munder', 'munderover',
    'mtable', 'mtr', 'mtd', 'mtext', 'mspace', 'menclose', 'mpadded', 'mphantom',
    'svg', 'path', 'line', 'rect',
  ]);

  // Attributes allowed per tag (all others removed)
  const ALLOWED_ATTRS = {
    '*': ['class', 'style'],
    'img': ['src', 'alt', 'class'],
    'button': ['class'],
    'a': ['href', 'target', 'class'],
    'td': ['style', 'class'],
    'th': ['style', 'class'],
    'annotation': ['encoding'],
    'math': ['xmlns'],
    'svg': ['xmlns', 'width', 'height', 'viewBox', 'style', 'class'],
    'path': ['d', 'fill', 'stroke', 'style'],
    'line': ['x1', 'x2', 'y1', 'y2', 'stroke', 'style'],
    'rect': ['x', 'y', 'width', 'height', 'fill', 'stroke', 'style'],
  };

  /**
   * Sanitize an HTML string by removing disallowed tags and attributes.
   * Uses the browser's built-in DOMParser for robust parsing.
   */
  function sanitize(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    cleanNode(doc.body);
    return doc.body.innerHTML;
  }

  function cleanNode(node) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase();

        // Remove dangerous tags entirely (including children)
        if (isDangerousTag(tag)) {
          child.remove();
          continue;
        }

        // Unwrap non-allowed tags (keep children, remove the tag wrapper)
        if (!ALLOWED_TAGS.has(tag)) {
          while (child.firstChild) {
            node.insertBefore(child.firstChild, child);
          }
          child.remove();
          continue;
        }

        // Strip disallowed attributes
        const allowedForTag = {
          ...(ALLOWED_ATTRS['*'] ? { '*': ALLOWED_ATTRS['*'] } : {}),
          ...(ALLOWED_ATTRS[tag] ? { [tag]: ALLOWED_ATTRS[tag] } : {}),
        };
        const allowedSet = new Set([
          ...(allowedForTag['*'] || []),
          ...(allowedForTag[tag] || []),
        ]);

        for (const attr of Array.from(child.attributes)) {
          if (!allowedSet.has(attr.name)) {
            child.removeAttribute(attr.name);
          }
        }

        // Recurse into children
        cleanNode(child);
      }
    }
  }

  function isDangerousTag(tag) {
    return ['script', 'style', 'iframe', 'object', 'embed', 'form', 'link', 'meta', 'base'].includes(tag);
  }

  return { sanitize };
})();
