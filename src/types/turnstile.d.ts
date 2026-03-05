type TurnstileCallback = (token: string) => void;
type TurnstileVoidCallback = () => void;

interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  appearance?: "always" | "execute" | "interaction-only";
  execution?: "render" | "execute";
  retry?: "auto" | "never";
  "refresh-expired"?: "auto" | "manual" | "never";
  "response-field"?: boolean;
  callback?: TurnstileCallback;
  "expired-callback"?: TurnstileVoidCallback;
  "error-callback"?: TurnstileVoidCallback;
  "timeout-callback"?: TurnstileVoidCallback;
}

interface Turnstile {
  render(
    container: string | HTMLElement,
    options: TurnstileRenderOptions
  ): string;
  execute(widgetId: string): void;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

export {};
