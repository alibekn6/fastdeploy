"use client";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";

export function ThemeToggle() {
  const t = useTranslations("Common");
  const { resolvedTheme, setTheme } = useTheme();
  // `resolvedTheme` is undefined until next-themes has read localStorage /
  // the media query on the client, so the first client render would disagree
  // with the server HTML. Render the button disabled-but-sized until mounted:
  // the icon is what differs, and the slot keeps its width either way.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const label = isDark ? t("themeToLight") : t("themeToDark");

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted ? isDark ? <SunIcon aria-hidden="true" /> : <MoonIcon aria-hidden="true" /> : null}
    </Button>
  );
}
