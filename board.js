"use strict";

const campaignEnd = Date.parse("2026-12-09T00:00:00+03:00");
const campaignEnded = Date.now() >= campaignEnd;

function element(tag, text, className) {
  const result = document.createElement(tag);
  if (text) result.textContent = text;
  if (className) result.className = className;
  return result;
}

function makeList(entries, className, renderEntry) {
  const list = element("ul", "", className);
  for (const entry of entries) {
    const item = element("li");
    renderEntry(item, entry);
    list.append(item);
  }
  return list;
}

function showMessages(messages) {
  if (!Array.isArray(messages)) return;
  const publishableMessages = messages.filter(entry => entry?.to && entry?.text);
  if (!publishableMessages.length) return;
  const list = makeList(publishableMessages, "message-list", (item, entry) => {
    item.append(
      element("h3", entry.to, "card-heading"),
      element("p", entry.text, "message-text"),
    );
    if (entry.from) item.append(element("p", `От кого: ${entry.from}`, "byline"));
  });
  messagesContainer.replaceChildren(list);
}

function showClosingDetails({ total, stories }) {
  if (Number.isSafeInteger(total) && total >= 0) {
    const format = new Intl.NumberFormat("ru");
    document.getElementById("closing-note").textContent =
      `Всего коллеги отправили благодарностей: ${format.format(total)}.`;
  }

  if (!Array.isArray(stories)) return;
  const publishableStories = stories.filter(story => story?.title && story?.text).slice(0, 3);
  if (!publishableStories.length) return;
  const container = document.getElementById("closing-stories");
  container.replaceChildren(makeList(publishableStories, "story-list", (item, story) => {
    item.append(element("h3", story.title), element("p", story.text));
  }));
  container.hidden = false;
}

if (campaignEnded) {
  document.getElementById("campaign-invitation").hidden = true;
  document.getElementById("board-actions").hidden = true;
  document.getElementById("campaign-ended").hidden = false;
  document.getElementById("closing-card").hidden = false;
  document.getElementById("board-empty").textContent = "На доске пока нет опубликованных благодарностей.";
}

const formDialog = document.getElementById("form-dialog");
const formFrame = document.getElementById("form-frame");

if (!campaignEnded && typeof formDialog.showModal === "function") {
  for (const id of ["open-form", "open-form-bottom"]) {
    const link = document.getElementById(id);
    link.setAttribute("aria-haspopup", "dialog");
    link.setAttribute("aria-controls", formDialog.id);
    link.addEventListener("click", event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (!formFrame.hasAttribute("src")) {
        const url = new URL(link.href);
        url.searchParams.set("embedded", "true");
        url.searchParams.set("hl", "ru");
        formFrame.src = url.href;
      }

      formDialog.showModal();
    });
  }
}

const publicFeedUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfgxCn2Dr7pyyqJHCTD3zANs1CPolL4Ve9H2PkBSkCUc5P1-OtGkilOW3GmGX_8hb36jQC-3GqmdI7/pub?gid=873401514&single=true&output=csv";
const localResults = fetch("results.json", { cache: "no-cache" })
  .then(response => response.ok ? response.json() : null)
  .catch(() => null);
const feedCacheKey = "spasibo-ryadom.public-feed.v1";
const feedCacheLifetime = 5 * 60 * 1000;
const messagesContainer = document.getElementById("messages");
const emptyMessage = document.getElementById("board-empty");
const emptyState = emptyMessage.parentElement;
const defaultEmptyMessage = emptyMessage.textContent;

let publicFeed = readCachedFeed();
let smallerFeedKey = null;
let boardRefreshing = false;
let lastRenderKey;

function parsePublicFeed(csv) {
  const rows = [];
  let row = [];
  const fields = /("(?:[^"]|"")*"|[^",\r\n]*)(,|\r\n|\n|\r|$)/gy;
  const source = csv.replace(/^\uFEFF/, "");
  let consumed = 0;
  for (const match of source.matchAll(fields)) {
    const [, raw, separator] = match;
    consumed = match.index + match[0].length;
    row.push(raw.startsWith('"') ? raw.slice(1, -1).replace(/""/g, '"') : raw);
    if (separator !== ",") {
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
    }
  }

  if (consumed !== source.length || rows.some(row => row.length !== 3)) {
    throw new Error("The gratitude feed returned an incomplete CSV");
  }

  const header = rows.shift();
  if (header?.join(",") !== "Кому,От кого,Благодарность") {
    throw new Error("The gratitude feed returned an unexpected header");
  }
  return rows.reverse()
    .filter(row => row.every(value => value.trim()))
    .map(([to, from, text]) => ({ to, from, text }));
}

function feedIsRecent(feed) {
  const age = Date.now() - feed?.checkedAt;
  return age >= 0 && age < feedCacheLifetime;
}

function readCachedFeed() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(feedCacheKey));
    if (feedIsRecent(cached) && typeof cached.csv === "string") {
      return { checkedAt: cached.checkedAt, messages: parsePublicFeed(cached.csv) };
    }
  } catch {
    // Storage is optional, including in browsers that block it.
  }
  return null;
}

function updatePublicFeed(csv) {
  const messages = parsePublicFeed(csv);
  const key = JSON.stringify(messages);
  if (feedIsRecent(publicFeed) && messages.length < publicFeed.messages.length &&
      smallerFeedKey !== key) {
    // Google can alternate between current and older published snapshots.
    smallerFeedKey = key;
    return;
  }

  const checkedAt = Date.now();
  publicFeed = { messages, checkedAt };
  smallerFeedKey = null;
  try {
    sessionStorage.setItem(feedCacheKey, JSON.stringify({ csv, checkedAt }));
  } catch {
    // The current tab can still render the feed without storage.
  }
}

function renderBoard(results, status = "") {
  const recentMessages = feedIsRecent(publicFeed) ? publicFeed.messages : [];
  const staticMessages = Array.isArray(results?.messages) ? results.messages : [];
  const messages = [...recentMessages, ...staticMessages];
  const renderKey = JSON.stringify([messages, status]);
  if (renderKey === lastRenderKey) return;
  lastRenderKey = renderKey;

  if (messages.some(entry => entry?.to && entry?.text)) {
    showMessages(messages);
    if (status) messagesContainer.append(element("p", status, "empty"));
  } else {
    emptyMessage.textContent = status || defaultEmptyMessage;
    messagesContainer.replaceChildren(emptyState);
  }
}

async function refreshBoard() {
  if (boardRefreshing) return;
  boardRefreshing = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let status = "";
  try {
    const url = new URL(publicFeedUrl);
    url.searchParams.set("_board", String(Date.now()));
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("Could not load the public gratitude feed");
    updatePublicFeed(await response.text());
  } catch (error) {
    smallerFeedKey = null;
    if (!feedIsRecent(publicFeed)) {
      status = "Не удалось обновить ленту. Попробуем снова автоматически.";
    }
    console.warn("Публичная лента благодарностей временно недоступна.", error);
  } finally {
    clearTimeout(timeout);
    renderBoard(await localResults, status);
    boardRefreshing = false;
  }
}

if (feedIsRecent(publicFeed)) {
  renderBoard(null);
} else {
  emptyMessage.textContent = "Загружаем благодарности…";
}

localResults.then(results => {
  if (results && campaignEnded) showClosingDetails(results);
  if (feedIsRecent(publicFeed)) renderBoard(results);
});

refreshBoard();
formDialog.addEventListener("close", refreshBoard);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshBoard();
});
setInterval(() => {
  if (!document.hidden) refreshBoard();
}, 30000);
