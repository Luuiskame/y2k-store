/**
 * Medusa UI's own shadow tokens, copied verbatim from the preset bundled in
 * @medusajs/admin-bundler 2.13.1 (`var effects` in dist/index.js). Card
 * outlines, button edges and focus rings are drawn with these, and each one
 * hardcodes the stock zinc grays and blues. A palette re-issues them with its
 * own colors swapped in (see `effectTokens` in palettes.ts); without that
 * every card would keep a gray outline and a blue focus ring.
 *
 * Generated, not hand-written: after a Medusa upgrade, regenerate and diff.
 */
export const MEDUSA_EFFECTS: Record<"dark" | "light", Record<string, string>> = {
  "dark": {
    "--details-contrast-on-bg-interactive": "0px 1px 2px 0px rgba(30, 58, 138, 0.6)",
    "--details-switch-handle": "0px 0px 2px 1px rgba(255, 255, 255, 1) inset, 0px 1px 0px 0px rgba(255, 255, 255, 1) inset, 0px 0px 0px 0.5px rgba(0, 0, 0, 0.16), 0px 5px 4px 0px rgba(0, 0, 0, 0.1), 0px 3px 3px 0px rgba(0, 0, 0, 0.1), 0px 1px 2px 0px rgba(0, 0, 0, 0.1), 0px 0px 1px 0px rgba(0, 0, 0, 0.1)",
    "--borders-interactive-with-active": "0px 0px 0px 1px rgba(96, 165, 250, 1), 0px 0px 0px 4px rgba(59, 130, 246, 0.25)",
    "--borders-focus": "0px 0px 0px 1px rgba(24, 24, 27, 1), 0px 0px 0px 3px rgba(96, 165, 250, 0.8)",
    "--details-switch-background-focus": "0px 0px 0px 1px rgba(24, 24, 27, 1), 0px 0px 0px 3px rgba(96, 165, 250, 0.8), 0px 1px 1px 0px rgba(0, 0, 0, 0.1) inset, 0px 2px 4px 0px rgba(0, 0, 0, 0.1) inset, 0px 0px 0px 0.75px rgba(255, 255, 255, 0.12) inset, 0px 0px 8px 0px rgba(0, 0, 0, 0.1) inset",
    "--buttons-danger": "0px -1px 0px 0px rgba(255, 255, 255, 0.16), 0px 0px 0px 1px rgba(255, 255, 255, 0.12), 0px 0px 0px 1px rgba(159, 18, 57, 1), 0px 0px 1px 1.5px rgba(0, 0, 0, 0.24), 0px 2px 2px 0px rgba(0, 0, 0, 0.24)",
    "--buttons-danger-focus": "0px -1px 0px 0px rgba(255, 255, 255, 0.16), 0px 0px 0px 1px rgba(255, 255, 255, 0.12), 0px 0px 0px 1px rgba(159, 18, 57, 1), 0px 0px 0px 2px rgba(24, 24, 27, 1), 0px 0px 0px 4px rgba(96, 165, 250, 0.8)",
    "--details-switch-background": "0px 1px 1px 0px rgba(0, 0, 0, 0.1) inset, 0px 2px 4px 0px rgba(0, 0, 0, 0.1) inset, 0px 0px 0px 0.75px rgba(255, 255, 255, 0.12) inset, 0px 0px 8px 0px rgba(0, 0, 0, 0.1) inset",
    "--buttons-inverted-focus": "0px -1px 0px 0px rgba(255, 255, 255, 0.12), 0px 0px 0px 1px rgba(255, 255, 255, 0.12), 0px 0px 0px 1px rgba(82, 82, 91, 1), 0px 0px 0px 2px rgba(24, 24, 27, 1), 0px 0px 0px 4px rgba(96, 165, 250, 0.8)",
    "--elevation-flyout": "0px -1px 0px 0px rgba(255, 255, 255, 0.04), 0px 0px 0px 1px rgba(255, 255, 255, 0.1), 0px 4px 8px 0px rgba(0, 0, 0, 0.32), 0px 8px 16px 0px rgba(0, 0, 0, 0.32)",
    "--borders-error": "0px 0px 0px 1px rgba(244, 63, 94, 1), 0px 0px 0px 3px rgba(225, 29, 72, 0.25)",
    "--buttons-inverted": "0px -1px 0px 0px rgba(255, 255, 255, 0.12), 0px 0px 0px 1px rgba(255, 255, 255, 0.1), 0px 0px 0px 1px rgba(82, 82, 91, 1), 0px 0px 1px 1.5px rgba(0, 0, 0, 0.24), 0px 2px 2px 0px rgba(0, 0, 0, 0.24)",
    "--borders-base": "0px -1px 0px 0px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(39, 39, 42, 1), 0px 0px 1px 1.5px rgba(0, 0, 0, 0.24), 0px 2px 2px 0px rgba(0, 0, 0, 0.24)",
    "--elevation-card-hover": "0px -1px 0px 0px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(39, 39, 42, 1), 0px 1px 4px 0px rgba(0, 0, 0, 0.48), 0px 2px 8px 0px rgba(0, 0, 0, 0.48)",
    "--elevation-card-rest": "0px -1px 0px 0px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(39, 39, 42, 1), 0px 1px 2px 0px rgba(0, 0, 0, 0.32), 0px 2px 4px 0px rgba(0, 0, 0, 0.32)",
    "--buttons-neutral": "0px -1px 0px 0px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(39, 39, 42, 1), 0px 0px 1px 1.5px rgba(0, 0, 0, 0.24), 0px 2px 2px 0px rgba(0, 0, 0, 0.24)",
    "--elevation-code-block": "0px -1px 0px 0px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(39, 39, 42, 1), 0px 1px 2px 0px rgba(0, 0, 0, 0.32), 0px 2px 4px 0px rgba(0, 0, 0, 0.32)",
    "--buttons-neutral-focus": "0px -1px 0px 0px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(255, 255, 255, 0.06), 0px 0px 0px 1px rgba(39, 39, 42, 1), 0px 0px 0px 2px rgba(24, 24, 27, 1), 0px 0px 0px 4px rgba(96, 165, 250, 0.8)",
    "--elevation-modal": "0px 0px 0px 1px rgba(24, 24, 27, 1) inset, 0px 0px 0px 1.5px rgba(255, 255, 255, 0.06) inset, 0px -1px 0px 0px rgba(255, 255, 255, 0.04), 0px 0px 0px 1px rgba(255, 255, 255, 0.1), 0px 4px 8px 0px rgba(0, 0, 0, 0.32), 0px 8px 16px 0px rgba(0, 0, 0, 0.32)",
    "--elevation-commandbar": "0px 0px 0px 0.75px rgba(24, 24, 27, 1) inset, 0px 0px 0px 1.25px rgba(255, 255, 255, 0.1) inset, 0px 4px 8px 0px rgba(0, 0, 0, 0.32), 0px 8px 16px 0px rgba(0, 0, 0, 0.32)",
    "--elevation-tooltip": "0px -1px 0px 0px rgba(255, 255, 255, 0.04), 0px 2px 4px 0px rgba(0, 0, 0, 0.32), 0px 0px 0px 1px rgba(255, 255, 255, 0.1), 0px 4px 8px 0px rgba(0, 0, 0, 0.32)",
    "--borders-interactive-with-focus": "0px -1px 2px 0px rgba(219, 234, 254, 0.5), 0px 0px 0px 1px rgba(96, 165, 250, 1), 0px 0px 0px 2px rgba(24, 24, 27, 1), 0px 0px 0px 4px rgba(96, 165, 250, 0.8)",
    "--borders-interactive-with-shadow": "0px -1px 2px 0px rgba(219, 234, 254, 0.5), 0px 0px 0px 1px rgba(96, 165, 250, 1)"
  },
  "light": {
    "--buttons-danger-focus": "0px 0.75px 0px 0px rgba(255, 255, 255, 0.2) inset, 0px 1px 2px 0px rgba(190, 18, 60, 0.4), 0px 0px 0px 1px rgba(190, 18, 60, 1), 0px 0px 0px 2px rgba(255, 255, 255, 1), 0px 0px 0px 4px rgba(59, 130, 246, 0.6)",
    "--details-contrast-on-bg-interactive": "0px 1px 2px 0px rgba(30, 58, 138, 0.6)",
    "--borders-error": "0px 0px 0px 1px rgba(225, 29, 72, 1), 0px 0px 0px 3px rgba(225, 29, 72, 0.15)",
    "--borders-focus": "0px 0px 0px 1px rgba(255, 255, 255, 1), 0px 0px 0px 3px rgba(59, 130, 246, 0.6)",
    "--buttons-danger": "0px 0.75px 0px 0px rgba(255, 255, 255, 0.2) inset, 0px 1px 2px 0px rgba(190, 18, 60, 0.4), 0px 0px 0px 1px rgba(190, 18, 60, 1)",
    "--buttons-inverted-focus": "0px 0.75px 0px 0px rgba(255, 255, 255, 0.2) inset, 0px 1px 2px 0px rgba(0, 0, 0, 0.4), 0px 0px 0px 1px rgba(24, 24, 27, 1), 0px 0px 0px 2px rgba(255, 255, 255, 1), 0px 0px 0px 4px rgba(59, 130, 246, 0.6)",
    "--elevation-card-hover": "0px 0px 0px 1px rgba(0, 0, 0, 0.08), 0px 1px 2px -1px rgba(0, 0, 0, 0.08), 0px 2px 8px 0px rgba(0, 0, 0, 0.1)",
    "--details-switch-handle": "0px 0px 2px 1px rgba(255, 255, 255, 1) inset, 0px 1px 0px 0px rgba(255, 255, 255, 1) inset, 0px 0px 0px 0.5px rgba(0, 0, 0, 0.02), 0px 5px 4px 0px rgba(0, 0, 0, 0.02), 0px 3px 3px 0px rgba(0, 0, 0, 0.04), 0px 1px 2px 0px rgba(0, 0, 0, 0.12), 0px 0px 1px 0px rgba(0, 0, 0, 0.08)",
    "--buttons-neutral": "0px 1px 2px 0px rgba(0, 0, 0, 0.12), 0px 0px 0px 1px rgba(0, 0, 0, 0.08)",
    "--borders-base": "0px 1px 2px 0px rgba(0, 0, 0, 0.12), 0px 0px 0px 1px rgba(0, 0, 0, 0.08)",
    "--elevation-card-rest": "0px 0px 0px 1px rgba(0, 0, 0, 0.08), 0px 1px 2px -1px rgba(0, 0, 0, 0.08), 0px 2px 4px 0px rgba(0, 0, 0, 0.04)",
    "--buttons-neutral-focus": "0px 1px 2px 0px rgba(0, 0, 0, 0.12), 0px 0px 0px 1px rgba(0, 0, 0, 0.08), 0px 0px 0px 2px rgba(255, 255, 255, 1), 0px 0px 0px 4px rgba(59, 130, 246, 0.6)",
    "--details-switch-background-focus": "0px 0px 0px 1px rgba(255, 255, 255, 1), 0px 0px 0px 3px rgba(59, 130, 246, 0.6), 0px 1px 1px 0px rgba(0, 0, 0, 0.04) inset, 0px 2px 4px 0px rgba(0, 0, 0, 0.04) inset, 0px 0px 0px 0.75px rgba(0, 0, 0, 0.06) inset, 0px 0px 8px 0px rgba(0, 0, 0, 0.02) inset, 0px 2px 4px 0px rgba(0, 0, 0, 0.04)",
    "--details-switch-background": "0px 1px 1px 0px rgba(0, 0, 0, 0.04) inset, 0px 2px 4px 0px rgba(0, 0, 0, 0.04) inset, 0px 0px 0px 0.75px rgba(0, 0, 0, 0.06) inset, 0px 0px 8px 0px rgba(0, 0, 0, 0.02) inset, 0px 2px 4px 0px rgba(0, 0, 0, 0.04)",
    "--elevation-flyout": "0px 0px 0px 1px rgba(0, 0, 0, 0.08), 0px 4px 8px 0px rgba(0, 0, 0, 0.08), 0px 8px 16px 0px rgba(0, 0, 0, 0.08)",
    "--elevation-tooltip": "0px 0px 0px 1px rgba(0, 0, 0, 0.08), 0px 2px 4px 0px rgba(0, 0, 0, 0.08), 0px 4px 8px 0px rgba(0, 0, 0, 0.08)",
    "--elevation-modal": "0px 0px 0px 1px rgba(255, 255, 255, 1) inset, 0px 0px 0px 1.5px rgba(228, 228, 231, 0.6) inset, 0px 0px 0px 1px rgba(0, 0, 0, 0.08), 0px 8px 16px 0px rgba(0, 0, 0, 0.08), 0px 16px 32px 0px rgba(0, 0, 0, 0.08)",
    "--elevation-code-block": "0px 0px 0px 1px rgba(24, 24, 27, 1) inset, 0px 0px 0px 1.5px rgba(255, 255, 255, 0.2) inset",
    "--buttons-inverted": "0px 0.75px 0px 0px rgba(255, 255, 255, 0.2) inset, 0px 1px 2px 0px rgba(0, 0, 0, 0.4), 0px 0px 0px 1px rgba(24, 24, 27, 1)",
    "--elevation-commandbar": "0px 0px 0px 0.75px rgba(39, 39, 42, 1) inset, 0px 0px 0px 1.25px rgba(255, 255, 255, 0.3) inset, 0px 8px 16px 0px rgba(0, 0, 0, 0.08), 0px 16px 32px 0px rgba(0, 0, 0, 0.08)",
    "--borders-interactive-with-focus": "0px 1px 2px 0px rgba(30, 58, 138, 0.5), 0px 0px 0px 1px rgba(37, 99, 235, 1), 0px 0px 0px 2px rgba(255, 255, 255, 1), 0px 0px 0px 4px rgba(37, 99, 235, 0.6)",
    "--borders-interactive-with-shadow": "0px 1px 2px 0px rgba(30, 58, 138, 0.5), 0px 0px 0px 1px rgba(37, 99, 235, 1)",
    "--borders-interactive-with-active": "0px 0px 0px 4px rgba(37, 99, 235, 0.2), 0px 0px 0px 1px rgba(37, 99, 235, 1)"
  }
}

/** A few stock colors, to draw the preview card of the "Clásico" palette. */
export const MEDUSA_PREVIEW: Record<"dark" | "light", Record<string, string>> = {
  "dark": {
    "--bg-subtle": "rgba(24, 24, 27, 1)",
    "--bg-base": "rgba(33, 33, 36, 1)",
    "--bg-component": "rgba(39, 39, 42, 1)",
    "--fg-base": "rgba(244, 244, 245, 1)",
    "--fg-subtle": "rgba(161, 161, 170, 1)",
    "--fg-muted": "rgba(113, 113, 122, 1)",
    "--fg-interactive": "rgba(96, 165, 250, 1)",
    "--bg-interactive": "rgba(96, 165, 250, 1)",
    "--button-inverted": "rgba(82, 82, 91, 1)",
    "--border-base": "rgba(255, 255, 255, 0.08)",
    "--bg-highlight": "rgba(23, 37, 84, 1)"
  },
  "light": {
    "--bg-subtle": "rgba(250, 250, 250, 1)",
    "--bg-base": "rgba(255, 255, 255, 1)",
    "--bg-component": "rgba(250, 250, 250, 1)",
    "--fg-base": "rgba(24, 24, 27, 1)",
    "--fg-subtle": "rgba(82, 82, 91, 1)",
    "--fg-muted": "rgba(113, 113, 122, 1)",
    "--fg-interactive": "rgba(59, 130, 246, 1)",
    "--bg-interactive": "rgba(59, 130, 246, 1)",
    "--button-inverted": "rgba(39, 39, 42, 1)",
    "--border-base": "rgba(228, 228, 231, 1)",
    "--bg-highlight": "rgba(239, 246, 255, 1)"
  }
}
