# WARNER editing workflow

1. Pick a folder in `content/` (`docs`, `voices`, or `warner`) and an ID that is unique across all three. Paste your text from Google Docs as plain text into a UTF-8 Markdown file such as `content/voices/new-node.md`. Add any formatting you want to keep using Markdown.
2. Put the metadata at the top, followed by a blank line and your exact text. Omit `title` if the entry has no heading.

   ```text
   id: new-node

   [PLACEHOLDER PROSE FOR NODE: new-node]
   ```

   Use `*italics*`, `**bold**`, `## Heading`, `> Block quote`, or a standalone `---` surrounded by blank lines for a section break. A single line break stays visible. Use a blank line between paragraphs. The site displays raw HTML as text.

3. Register the file under `nodes` in `content/index.json` with a mapping like `"new-node": "voices/new-node.md"`. To add an inline link, wrap the exact trigger phrase in `[[target-id|trigger phrase]]`, keeping the marker on one line and using a registered target ID.
4. For a revisit, add a header like `corrupt_variant: new-node-revisit.md` and save that file beside the main entry. Give the variant file only its Markdown body, without the metadata header. For audio, copy the file into `assets/audio/` and add a header such as `audio_src: assets/audio/new-node.mp3`.
5. Start a static server from the repository root with `python -m http.server 8000 --bind 127.0.0.1`. Open `http://127.0.0.1:8000/`, then try a direct hash such as `http://127.0.0.1:8000/#709446`. Opening the file directly bypasses the HTTP server needed for content requests.
6. Check the formatting and test inline links, Back and Forward, and any audio or revisit variant you added. In a fresh browser session, use Drift until all eligible entries have been visited, then keep clicking to check that it still jumps to a different eligible entry. If there is only one eligible entry, Drift can reopen it. Open an independent tab or clear this site's session storage to reset visits.
7. Review `git status --short`, stage the intended files, and commit. Push to `main` with `git push origin main`. In the repository's GitHub Pages settings, use **Deploy from a branch**, with **main** and **/ (root)**. Once published, append a hash such as `#fountain` to the site URL to link to that node from YouTube Shorts.

## Styling and moving entries

On a `docs` entry, wrap any word or phrase you want to briefly glitch as `{{glitch|your words}}`. The words display as plain text. Put the marker on one line and outside code. With reduced motion enabled, the text stays still and the scanlines remain visible.

On a `voices` entry, use `{{wisp|your words}}` for a faint aura and an occasional drifting smoke trail. The words themselves stay in place. Reduced motion keeps the aura still.

On a `warner` entry, use `{{focus|your words}}` for a warm pulse and a slight sideways shift. Reduced motion keeps the emphasis still.

To combine an effect and a link, put the effect inside the link label, as in `[[target-id|{{focus|your words}}]]`. You can also mark only part of the label with `[[target-id|some {{focus|words}}]]`. Choose the effect for the entry where the link appears.

The article gets `data-type="docs"`, `data-type="voices"`, or `data-type="warner"` from the entry's folder. In `styles.css`, use a selector like `[data-type="docs"] #node-body` to style the Markdown body for one type.

To give an entry a styling override, add an optional header such as `layer: custom-style`. This adds `data-layer="custom-style"` alongside the folder type. A selector such as `[data-layer="custom-style"] #node-body` can apply the same override in any folder. Use lowercase letters and digits, with single hyphens between words.

To change an entry's type, move its Markdown file and any revisit file together, then update its path in `content/index.json`. Keep the same ID so its hash URL and incoming inline links continue to work.

## Keep an entry out of Drift

Add `drift_exclude: true` to the metadata header of the main Markdown file. This also keeps it out of the random selection at the bare site URL. Keep the entry in `content/index.json` so inline links and its direct hash URL still work.
