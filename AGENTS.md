# WARNER repository instructions

**Permanent content rule.** Story prose belongs exclusively to the author. Codex must never write, paraphrase, rewrite, edit, or otherwise alter story prose, lore, character text, or other creative writing in `content/`. The sole exception is an explicit author request for a mechanical syntax fix, such as repairing broken `[[id|link]]` brackets. Change only the requested syntax and preserve the author's wording. Use only obvious technical placeholders when the author requests test fixtures.

## Folder map

- `index.html`, `styles.css`, `app.js` hold the static shell, layout, and browser navigation.
- `content/index.json` maps site-wide node IDs to paths relative to `content/` and specifies the default entry.
- `content/docs/`, `content/voices/`, and `content/warner/` hold the node files. Keep each optional revisit file beside its node.
- `assets/audio/` holds audio files.
- `vendor/markdown-it/` holds the pinned browser parser (markdown-it 15.0.3) and its license.
- `.nojekyll` serves the repository files directly on GitHub Pages.
- `WORKFLOW.md` documents the author's editing and publishing process.

## Node schema

Use UTF-8 Markdown files. Write one `key: value` per metadata line, then a blank line, then the body. The body is the `body` field. The browser renders Markdown with single line breaks preserved and raw HTML displayed as text. Metadata values and the visible words inside a WARNER link are plain text.

| Field | Rule |
| --- | --- |
| `id` | Required. Lowercase ASCII letters and digits, optionally separated by single hyphens. Must match the filename stem and a unique ID in `content/index.json`. |
| `title` | Optional single-line heading. |
| `layer` | Optional styling label. Use lowercase ASCII letters and digits, optionally separated by single hyphens. Exposed as `data-layer` on the article when set. |
| `body` | Everything after the metadata separator. Use `[[target-id\|trigger phrase]]` for inline links. |
| `corrupt_variant` | Optional lowercase `.md` filename in the same folder as its node, with letters, digits, or hyphens before the extension. This file contains only replacement body text. |
| `audio_src` | Optional site-relative path such as `assets/audio/test-tone.wav`. Use letters, digits, hyphens, or underscores in the filename stem and an alphanumeric extension. |

The node's folder supplies the article's `data-type` value. The `layer` field independently supplies `data-layer`.

## Validation

- Check that the manifest lists each ID once, includes its default ID, and maps each ID to an existing `<type>/<id>.md` file. Allowed types are `docs`, `voices`, and `warner`.
- Check that each node has a blank line before its body and that any optional layer label follows the format above.
- Inspect both regular and revisit bodies for malformed markers and links to IDs missing from the manifest. Keep the visible trigger phrase exactly as written by the author.
- Check referenced variant and audio files for existence and matching case.
- Serve the root over HTTP and test Markdown formatting, direct hashes, inline links, browser history, revisit swaps, audio, and Drift through exhaustion.
