"use strict";

const campaignEnd = Date.parse("2026-12-12T00:00:00+03:00");
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

const givenNames = new Map();
const namesByGender = {
  female: `Александра:Александре Алёна:Алёне Алена:Алене Алина:Алине Алиса:Алисе Алла:Алле Анастасия:Анастасии
    Ангелина:Ангелине Анна:Анне Антонина:Антонине Валентина:Валентине Валерия:Валерии Варвара:Варваре
    Василиса:Василисе Вера:Вере Вероника:Веронике Виктория:Виктории Галина:Галине Дарья:Дарье Диана:Диане
    Дина:Дине Евгения:Евгении Екатерина:Екатерине Елена:Елене Елизавета:Елизавете Жанна:Жанне
    Зинаида:Зинаиде Злата:Злате Зоя:Зое Инна:Инне Ирина:Ирине Карина:Карине Кира:Кире Кристина:Кристине
    Ксения:Ксении Лариса:Ларисе Лидия:Лидии Лилия:Лилии Любовь:Любови Людмила:Людмиле Майя:Майе
    Маргарита:Маргарите Марина:Марине Мария:Марии Милана:Милане Надежда:Надежде Наталия:Наталии
    Наталья:Наталье Нина:Нине Оксана:Оксане Олеся:Олесе Ольга:Ольге Полина:Полине Раиса:Раисе
    Регина:Регине Светлана:Светлане София:Софии Софья:Софье Тамара:Тамаре Татьяна:Татьяне Ульяна:Ульяне
    Элина:Элине Эльвира:Эльвире Эльнара:Эльнаре Юлия:Юлии Яна:Яне Асель:Асель Марьям:Марьям Сабрие:Сабрие
    Аня:Ане Даша:Даше Катя:Кате Лена:Лене Лиличка:Лиличке Маша:Маше Наташа:Наташе Оля:Оле Олечка:Олечке Света:Свете Таня:Тане Юля:Юле`,
  male: `Александр:Александру Алексей:Алексею Анатолий:Анатолию Андрей:Андрею Антон:Антону Аркадий:Аркадию
    Арсений:Арсению Артём:Артёму Артем:Артему Артур:Артуру Борис:Борису Вадим:Вадиму Валентин:Валентину
    Валерий:Валерию Василий:Василию Виктор:Виктору Виталий:Виталию Владимир:Владимиру Владислав:Владиславу
    Вячеслав:Вячеславу Геннадий:Геннадию Георгий:Георгию Глеб:Глебу Григорий:Григорию Даниил:Даниилу
    Данил:Данилу Денис:Денису Дмитрий:Дмитрию Евгений:Евгению Егор:Егору Иван:Ивану Игорь:Игорю
    Илья:Илье Кирилл:Кириллу Константин:Константину Лев:Льву Леонид:Леониду Максим:Максиму
    Матвей:Матвею Михаил:Михаилу Никита:Никите Николай:Николаю Олег:Олегу Павел:Павлу Пётр:Петру
    Петр:Петру Роман:Роману Руслан:Руслану Семён:Семёну Семен:Семену Сергей:Сергею Станислав:Станиславу
    Степан:Степану Тимофей:Тимофею Фёдор:Фёдору Федор:Федору Эльдар:Эльдару Юрий:Юрию Ярослав:Ярославу
    Дима:Диме Коля:Коле Лёша:Лёше Леша:Леше Миша:Мише Паша:Паше Петя:Пете
    Серёжа:Серёже Сережа:Сереже Тёма:Тёме`,
};
for (const [gender, entries] of Object.entries(namesByGender)) {
  for (const pair of entries.split(/\s+/)) {
    const [given, dative] = pair.toLowerCase().split(":");
    givenNames.set(given, { dative, gender });
  }
}
givenNames.set("саша", { dative: "саше" });
givenNames.set("женя", { dative: "жене" });
givenNames.set("валя", { dative: "вале" });

function preserveCapitalization(source, inflected) {
  if (source === source.toUpperCase()) return inflected.toUpperCase();
  if (source[0] === source[0].toUpperCase()) return inflected[0].toUpperCase() + inflected.slice(1);
  return inflected;
}

function genitiveGivenName(given, dative) {
  if (given.endsWith("а")) {
    const stem = given.slice(0, -1);
    return stem + (/[гкхжчшщ]$/.test(stem) ? "и" : "ы");
  }
  if (given.endsWith("я")) return given.slice(0, -1) + "и";
  if (dative.endsWith("у")) return dative.slice(0, -1) + "а";
  if (dative.endsWith("ю")) return dative.slice(0, -1) + "я";
  return dative;
}

const obliqueGivenNames = new Map();
for (const [given, name] of givenNames) {
  for (const form of new Set([name.dative, genitiveGivenName(given, name.dative)])) {
    if (givenNames.has(form)) continue;
    const previous = obliqueGivenNames.get(form);
    obliqueGivenNames.set(form, previous && previous.gender !== name.gender ? { gender: null } : name);
  }
}

const femaleFamilyEndings = [
  [/(?:овна|евна|ёвна|инична|ична)$/, 1, "е", "ы"],
  [/(?:ова|ева|ёва|ина|ына)$/, 1, "ой", "ой"],
  [/(?:яя|[жчшщ]ая)$/, 2, "ей", "ей"],
  [/ая$/, 2, "ой", "ой"],
];

const maleFamilyEndings = [
  [/(?:[гкх]ий|ый|ой)$/, 2, "ому", "ого"],
  [/ий$/, 2, "ему", "его"],
  [/[ьй]$/, 1, "ю", "я"],
  [/[бвгджзклмнпрстфхцчшщ]$/, 0, "у", "а"],
];

const indeclinableVowelSurnames = new Set(["дюма", "золя", "делакруа", "дега", "ферма"]);
const vowelFamilyEndings = [
  [/ия$/, 1, "и", "и"],
  [/я$/, 1, "е", "и"],
  [/[гкхжчшщ]а$/, 1, "е", "и"],
  [/[бвдзлмнпрстфц]а$/, 1, "е", "ы"],
];

function inflectFamilyNamePart(part, gender, nameCase, givenAlreadyInflected) {
  const lower = part.toLowerCase();
  if (/(?:ых|их)$/.test(lower) || indeclinableVowelSurnames.has(lower)) return part;
  // After a declined male given name, -а or -я may already be a genitive ending.
  const commonEndings = gender === "male" && givenAlreadyInflected ? [] : vowelFamilyEndings;
  const endings = gender === "female" ? femaleFamilyEndings : maleFamilyEndings;
  const ending = [...endings, ...commonEndings].find(([pattern]) => pattern.test(lower));
  if (!ending) return part;
  const [, trim, dative, genitive] = ending;
  const suffix = nameCase === "genitive" ? genitive : dative;
  return preserveCapitalization(part, lower.slice(0, lower.length - trim) + suffix);
}

function inflectPersonName(personName, nameCase) {
  const parts = personName.trim().split(/\s+/);
  if (parts.length > 3 || !parts.every(part => /^[а-яё]+(?:-[а-яё]+)*\.?$/iu.test(part))) return personName;
  const lowerParts = parts.map(part => part.toLowerCase());
  let knownNames = lowerParts.map(part => givenNames.get(part));
  const givenAlreadyInflected = !knownNames.some(Boolean);
  if (givenAlreadyInflected) knownNames = lowerParts.map(part => obliqueGivenNames.get(part));
  if (knownNames.filter(Boolean).length !== 1) return personName;
  const nameIndex = knownNames.findIndex(Boolean);
  const name = knownNames[nameIndex];
  const given = lowerParts[nameIndex];
  const inflected = nameCase === "genitive" ? genitiveGivenName(given, name.dative) : name.dative;
  return parts.map((part, index) => {
    if (index === nameIndex) return givenAlreadyInflected ? part : preserveCapitalization(part, inflected);
    if (!name.gender) return part;
    return part.split("-").map(word => inflectFamilyNamePart(word, name.gender, nameCase, givenAlreadyInflected)).join("-");
  }).join(" ");
}

function showMessages(messages) {
  if (!Array.isArray(messages)) return;
  const publishableMessages = messages.filter(entry => entry?.to && entry?.text);
  if (!publishableMessages.length) return;
  const list = makeList(publishableMessages, "message-list", (item, entry) => {
    const header = element("header");
    const recipient = entry.to.replace(/(?<!\p{L})(Мавиле\s+)Усеиновна(?!\p{L})/gu, "$1Усеиновне");
    header.append(element("h3", inflectPersonName(recipient, "dative"), "card-heading"));
    if (entry.unit) header.append(element("p", entry.unit, "recipient-unit"));
    item.append(header, element("p", entry.text, "message-text"));
    if (entry.from) item.append(element("p", `От кого: ${inflectPersonName(entry.from, "genitive")}`, "byline"));
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

  const header = rows.shift();
  const legacyHeader = "Кому,От кого,Благодарность";
  if (![legacyHeader, legacyHeader + ",Аптека или подразделение"].includes(header?.join(","))) {
    throw new Error("The gratitude feed returned an unexpected header");
  }
  if (consumed !== source.length || rows.some(row => row.length < 3 || row.length > header.length)) {
    throw new Error("The gratitude feed returned an incomplete CSV");
  }

  return rows.reverse()
    .filter(row => row.slice(0, 3).every(value => value.trim()))
    .map(([to, from, text, unit = ""]) => ({ to, from, text, unit: unit.trim() }));
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
