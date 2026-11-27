import assert from "node:assert/strict";
import test from "node:test";
import { getTimeColumnScrollTop } from "./timePicker";

test("centers the initial hour when the popup first becomes visible", () => {
  assert.equal(getTimeColumnScrollTop({
    scrollTop: 0, viewportHeight: 180, optionTop: 288, optionHeight: 36, center: true,
  }), 216);
});

test("selecting any fully visible hour leaves the list in place", () => {
  for (const optionTop of [216, 252, 288, 324, 360]) {
    assert.equal(getTimeColumnScrollTop({
      scrollTop: 216, viewportHeight: 180, optionTop, optionHeight: 36,
    }), 216);
  }
});

test("keyboard navigation scrolls only enough to reveal an off-screen hour", () => {
  assert.equal(getTimeColumnScrollTop({
    scrollTop: 216, viewportHeight: 180, optionTop: 180, optionHeight: 36,
  }), 180);
  assert.equal(getTimeColumnScrollTop({
    scrollTop: 216, viewportHeight: 180, optionTop: 396, optionHeight: 36,
  }), 252);
});

test("resizing reveals a clipped option without recentering the list", () => {
  assert.equal(getTimeColumnScrollTop({
    scrollTop: 216, viewportHeight: 120, optionTop: 324, optionHeight: 36,
  }), 240);
});

test("waits for a hidden popover and clamps centering at the start of the list", () => {
  assert.equal(getTimeColumnScrollTop({
    scrollTop: 0, viewportHeight: 0, optionTop: 288, optionHeight: 36, center: true,
  }), 0);
  assert.equal(getTimeColumnScrollTop({
    scrollTop: 0, viewportHeight: 180, optionTop: 0, optionHeight: 36, center: true,
  }), 0);
});
