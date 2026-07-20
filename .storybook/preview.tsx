import { withThemeByClassName } from "@storybook/addon-themes";
import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initialize, mswLoader } from "msw-storybook-addon";
import { NextIntlClientProvider } from "next-intl";
import { useState } from "react";
import en from "../messages/en.json";
import kk from "../messages/kk.json";
import ru from "../messages/ru.json";
import { handlers } from "../src/shared/api/mocks/handlers";
import { markMockWorkerReady } from "../src/shared/api/mocks/worker-ready";
import "../src/app/styles/globals.css";

initialize({ onUnhandledRequest: "bypass" }, handlers);
// Storybook wires MSW via msw-storybook-addon (mswLoader guarantees the worker
// is live before a story renders), not via MswProvider — so release the ky
// transport gate here or `http`-driven stories would await it forever when
// `pnpm storybook` runs with NEXT_PUBLIC_API_MOCKING=enabled.
markMockWorkerReady();

const messagesByLocale = { en, ru, kk } as const;

// Fresh QueryClient per story render — a module-level shared instance would
// leak cache between stories/tests.
const withQueryClient: Decorator = (Story) => {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Story />
    </QueryClientProvider>
  );
};

const withI18n: Decorator = (Story, context) => {
  const locale = (context.globals.locale ?? "en") as keyof typeof messagesByLocale;
  return (
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      <Story />
    </NextIntlClientProvider>
  );
};

const preview: Preview = {
  loaders: [mswLoader],
  parameters: {
    // App Router project: makes the framework provide its built-in
    // next/navigation mocks (getRouter() from navigation.mock).
    nextjs: { appDirectory: true },
    msw: { handlers },
    a11y: { test: "error" },
  },
  decorators: [
    withQueryClient,
    withI18n,
    withThemeByClassName({
      themes: { light: "", dark: "dark" },
      defaultTheme: "light",
      parentSelector: "html",
    }),
  ],
  globalTypes: {
    locale: {
      description: "i18n locale",
      toolbar: {
        title: "Locale",
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "ru", title: "Русский" },
          { value: "kk", title: "Қазақша" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: "en" },
};

export default preview;
