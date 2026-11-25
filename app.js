import MarkdownIt from "./vendor/markdown-it/markdown-it.esm.min.mjs";
import { drawVoicesFog } from "./fog.js";
import { startWarnerDebris } from "./ruins.js";

const entry = document.querySelector("#node");
const title = document.querySelector("#node-title");
const body = document.querySelector("#node-body");
const audio = document.querySelector("#node-audio");
const back = document.querySelector("#back");
const drift = document.querySelector("#drift");
const status = document.querySelector("#status");

const storageKey = `warner:visited:${new URL("./", import.meta.url).pathname}`;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const pageTypes = new Set(["docs", "voices", "warner"]);
const content = new URL("./content/", import.meta.url);
let manifest;
let navigation = 0;
let fogDrawn = false;
let stopWarnerDebris;

const markdown = new MarkdownIt({ html: false, breaks: true });
const nodeLink = /\[\[([a-z0-9-]+)\|([^\[\]\r\n]+)\]\]/y;
const effectMarker = /\{\{(glitch|wisp|focus)\|([^{}\r\n]+)\}\}/y;
const labelEffects = new RegExp(effectMarker.source, "g");
const inlineEffects = {
  docs: { name: "glitch", className: "archive-glitch" },
  voices: { name: "wisp", className: "voice-wisp" },
  warner: { name: "focus", className: "warner-focus" },
};

function pushEffect(state, effect, text) {
  state.push("span_open", "span", 1).attrSet("class", effect.className);
  state.push("text", "", 0).content = text;
  state.push("span_close", "span", -1);
}

function pushLinkLabel(state, label) {
  const effect = inlineEffects[state.env.type];
  let cursor = 0;
  if (effect) {
    for (const match of label.matchAll(labelEffects)) {
      if (match[1] !== effect.name) continue;
      state.push("text", "", 0).content = label.slice(cursor, match.index);
      pushEffect(state, effect, match[2]);
      cursor = match.index + match[0].length;
    }
  }
  state.push("text", "", 0).content = label.slice(cursor);
}

markdown.inline.ruler.before("link", "entry_effect", (state, silent) => {
  const effect = inlineEffects[state.env.type];
  if (!effect || state.src[state.pos] !== "{") return false;

  effectMarker.lastIndex = state.pos;
  const match = effectMarker.exec(state.src);
  if (!match || match[1] !== effect.name || effectMarker.lastIndex > state.posMax) return false;

  if (!silent) {
    pushEffect(state, effect, match[2]);
  }
  state.pos += match[0].length;
  return true;
});

markdown.inline.ruler.before("link", "warner_link", (state, silent) => {
  if (state.linkLevel > 0 || state.src[state.pos + 1] !== "[") return false;

  nodeLink.lastIndex = state.pos;
  const match = nodeLink.exec(state.src);
  if (!match || nodeLink.lastIndex > state.posMax) return false;

  const [marker, target, phrase] = match;
  if (!silent) {
    if (state.env.nodes.has(target)) {
      state.push("link_open", "a", 1).attrSet("href", `#${target}`);
      pushLinkLabel(state, phrase);
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
  const response = await fetch(url, { cache: "no-cache" });
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
  return { nodes };
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
  if (fields.get("id") !== id || (layer !== undefined && !slug.test(layer))) {
    throw new Error(`Invalid ID or layer in ${id}`);
  }

  const variant = fields.get("corrupt_variant");
  const audioSrc = fields.get("audio_src");
  const driftExclude = fields.get("drift_exclude");
  if (driftExclude !== undefined && !["true", "false"].includes(driftExclude)) {
    throw new Error(`Invalid drift_exclude in ${id}`);
  }
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
    driftExcluded: driftExclude === "true",
    body: revisit && variant
      ? await fetchText(new URL(variant, url))
      : file.slice(separator.index + separator[0].length),
  };
}

function clearAudio() {
  if (audio.hasAttribute("src")) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  audio.hidden = true;
}

function stopDebris() {
  stopWarnerDebris?.();
  stopWarnerDebris = undefined;
}

function clearEntry() {
  stopDebris();
  clearAudio();
  entry.hidden = true;
  title.hidden = true;
}

function addFocusLetters(phrase) {
  const text = phrase.textContent;
  const letters = typeof Intl.Segmenter === "function"
    ? Array.from(new Intl.Segmenter().segment(text), part => part.segment)
    : Array.from(text);

  phrase.replaceChildren(...letters.map(letter => {
    if (/^\s+$/u.test(letter)) return letter;

    const span = document.createElement("span");
    span.className = "focus-letter";
    span.textContent = letter;
    span.style.setProperty("--focus-x", `${(Math.random() * 1.6 - 0.8).toFixed(2)}px`);
    span.style.setProperty("--focus-y", `${(-0.45 - Math.random() * 0.95).toFixed(2)}px`);
    span.style.setProperty("--focus-period", `${(4 + Math.random() * 4).toFixed(2)}s`);
    span.style.setProperty("--focus-delay", `${(-Math.random() * 4).toFixed(2)}s`);
    return span;
  }));
}

async function showNode(moveFocus = false) {
  const currentNavigation = ++navigation;
  drift.disabled = true;
  if (!audio.paused) audio.pause();

  status.textContent = "Loading entry…";
  try {
    let id = window.location.hash.slice(1);
    if (!id) {
      const isCurrent = () => currentNavigation === navigation && !window.location.hash;
      id = await pickDriftEntry([[...manifest.nodes.keys()]], isCurrent);
      if (!isCurrent()) return;
      if (!id) {
        clearEntry();
        status.textContent = "No entries available to open.";
        return;
      }
      history.replaceState(history.state, "", `#${id}`);
    }
    if (!manifest.nodes.has(id)) {
      clearEntry();
      status.textContent = "Entry not found.";
      return;
    }

    const node = await loadNode(id, visited.has(id));
    if (currentNavigation !== navigation) return;
    const renderedBody = markdown.render(node.body, { nodes: manifest.nodes, type: node.type });

    clearAudio();
    if (node.type !== "warner") stopDebris();
    if (node.layer) {
      entry.dataset.layer = node.layer;
    } else {
      delete entry.dataset.layer;
    }
    entry.dataset.type = node.type;
    if (node.type === "voices" && !fogDrawn) {
      drawVoicesFog(document.querySelector("#voices-fog"));
      fogDrawn = true;
    }
    title.textContent = node.title ?? "";
    title.hidden = !node.title;
    body.innerHTML = renderedBody;
    for (const phrase of body.querySelectorAll(".warner-focus")) addFocusLetters(phrase);
    for (const wisp of body.querySelectorAll(".voice-wisp")) {
      wisp.style.setProperty("--wisp-duration", `${7 + Math.random() * 3}s`);
      wisp.style.setProperty("--wisp-delay", `${-Math.random() * 4}s`);
      wisp.style.setProperty("--wisp-drift", (0.8 + Math.random() * 0.4).toFixed(2));
    }
    if (node.audioSrc) {
      audio.src = new URL(node.audioSrc, import.meta.url).href;
      audio.hidden = false;
    }
    entry.hidden = false;
    if (node.type === "warner" && !stopWarnerDebris) {
      stopWarnerDebris = startWarnerDebris(document.querySelector("#warner-debris"));
    }
    recordVisit(id);
    status.textContent = "";
    if (moveFocus) {
      entry.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  } catch (error) {
    if (currentNavigation !== navigation) return;
    clearEntry();
    console.error(error);
    status.textContent = "Could not load this entry.";
  } finally {
    if (currentNavigation === navigation) drift.disabled = false;
  }
}

async function pickDriftEntry(pools, isCurrent) {
  for (const pool of pools) {
    while (pool.length && isCurrent()) {
      const position = Math.floor(Math.random() * pool.length);
      const [candidate] = pool.splice(position, 1);
      const node = await loadNode(candidate, false).catch(error => {
        console.error(error);
        return null;
      });
      if (isCurrent() && node && !node.driftExcluded) return candidate;
    }
  }
}

async function driftToEntry() {
  const hash = window.location.hash;
  const currentNavigation = navigation;
  const id = hash.slice(1);
  const otherIds = [...manifest.nodes.keys()].filter(candidate => candidate !== id);
  const unvisited = otherIds.filter(candidate => !visited.has(candidate));
  const revisits = otherIds.filter(candidate => visited.has(candidate));
  const current = manifest.nodes.has(id) ? [id] : [];
  const isCurrent = () => currentNavigation === navigation && window.location.hash === hash;

  drift.disabled = true;
  try {
    const candidate = await pickDriftEntry([unvisited, revisits, current], isCurrent);
    if (!isCurrent()) return;
    if (!candidate) {
      status.textContent = "No entries available for Drift.";
    } else if (candidate === id) {
      await showNode(true);
    } else {
      window.location.hash = candidate;
    }
  } finally {
    if (isCurrent()) drift.disabled = false;
  }
}

function updateBackButton(hasPrevious) {
  if (typeof history.state?.warnerHasPrevious !== "boolean") {
    history.replaceState({ ...history.state, warnerHasPrevious: hasPrevious }, "");
  }
  back.disabled = !history.state.warnerHasPrevious;
}

async function start() {
  updateBackButton(false);
  back.addEventListener("click", () => history.back());
  try {
    status.textContent = "Loading entry…";
    manifest = await loadManifest();
  } catch (error) {
    console.error(error);
    status.textContent = "Could not load the entry index.";
    return;
  }

  window.addEventListener("hashchange", () => {
    updateBackButton(true);
    showNode(true);
  });
  body.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (link?.getAttribute("href") === window.location.hash &&
        event.button === 0 && !event.ctrlKey && !event.metaKey &&
        !event.shiftKey && !event.altKey) {
      event.preventDefault();
      showNode(true);
    }
  });
  drift.addEventListener("click", driftToEntry);
  await showNode();
}

start();
