# WARNER editing workflow

1. Pick a folder in `content/` (`docs`, `voices`, or `warner`) and an ID that is unique across all three. Paste your text from Google Docs as plain text into a UTF-8 Markdown file such as `content/voices/new-node.md`. Add any formatting you want to keep using Markdown.
2. Put the metadata at the top, followed by a blank line and your exact text. Omit `title` if the entry has no heading.

   ```text
   id: new-node
   layer: memory

   [PLACEHOLDER PROSE FOR NODE: new-node]
   ```

   Use `*italics*`, `**bold**`, `## Heading`, `> Block quote`, or a standalone `---` surrounded by blank lines for a section break. A single line break stays visible. Use a blank line between paragraphs. The site displays raw HTML as text.

3. Register the file under `nodes` in `content/index.json` with a mapping like `"new-node": "voices/new-node.md"`. Keep the existing `default` unless you want to change the entry shown at the bare site URL. To add an inline link, wrap the exact trigger phrase in `[[target-id|trigger phrase]]`, keeping the marker on one line and using a registered target ID.
4. For a revisit, add a header like `corrupt_variant: new-node-revisit.md` and save that file beside the main entry. Give the variant file only its Markdown body, without the metadata header. For audio, copy the file into `assets/audio/` and add a header such as `audio_src: assets/audio/new-node.mp3`.
5. Start a static server from the repository root with `python -m http.server 8000 --bind 127.0.0.1`. Open `http://127.0.0.1:8000/`, then try a direct hash such as `http://127.0.0.1:8000/#709446`. Opening the file directly bypasses the HTTP server needed for content requests.
6. Check the formatting and test links in both bodies. In a fresh browser session, open `#owl`, follow a link to `#fountain`, play the short test tone, and follow its link back to `#owl` to see the revisit placeholder. Try Back and Forward. Use Drift until all nodes in the manifest have been visited. Drift disables at that point, and inline links remain usable. Use a fresh tab opened independently or clear this site's session storage to reset visits.
7. Review `git status --short`, stage the intended files, and commit. Push to `main` with `git push origin main`. In the repository's GitHub Pages settings, use **Deploy from a branch**, with **main** and **/ (root)**. Once published, append a hash such as `#fountain` to the site URL to link to that node from YouTube Shorts.

## Styling and moving entries

The article gets `data-type="docs"`, `data-type="voices"`, or `data-type="warner"` from the entry's folder. In `styles.css`, use a selector like `[data-type="docs"] #node-body` to style the Markdown body for one type. You can combine it with the separate layer attribute, as in `[data-type="voices"][data-layer="memory"]`.

To change an entry's type, move its Markdown file and any revisit file together, then update its path in `content/index.json`. Keep the same ID so its hash URL and incoming inline links continue to work.
