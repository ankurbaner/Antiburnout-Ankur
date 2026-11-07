// @vitest-environment jsdom
import { expect, it } from "vitest";
import { initSmile } from "../src/smileUI";

it("does nothing when the Smile stage is absent", () => {
  document.body.replaceChildren();
  expect(() => initSmile()).not.toThrow();
  expect(document.body.children).toHaveLength(0);
});
