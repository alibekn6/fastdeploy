"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

// `attribute="class"` matches globals.css's `@custom-variant dark (&:is(.dark *))`
// and Storybook's `withThemeByClassName` — one switch drives app and workshop.
//
// next-themes injects a blocking inline script into <head>, so the resolved
// theme is applied before first paint and there is no flash of the wrong theme.
// That script writes to <html> during SSR-mismatched hydration, which is why
// app/[locale]/layout.tsx keeps `suppressHydrationWarning` on the <html> tag.
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
