"use strict";

(() => {
  const extensionApi = globalThis.browser ?? globalThis.chrome;
  const directionApi = globalThis.ClaudeRtlDirection;

  const MESSAGE_ROOT_SELECTORS = [
    "[data-testid*=\"message\"]",
    "[data-testid*=\"conversation-turn\"]",
    "[data-testid*=\"chat-message\"]",
    "[data-is-streaming]",
    ".font-claude-message",
    ".font-user-message"
  ];

  const NATURAL_BLOCK_SELECTOR =
    ":is(p, li, blockquote, h1, h2, h3, h4, h5, h6, .whitespace-pre-wrap, .font-claude-message, .font-user-message)";

  const NATURAL_TEXT_SELECTOR = [
    ...MESSAGE_ROOT_SELECTORS,
    ...MESSAGE_ROOT_SELECTORS.map(
      (rootSelector) => `${rootSelector} ${NATURAL_BLOCK_SELECTOR}`
    )
  ].join(", ");

  const COMPOSER_SELECTOR = [
    ".ProseMirror[contenteditable=\"true\"]",
    "[data-testid*=\"chat-input\"] [contenteditable=\"true\"]",
    "[data-testid*=\"composer\"] [contenteditable=\"true\"]",
    "[contenteditable=\"true\"][aria-label*=\"message\" i]",
    "[contenteditable=\"true\"][aria-label*=\"prompt\" i]",
    "textarea[placeholder*=\"message\" i]",
    "textarea[placeholder*=\"prompt\" i]"
  ].join(", ");

  const LTR_ISOLATE_SKIP_SELECTOR = [
    "pre",
    "code",
    "kbd",
    "samp",
    "table",
    "math",
    "svg",
    "[class*=\"katex\"]",
    "[class*=\"math\"]",
    "[data-claude-ltr-isolate=\"true\"]",
    COMPOSER_SELECTOR
  ].join(", ");

  let patchComposer = true;
  let observer;

  function applyDirection(element) {
    const direction = directionApi.detectDirection(element.textContent);
    element.setAttribute("dir", direction);
    element.dataset.claudeRtl = "true";
  }

  function shouldSkipTextNode(textNode) {
    const parent = textNode.parentElement;
    return !parent || parent.closest(LTR_ISOLATE_SKIP_SELECTOR);
  }

  function replaceTextNodeWithIsolates(textNode, runs) {
    const fragment = document.createDocumentFragment();
    const text = textNode.nodeValue;
    let offset = 0;

    for (const run of runs) {
      if (run.start > offset) {
        fragment.append(document.createTextNode(text.slice(offset, run.start)));
      }

      const isolate = document.createElement("bdi");
      isolate.dir = "ltr";
      isolate.dataset.claudeLtrIsolate = "true";
      isolate.textContent = run.value;
      fragment.append(isolate);
      offset = run.end;
    }

    if (offset < text.length) {
      fragment.append(document.createTextNode(text.slice(offset)));
    }

    textNode.replaceWith(fragment);
  }

  function isolateInlineLtrRuns(element) {
    if (
      element.getAttribute("dir") !== "rtl" ||
      !element.matches(NATURAL_BLOCK_SELECTOR)
    ) {
      return;
    }

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(textNode) {
        if (!/[A-Za-z0-9]/.test(textNode.nodeValue) || shouldSkipTextNode(textNode)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const replacements = [];

    for (let textNode = walker.nextNode(); textNode; textNode = walker.nextNode()) {
      const runs = directionApi.findLtrRuns(textNode.nodeValue);
      if (runs.length > 0) {
        replacements.push([textNode, runs]);
      }
    }

    replacements.forEach(([textNode, runs]) => {
      replaceTextNodeWithIsolates(textNode, runs);
    });
  }

  function applyToRoot(root) {
    if (!(root instanceof Element || root instanceof Document)) {
      return;
    }

    if (root instanceof Element && root.matches(NATURAL_TEXT_SELECTOR)) {
      applyDirection(root);
      isolateInlineLtrRuns(root);
    }

    root.querySelectorAll(NATURAL_TEXT_SELECTOR).forEach((element) => {
      applyDirection(element);
      isolateInlineLtrRuns(element);
    });

    if (!patchComposer) {
      return;
    }

    if (root instanceof Element && root.matches(COMPOSER_SELECTOR)) {
      applyDirection(root);
    }

    root.querySelectorAll(COMPOSER_SELECTOR).forEach(applyDirection);
  }

  function clearComposerDirection() {
    document.querySelectorAll(COMPOSER_SELECTOR).forEach((element) => {
      if (element.dataset.claudeRtl === "true") {
        element.removeAttribute("dir");
        delete element.dataset.claudeRtl;
      }
    });
  }

  function startObserver() {
    applyToRoot(document);

    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (
          record.type === "characterData" &&
          record.target.parentElement instanceof Element
        ) {
          applyToRoot(record.target.parentElement);
          continue;
        }

        record.addedNodes.forEach(applyToRoot);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  async function loadSettings() {
    if (!extensionApi?.storage?.local) {
      return;
    }

    const settings = await extensionApi.storage.local.get({
      patchComposer: true
    });
    patchComposer = settings.patchComposer !== false;
  }

  extensionApi?.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.patchComposer) {
      return;
    }

    patchComposer = changes.patchComposer.newValue !== false;
    if (patchComposer) {
      applyToRoot(document);
    } else {
      clearComposerDirection();
    }
  });

  loadSettings()
    .catch((error) => {
      console.warn("Claude Web RTL could not load its settings.", error);
    })
    .finally(startObserver);
})();
