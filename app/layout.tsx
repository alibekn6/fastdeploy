import "@/app/styles/globals.css";
import type { ReactNode } from "react";
import { MswProvider, QueryProvider } from "@/app/providers";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <MswProvider>
          <QueryProvider>{children}</QueryProvider>
        </MswProvider>
      </body>
    </html>
  );
}
