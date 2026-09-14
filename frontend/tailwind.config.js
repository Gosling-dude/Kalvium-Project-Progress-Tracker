/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter var",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"],
      },
      colors: {
        // Full ramp built around the original brand hue (#3457d5) so existing
        // brand-500/600/700 usages keep their look while disabled/subtle
        // states finally have real steps to reach for.
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#bcd2ff",
          300: "#93b4ff",
          400: "#6389fa",
          500: "#3457d5",
          600: "#2a45b3",
          700: "#213690",
          800: "#1d2f74",
          900: "#1b2b5f",
          950: "#131c3d",
        },
      },
      fontSize: {
        // Tailwind's default ramp, kept size-for-size so no existing layout or
        // truncation width shifts — only optical tracking is tightened on the
        // display sizes, which is what actually reads as "designed".
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        lg: ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.005em" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.012em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.018em" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.022em" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.026em" }],
      },
      borderRadius: {
        md: "0.4375rem",
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        // Layered, low-alpha shadows tinted with the slate hue instead of
        // pure black — keeps elevation from looking muddy on the slate ground.
        xs: "0 1px 2px 0 rgb(15 23 42 / 0.04)",
        sm: "0 1px 2px 0 rgb(15 23 42 / 0.05), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        DEFAULT: "0 1px 3px 0 rgb(15 23 42 / 0.07), 0 4px 8px -2px rgb(15 23 42 / 0.06)",
        md: "0 2px 4px -1px rgb(15 23 42 / 0.06), 0 8px 16px -4px rgb(15 23 42 / 0.08)",
        lg: "0 4px 6px -2px rgb(15 23 42 / 0.05), 0 16px 32px -8px rgb(15 23 42 / 0.12)",
        xl: "0 8px 12px -4px rgb(15 23 42 / 0.06), 0 28px 56px -12px rgb(15 23 42 / 0.18)",
        pop: "0 12px 24px -8px rgb(15 23 42 / 0.16), 0 32px 64px -16px rgb(15 23 42 / 0.22)",
        brand: "0 1px 2px 0 rgb(33 54 144 / 0.24), 0 6px 16px -4px rgb(42 69 179 / 0.36)",
        "inner-highlight": "inset 0 1px 0 0 rgb(255 255 255 / 0.12)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 0.61, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.36, 0.64, 1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          // MUST end at `none`, not `translateY(0)`: this animation runs with
          // fill-mode `both`, so a lingering transform value would make the
          // animated element a containing block for `position: fixed` — and
          // PageContainer (which uses this) is the ancestor of most modals.
          to: { opacity: "1", transform: "none" },
        },
        // Every transform animation below ends at `none` for the same reason as
        // fade-in-up: these run with fill-mode `both` on panels and drawers that
        // can themselves contain fixed-position overlays.
        "scale-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.97)" },
          to: { opacity: "1", transform: "none" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "none" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "none" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgb(225 29 72 / 0.45)" },
          "70%": { boxShadow: "0 0 0 6px rgb(225 29 72 / 0)" },
          "100%": { boxShadow: "0 0 0 0 rgb(225 29 72 / 0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out both",
        "fade-in-up": "fade-in-up 0.28s cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "scale-in": "scale-in 0.22s cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "slide-in-right": "slide-in-right 0.28s cubic-bezier(0.22, 0.61, 0.36, 1) both",
        "slide-in-left": "slide-in-left 0.28s cubic-bezier(0.22, 0.61, 0.36, 1) both",
        shimmer: "shimmer 1.6s infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.22, 0.61, 0.36, 1) infinite",
      },
    },
  },
  plugins: [],
};
