// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MethodologyVersionBanner } from "@/app/(tools)/strokes-gained/history/_components/methodology-version-banner";

describe("MethodologyVersionBanner", () => {
  afterEach(cleanup);

  it("renders when visible is true", () => {
    render(<MethodologyVersionBanner visible={true} />);
    expect(screen.getByTestId("methodology-version-banner")).toBeInTheDocument();
    expect(
      screen.getByText(/older methodology version/i)
    ).toBeInTheDocument();
  });

  it("does not render when visible is false", () => {
    render(<MethodologyVersionBanner visible={false} />);
    expect(screen.queryByTestId("methodology-version-banner")).not.toBeInTheDocument();
  });
});
