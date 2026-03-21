import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import type { RadarChartDatum } from "@/lib/golf/types";

async function renderChart(data: RadarChartDatum[], size = 260) {
  const { OgRadarChart } = await import("@/lib/golf/og-radar-svg");
  const element = createElement(OgRadarChart, { data, size });
  return renderToStaticMarkup(element);
}

function makeData(values: Partial<Record<string, number | { value: number; skipped: boolean }>>): RadarChartDatum[] {
  const defaults = {
    "Off the Tee": 50,
    "Approach": 50,
    "Around the Green": 50,
    "Putting": 50,
  };
  const merged = { ...defaults, ...values };
  return Object.entries(merged).map(([category, v]) => {
    if (typeof v === "object") {
      return { category, player: v.value, skipped: true };
    }
    return { category, player: v };
  });
}

describe("OgRadarChart", () => {
  it("renders with all values at 50 (peer-equal)", async () => {
    const html = await renderChart(makeData({}));

    // Should contain an SVG element
    expect(html).toContain("<svg");

    // Should contain a path or polygon for the user data
    expect(html).toMatch(/<path[^>]*d="M/);

    // Should contain grid circles (5 levels)
    const circleMatches = html.match(/<circle/g);
    expect(circleMatches).not.toBeNull();
    // At least 5 grid circles + 1 peer baseline = 6+
    expect(circleMatches!.length).toBeGreaterThanOrEqual(6);
  });

  it("renders with one skipped category at value 50", async () => {
    const html = await renderChart(
      makeData({ "Around the Green": { value: 50, skipped: true } })
    );

    // Should still render 4 vertices (skipped plots at 50)
    expect(html).toContain("<svg");
    expect(html).toMatch(/<path[^>]*d="M/);

    // The skipped label should have reduced opacity
    expect(html).toContain("ATG");
  });

  it("renders gracefully with all categories skipped", async () => {
    const data: RadarChartDatum[] = [
      { category: "Off the Tee", player: 50, skipped: true },
      { category: "Approach", player: 50, skipped: true },
      { category: "Around the Green", player: 50, skipped: true },
      { category: "Putting", player: 50, skipped: true },
    ];
    const html = await renderChart(data);

    // Should still render valid SVG (circle at 50% for all)
    expect(html).toContain("<svg");
    expect(html).toMatch(/<path[^>]*d="M/);
  });

  it("handles extreme values: 0 and 100", async () => {
    const html = await renderChart(
      makeData({ "Off the Tee": 0, "Approach": 100, "Around the Green": 0, "Putting": 100 })
    );

    expect(html).toContain("<svg");
    // Path should exist with distinct vertices
    expect(html).toMatch(/<path[^>]*d="M/);
  });

  it("renders asymmetric polygon for mixed values", async () => {
    const html = await renderChart(
      makeData({ "Off the Tee": 80, "Approach": 30, "Around the Green": 60, "Putting": 45 })
    );

    expect(html).toContain("<svg");
    // Should have the green fill color for user polygon
    expect(html).toContain("#166534");
  });

  it("maps full category names to abbreviations", async () => {
    const html = await renderChart(makeData({}));

    // Should use abbreviated labels, not full names
    expect(html).toContain("OTT");
    expect(html).toContain("APP");
    expect(html).toContain("ATG");
    expect(html).toContain("PUTT");

    // Should NOT contain full names in labels
    expect(html).not.toContain("Off the Tee");
    expect(html).not.toContain("Around the Green");
  });
});
