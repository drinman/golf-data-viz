// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RoundInputForm } from "@/app/(tools)/strokes-gained/_components/round-input-form";

afterEach(cleanup);

describe("RoundInputForm save consent", () => {
  const onSubmit = vi.fn();

  it("shows anonymous save consent when save is enabled", () => {
    render(<RoundInputForm onSubmit={onSubmit} saveEnabled />);

    expect(
      screen.getByLabelText("Save this round anonymously to improve future benchmarks.")
    ).toBeVisible();
  });

  it("hides anonymous save consent when save is disabled", () => {
    render(<RoundInputForm onSubmit={onSubmit} saveEnabled={false} />);

    expect(
      screen.queryByLabelText("Save this round anonymously to improve future benchmarks.")
    ).toBeNull();
  });
});
