import { describe, expect, it } from "vitest";

import { orderTotal } from "./calc";

describe("orderTotal", () => {
  it("adds shipping to quantity times unit price", () => {
    expect(orderTotal(3, 10, 7)).toBe(37);
  });
});
