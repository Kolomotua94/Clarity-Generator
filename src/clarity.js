const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "can",
  "for",
  "from",
  "has",
  "have",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "so",
  "that",
  "the",
  "their",
  "this",
  "to",
  "we",
  "with",
  "will",
  "you",
]);

const AUDIENCE_LABELS = {
  general: "general readers",
  executive: "executive stakeholders",
  technical: "technical teammates",
  customer: "customers",
};

const TONE_PREFIX = {
  plain: "",
  confident: "Recommended direction: ",
  friendly: "Here is the clearest version: ",
  urgent: "Priority update: ",
};

const FORMAT_LIMITS = {
  brief: 3,
  plan: 5,
  update: 4,
};

export function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitSentences(value) {
  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);
}

export function extractKeywords(value, limit = 6) {
  const counts = new Map();
  const words = normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

export function calculateClarityScore(value) {
  const sentences = splitSentences(value);

  if (sentences.length === 0) {
    return 0;
  }

  const words = normalizeWhitespace(value).split(/\s+/).filter(Boolean);
  const averageSentenceLength = words.length / sentences.length;
  const longSentencePenalty = Math.max(0, averageSentenceLength - 18) * 1.5;
  const questionPenalty = detectOpenQuestions(value).length * 4;
  const actionBonus = Math.min(detectActionItems(value).length * 4, 12);
  const structureBonus = /\n[-*\d]/.test(value) ? 8 : 0;
  const keywordBonus = Math.min(extractKeywords(value).length * 2, 10);
  const score = 74 - longSentencePenalty - questionPenalty + actionBonus + structureBonus + keywordBonus;

  return Math.max(1, Math.min(100, Math.round(score)));
}

export function detectActionItems(value) {
  const lines = normalizeWhitespace(value).split("\n");
  const actionPatterns = [
    /\b(action|todo|next step|follow up|owner|due)\b/i,
    /\b(need to|needs to|must|should|ship|send|review|decide|schedule|confirm|publish)\b/i,
    /^[-*]\s+\[[ x]\]/i,
  ];

  return lines
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((line) => !isQuestionLine(line))
    .filter((line) => actionPatterns.some((pattern) => pattern.test(line)))
    .slice(0, 6);
}

export function detectOpenQuestions(value) {
  return splitSentences(value)
    .filter((sentence) => {
      const lower = sentence.toLowerCase();
      return (
        sentence.endsWith("?") ||
        lower.startsWith("how ") ||
        lower.startsWith("what ") ||
        lower.startsWith("when ") ||
        lower.startsWith("where ") ||
        lower.startsWith("why ") ||
        lower.startsWith("who ")
      );
    })
    .slice(0, 5);
}

export function generateClarityResult(value, options = {}) {
  const text = normalizeWhitespace(value);

  if (!text) {
    throw new Error("Add notes, thoughts, or a draft before generating clarity.");
  }

  const audience = options.audience ?? "general";
  const tone = options.tone ?? "plain";
  const format = options.format ?? "brief";
  const sentences = splitSentences(text);
  const keywords = extractKeywords(text);
  const summaryLimit = FORMAT_LIMITS[format] ?? FORMAT_LIMITS.brief;
  const summary = buildSummary(sentences, keywords, summaryLimit);
  const actionItems = options.includeActionItems === false ? [] : buildActionItems(text, sentences);
  const questions = detectOpenQuestions(text);
  const headline = buildHeadline(sentences, keywords, tone);
  const tips = buildTips(text, sentences, actionItems, questions);

  return {
    headline,
    audience: AUDIENCE_LABELS[audience] ?? AUDIENCE_LABELS.general,
    summary,
    actionItems,
    questions,
    tips,
    score: calculateClarityScore(text),
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

export function formatResultAsMarkdown(result) {
  const sections = [
    `# ${result.headline}`,
    `Audience: ${result.audience}`,
    "",
    "## Summary",
    ...result.summary.map((item) => `- ${item}`),
  ];

  if (result.actionItems.length > 0) {
    sections.push("", "## Action items", ...result.actionItems.map((item) => `- ${item}`));
  }

  if (result.questions.length > 0) {
    sections.push("", "## Open questions", ...result.questions.map((item) => `- ${item}`));
  }

  sections.push("", "## Clarity tips", ...result.tips.map((item) => `- ${item}`));

  return sections.join("\n");
}

function buildSummary(sentences, keywords, limit) {
  const meaningful = sentences
    .filter((sentence) => sentence.length > 8)
    .sort((a, b) => scoreSentence(b, keywords) - scoreSentence(a, keywords));
  const selected = meaningful.slice(0, limit);

  if (selected.length === 0) {
    return ["Capture the core idea in one complete sentence."];
  }

  return selected.map((sentence) => tightenSentence(sentence));
}

function buildActionItems(text, sentences) {
  const detected = detectActionItems(text);

  if (detected.length > 0) {
    return detected.map((item) => toActionItem(item));
  }

  return sentences
    .filter((sentence) => /\b(decide|finish|launch|review|send|update|share|meet)\b/i.test(sentence))
    .slice(0, 3)
    .map((sentence) => toActionItem(sentence));
}

function buildHeadline(sentences, keywords, tone) {
  const topic = keywords.slice(0, 3).join(", ");
  const base = sentences[0] ? tightenSentence(sentences[0]) : `Clarify ${topic || "the idea"}`;
  const trimmed = base.length > 72 ? `${base.slice(0, 69).trim()}...` : base;

  return `${TONE_PREFIX[tone] ?? ""}${trimmed}`;
}

function buildTips(text, sentences, actionItems, questions) {
  const tips = [];
  const averageLength = text.split(/\s+/).filter(Boolean).length / Math.max(sentences.length, 1);

  if (averageLength > 22) {
    tips.push("Split long sentences so each one carries a single idea.");
  }

  if (actionItems.length === 0) {
    tips.push("Add an explicit owner and next step for the most important decision.");
  }

  if (questions.length > 0) {
    tips.push("Resolve or assign each open question before sharing the brief.");
  }

  if (!/\b(because|so that|therefore|goal|outcome)\b/i.test(text)) {
    tips.push("State the desired outcome so readers understand why the work matters.");
  }

  if (tips.length === 0) {
    tips.push("The draft is structured well; keep the final version concise.");
  }

  return tips.slice(0, 4);
}

function scoreSentence(sentence, keywords) {
  const lower = sentence.toLowerCase();
  const keywordScore = keywords.filter((keyword) => lower.includes(keyword)).length * 4;
  const lengthScore = sentence.length > 55 && sentence.length < 180 ? 4 : 0;
  const actionScore = /\b(goal|because|decide|need|impact|customer|deadline|risk)\b/i.test(sentence) ? 3 : 0;

  return keywordScore + lengthScore + actionScore;
}

function isQuestionLine(line) {
  const lower = line.toLowerCase();

  return (
    line.endsWith("?") ||
    lower.startsWith("how ") ||
    lower.startsWith("what ") ||
    lower.startsWith("when ") ||
    lower.startsWith("where ") ||
    lower.startsWith("why ") ||
    lower.startsWith("who ")
  );
}

function tightenSentence(sentence) {
  return sentence
    .replace(/\b(just|really|very|basically|actually)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[a-z]/, (letter) => letter.toUpperCase());
}

function toActionItem(sentence) {
  const clean = tightenSentence(sentence).replace(/\.$/, "");

  if (/^(action|todo|next step):/i.test(clean)) {
    return clean;
  }

  return `Next step: ${clean}`;
}
