import { formatResultAsMarkdown, generateClarityResult } from "./clarity.js";

const SAMPLE_NOTES = `The onboarding launch is close but the team still needs one source of truth.
Customers are confused by the current setup checklist because billing, workspace invites, and analytics appear in different places.
Need to decide whether the new checklist ships to all workspaces or only new accounts.
Action: Maya will review activation data and send a recommendation by Friday.
What support article should we update before launch?`;

const form = document.querySelector("#clarity-form");
const input = document.querySelector("#notes");
const audience = document.querySelector("#audience");
const tone = document.querySelector("#tone");
const format = document.querySelector("#format");
const includeActionItems = document.querySelector("#include-actions");
const resultPanel = document.querySelector("#result-panel");
const resultContent = document.querySelector("#result-content");
const emptyState = document.querySelector("#empty-state");
const scoreValue = document.querySelector("#score-value");
const wordCount = document.querySelector("#word-count");
const copyButton = document.querySelector("#copy-result");
const sampleButton = document.querySelector("#load-sample");
const resetButton = document.querySelector("#reset-form");
const statusMessage = document.querySelector("#status-message");

let currentMarkdown = "";

restoreDraft();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generate();
});

input.addEventListener("input", () => {
  persistDraft();
  updateWordCount();
});

[audience, tone, format, includeActionItems].forEach((control) => {
  control.addEventListener("change", persistDraft);
});

sampleButton.addEventListener("click", () => {
  input.value = SAMPLE_NOTES;
  audience.value = "executive";
  tone.value = "confident";
  format.value = "update";
  includeActionItems.checked = true;
  persistDraft();
  updateWordCount();
  generate();
});

resetButton.addEventListener("click", () => {
  form.reset();
  currentMarkdown = "";
  localStorage.removeItem("clarity-generator:draft");
  resultContent.replaceChildren();
  resultPanel.hidden = true;
  emptyState.hidden = false;
  scoreValue.textContent = "--";
  updateWordCount();
  showStatus("Draft cleared.");
});

copyButton.addEventListener("click", async () => {
  if (!currentMarkdown) {
    showStatus("Generate a brief before copying.");
    return;
  }

  try {
    await navigator.clipboard.writeText(currentMarkdown);
    showStatus("Copied generated brief.");
  } catch {
    showStatus("Copy failed. Select the generated text manually.");
  }
});

function generate() {
  try {
    const result = generateClarityResult(input.value, {
      audience: audience.value,
      tone: tone.value,
      format: format.value,
      includeActionItems: includeActionItems.checked,
    });

    renderResult(result);
    currentMarkdown = formatResultAsMarkdown(result);
    persistDraft();
    showStatus("Generated a clearer brief.");
  } catch (error) {
    showStatus(error.message);
  }
}

function renderResult(result) {
  resultPanel.hidden = false;
  emptyState.hidden = true;
  scoreValue.textContent = String(result.score);
  resultContent.replaceChildren();

  const headline = document.createElement("h3");
  headline.textContent = result.headline;
  resultContent.append(headline);

  const meta = document.createElement("p");
  meta.className = "result-meta";
  meta.textContent = `For ${result.audience} • ${result.wordCount} words analyzed`;
  resultContent.append(meta);

  resultContent.append(createSection("Summary", result.summary));

  if (result.actionItems.length > 0) {
    resultContent.append(createSection("Action items", result.actionItems));
  }

  if (result.questions.length > 0) {
    resultContent.append(createSection("Open questions", result.questions));
  }

  resultContent.append(createSection("Clarity tips", result.tips));
}

function createSection(title, items) {
  const section = document.createElement("section");
  const heading = document.createElement("h4");
  const list = document.createElement("ul");

  heading.textContent = title;
  section.append(heading);

  for (const item of items) {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    list.append(listItem);
  }

  section.append(list);
  return section;
}

function updateWordCount() {
  const count = input.value.trim() ? input.value.trim().split(/\s+/).length : 0;
  wordCount.textContent = `${count} word${count === 1 ? "" : "s"}`;
}

function persistDraft() {
  const draft = {
    notes: input.value,
    audience: audience.value,
    tone: tone.value,
    format: format.value,
    includeActionItems: includeActionItems.checked,
  };

  localStorage.setItem("clarity-generator:draft", JSON.stringify(draft));
}

function restoreDraft() {
  const rawDraft = localStorage.getItem("clarity-generator:draft");

  if (!rawDraft) {
    updateWordCount();
    return;
  }

  try {
    const draft = JSON.parse(rawDraft);
    input.value = draft.notes ?? "";
    audience.value = draft.audience ?? "general";
    tone.value = draft.tone ?? "plain";
    format.value = draft.format ?? "brief";
    includeActionItems.checked = draft.includeActionItems ?? true;
  } catch {
    localStorage.removeItem("clarity-generator:draft");
  }

  updateWordCount();
}

function showStatus(message) {
  statusMessage.textContent = message;
  window.clearTimeout(showStatus.timeoutId);
  showStatus.timeoutId = window.setTimeout(() => {
    statusMessage.textContent = "";
  }, 3200);
}
