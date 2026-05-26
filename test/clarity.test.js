import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateClarityScore,
  detectActionItems,
  detectOpenQuestions,
  extractKeywords,
  formatResultAsMarkdown,
  generateClarityResult,
  splitSentences,
} from "../src/clarity.js";

const NOTES = `The onboarding launch is close but the team still needs one source of truth.
Customers are confused by the current setup checklist because billing and analytics appear in different places.
Action: Maya will review activation data and send a recommendation by Friday.
What support article should we update before launch?`;

test("splitSentences handles prose and note-style line breaks", () => {
  assert.deepEqual(splitSentences("First idea. Second idea?\n- Third idea"), [
    "First idea.",
    "Second idea?",
    "Third idea",
  ]);
});

test("extractKeywords returns repeated meaningful terms first", () => {
  assert.deepEqual(extractKeywords("Launch notes clarify launch risk and customer risk", 3), [
    "launch",
    "risk",
    "clarify",
  ]);
});

test("detectActionItems finds explicit next steps", () => {
  assert.deepEqual(detectActionItems(NOTES), [
    "Action: Maya will review activation data and send a recommendation by Friday.",
  ]);
});

test("detectOpenQuestions finds unresolved questions", () => {
  assert.deepEqual(detectOpenQuestions(NOTES), [
    "What support article should we update before launch?",
  ]);
});

test("generateClarityResult creates a complete brief", () => {
  const result = generateClarityResult(NOTES, {
    audience: "executive",
    tone: "confident",
    format: "update",
  });

  assert.match(result.headline, /^Recommended direction:/);
  assert.equal(result.audience, "executive stakeholders");
  assert.ok(result.summary.length >= 3);
  assert.ok(result.actionItems.length >= 1);
  assert.ok(result.questions.length >= 1);
  assert.ok(result.score > 0);
  assert.ok(result.wordCount > 20);
});

test("formatResultAsMarkdown serializes all generated sections", () => {
  const markdown = formatResultAsMarkdown(
    generateClarityResult(NOTES, {
      audience: "customer",
      tone: "friendly",
      format: "brief",
    }),
  );

  assert.match(markdown, /^# Here is the clearest version:/);
  assert.match(markdown, /## Summary/);
  assert.match(markdown, /## Action items/);
  assert.match(markdown, /## Open questions/);
  assert.match(markdown, /## Clarity tips/);
});

test("calculateClarityScore returns zero for empty input", () => {
  assert.equal(calculateClarityScore("   "), 0);
});

test("generateClarityResult requires non-empty input", () => {
  assert.throws(() => generateClarityResult(""), /Add notes/);
});
