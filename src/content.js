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

  let patchComposer = true;
  let observer;

  function applyDirection(element) {
    const direction = directionApi.detectDirection(element.textContent);
    element.setAttribute("dir", direction);
    element.dataset.claudeRtl = "true";
  }

  function applyToRoot(root) {
    if (!(root instanceof Element || root instanceof Document)) {
      return;
    }

    if (root instanceof Element && root.matches(NATURAL_TEXT_SELECTOR)) {
      applyDirection(root);
    }

    root.querySelectorAll(NATURAL_TEXT_SELECTOR).forEach(applyDirection);

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
