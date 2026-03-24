// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Capture props passed to ResponsiveRadar
const mockResponsiveRadar = vi.fn(() => <svg data-testid="mock-radar" />);
vi.mock("@nivo/radar", () => ({
  ResponsiveRadar: (props: Record<string, unknown>) => {
    mockResponsiveRadar(props);
    return <svg data-testid="mock-radar" />;
  },
}));

import { render } from "@testing-library/react";
import { RadarChart } from "@/components/charts/radar-chart";

const sampleData = [
  { category: "Off the Tee", player: 60 },
  { category: "Approach", player: 45 },
  { category: "Around the Green", player: 55 },
  { category: "Putting", player: 50 },
];

afterEach(() => {
  cleanup();
  mockResponsiveRadar.mockClear();
});

describe("RadarChart", () => {
  describe("default (non-compact) mode", () => {
    it("renders with default colors, fillOpacity, and margins", () => {
      render(<RadarChart data={sampleData} bracketLabel="10–15 HCP" />);

      expect(mockResponsiveRadar).toHaveBeenCalledTimes(1);
      const props = mockResponsiveRadar.mock.calls[0][0] as Record<string, unknown>;
      expect(props.colors).toEqual(["#166534"]);
      expect(props.fillOpacity).toBe(0.25);
      expect(props.margin).toEqual({ top: 70, right: 80, bottom: 40, left: 80 });
      expect(props.dotSize).toBe(8);
      // Should have legends
      expect(props.legends).toBeDefined();
      expect((props.legends as unknown[]).length).toBeGreaterThan(0);
    });

    it("wrapper has minHeight 300", () => {
      const { container } = render(<RadarChart data={sampleData} />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.style.minHeight).toBe("300px");
    });
  });

  describe("compact mode", () => {
    it("uses tight margins and hides legends/dots", () => {
      render(<RadarChart data={sampleData} bracketLabel="10–15 HCP" compact />);

      const props = mockResponsiveRadar.mock.calls[0][0] as Record<string, unknown>;
      expect(props.margin).toEqual({ top: 16, right: 24, bottom: 16, left: 24 });
      expect(props.dotSize).toBe(0);
      expect(props.dotBorderWidth).toBe(0);
      expect(props.legends).toEqual([]);
    });

    it("wrapper does NOT have minHeight 300", () => {
      const { container } = render(<RadarChart data={sampleData} compact />);
      const wrapper = container.firstElementChild as HTMLElement;
      expect(wrapper.style.minHeight).not.toBe("300px");
    });
  });

  describe("color and fillOpacity overrides", () => {
    it("uses custom colors when provided", () => {
      render(<RadarChart data={sampleData} colors={["#a8a29e"]} />);

      const props = mockResponsiveRadar.mock.calls[0][0] as Record<string, unknown>;
      expect(props.colors).toEqual(["#a8a29e"]);
    });

    it("uses custom fillOpacity when provided", () => {
      render(<RadarChart data={sampleData} fillOpacity={0.1} />);

      const props = mockResponsiveRadar.mock.calls[0][0] as Record<string, unknown>;
      expect(props.fillOpacity).toBe(0.1);
    });

    it("combines compact with custom colors and fillOpacity", () => {
      render(
        <RadarChart
          data={sampleData}
          compact
          colors={["#a8a29e"]}
          fillOpacity={0.1}
        />
      );

      const props = mockResponsiveRadar.mock.calls[0][0] as Record<string, unknown>;
      expect(props.colors).toEqual(["#a8a29e"]);
      expect(props.fillOpacity).toBe(0.1);
      expect(props.margin).toEqual({ top: 16, right: 24, bottom: 16, left: 24 });
      expect(props.legends).toEqual([]);
    });
  });
});
