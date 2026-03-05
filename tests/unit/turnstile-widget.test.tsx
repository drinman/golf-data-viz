// @vitest-environment jsdom

import { createRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/security/turnstile-widget";

describe("TurnstileWidget", () => {
  let renderOptions:
    | Parameters<NonNullable<typeof window.turnstile>["render"]>[1]
    | null;
  let renderMock: ReturnType<typeof vi.fn>;
  let executeMock: ReturnType<typeof vi.fn>;
  let resetMock: ReturnType<typeof vi.fn>;
  let removeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    renderOptions = null;
    renderMock = vi.fn((_container, options) => {
      renderOptions = options;
      return "widget-1";
    });
    executeMock = vi.fn();
    resetMock = vi.fn();
    removeMock = vi.fn();
    window.turnstile = {
      render: renderMock,
      execute: executeMock,
      reset: resetMock,
      remove: removeMock,
    };
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    delete window.turnstile;
  });

  async function renderWidget() {
    const ref = createRef<TurnstileWidgetHandle>();
    const view = render(<TurnstileWidget ref={ref} siteKey="site-key" />);

    await act(async () => {
      await Promise.resolve();
    });
    expect(renderMock).toHaveBeenCalledTimes(1);

    return { ref, ...view };
  }

  it("resolves execute() with the Turnstile token", async () => {
    const { ref } = await renderWidget();

    const promise = ref.current!.execute();

    await act(async () => {
      await Promise.resolve();
    });
    expect(executeMock).toHaveBeenCalledWith("widget-1");

    act(() => {
      renderOptions?.callback?.("turnstile-token");
    });

    await expect(promise).resolves.toBe("turnstile-token");
    expect(resetMock).toHaveBeenCalledWith("widget-1");
  });

  it("rejects execute() on timeout", async () => {
    const { ref } = await renderWidget();

    const promise = ref.current!.execute();

    await act(async () => {
      await Promise.resolve();
    });
    expect(executeMock).toHaveBeenCalledWith("widget-1");

    act(() => {
      vi.advanceTimersByTime(10001);
    });

    await expect(promise).rejects.toMatchObject({
      code: "timeout",
    });
    expect(resetMock).toHaveBeenCalledWith("widget-1");
  });

  it("rejects execute() when the widget reports an error", async () => {
    const { ref } = await renderWidget();

    const promise = ref.current!.execute();

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      renderOptions?.["error-callback"]?.();
    });

    await expect(promise).rejects.toMatchObject({
      code: "error",
    });
    expect(resetMock).toHaveBeenCalledWith("widget-1");
  });

  it("supersedes the old in-flight execution when execute() is called again", async () => {
    const { ref } = await renderWidget();

    const firstPromise = ref.current!.execute();
    const secondPromise = ref.current!.execute();

    await expect(firstPromise).rejects.toMatchObject({
      code: "superseded",
    });

    act(() => {
      renderOptions?.callback?.("fresh-token");
    });

    await expect(secondPromise).resolves.toBe("fresh-token");
    expect(executeMock).toHaveBeenCalledTimes(2);
    expect(resetMock).toHaveBeenCalledWith("widget-1");
  });

  it("rejects the in-flight execution if the widget unmounts", async () => {
    const { ref, unmount } = await renderWidget();

    const promise = ref.current!.execute();

    await act(async () => {
      await Promise.resolve();
    });

    unmount();

    await expect(promise).rejects.toMatchObject({
      code: "unmounted",
    });
    expect(removeMock).toHaveBeenCalledWith("widget-1");
  });
});
