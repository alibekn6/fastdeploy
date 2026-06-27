"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { acceptConsent, analyticsConfigured, consentDecided, rejectConsent } from "./consent";

export function ConsentBanner() {
  const t = useTranslations("Consent");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (analyticsConfigured() && !consentDecided()) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-3 border-t bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground">{t("message")}</p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            rejectConsent();
            setVisible(false);
          }}
        >
          {t("reject")}
        </Button>
        <Button
          onClick={() => {
            acceptConsent();
            setVisible(false);
          }}
        >
          {t("accept")}
        </Button>
      </div>
    </div>
  );
}
