import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";

describe("security headers", () => {
  it("includes a Content-Security-Policy header", async () => {
    const headersFn = nextConfig.headers;
    expect(headersFn).toBeDefined();

    const routes = await headersFn!();
    const catchAll = routes.find((r) => r.source === "/(.*)");
    expect(catchAll).toBeDefined();

    const csp = catchAll!.headers.find(
      (h) => h.key === "Content-Security-Policy"
    );
    expect(csp).toBeDefined();
    expect(csp!.value).toContain("object-src 'none'");
    expect(csp!.value).toContain("base-uri 'self'");
    expect(csp!.value).toContain("form-action 'self'");
    expect(csp!.value).toContain("frame-ancestors 'none'");
  });
});
