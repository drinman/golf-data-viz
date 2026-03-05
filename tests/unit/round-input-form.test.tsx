// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("shows the Cloudflare disclosure only when anonymous save is checked", async () => {
    const user = userEvent.setup();

    render(<RoundInputForm onSubmit={onSubmit} saveEnabled />);

    expect(
      screen.queryByText(/Cloudflare Turnstile to distinguish humans from bots/i)
    ).toBeNull();

    await user.click(
      screen.getByLabelText(
        "Save this round anonymously to improve future benchmarks."
      )
    );

    expect(
      screen.getByText(/Cloudflare Turnstile to distinguish humans from bots/i)
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Privacy Policy" })
    ).toHaveAttribute("href", "https://www.cloudflare.com/privacypolicy/");
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "https://www.cloudflare.com/website-terms/"
    );
  });

  it("reports the save opt-in state upward as the checkbox changes", async () => {
    const user = userEvent.setup();
    const onSavePreferenceChange = vi.fn();

    render(
      <RoundInputForm
        onSubmit={onSubmit}
        saveEnabled
        onSavePreferenceChange={onSavePreferenceChange}
      />
    );

    expect(onSavePreferenceChange).toHaveBeenCalledWith(false);

    await user.click(
      screen.getByLabelText(
        "Save this round anonymously to improve future benchmarks."
      )
    );

    expect(onSavePreferenceChange).toHaveBeenLastCalledWith(true);
  });
});
