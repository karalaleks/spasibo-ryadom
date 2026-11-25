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
    if (entry.from) item.append(element("p", entry.from, "byline"));
  });
  document.getElementById("messages").replaceChildren(list);
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
  document.getElementById("campaign-ended").hidden = false;
  document.getElementById("closing-card").hidden = false;
  document.getElementById("board-empty").textContent = "На доске пока нет опубликованных благодарностей.";
}

const openForm = document.getElementById("open-form");
const formDialog = document.getElementById("form-dialog");
const formFrame = document.getElementById("form-frame");

if (!campaignEnded && typeof formDialog.showModal === "function") {
  openForm.setAttribute("aria-haspopup", "dialog");
  openForm.setAttribute("aria-controls", formDialog.id);
  openForm.addEventListener("click", event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (!formFrame.hasAttribute("src")) {
      const url = new URL(openForm.href);
      url.searchParams.set("embedded", "true");
      url.searchParams.set("hl", "ru");
      formFrame.src = url.href;
    }

    formDialog.showModal();
  });
}

fetch("results.json", { cache: "no-cache" })
  .then(response => {
    if (!response.ok) throw new Error("Could not load the gratitude board");
    return response.json();
  })
  .then(results => {
    if (!results) return;
    showMessages(results.messages);
    if (campaignEnded) showClosingDetails(results);
  })
  .catch(() => {
    const emptyMessage = document.getElementById("board-empty");
    if (emptyMessage) emptyMessage.textContent = "Благодарности не загрузились. Попробуйте обновить страницу.";
  });
