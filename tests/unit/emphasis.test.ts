import { describe, it, expect } from "vitest";
import { getEmphasizedCategories } from "@/lib/golf/emphasis";
import type { StrokesGainedCategory } from "@/lib/golf/types";
import { makeSGResult } from "../fixtures/factories";

describe("getEmphasizedCategories", () => {
  it("returns putting and ATG for standard round with high/medium confidence", () => {
    const result = makeSGResult({
      confidence: {
        "off-the-tee": "medium",
        approach: "high",
        "around-the-green": "medium",
        putting: "high",
      },
      skippedCategories: [],
    });
    expect(getEmphasizedCategories(result)).toEqual([
      "putting",
      "around-the-green",
    ]);
  });

  it("returns only putting when ATG confidence is low", () => {
    const result = makeSGResult({
      confidence: {
        "off-the-tee": "medium",
        approach: "high",
        "around-the-green": "low",
        putting: "high",
      },
      skippedCategories: [],
    });
    expect(getEmphasizedCategories(result)).toEqual(["putting"]);
  });

  it("returns only putting when ATG is skipped", () => {
    const result = makeSGResult({
      confidence: {
        "off-the-tee": "medium",
        approach: "high",
        "around-the-green": "medium",
        putting: "high",
      },
      skippedCategories: ["around-the-green"],
    });
    expect(getEmphasizedCategories(result)).toEqual(["putting"]);
  });

  it("returns only putting when ATG is skipped AND low confidence", () => {
    const result = makeSGResult({
      confidence: {
        "off-the-tee": "medium",
        approach: "high",
        "around-the-green": "low",
        putting: "high",
      },
      skippedCategories: ["around-the-green"],
    });
    expect(getEmphasizedCategories(result)).toEqual(["putting"]);
  });

  it("returns empty array when both putting and ATG are skipped", () => {
    const result = makeSGResult({
      confidence: {
        "off-the-tee": "medium",
        approach: "high",
        "around-the-green": "medium",
        putting: "high",
      },
      skippedCategories: ["putting", "around-the-green"],
    });
    expect(getEmphasizedCategories(result)).toEqual([]);
  });

  it("handles undefined skippedCategories defensively", () => {
    const result = {
      ...makeSGResult({
        confidence: {
          "off-the-tee": "medium",
          approach: "high",
          "around-the-green": "high",
          putting: "high",
        },
      }),
      // Simulate runtime edge case where field is missing/undefined
      skippedCategories: undefined as unknown as StrokesGainedCategory[],
    };
    expect(() => getEmphasizedCategories(result)).not.toThrow();
    expect(getEmphasizedCategories(result)).toEqual([
      "putting",
      "around-the-green",
    ]);
  });
});
