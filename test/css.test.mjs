import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(^|\\n)${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[2] ?? "";
}

test("hover styles do not change slider dimensions or layout", () => {
  const hoverBodies = [...css.matchAll(/[^{}]*:hover[^{}]*\{([\s\S]*?)\}/g)].map(
    (match) => match[1]
  );
  assert.ok(hoverBodies.length > 0, "expected at least one hover rule");

  for (const body of hoverBodies) {
    assert.doesNotMatch(
      body,
      /\b(width|height|max-width|max-height|min-width|min-height|padding|margin|border-width|transform|scale|zoom|object-fit|display|position|top|right|bottom|left)\s*:/
    );
  }
});

test("image fit and frame sizing are stable", () => {
  const frame = ruleBody(".simple-image-slider__frame");
  const image = ruleBody(".simple-image-slider__image");

  assert.match(frame, /aspect-ratio\s*:\s*4\s*\/\s*3/);
  assert.match(frame, /overflow\s*:\s*hidden/);
  assert.match(image, /object-fit\s*:\s*contain/);
  assert.match(image, /height\s*:\s*auto/);
  assert.match(image, /width\s*:\s*100%/);
});
