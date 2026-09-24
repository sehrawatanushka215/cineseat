"use client";

import { useEffect } from "react";

/**
 * Runs axe-core in the browser, in development only, and logs any
 * accessibility violations to the console as you navigate.
 *
 * Wrapped in try/catch on purpose: a dev-time linter must never be able to
 * take the app down. That is the same "fallback behaviour" rule from the
 * lecture, applied to our own tooling.
 */
export function AxeInit() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let cancelled = false;

    (async () => {
      try {
        const [reactMod, reactDomMod, axeMod] = await Promise.all([
          import("react"),
          import("react-dom"),
          import("@axe-core/react"),
        ]);
        if (cancelled) return;

        const React = (reactMod as unknown as { default?: unknown }).default ?? reactMod;
        const ReactDOM = (reactDomMod as unknown as { default?: unknown }).default ?? reactDomMod;
        const axe = axeMod.default as unknown as (
          react: unknown,
          reactDom: unknown,
          timeout: number,
        ) => void;

        axe(React, ReactDOM, 1000);
        console.info("[axe] accessibility checks running - watch this console.");
      } catch (error) {
        console.warn("[axe] dev-only checker did not start:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
