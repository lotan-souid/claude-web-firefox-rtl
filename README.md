# Claude Web RTL for Firefox

A Firefox extension that adds automatic right-to-left support for Hebrew conversations in Claude.

The extension detects the first strong character in Claude messages and in the composer, then applies `dir="rtl"`, `dir="ltr"`, or `dir="auto"` to keep Hebrew, English, and mixed text readable.

## Development

```sh
npm test
npm run check
npm run lint:addon
npm run start
```

`npm run start` opens Firefox with the extension loaded at `https://claude.ai/new`.

## Options

The options page includes one setting:

- Apply automatic direction to the composer.

This is enabled by default and can be disabled if Claude changes its editor behavior.

## Build

```sh
npm run build
```

The packaged extension is created under `web-ext-artifacts/`.
