"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useCallback,
} from "react";

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_TIMEOUT_MS = 5000;
const TURNSTILE_EXECUTE_TIMEOUT_MS = 10000;

let scriptLoadPromise: Promise<void> | null = null;

export type TurnstileExecuteErrorCode =
  | "not_ready"
  | "timeout"
  | "error"
  | "expired"
  | "superseded"
  | "unmounted";

export class TurnstileExecuteError extends Error {
  code: TurnstileExecuteErrorCode;

  constructor(code: TurnstileExecuteErrorCode, message?: string) {
    super(message ?? code);
    this.name = "TurnstileExecuteError";
    this.code = code;
  }
}

export interface TurnstileWidgetHandle {
  execute(): Promise<string>;
  reset(): void;
}

interface TurnstileWidgetProps {
  siteKey: string;
}

function createError(code: TurnstileExecuteErrorCode): TurnstileExecuteError {
  const messages: Record<TurnstileExecuteErrorCode, string> = {
    not_ready: "Turnstile is not ready",
    timeout: "Turnstile verification timed out",
    error: "Turnstile verification failed",
    expired: "Turnstile token expired",
    superseded: "Turnstile verification was superseded by a newer request",
    unmounted: "Turnstile widget unmounted during verification",
  };

  return new TurnstileExecuteError(code, messages[code]);
}

function settleWhenReady(resolve: () => void, reject: (error: Error) => void) {
  const start = Date.now();

  const check = () => {
    if (typeof window !== "undefined" && window.turnstile) {
      resolve();
      return;
    }

    if (Date.now() - start >= TURNSTILE_SCRIPT_TIMEOUT_MS) {
      reject(createError("not_ready"));
      return;
    }

    window.setTimeout(check, 50);
  };

  check();
}

function ensureTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(createError("not_ready"));
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise;
  }

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile-script="true"]'
    );

    if (!existing) {
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = "true";
      script.onerror = () => reject(createError("not_ready"));
      document.head.appendChild(script);
    }

    settleWhenReady(resolve, reject);
  }).catch((error) => {
    scriptLoadPromise = null;
    throw error;
  });

  return scriptLoadPromise;
}

type PendingExecution = {
  resolve: (token: string) => void;
  reject: (error: Error) => void;
  timeoutId: number;
};

export const TurnstileWidget = forwardRef<
  TurnstileWidgetHandle,
  TurnstileWidgetProps
>(function TurnstileWidget({ siteKey }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const pendingExecutionRef = useRef<PendingExecution | null>(null);
  const mountedRef = useRef(true);

  const clearPendingExecution = useCallback((): PendingExecution | null => {
    const pending = pendingExecutionRef.current;
    if (!pending) return null;

    clearTimeout(pending.timeoutId);
    pendingExecutionRef.current = null;
    return pending;
  }, []);

  const resetWidget = useCallback(() => {
    if (widgetIdRef.current && typeof window !== "undefined" && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  const rejectPending = useCallback((code: TurnstileExecuteErrorCode) => {
    const pending = clearPendingExecution();
    if (!pending) return;
    pending.reject(createError(code));
    resetWidget();
  }, [clearPendingExecution, resetWidget]);

  useEffect(() => {
    mountedRef.current = true;

    let cancelled = false;

    ensureTurnstileScript()
      .then(() => {
        if (
          cancelled ||
          !mountedRef.current ||
          !containerRef.current ||
          !window.turnstile ||
          widgetIdRef.current
        ) {
          return;
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          action: "save_round",
          execution: "execute",
          appearance: "interaction-only",
          retry: "auto",
          "refresh-expired": "manual",
          "response-field": false,
          callback: (token) => {
            const pending = clearPendingExecution();
            if (!pending) return;
            pending.resolve(token);
            resetWidget();
          },
          "expired-callback": () => {
            rejectPending("expired");
          },
          "error-callback": () => {
            rejectPending("error");
          },
          "timeout-callback": () => {
            rejectPending("timeout");
          },
        });
      })
      .catch(() => {
        rejectPending("not_ready");
      });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null; // null BEFORE reject so resetWidget() no-ops via its guard
      // INTENTIONALLY skip resetWidget() here — the widget is being removed, not reused.
      // rejectPending() would call resetWidget() → turnstile.reset() which races with
      // turnstile.remove() below, causing "Nothing to reset found for provided container."
      const pending = clearPendingExecution();
      if (pending) {
        pending.reject(createError("unmounted"));
      }
      if (widgetId && typeof window !== "undefined" && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [clearPendingExecution, rejectPending, resetWidget, siteKey]);

  useImperativeHandle(
    ref,
    () => ({
      async execute() {
        await ensureTurnstileScript();

        const turnstile = window.turnstile;

        if (!widgetIdRef.current || !turnstile) {
          throw createError("not_ready");
        }

        rejectPending("superseded");

        return new Promise<string>((resolve, reject) => {
          const timeoutId = window.setTimeout(() => {
            const pending = clearPendingExecution();
            if (!pending) return;
            pending.reject(createError("timeout"));
            resetWidget();
          }, TURNSTILE_EXECUTE_TIMEOUT_MS);

          pendingExecutionRef.current = { resolve, reject, timeoutId };

          try {
            turnstile.execute(widgetIdRef.current!);
          } catch {
            const pending = clearPendingExecution();
            if (!pending) return;
            pending.reject(createError("error"));
            resetWidget();
          }
        });
      },
      reset() {
        rejectPending("superseded");
        resetWidget();
      },
    }),
    [clearPendingExecution, rejectPending, resetWidget]
  );

  return <div ref={containerRef} data-testid="turnstile-widget" />;
});
