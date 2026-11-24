import MarkdownIt from "./vendor/markdown-it/markdown-it.esm.min.mjs";

const entry = document.querySelector("#node");
const title = document.querySelector("#node-title");
const body = document.querySelector("#node-body");
const audio = document.querySelector("#node-audio");
const drift = document.querySelector("#drift");
const status = document.querySelector("#status");

const storageKey = `warner:visited:${new URL("./", import.meta.url).pathname}`;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pageTypes = new Set(["docs", "voices", "warner"]);
const content = new URL("./content/", import.meta.url);
let manifest;
let navigation = 0;

const markdown = new MarkdownIt({ html: false, breaks: true });
const nodeLink = /\[\[([a-z0-9-]+)\|([^\[\]\r\n]+)\]\]/y;

markdown.inline.ruler.before("link", "warner_link", (state, silent) => {
  if (state.linkLevel > 0 || state.src[state.pos + 1] !== "[") return false;

  nodeLink.lastIndex = state.pos;
  const match = nodeLink.exec(state.src);
  if (!match || nodeLink.lastIndex > state.posMax) return false;

  const [marker, target, phrase] = match;
  if (!silent) {
    if (state.env.nodes.has(target)) {
      state.push("link_open", "a", 1).attrSet("href", `#${target}`);
      state.push("text", "", 0).content = phrase;
      state.push("link_close", "a", -1);
    } else {
      state.push("text", "", 0).content = marker;
    }
  }
  state.pos += marker.length;
  return true;
});

function readVisited() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

const visited = readVisited();

function recordVisit(id) {
  visited.add(id);
  try {
    sessionStorage.setItem(storageKey, JSON.stringify([...visited]));
  } catch {
    // Keep navigation working when browser storage is unavailable.
  }
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url.pathname}`);
  return response.text();
}

async function loadManifest() {
  const index = JSON.parse(await fetchText(new URL("index.json", content)));
  if (!index.nodes || typeof index.nodes !== "object" || Array.isArray(index.nodes)) {
    throw new Error("Invalid content index");
  }

  const nodes = new Map();
  for (const [id, path] of Object.entries(index.nodes)) {
    const type = typeof path === "string" ? path.split("/")[0] : "";
    if (!slug.test(id) || !pageTypes.has(type) || path !== `${type}/${id}.md`) {
      throw new Error(`Invalid path for entry ${id}`);
    }
    nodes.set(id, { type, url: new URL(path, content) });
  }
  if (!nodes.has(index.default)) throw new Error("Invalid default entry");
  return { default: index.default, nodes };
}

async function loadNode(id, revisit) {
  const { type, url } = manifest.nodes.get(id);
  const file = await fetchText(url);
  const separator = /\r?\n\r?\n/.exec(file);
  if (!separator) throw new Error(`Missing body separator in ${id}`);

  const fields = new Map();
  for (const line of file.slice(0, separator.index).split(/\r?\n/)) {
    const field = /^([a-z_]+):[ \t]*(.*)$/.exec(line);
    if (!field || fields.has(field[1])) throw new Error(`Invalid header in ${id}`);
    fields.set(field[1], field[2]);
  }

  const layer = fields.get("layer");
  if (fields.get("id") !== id || !["memory", "whisper", "static"].includes(layer)) {
    throw new Error(`Invalid ID or layer in ${id}`);
  }

  const variant = fields.get("corrupt_variant");
  const audioSrc = fields.get("audio_src");
  if (variant && !/^[a-z0-9-]+\.md$/.test(variant)) {
    throw new Error(`Invalid variant filename in ${id}`);
  }
  if (audioSrc && !/^assets\/audio\/[a-z0-9_-]+\.[a-z0-9]+$/i.test(audioSrc)) {
    throw new Error(`Invalid audio path in ${id}`);
  }

  return {
    title: fields.get("title"),
    type,
    layer,
    audioSrc,
    body: revisit && variant
      ? await fetchText(new URL(variant, url))
      : file.slice(separator.index + separator[0].length),
  };
}

function unvisitedNodes() {
  return [...manifest.nodes.keys()].filter(id => !visited.has(id));
}

function clearEntry() {
  entry.hidden = true;
  if (audio.hasAttribute("src")) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  audio.hidden = true;
}

async function showNode(moveFocus = false) {
  const currentNavigation = ++navigation;
  drift.disabled = true;
  clearEntry();

  let id = window.location.hash.slice(1);
  if (!id) {
    id = manifest.default;
    history.replaceState(null, "", `#${id}`);
  }
  if (!manifest.nodes.has(id)) {
    status.textContent = "Entry not found.";
    drift.disabled = unvisitedNodes().length === 0;
    return;
  }

  status.textContent = "Loading entry…";
  try {
    const node = await loadNode(id, visited.has(id));
    if (currentNavigation !== navigation) return;

    entry.dataset.layer = node.layer;
    entry.dataset.type = node.type;
    title.textContent = node.title ?? "";
    title.hidden = !node.title;
    body.innerHTML = markdown.render(node.body, { nodes: manifest.nodes });
    if (node.audioSrc) {
      audio.src = new URL(node.audioSrc, import.meta.url).href;
      audio.hidden = false;
    }
    entry.hidden = false;
    recordVisit(id);
    const remaining = unvisitedNodes();
    drift.disabled = remaining.length === 0;
    status.textContent = remaining.length ? "" : "All entries visited this session.";
    if (moveFocus) {
      entry.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  } catch (error) {
    if (currentNavigation !== navigation) return;
    console.error(error);
    status.textContent = "Could not load this entry.";
    drift.disabled = unvisitedNodes().some(candidate => candidate !== id);
  }
}

async function start() {
  try {
    status.textContent = "Loading entry…";
    manifest = await loadManifest();
  } catch (error) {
    console.error(error);
    status.textContent = "Could not load the entry index.";
    return;
  }

  window.addEventListener("hashchange", () => showNode(true));
  body.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (link?.getAttribute("href") === window.location.hash &&
        event.button === 0 && !event.ctrlKey && !event.metaKey &&
        !event.shiftKey && !event.altKey) {
      event.preventDefault();
      showNode(true);
    }
  });
  drift.addEventListener("click", () => {
    const id = window.location.hash.slice(1);
    const candidates = unvisitedNodes().filter(candidate => candidate !== id);
    if (candidates.length) {
      window.location.hash = candidates[Math.floor(Math.random() * candidates.length)];
    }
  });
  await showNode();
}

start();
