import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll } from "vitest";

beforeAll(() => {
  Object.defineProperty(window, "scrollTo", {
    configurable: true,
    value: () => undefined,
  });
});

afterEach(() => {
  cleanup();
});
