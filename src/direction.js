"use strict";

(function exposeDirectionHelpers(globalObject) {
  const RTL_CHARACTER =
    /[\u0590-\u08ff\uFB1D-\uFDFF\uFE70-\uFEFF]/u;
  const LTR_CHARACTER =
    /[A-Za-z\u00C0-\u02AF\u0370-\u058F\u1E00-\u1EFF]/u;
  const LTR_INLINE_RUN =
    /https?:\/\/[^\s<>"]+|[A-Za-z0-9]+(?:[._:\/\-][A-Za-z0-9]+)*(?:[ \t]+[A-Za-z0-9]+(?:[._:\/\-][A-Za-z0-9]+)*)*/g;
  const ISOLATABLE_LTR_RUN = /[A-Za-z]|\d[._:\/\-]\d/u;

  function detectDirection(value) {
    for (const character of String(value ?? "")) {
      if (RTL_CHARACTER.test(character)) {
        return "rtl";
      }

      if (LTR_CHARACTER.test(character)) {
        return "ltr";
      }
    }

    return "auto";
  }

  function findLtrRuns(value) {
    const text = String(value ?? "");
    const runs = [];

    for (const match of text.matchAll(LTR_INLINE_RUN)) {
      const run = match[0];
      if (!ISOLATABLE_LTR_RUN.test(run)) {
        continue;
      }

      runs.push({
        start: match.index,
        end: match.index + run.length,
        value: run
      });
    }

    return runs;
  }

  const api = { detectDirection, findLtrRuns };
  globalObject.ClaudeRtlDirection = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis === "undefined" ? this : globalThis);
