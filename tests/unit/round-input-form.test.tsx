// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoundInputForm } from "@/app/(tools)/strokes-gained/_components/round-input-form";

afterEach(cleanup);

describe("RoundInputForm plus handicap toggle", () => {
  const onSubmit = vi.fn();

  it("toggle defaults to HCP", () => {
    render(<RoundInputForm onSubmit={onSubmit} saveEnabled={false} />);
    const toggle = screen.getByTestId("plus-handicap-toggle");
    expect(toggle.textContent).toBe("HCP");
  });

  it("clicking toggle changes label to +", async () => {
    const user = userEvent.setup();
    render(<RoundInputForm onSubmit={onSubmit} saveEnabled={false} />);
    const toggle = screen.getByTestId("plus-handicap-toggle");
    await user.click(toggle);
    expect(toggle.textContent).toBe("+");
  });

  it("plus toggle on shows Plus HCP badge", async () => {
    const user = userEvent.setup();
    render(<RoundInputForm onSubmit={onSubmit} saveEnabled={false} />);
    const toggle = screen.getByTestId("plus-handicap-toggle");
    await user.click(toggle);

    // Type a handicap value
    const hcpInput = document.querySelector<HTMLInputElement>('input[name="handicapIndex"]')!;
    await user.clear(hcpInput);
    await user.type(hcpInput, "2.3");
    // Trigger blur to update watch
    await user.tab();

    expect(screen.getByText("Plus HCP")).toBeVisible();
  });

  it("rehydrates from -2.3 with + toggle and 2.3 value", () => {
    render(
      <RoundInputForm
        onSubmit={onSubmit}
        saveEnabled={false}
        initialValues={{ handicapIndex: -2.3 } as never}
      />
    );
    const toggle = screen.getByTestId("plus-handicap-toggle");
    expect(toggle.textContent).toBe("+");

    const hcpInput = document.querySelector<HTMLInputElement>('input[name="handicapIndex"]')!;
    expect(hcpInput).toHaveValue(2.3);
  });
});

describe("RoundInputForm save consent", () => {
  const onSubmit = vi.fn();

  it("shows anonymous save consent when save is enabled", () => {
    render(<RoundInputForm onSubmit={onSubmit} saveEnabled />);

    expect(
      screen.getByLabelText("Save this round to track over time")
    ).toBeVisible();
  });

  it("hides anonymous save consent when save is disabled", () => {
    render(<RoundInputForm onSubmit={onSubmit} saveEnabled={false} />);

    expect(
      screen.queryByLabelText("Save this round to track over time")
    ).toBeNull();
  });

  it("shows the Cloudflare disclosure only when anonymous save is checked", async () => {
    const user = userEvent.setup();

    render(<RoundInputForm onSubmit={onSubmit} saveEnabled />);

    expect(
      screen.queryByText(/create a free account to claim it/i)
    ).toBeNull();

    await user.click(
      screen.getByLabelText(
        "Save this round to track over time"
      )
    );

    expect(
      screen.getByText(/Save this round now, then create a free account to claim it and track your SG trends over time/i)
    ).toBeVisible();
    expect(
      screen.getByText(/Cloudflare Turnstile verifies you're human/i)
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Privacy Policy" })
    ).toHaveAttribute("href", "https://www.cloudflare.com/privacypolicy/");
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "https://www.cloudflare.com/website-terms/"
    );
  });

  it("shows authenticated disclosure when user is signed in", async () => {
    const user = userEvent.setup();

    render(<RoundInputForm onSubmit={onSubmit} saveEnabled isAuthenticated />);

    await user.click(
      screen.getByLabelText("Save this round to track over time")
    );

    expect(
      screen.getByText(/This round will be added to your history/i)
    ).toBeVisible();
    expect(
      screen.queryByText(/create a free account/i)
    ).toBeNull();
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
        "Save this round to track over time"
      )
    );

    expect(onSavePreferenceChange).toHaveBeenLastCalledWith(true);
  });
});
